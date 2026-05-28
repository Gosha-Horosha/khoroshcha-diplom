#!/bin/bash

# Script to run database migrations

echo "Running database migrations..."

# Navigate to backend directory
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if not already installed
if [ ! -f "venv/bin/alembic" ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Run migrations
echo "Running Alembic migrations..."
alembic upgrade head

echo "Migrations completed successfully."