# Starting the Room Booking System from Scratch

This guide provides all the commands needed to start the Room Booking System project from a clean state.

## Prerequisites

Before starting, verify that Docker and Docker Compose are installed:

```bash
docker --version
docker compose version
```


## Complete Fresh Start Workflow

**Navigate to Project Directory**

### 1. Clean Up (Stop and Remove Everything)
From each directory that contains a **docker-compose.yml** (or compose.yaml):

```bash
# This command:
# - Stops all running containers created by Compose
# - Removes containers created by Compose
# - Removes networks created by Compose
# - Removes volumes (including database data) declared in the Compose file
# - Remove images built by Compose
docker compose down \
  --volumes \
  --rmi all \
  --remove-orphans


#Stop and remove all containers (Compose or not):
docker stop $(docker ps -aq)

# remove everything
docker rm -f $(docker ps -aq)

# Remove all images
# Removes:
#  - pulled images
#  - locally built images
#  - Compose-built images
docker rmi -f $(docker images -aq)

# Remove all volumes (DATA LOSS)
# Removes: named volumes AND anonymous volumes
# NOTE: If a volume is in use, make sure containers are removed first.
docker volume rm $(docker volume ls -q)

# Remove all custom networks
# Default networks (bridge, host, none) will not be removed.
docker network rm $(docker network ls -q)

# One-shot cleanup (recommended)
# This removes:
#   - stopped containers
#   - unused images
#   - unused networks
#   - unused volumes
# This is usually enough for full cleanup.
docker system prune -a --volumes

############# Nuclear option (full reset)
# Leaves you with:
#   - empty Docker engine
#   - no containers
#   - no images
#   - no volumes
#   - no custom networks
docker stop $(docker ps -aq) 2>/dev/null
docker rm -f $(docker ps -aq) 2>/dev/null
docker rmi -f $(docker images -aq) 2>/dev/null
docker volume rm $(docker volume ls -q) 2>/dev/null
docker network rm $(docker network ls -q) 2>/dev/null

# Verify cleanup
# Everything should be empty (except default networks).
docker ps -a
docker images
docker volume ls
docker network ls
```

In summary:
```bash
# Recommended approach (most cases) for local dev:
docker compose down --volumes --rmi all --remove-orphans
docker system prune -a --volumes
```

### 2. Build and Start All Services

```bash
# This command:
# - Rebuilds all Docker images
# - Creates and starts all containers in detached mode
# - Initializes the database with the schema and default data
docker compose up -d --build
```

### 3. Verify All Services Are Running

```bash
docker compose ps
```

You should see three services running:
- `room-booking-mysql-1` (database)
- `room-booking-backend-1` (API server)
- `room-booking-nginx-1` (web server)

The -1 suffix in container names like room-booking-mysql-1 is Docker Compose's automatic naming convention.
Docker Compose creates container names using this format:
```console
<project_name>-<service_name>-<replica_number>
```
Where: <br>
- project_name: room-booking (the directory name by default)
- service_name: mysql, backend, or nginx (from docker-compose.yml)
- replica_number: 1 (the first instance of that service). The -1 indicates this is the first (and only) replica of each service. If you scaled a service to run multiple instances, you'd see -2, -3, etc.


### 4. View Service Logs

To view logs from all services:

```bash
docker compose logs -f
```

To view logs from a specific service:

```bash
docker compose logs -f backend
docker compose logs -f mysql
docker compose logs -f nginx
```

Press `Ctrl+C` to stop following logs.

## Access the Application

Once all services are running, access the application at:

```
http://localhost
```

### Default Credentials

- **Admin Account**: `admin` / `password123`
- **Regular User**: `user1` / `password123`

## Common Management Commands

### Stop All Services

```bash
docker compose stop
```

### Start Stopped Services

```bash
docker compose start
```

### Restart All Services

```bash
docker compose restart
```

### Restart a Specific Service

```bash
docker compose restart backend
docker compose restart mysql
docker compose restart nginx
```

### Rebuild and Restart a Specific Service

```bash
docker compose up -d --build backend
docker compose up -d --build nginx
```

### View Container Status

```bash
docker compose ps
```

### View Resource Usage

```bash
docker stats
```

## Database Access

### Connect to MySQL Database

```bash
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking
```

### Run SQL Commands

Once connected to MySQL, you can run queries:

```sql
-- List all users
SELECT id, username, email, role FROM users;

-- List all rooms
SELECT * FROM rooms;

-- List all bookings
SELECT * FROM bookings;

-- Exit MySQL
exit;
```

### Execute SQL File

```bash
docker compose exec -T mysql mysql -u bookinguser -pbookingpass room_booking < database/init.sql
```

## Container Shell Access

### Access Backend Container Shell

```bash
docker compose exec backend sh
```

### Access MySQL Container Shell

```bash
docker compose exec mysql bash
```

### Access Nginx Container Shell

```bash
docker compose exec nginx sh
```

## Troubleshooting Commands

### Check Container Logs

```bash
# All containers
docker compose logs

# Specific container with timestamps
docker compose logs -f --timestamps backend
```

### Inspect Container

```bash
docker compose exec backend ps aux
docker compose exec backend env
```

### Check Network Connectivity

```bash
# From backend to database
docker compose exec backend ping mysql

# Test database connection
docker compose exec backend nc -zv mysql 3306
```

### Verify File Permissions

```bash
docker compose exec nginx ls -la /usr/share/nginx/html
docker compose exec backend ls -la /app
```

### Test API Endpoints

```bash
# Health check
curl http://localhost/api/

# Login endpoint
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

### Check Frontend Files

```bash
docker compose exec nginx cat /etc/nginx/nginx.conf
docker compose exec nginx ls -la /usr/share/nginx/html
```

### Database Troubleshooting

```bash
# Check database status
docker compose exec mysql mysqladmin -u root -prootpassword status

# Check database tables
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking -e "SHOW TABLES;"

# Check user permissions
docker compose exec mysql mysql -u root -prootpassword -e "SHOW GRANTS FOR 'bookinguser'@'%';"
```

### Complete Reset

If you need to completely reset the project:

```bash
# Stop and remove everything
docker compose down -v

# Remove all Docker images for this project
docker compose down --rmi all -v

# Rebuild and start fresh
docker compose up -d --build
```

## Expected Startup Times

- **Database (MySQL)**: 5-10 seconds
- **Backend (Node.js)**: 3-5 seconds
- **Nginx**: 1-2 seconds
- **Total**: Approximately 15-20 seconds for a clean start

## Verify Successful Startup

1. Check all services are healthy:
   ```bash
   docker compose ps
   ```

2. Check backend is responding:
   ```bash
   curl http://localhost/api/
   ```

3. Access the web interface:
   ```
   http://localhost
   ```

4. Try logging in with admin credentials:
   - Username: `admin`
   - Password: `password123`

If all steps complete successfully, the Room Booking System is ready to use.
