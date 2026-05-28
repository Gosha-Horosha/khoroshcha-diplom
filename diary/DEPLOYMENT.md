# Deployment Guide

This guide covers the deployment of the Diary App to production environments.

## Prerequisites

- Docker and Docker Compose installed on the server
- Domain name configured to point to your server
- SSL certificates for HTTPS

## Production Deployment Steps

### 1. Server Setup

Ensure your server meets the following requirements:
- Ubuntu 20.04+ or similar Linux distribution
- Minimum 2GB RAM, 2 CPU cores
- 20GB+ disk space
- Docker and Docker Compose installed

### 2. Environment Configuration

Create a production environment file:

```bash
cd diary/infra
cp .env.example .env.production
```

Edit `.env.production` with your production values:

```env
# Database
DB_USER=your_production_db_user
DB_PASSWORD=your_secure_password

# JWT
SECRET_KEY=your-very-secure-production-secret-key

# CORS
CORS_ORIGINS=["https://yourdomain.com"]
```

### 3. SSL Certificate Setup

Obtain SSL certificates for your domain and place them in `infra/nginx/ssl/`:

```bash
mkdir -p infra/nginx/ssl
# Copy your certificates to:
# infra/nginx/ssl/cert.pem
# infra/nginx/ssl/key.pem
```

### 4. Update Nginx Configuration

Edit `infra/nginx/nginx.prod.conf` and replace `yourdomain.com` with your actual domain name.

### 5. Deploy with Docker Compose

```bash
cd infra
# Set environment variables
export $(cat .env.production | xargs)

# Build and start services
docker-compose -f docker-compose.prod.yml up -d
```

### 6. Verify Deployment

Check if all services are running:
```bash
docker-compose -f docker-compose.prod.yml ps
```

Test the application:
- Frontend: https://yourdomain.com
- Backend API: https://yourdomain.com/api
- API Docs: https://yourdomain.com/api/docs

## Cloud Deployment

### AWS EC2 Deployment

1. Launch an EC2 instance with Docker pre-installed
2. Configure security groups to allow HTTP/HTTPS traffic
3. Follow the deployment steps above

### Docker Swarm / Kubernetes

For larger deployments, consider using orchestration tools:

#### Docker Swarm
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml diary
```

#### Kubernetes

Create Kubernetes manifests from the Docker Compose configuration using `kompose`:

```bash
kompose convert -f docker-compose.prod.yml
kubectl apply -f .
```

## Monitoring and Logging

### Application Logs

View logs for specific services:
```bash
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs nginx
```

### Database Backups

Set up automated PostgreSQL backups:

```bash
# Backup script
#!/bin/bash
pg_dump -h localhost -U your_user diary_db > backup_$(date +%Y%m%d).sql

# Add to crontab for daily backups
0 2 * * * /path/to/backup_script.sh
```

### Health Monitoring

Configure monitoring for:
- Database connection health
- API response times
- SSL certificate expiration
- Disk space usage

## Scaling Considerations

### Horizontal Scaling

For high traffic, consider:
- Load balancing multiple backend instances
- Database read replicas
- Redis caching layer
- CDN for static assets

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_diary_entries_user_id ON diary_entries(user_id);
CREATE INDEX idx_diary_entries_created_at ON diary_entries(created_at);
CREATE INDEX idx_users_username ON users(username);
```

## Security Hardening

### Environment Security

- Use strong passwords for database and JWT secrets
- Regularly update Docker images
- Configure firewall rules
- Enable automatic security updates

### Application Security

- Validate all user inputs
- Implement rate limiting
- Use HTTPS exclusively
- Regular security audits

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check PostgreSQL logs
   - Verify connection string in environment variables

2. **SSL certificate issues**
   - Verify certificate paths in nginx config
   - Check certificate expiration dates

3. **CORS errors**
   - Ensure CORS_ORIGINS includes your domain
   - Check nginx CORS headers configuration

### Performance Optimization

1. **Enable database connection pooling**
2. **Implement caching for frequent queries**
3. **Optimize frontend asset delivery**
4. **Use CDN for static resources**

## Backup and Recovery

### Regular Backups

1. Database backups (daily)
2. Application configuration backups
3. SSL certificate backups
4. Docker volume backups

### Disaster Recovery

Maintain:
- Off-site backups
- Deployment scripts
- Environment configuration
- SSL certificates

## Updates and Maintenance

### Application Updates

1. Pull latest code changes
2. Rebuild Docker images
3. Run database migrations
4. Restart services

```bash
cd infra
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database Maintenance

Regularly:
- Update statistics: `ANALYZE;`
- Vacuum database: `VACUUM FULL;`
- Check for long-running queries

This deployment guide provides a foundation for running Diary App in production. Adjust based on your specific infrastructure and requirements.