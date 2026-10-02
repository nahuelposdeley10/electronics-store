#!/usr/bin/env bash
set -euo pipefail
test "$(id -u)" = 0
cd /home/appuser/deploy-production
backup="/root/electronics-deploy-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -m 700 "$backup"
cp -a /etc/nginx "$backup/nginx"
cp -a /var/www/electronics-store/.env "$backup/env"
cp -a /var/www/electronics-store/dist "$backup/dist"
printf 'BACKUP=%s\n' "$backup"
npm install --prefix /opt/electronics-runtime node@22 --omit=dev
/opt/electronics-runtime/node_modules/node/bin/node --version
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y python3-venv
python3 -m venv /opt/electronics-certbot
/opt/electronics-certbot/bin/pip install 'certbot>=5.4'
install -d -o appuser -g appuser -m 755 /var/www/letsencrypt
install -m 644 nginx-http.conf /etc/nginx/sites-available/electronics-store
ln -s /etc/nginx/sites-available/electronics-store /etc/nginx/sites-enabled/electronics-store
nginx -t
systemctl reload nginx
chown appuser:appuser /var/www/electronics-store/.env
chmod 600 /var/www/electronics-store/.env
printf 'BOOTSTRAP_OK\n'
