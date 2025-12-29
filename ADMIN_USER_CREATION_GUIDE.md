# Admin User Creation Feature Guide

## Overview
The admin user creation feature allows administrators to add new users to the Room Booking System, including creating additional admin users.

## Feature Capabilities

### What Admins Can Do:
 Create new regular users
 Create new admin users
 Set username, email, and password for new users
 Assign roles (user or admin)
 View all users in the system
 See role badges for easy identification

### Security Features:
🔒 Only users with admin role can create users
🔒 Regular users get "Access denied" error
🔒 Passwords are hashed with bcrypt before storage
🔒 JWT tokens include role for authorization
🔒 Duplicate username/email validation

## How to Use (Web Interface)

### Step 1: Login as Admin
1. Navigate to http://localhost
2. Login with admin credentials:
   - Username: `admin`
   - Password: `password123`

### Step 2: Access Admin Panel
1. Click on the **"Admin Panel"** tab (only visible to admins)
2. You'll see two sections:
   - User Management (with create form)
   - All Bookings Management

### Step 3: Create New User
1. In the "Create New User" form, fill in:
   - **Username**: Unique username (required)
   - **Email**: Valid email address (required)
   - **Password**: Password for the new user (required)
   - **Role**: Select either "User" or "Admin" (default: User)

2. Click **"Create User"** button

3. On success:
   - Green success message appears
   - Form is reset
   - User list refreshes automatically
   - New user appears in the table

4. On error:
   - Red error message shows the issue
   - Common errors:
     - "Username or email already exists"
     - Missing required fields

### Step 4: Verify User Creation
1. Check the "All Users" table below the form
2. New user should appear with:
   - ID, Username, Email
   - Role badge (blue for User, red for Admin)
   - Created timestamp

## How to Use (API)

### Authentication
First, get an admin token:

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)
```

### Create Regular User

```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "role": "user"
  }'
```

**Success Response:**
```json
{
  "id": 7,
  "username": "newuser",
  "email": "newuser@example.com",
  "role": "user",
  "message": "User created successfully."
}
```

### Create Admin User

```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin2",
    "email": "admin2@example.com",
    "password": "admin123",
    "role": "admin"
  }'
```

**Success Response:**
```json
{
  "id": 8,
  "username": "admin2",
  "email": "admin2@example.com",
  "role": "admin",
  "message": "User created successfully."
}
```

### View All Users

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/admin/users
```

**Response:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "created_at": "2025-12-28T10:00:00.000Z"
  },
  {
    "id": 2,
    "username": "user1",
    "email": "user1@example.com",
    "role": "user",
    "created_at": "2025-12-28T10:00:00.000Z"
  }
]
```

## Error Handling

### Duplicate Username or Email
**Request:**
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"test@example.com","password":"test123"}'
```

**Response:**
```json
{
  "error": "Username or email already exists."
}
```
**HTTP Status:** 409 Conflict

### Missing Required Fields
**Request:**
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser"}'
```

**Response:**
```json
{
  "error": "Username, password, and email are required."
}
```
**HTTP Status:** 400 Bad Request

### Invalid Role
**Request:**
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"test123","role":"superadmin"}'
```

**Response:**
```json
{
  "error": "Invalid role. Must be \"user\" or \"admin\"."
}
```
**HTTP Status:** 400 Bad Request

### Non-Admin User Attempt
**Request:**
```bash
# Login as regular user
USER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"password123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Try to create user
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"hacker","email":"hacker@example.com","password":"hack123"}'
```

**Response:**
```json
{
  "error": "Access denied. Admin privileges required."
}
```
**HTTP Status:** 403 Forbidden

## Testing the Feature

### Test 1: Create Regular User
```bash
# Get admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Create user
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1","email":"testuser1@example.com","password":"test123","role":"user"}'

# Verify user exists
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking \
  -e "SELECT id, username, email, role FROM users WHERE username='testuser1';"

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1","password":"test123"}'
```

### Test 2: Create Admin User
```bash
# Create admin user
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin3","email":"admin3@example.com","password":"admin123","role":"admin"}'

# Verify admin role
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking \
  -e "SELECT id, username, email, role FROM users WHERE username='admin3';"

# Login as new admin
NEW_ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin3","password":"admin123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Verify can access admin endpoints
curl -H "Authorization: Bearer $NEW_ADMIN_TOKEN" \
  http://localhost:3000/api/admin/users
```

### Test 3: Security Check
```bash
# Try to create user as regular user (should fail)
USER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"password123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"hacker","email":"hacker@example.com","password":"hack123"}'
# Expected: {"error":"Access denied. Admin privileges required."}
```

## Database Schema

The `users` table includes:

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,  -- bcrypt hashed
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Frontend Implementation Details

### Form Location
- Tab: "Admin Panel" (only visible when logged in as admin)
- Section: "User Management"
- Form ID: `createUserForm`

### Form Fields
1. **Username** (`#newUsername`)
   - Type: text
   - Required: yes
   - Validation: Must be unique

2. **Email** (`#newEmail`)
   - Type: email
   - Required: yes
   - Validation: Must be unique and valid email format

3. **Password** (`#newPassword`)
   - Type: password
   - Required: yes
   - Note: Automatically hashed on server

4. **Role** (`#newRole`)
   - Type: select
   - Options: User, Admin
   - Default: User

### Success Flow
1. Form submitted
2. API call to `POST /api/admin/users`
3. Success message displayed (green)
4. Form reset
5. User list refreshed
6. New user visible in table

### Error Flow
1. Form submitted
2. API call fails
3. Error message displayed (red)
4. Form retains values for correction

## Backend Implementation Details

### Endpoint
`POST /api/admin/users`

### Middleware Stack
1. `authenticateToken` - Verify JWT
2. `authenticateAdmin` - Verify admin role
3. Request handler

### Request Body
```json
{
  "username": "string (required)",
  "email": "string (required)",
  "password": "string (required)",
  "role": "string (optional, default: 'user')"
}
```

### Process Flow
1. Validate required fields
2. Validate role value
3. Hash password with bcrypt (cost: 10)
4. Insert into database
5. Return created user (without password)

### Security Measures
- Passwords hashed with bcrypt before storage
- Role validation (only 'user' or 'admin' allowed)
- Duplicate username/email prevented by unique constraints
- Admin-only access enforced by middleware
- JWT token verification required

## Practical Examples

### Example 1: Create Support Staff
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "support",
    "email": "support@company.com",
    "password": "Support2025!",
    "role": "user"
  }'
```

### Example 2: Create Department Admin
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hr_admin",
    "email": "hr.admin@company.com",
    "password": "HRAdmin2025!",
    "role": "admin"
  }'
```

### Example 3: Batch User Creation Script
```bash
#!/bin/bash

ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Create multiple users
users=(
  "employee1:employee1@company.com"
  "employee2:employee2@company.com"
  "employee3:employee3@company.com"
)

for user_data in "${users[@]}"; do
  username="${user_data%%:*}"
  email="${user_data##*:}"
  
  echo "Creating user: $username"
  curl -X POST http://localhost:3000/api/admin/users \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$username\",\"email\":\"$email\",\"password\":\"Welcome2025!\",\"role\":\"user\"}"
  echo ""
done
```

## Verification Commands

### Check User Count
```bash
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking \
  -e "SELECT COUNT(*) as total_users FROM users;"
```

### List All Admins
```bash
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking \
  -e "SELECT id, username, email FROM users WHERE role='admin';"
```

### List All Regular Users
```bash
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking \
  -e "SELECT id, username, email FROM users WHERE role='user';"
```

### Verify Password Hash
```bash
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking \
  -e "SELECT username, LEFT(password, 20) as password_hash FROM users LIMIT 5;"
```

## Troubleshooting

### Issue: "Access denied" error
**Cause:** Not logged in as admin
**Solution:** Ensure you're using admin credentials

### Issue: "Username or email already exists"
**Cause:** User with same username or email already in database
**Solution:** Use different username and email

### Issue: Form not visible
**Cause:** Logged in as regular user
**Solution:** Logout and login with admin credentials

### Issue: Success but user can't login
**Cause:** Unlikely with current implementation
**Solution:** Check password was correctly set, verify user in database

## Summary

 **Feature Status:** FULLY IMPLEMENTED AND TESTED

 **API Endpoint:** Working perfectly

 **Frontend UI:** Complete with form and validation

 **Security:** Role-based access control enforced

 **Testing:** All scenarios pass

The admin user creation feature is production-ready and available at:
- **Web Interface:** http://localhost (Admin Panel tab)
- **API Endpoint:** POST /api/admin/users
