#!/usr/bin/env bash
set -euo pipefail
test "$(id -u)" = 0
cd /home/appuser/deploy-production
test -s /etc/letsencrypt/live/137.184.155.228/fullchain.pem
test -s /var/www/electronics-store/dist/index.html
install -m 644 electronics-store.service /etc/systemd/system/electronics-store.service
install -m 644 electronics-cert-renew.service /etc/systemd/system/electronics-cert-renew.service
install -m 644 electronics-cert-renew.timer /etc/systemd/system/electronics-cert-renew.timer
systemctl daemon-reload
pm2 stop electronics-store
systemctl enable --now electronics-store.service
healthy=0
for attempt in $(seq 1 30); do
    if curl --fail --silent http://127.0.0.1:3000/api/health; then healthy=1; break; fi
    sleep 2
done
if [ "$healthy" != 1 ]; then
    systemctl stop electronics-store.service
    pm2 start electronics-store
    echo 'New service failed; restored PM2 process. HTTPS not activated.'
    exit 1
fi
install -m 644 nginx-https.conf /etc/nginx/sites-available/electronics-store
nginx -t
systemctl reload nginx
systemctl enable --now electronics-cert-renew.timer
pm2 save
systemctl disable pm2-root.service
systemctl is-active electronics-store.service nginx
systemctl list-timers electronics-cert-renew.timer --no-pager
curl --fail --silent https://137.184.155.228/api/health
printf '\nPRODUCTION_ACTIVE\n'
