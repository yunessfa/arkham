#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
. ./scripts/demo-env.sh
if [ ! -x .venv/bin/python ]; then python3 -m venv .venv; fi
if [ "${ARKHAM_SKIP_INSTALL:-0}" != "1" ]; then
  .venv/bin/python -m pip install -r backend/requirements.txt
  (cd frontend && npm ci && npm run build)
fi
.venv/bin/python backend/manage.py migrate --noinput
.venv/bin/python backend/manage.py setup_roles
.venv/bin/python backend/manage.py seed_demo --confirm-demo
printf '\nDemo: %s\nManagement: %s/manage\nCreate your admin in another terminal: ./scripts/create-demo-admin.sh\n' "$PUBLIC_ORIGIN" "$PUBLIC_ORIGIN"
.venv/bin/python backend/manage.py runserver "127.0.0.1:${DEMO_PORT:-8000}" --noreload
