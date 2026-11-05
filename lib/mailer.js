'use strict';
/**
 * Dependency-free AWS SES email sender (SigV4, SES v2 HTTPS API).
 * Node >= 20 only (uses global fetch + node:crypto). No SDK.
 *
 * Reads credentials and config from the environment:
 *   SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY   (an IAM user allowed ses:SendEmail from MAIL_FROM)
 *   SES_REGION       (default us-east-1)
 *   MAIL_FROM        (a VERIFIED SES identity, e.g. "Iraady Website <info@iraady.com>")
 *   MAIL_TO          (where enquiries land, e.g. info@iraady.com)
 *
 * If credentials are missing it returns {ok:false, skipped:true} so the caller
 * can still store the enquiry and not crash — email is best-effort.
 */
const crypto = require('crypto');

const REGION = process.env.SES_REGION || 'us-east-1';
const ACCESS_KEY = process.env.SES_ACCESS_KEY_ID || '';
const SECRET_KEY = process.env.SES_SECRET_ACCESS_KEY || '';
const SESSION_TOKEN = process.env.SES_SESSION_TOKEN || '';
const MAIL_FROM = process.env.MAIL_FROM || 'Iraady Website <info@iraady.com>';
const MAIL_TO = process.env.MAIL_TO || 'info@iraady.com';

function configured() { return !!(ACCESS_KEY && SECRET_KEY); }

function sha256hex(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function hmac(key, s) { return crypto.createHmac('sha256', key).update(s, 'utf8').digest(); }

function signingKey(secret, date, region, service) {
  const kDate = hmac('AWS4' + secret, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

/**
 * Send one email via SES v2 SendEmail. Returns {ok, messageId?} or {ok:false, error}.
 * replyTo lets staff reply straight to the visitor.
 */
async function sendEmail({ subject, html, text, replyTo }) {
  if (!configured()) return { ok: false, skipped: true, error: 'SES credentials not set' };

  const service = 'ses';
  const host = `email.${REGION}.amazonaws.com`;
  const endpoint = `https://${host}/v2/email/outbound-emails`;

  const toList = String(MAIL_TO).split(',').map((s) => s.trim()).filter(Boolean);
  const body = JSON.stringify({
    FromEmailAddress: MAIL_FROM,
    Destination: { ToAddresses: toList },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: html ? { Data: html, Charset: 'UTF-8' } : undefined,
          Text: text ? { Data: text, Charset: 'UTF-8' } : undefined,
        },
      },
    },
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');   // 20260101T000000Z
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256hex(body);

  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n` +
    (SESSION_TOKEN ? `x-amz-security-token:${SESSION_TOKEN}\n` : '');
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date' + (SESSION_TOKEN ? ';x-amz-security-token' : '');
  const canonicalRequest = [
    'POST', '/v2/email/outbound-emails', '',
    canonicalHeaders, signedHeaders, payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${REGION}/${service}/aws4_request`;
  const toSign = [
    'AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest),
  ].join('\n');

  const signature = crypto.createHmac('sha256', signingKey(SECRET_KEY, dateStamp, REGION, service))
    .update(toSign, 'utf8').digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Amz-Date': amzDate,
        'X-Amz-Content-Sha256': payloadHash,
        Authorization: authorization,
        ...(SESSION_TOKEN ? { 'X-Amz-Security-Token': SESSION_TOKEN } : {}),
      },
      body,
      signal: controller.signal,
    });
    const txt = await res.text();
    if (!res.ok) return { ok: false, error: `SES ${res.status}: ${txt.slice(0, 300)}` };
    let id = '';
    try { id = JSON.parse(txt).MessageId || ''; } catch {}
    return { ok: true, messageId: id };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { sendEmail, configured, MAIL_TO, MAIL_FROM };
