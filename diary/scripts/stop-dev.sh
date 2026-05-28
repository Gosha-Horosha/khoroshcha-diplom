#!/bin/bash

# Script to stop the development environment

echo "Stopping Diary App development environment..."

# Navigate to infra directory
cd infra

# Stop services
echo "Stopping services..."
docker-compose down

echo "All services have been stopped."