# Room Booking System

This is a Docker-based room booking application with a three-tier architecture with Nginx reverse proxy frontend, Node.js backend, and MySQL database. <br>
The application:
- Uses Docker Compose for orchestration with proper service dependencies
- Implements health checks for MySQL to ensure backend waits for database readiness
- RESTful API design with JWT authentication
- Proper database connection pooling

## Features

- **10 Rooms** available for booking
- **5 Users** with authentication  
- **Admin User** with special privileges
- **Time-based bookings** (15 minutes to 4 hours per day)
- **Conflict prevention** - no double bookings
- **Calendar Views** - Day, Week, and Month views to see all bookings
- **Responsive web interface**
- **JWT authentication**
- **Admin Panel** - User management, room management, and booking oversight
- **Room Management** - Admin can add and remove rooms
- **Booking Duration Settings** - Admin can configure min/max booking durations
- **Docker Compose** for easy deployment

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1. **Clone or navigate to the project directory:**
   ```bash
   cd room-booking
   ```

2. **Create environment file (optional):**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env if you want to change default values
   cd ..
   ```

3. **Start the application:**
   ```bash
   docker compose up -d
   ```

4. **Wait for services to be ready** (about 30-60 seconds for database initialization)

5. **Access the application:**
   - Open your browser and go to: http://localhost

6. **Login with demo credentials:**
   - Regular Users: `user1`, `user2`, `user3`, `user4`, or `user5`
   - Admin User: `admin`
   - Password: `password123` (for all users)

## Services

The application consists of three main services:

- **Nginx** (Port 80) - Web server and reverse proxy
- **Backend API** (Port 3000) - Node.js/Express REST API
- **MySQL** (Port 3306) - Database

## Usage

### Booking a Room

1. Login with your credentials
2. Select a room from the dropdown
3. Choose a date and time
4. Click "Book Room"
5. View your bookings in the "My Bookings" tab

### Calendar View

1. Click on the "Calendar View" tab
2. Choose your view: Day, Week, or Month
3. Select a date to view bookings
4. Optionally filter by room
5. See all bookings with availability status
   - **Day View**: Detailed timeline for each room
   - **Week View**: Grid showing daily bookings
   - **Month View**: Monthly overview with booking counts

### Admin Features (Admin Users Only)

1. Login with admin credentials
2. Access the "Admin Panel" tab
3. **User Management**:
   - Create new users
   - Assign user or admin roles
   - View all registered users
   - Delete users (except yourself)
4. **Room Management**:
   - Add new rooms with room number, name, and capacity
   - View all rooms with their details
   - Delete rooms (only if they have no bookings)
5. **Booking Duration Settings**:
   - Set minimum booking duration (5-120 minutes)
   - Set maximum booking duration (30-1440 minutes/24 hours)
   - Duration constraints apply to all users
6. **Booking Management**:
   - View all bookings from all users
   - Delete any booking (not just your own)

### Booking Rules

- Minimum duration: 15 minutes
- Maximum duration: 4 hours
- Bookings must be within the same day
- Cannot book a room that's already reserved
- Only the user who made the booking can cancel it

## Available Rooms

1. R101 - Conference Room A (10 people)
2. R102 - Conference Room B (8 people)
3. R103 - Meeting Room 1 (6 people)
4. R104 - Meeting Room 2 (6 people)
5. R105 - Huddle Room 1 (4 people)
6. R106 - Huddle Room 2 (4 people)
7. R107 - Board Room (12 people)
8. R108 - Training Room (15 people)
9. R109 - Interview Room 1 (3 people)
10. R110 - Interview Room 2 (3 people)

## User Accounts

**Regular Users:**
- user1@example.com
- user2@example.com
- user3@example.com
- user4@example.com
- user5@example.com

**Admin User:**
- admin@example.com

All users have the password: `password123`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Rooms
- `GET /api/rooms` - List all rooms
- `GET /api/rooms/:roomId/availability?date=YYYY-MM-DD` - Check room availability

### Bookings
- `GET /api/bookings` - Get user's bookings
- `POST /api/bookings` - Create a new booking
- `DELETE /api/bookings/:id` - Cancel a booking

### Calendar
- `GET /api/calendar/bookings?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&room_id=ID` - Get bookings for calendar view
- `GET /api/calendar/availability?date=YYYY-MM-DD` - Get room availability summary

### Settings
- `GET /api/settings` - Get current booking duration settings (all users)

### Admin (Requires Admin Role)
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create a new user
- `DELETE /api/admin/users/:id` - Delete a user
- `GET /api/admin/rooms` - Get all rooms (included in users endpoint)
- `POST /api/admin/rooms` - Create a new room
- `DELETE /api/admin/rooms/:id` - Delete a room
- `GET /api/admin/settings` - Get booking duration settings
- `PUT /api/admin/settings` - Update booking duration settings
- `GET /api/admin/bookings` - Get all bookings from all users
- `DELETE /api/admin/bookings/:id` - Delete any booking

## Managing the Application

### View logs
```bash
docker compose logs -f
```

### Stop the application
```bash
docker compose down
```

### Stop and remove all data (including database)
```bash
docker compose down -v
```

### Restart a specific service
```bash
docker compose restart backend
docker compose restart nginx
docker compose restart mysql
```

### Access MySQL database
```bash
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking
```

## Troubleshooting

### Cannot connect to the application
- Make sure all containers are running: `docker compose ps`
- Check logs: `docker compose logs`
- Ensure ports 80, 3000, and 3306 are not in use

### Database connection errors
- Wait for MySQL to fully initialize (check with `docker compose logs mysql`)
- Restart the backend: `docker compose restart backend`

### Login fails
- Check that users were created in the database
- Verify the password hashes in the database
- Clear browser cache: Ctrl+Shift+Delete
- Try hard reload: Ctrl+Shift+R

### Frontend changes not visible
- Rebuild nginx container: `docker compose build nginx && docker compose up -d nginx`
- Clear browser cache completely
- Try in incognito window

### Comprehensive Troubleshooting
For detailed troubleshooting steps, commands, and solutions to common issues, see [troubleshooting4.md](troubleshooting4.md)

## Development

### Modify backend code
The backend code is mounted as a volume. Changes to files in `./backend` will require a container restart:
```bash
docker compose restart backend
```

### Modify frontend code
The frontend is served by Nginx. Changes to files in `./frontend` require rebuilding the nginx container:
```bash
docker compose build nginx
docker compose up -d nginx
```
Then clear browser cache (Ctrl+Shift+Delete) and hard reload (Ctrl+Shift+R).

### Database changes
Modify `./database/init.sql` and recreate the database:
```bash
docker compose down -v
docker compose up -d
```

### Clean all project resources
To completely remove all Docker resources for this project (containers, volumes, networks, and images):
```bash
# Stop and remove containers and volumes
docker compose down -v

# Remove project-specific images
docker rmi room_booking_api room_booking_nginx

# Remove dangling images
docker image prune -f

# Remove project network (if not auto-removed)
docker network rm docker-example_booking_network 2>/dev/null || true
```

Or use this single command to clean everything:
```bash
docker compose down -v --rmi all && docker system prune -f
```

## Project Structure

```
docker-example/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── nginx/
│   └── nginx.conf
└── database/
    ├── init.sql
    └── update_passwords.sql
```

## Security Notes

**For production use:**
- Change the JWT secret in the environment variables
- Use strong passwords for MySQL
- Implement HTTPS with SSL certificates
- Use environment-specific configuration
- Implement rate limiting
- Add input validation and sanitization
- Use secrets management

## License

MIT
