FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=80 DATA_DIR=/data
COPY package.json ./
COPY server.js ./
COPY lib ./lib
COPY seed ./seed
COPY pages ./pages
COPY public ./public
RUN mkdir -p /data && chown -R node:node /data
USER node
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:80/health || exit 1
CMD ["node", "server.js"]
