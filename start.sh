#!/bin/bash
# Restart CRED testnet demo: backend on :8787 + cloudflared quick tunnel
cd "$(dirname "$0")"
pkill -f "node server.js"; pkill -f "cloudflared tunnel"; sleep 1
nohup node server.js > server.log 2>&1 &
[ "$TUNNEL" = 1 ] && nohup ~/cloudflared tunnel --no-autoupdate --protocol http2 --url http://localhost:8787 > tunnel.log 2>&1 &
sleep 8; [ "$TUNNEL" = 1 ] && grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" tunnel.log | head -1
