#!/bin/bash
set -e

# Run migrations
echo "Runnning migrations..."
alembic upgrade head

# Start server
echo "Starting server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
