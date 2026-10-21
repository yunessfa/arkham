# Local process environment only; never use these settings in production.
export DEBUG=1
export SECRET_KEY="$(cat /data/arkham/.local-secret)"
export POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55432 POSTGRES_USER=arkham POSTGRES_DB=arkham_utf8
export PAYMENT_PROVIDER=mock PUBLIC_ORIGIN=http://127.0.0.1:8000

export DEMO_MODE=1
