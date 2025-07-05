# Deployment Strategies

This document explains the different deployment strategies available for the Smart Summary App to minimize or eliminate downtime during updates.

## Current Problem

The original `update-app.sh` script causes **complete downtime** during deployments because it:

1. Stops all containers (`docker-compose down`)
2. Removes old images
3. Builds new images
4. Starts new containers

During steps 1-3, your website is completely offline.

## Available Solutions

### 1. Rolling Update (Recommended) - `update-app-rolling.sh`

**Downtime**: ~5-10 seconds per service
**Complexity**: Low
**Rollback**: Manual

This approach updates one service at a time:

1. Build new images
2. Update backend service (keeps old running until new is healthy)
3. Update frontend service (keeps old running until new is healthy)
4. Clean up old images

```bash
# Use rolling update (now default in deploy.sh)
./deploy.sh

# Or run directly
./update-app-rolling.sh
```

### 2. Zero-Downtime Blue-Green - `zero-downtime-deploy.sh`

**Downtime**: ~1-2 seconds (traffic switching only)
**Complexity**: High
**Rollback**: Automatic on failure

This approach runs new containers alongside old ones:

1. Build new images
2. Start new containers on different ports (3001, 8001)
3. Test new containers thoroughly
4. Switch traffic by stopping old and starting new on original ports
5. Clean up temporary containers

```bash
# Use zero-downtime deployment
./zero-downtime-deploy.sh
```

### 3. Original Method - `update-app.sh`

**Downtime**: 30-60 seconds
**Complexity**: Low
**Use Case**: Development/testing only

```bash
# Only use for development - causes downtime!
./update-app.sh
```

## Deployment Flow

### Production (Recommended)

```bash
# Clone/pull latest code
git pull origin main

# Deploy with minimal downtime
./deploy.sh
```

### For Zero-Downtime Requirements

```bash
# Clone/pull latest code
git pull origin main

# Deploy with zero downtime
./zero-downtime-deploy.sh
```

## Monitoring During Deployment

All deployment scripts include comprehensive health checks:

- Backend health endpoint (`/health`)
- Frontend availability
- API functionality tests
- Automatic rollback on failure

## Troubleshooting

### If Rolling Update Fails

1. Check logs: `docker-compose logs`
2. Verify health endpoints are responding
3. Check for port conflicts
4. Ensure OPENAI_API_KEY is available

### If Zero-Downtime Deployment Fails

1. Check for port conflicts (3001, 8001)
2. Verify sufficient resources for running both versions
3. Check temporary files are cleaned up
4. Review cleanup process in the script

### Emergency Rollback

If deployment fails and services are down:

```bash
# Quick restore with original method
docker-compose down
docker-compose up -d
```

## Best Practices

1. **Always test deployments in staging first**
2. **Use rolling updates for most deployments**
3. **Use zero-downtime for critical production updates**
4. **Monitor health endpoints during deployment**
5. **Have a rollback plan ready**
6. **Keep deployment scripts updated**

## Script Comparison

| Feature        | update-app.sh | update-app-rolling.sh | zero-downtime-deploy.sh |
| -------------- | ------------- | --------------------- | ----------------------- |
| Downtime       | 30-60s        | 5-10s                 | 1-2s                    |
| Complexity     | Low           | Low                   | High                    |
| Resource Usage | Low           | Medium                | High                    |
| Rollback       | Manual        | Manual                | Automatic               |
| Best For       | Development   | Production            | Critical Production     |
