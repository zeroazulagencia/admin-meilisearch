#!/bin/bash
# Reprocess biury-pagos errors in batches of 50 until done
URL="http://127.0.0.1:8988/api/custom-module8/biury-pagos/reprocess/"
while true; do
  remaining=$(mysql -N -e "SELECT COUNT(*) FROM admin_dworkers.modulos_biury_8_logs WHERE status='error'" 2>/dev/null)
  if [ "$remaining" -le 0 ]; then
    echo "[$(date)] No more errors. Done."
    break
  fi
  echo "[$(date)] Starting batch. Remaining: $remaining"
  curl -s -X POST "$URL" -H 'Content-Type: application/json' -d '{"limit":50}' --max-time 300 > /dev/null
  if [ $? -ne 0 ]; then
    echo "[$(date)] curl failed, retrying in 10s"
    sleep 10
  fi
  # small pause between batches
  sleep 2
done
