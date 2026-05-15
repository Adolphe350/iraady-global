FROM nginx:alpine

COPY . /usr/share/nginx/html/

RUN cat >/etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    autoindex off;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
