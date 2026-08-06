#!/usr/bin/env bash

set -Eeuo pipefail

API_HOST="api.103-175-221-2.sslip.io"
BACKEND_PORT="5000"
CERTBOT_ROOT="/var/www/certbot"
NGINX_SITE="/etc/nginx/sites-available/litepos-api"
NGINX_LINK="/etc/nginx/sites-enabled/litepos-api"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Jalankan dengan sudo: sudo bash scripts/configure-vps-https.sh"
  exit 1
fi

echo "=== LitePOS Warna Warni: konfigurasi HTTPS ==="
echo "Hostname API: ${API_HOST}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx certbot

install -d -m 0755 "${CERTBOT_ROOT}/.well-known/acme-challenge"

cat > "${NGINX_SITE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${API_HOST};

    location /.well-known/acme-challenge/ {
        root ${CERTBOT_ROOT};
    }

    location / {
        return 308 https://\$host\$request_uri;
    }
}
EOF

ln -sfn "${NGINX_SITE}" "${NGINX_LINK}"
nginx -t
systemctl enable --now nginx
systemctl reload nginx

certbot certonly \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --webroot \
  --webroot-path "${CERTBOT_ROOT}" \
  --domain "${API_HOST}" \
  --keep-until-expiring

cat > "${NGINX_SITE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${API_HOST};

    location /.well-known/acme-challenge/ {
        root ${CERTBOT_ROOT};
    }

    location / {
        return 308 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${API_HOST};

    ssl_certificate /etc/letsencrypt/live/${API_HOST}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${API_HOST}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 10m;

    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location / {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;
    }
}
EOF

nginx -t
systemctl reload nginx

install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'EOF'
#!/bin/sh
systemctl reload nginx
EOF
chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

if systemctl list-unit-files --type=timer | grep -q '^certbot.timer'; then
  systemctl enable --now certbot.timer
fi

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q '^Status: active'; then
  ufw allow OpenSSH
  ufw allow 'Nginx Full'
fi

curl --fail --silent --show-error \
  --resolve "${API_HOST}:443:127.0.0.1" \
  "https://${API_HOST}/api/health"
echo
echo "=== HTTPS BERHASIL ==="
echo "API_URL=https://${API_HOST}"
