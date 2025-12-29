# New Features Implementation Summary

## Overview
Added admin functionality and calendar views to the Room Booking System.

## Changes Made

### 1. Database Schema Updates

**File: `database/init.sql`**

- Added `role` field to users table (ENUM: 'user', 'admin')
- Created admin user account:
  - Username: `admin`
  - Email: `admin@example.com`
  - Password: `password123`
  - Role: `admin`

### 2. Backend API Enhancements

**File: `backend/server.js`**

#### New Middleware
- `authenticateAdmin`: Verifies user has admin role before allowing access to admin endpoints

#### Modified Endpoints
- `POST /api/auth/login`: Now returns user role in JWT token and response
- `GET /api/auth/me`: Now includes user role in response

#### New Admin Endpoints (Admin Only)
- `GET /api/admin/users`: Get list of all users
- `POST /api/admin/users`: Create new users with specified role
- `GET /api/admin/bookings`: Get all bookings from all users
- `DELETE /api/admin/bookings/:id`: Delete any booking (not restricted to own bookings)

#### New Calendar Endpoints (All Authenticated Users)
- `GET /api/calendar/bookings?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&room_id=ID`: 
  - Get bookings for a date range
  - Optional room filter
  - Returns booking details with room and user information
  
- `GET /api/calendar/availability?date=YYYY-MM-DD`:
  - Get availability summary for all rooms on a specific date
  - Shows booking counts and status for each room

### 3. Frontend Updates

**File: `frontend/index.html`**

#### New Tabs
- **Calendar View Tab**: Available to all users
  - Day, Week, and Month view options
  - Date selector
  - Room filter
  
- **Admin Panel Tab**: Only visible to admin users
  - User management section
  - Create new users form
  - All bookings management

**File: `frontend/app.js`**

#### New Functions

**Calendar Functions:**
- `loadCalendar()`: Initialize calendar view
- `renderCalendar()`: Render selected calendar view
- `renderDayView()`: Show detailed daily schedule for each room
- `renderWeekView()`: Show weekly grid with booking indicators
- `renderMonthView()`: Show monthly overview with booking counts

**Admin Functions:**
- `loadAdminPanel()`: Load admin data (users and all bookings)
- `displayUsers()`: Render users table
- `displayAdminBookings()`: Render all bookings table
- `adminDeleteBooking()`: Delete any booking

**File: `frontend/styles.css`**

#### New Styles
- Calendar view layouts (day/week/month grids)
- Admin panel tables
- Badge styles for status indicators
- Responsive design for calendar views
- Booking slot styling with color coding:
  - Red border: Other users' bookings
  - Blue border: Own bookings
  - Green: Available slots

### 4. Features in Detail

#### Calendar Views

**Day View:**
- Shows all rooms with their bookings for selected date
- Displays exact time slots
- Color-coded to distinguish own bookings from others
- Shows "Available all day" for free rooms

**Week View:**
- Table format with rooms as rows, days as columns
- Shows booking count per room per day
- Badge indicators (green = free, red = booked)
- Mini booking time indicators

**Month View:**
- Grid layout showing all days of the month
- Booking count for each day
- Highlighted days with bookings

#### Admin Panel

**User Management:**
- View all registered users with details:
  - ID, Username, Email, Role, Created date
- Create new users:
  - Set username, email, password
  - Assign role (user or admin)
- Role badges for easy identification

**Booking Management:**
- View ALL bookings system-wide
- See which user booked each room
- Delete any booking (with confirmation)
- Full audit trail with timestamps

### 5. Access Control

#### Regular Users Can:
- Book rooms
- View their own bookings
- Cancel their own bookings
- View calendar (all bookings from all users)
- See room availability

#### Admin Users Can Do Everything Above Plus:
- Create new users
- Assign admin roles
- View all users
- Delete any booking (not just their own)
- Full system oversight

### 6. Security Updates

- JWT tokens now include user role
- Role-based access control for admin endpoints
- Proper authentication checks on all protected routes
- Validation of user roles on frontend and backend

## Testing

All features have been tested:
-  Admin user login works
-  Regular user login works
-  Calendar API endpoints respond correctly
-  Role field added to database
-  Frontend displays correctly
-  Admin panel hidden from regular users

## API Examples

### Login as Admin
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

### Get Calendar Bookings
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/calendar/bookings?start_date=2025-12-28&end_date=2025-12-31"
```

### Create New User (Admin Only)
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "role": "user"
  }'
```

### Get All Users (Admin Only)
```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "http://localhost:3000/api/admin/users"
```

## Database Schema

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',  -- NEW
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## User Accounts

Total Users: 6 (5 regular users + 1 admin)

- admin / admin@example.com (ADMIN)
- user1 / user1@example.com (USER)
- user2 / user2@example.com (USER)
- user3 / user3@example.com (USER)
- user4 / user4@example.com (USER)
- user5 / user5@example.com (USER)

All passwords: `password123`

## Files Modified

1. `/database/init.sql` - Added role field and admin user
2. `/backend/server.js` - Added admin middleware and new endpoints
3. `/frontend/index.html` - Added calendar and admin panel tabs
4. `/frontend/app.js` - Added calendar and admin functionality
5. `/frontend/styles.css` - Added calendar and admin styling
6. `/README.md` - Updated documentation

## How to Use

1. **Stop existing containers:**
   ```bash
   docker compose down -v
   ```

2. **Start fresh with new features:**
   ```bash
   docker compose up -d
   ```

3. **Login and test:**
   - Regular user: Visit http://localhost, login as user1
   - Admin user: Visit http://localhost, login as admin
   
4. **Explore features:**
   - Book a room
   - View calendar in different modes
   - If admin: access admin panel to manage users and bookings

## Notes

- Calendar views show bookings from ALL users (not just your own)
- Own bookings are highlighted in blue in calendar view
- Admin panel tab only appears for admin users
- All calendar features work for both regular users and admins
- Regular users can see all bookings but can only delete their own
- Admins can delete any booking
