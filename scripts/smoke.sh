#!/usr/bin/env bash
set -euo pipefail

BASE=${BASE:-http://127.0.0.1:3004}
TOKEN=${AUTH_TOKEN:-}

hdr=("-H" "Content-Type: application/json")
if [[ -n "$TOKEN" ]]; then
  hdr+=("-H" "Authorization: Bearer $TOKEN")
fi

echo "[1] healthz"
curl -sS "$BASE/healthz" | cat
echo

echo "[2] positions (auth required if server configured)"
set +e
curl -sS -i "$BASE/api/positions" "${hdr[@]}" | head -n 1 | cat
set -e

echo "[3] trade invalid symbol -> 400"
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/trade" "${hdr[@]}" \
  -d '{"symbol":"INVALID","notional":10,"leverage":5,"side":"BUY"}'

echo "[4] trade invalid leverage -> 400"
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/trade" "${hdr[@]}" \
  -d '{"symbol":"BTCUSDT","notional":10,"leverage":0,"side":"BUY"}'

echo "[5] trade invalid notional -> 400"
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/trade" "${hdr[@]}" \
  -d '{"symbol":"BTCUSDT","notional":0,"leverage":5,"side":"BUY"}'

echo "[6] trade valid-ish (ETHUSDT 50 USDT, may fail upstream without keys)"
curl -sS -i -X POST "$BASE/api/trade" "${hdr[@]}" \
  -d '{"symbol":"ETHUSDT","notional":50,"leverage":10,"side":"BUY"}' | head -n 1 | cat
echo
echo "Done."


