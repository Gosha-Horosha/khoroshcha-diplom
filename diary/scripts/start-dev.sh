#!/bin/bash

# Script to start the development environment

echo "Starting Diary App development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Navigate to infra directory
cd infra

# Start services
echo "Starting services with Docker Compose..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "Checking service status..."
docker-compose ps

echo ""
echo "Diary App is now running!"
echo "Frontend: http://localhost"
echo "Backend API: http://localhost/api"
echo "API Documentation: http://localhost/api/docs"
echo ""
echo "To stop the services, run: docker-compose down"