#!/usr/bin/env bash
set -euo pipefail
test "$(id -u)" = 0
/opt/electronics-certbot/bin/certbot certonly --non-interactive --agree-tos --register-unsafely-without-email --preferred-profile shortlived --webroot --webroot-path /var/www/letsencrypt --ip-address 137.184.155.228
tar --exclude=node_modules --exclude=.git --exclude=dist -czf "/root/electronics-source-$(date +%Y%m%d-%H%M%S).tar.gz" -C /var/www/electronics-store .
chown -R appuser:appuser /var/www/electronics-store
pm2 jlist | node -e 'let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>console.log(JSON.stringify(JSON.parse(s).map(x=>({id:x.pm_id,name:x.name,path:x.pm2_env.pm_exec_path})))));'
printf 'CERTIFICATE_OK\n'
