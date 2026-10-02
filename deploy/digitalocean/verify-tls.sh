#!/usr/bin/env bash
set -euo pipefail
/opt/electronics-certbot/bin/certbot renew --dry-run --run-deploy-hooks --deploy-hook 'nginx -t && systemctl reload nginx'
systemctl restart electronics-store.service
for attempt in $(seq 1 30); do
    if curl --fail --silent https://137.184.155.228/api/health; then
        printf '\nRESTART_AND_TLS_OK\n'
        exit 0
    fi
    sleep 2
done
exit 1
