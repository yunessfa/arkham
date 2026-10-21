#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
. ./scripts/demo-env.sh
if [ ! -x .venv/bin/python ]; then echo 'Run ./scripts/run-demo.sh first.'; exit 1; fi
.venv/bin/python backend/manage.py createsuperuser
