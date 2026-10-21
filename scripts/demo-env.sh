#!/bin/sh
# Source only, from the project root. Development data must never be exposed publicly.
set -eu
if [ ! -f .demo-secret ]; then
  umask 077
  python3 -c 'import secrets; print(secrets.token_urlsafe(64))' > .demo-secret
fi
export SECRET_KEY="$(cat .demo-secret)"
export DEBUG=1 DEMO_MODE=1 DEV_SQLITE=1 PAYMENT_PROVIDER=mock
export PUBLIC_ORIGIN="http://127.0.0.1:${DEMO_PORT:-8000}"
export ALLOWED_HOSTS=127.0.0.1,localhost,testserver
export REDIS_URL=""
