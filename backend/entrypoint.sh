#!/bin/bash
set -e

# Ensure encryption keypair exists
echo "Checking encryption keypair..."
python -c "from app.services.crypto import ensure_keypair; ensure_keypair()"

# Run migrations
echo "Running migrations..."
alembic upgrade head

# Start server
echo "Starting server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
