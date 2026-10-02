#!/usr/bin/env bash
set -euo pipefail
cd /home/appuser/deploy-production
curl --fail --location --silent --show-error https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2404-x86_64-100.19.1.tgz -o mongo-tools.tgz
echo 'f34b84a67ab96b4ff52571ec5d15e2148d96cb140b1ea9ef8c29ac33c48e3480  mongo-tools.tgz' | sha256sum --check
install -d -m 755 /opt/electronics-mongodb /usr/local/lib/electronics-store
tar -xzf mongo-tools.tgz --strip-components=1 -C /opt/electronics-mongodb
install -d -o appuser -g appuser -m 700 /var/backups/electronics-store
install -m 644 backup.cjs /usr/local/lib/electronics-store/backup.cjs
install -m 644 electronics-backup.service /etc/systemd/system/electronics-backup.service
install -m 644 electronics-backup.timer /etc/systemd/system/electronics-backup.timer
systemctl daemon-reload
systemctl start electronics-backup.service
systemctl enable --now electronics-backup.timer
journalctl -u electronics-backup.service -n 6 --no-pager
