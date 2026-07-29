#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Jalankan script ini dengan sudo."
  exit 1
fi

APP_DIR="${APP_DIR:-/home/andre/apps/konfirmasi}"
COLLECTOR="${APP_DIR}/scripts/collect-disk-health.py"

if [[ ! -f "${COLLECTOR}" ]]; then
  echo "Collector tidak ditemukan: ${COLLECTOR}"
  exit 1
fi

apt-get update
apt-get install -y smartmontools
install -d -m 0755 /var/lib/konfirmasi
chmod 0755 "${COLLECTOR}"

cat >/etc/systemd/system/konfirmasi-disk-health.service <<EOF
[Unit]
Description=Pemeriksaan kesehatan HDD dan SSD aplikasi Konfirmasi
After=local-fs.target

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 ${COLLECTOR}
User=root
Group=root
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=read-only
ProtectSystem=strict
ReadWritePaths=/var/lib/konfirmasi
EOF

cat >/etc/systemd/system/konfirmasi-disk-health.timer <<'EOF'
[Unit]
Description=Jadwal pemeriksaan kesehatan disk aplikasi Konfirmasi

[Timer]
OnBootSec=2min
OnUnitActiveSec=10min
Persistent=true
Unit=konfirmasi-disk-health.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now konfirmasi-disk-health.timer
systemctl start konfirmasi-disk-health.service

echo "Pemeriksaan kesehatan disk sudah aktif."
systemctl --no-pager status konfirmasi-disk-health.timer
