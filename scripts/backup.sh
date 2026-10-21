#!/bin/sh
set -eu
umask 077
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "backups/database-$stamp.dump"
docker compose exec -T backend tar -C /app/backend -czf - media > "backups/media-$stamp.tar.gz"
printf 'Backup created: %s\n' "$stamp"
