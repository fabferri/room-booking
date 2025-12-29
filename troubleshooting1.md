# Troubleshooting: Login Invalid Credentials Issue

## Problem
Users were unable to login to the application with the documented credentials (username: user1, password: password123). The API was returning "Invalid credentials" error.

## Diagnosis Steps

### Step 1: Verify Container Status
```bash
docker compose ps
```
Result: All containers were running properly (nginx, backend, mysql).

### Step 2: Check Database Users
```bash
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking -e "SELECT username, email, LEFT(password, 20) as password_start FROM users;"
```
Result: All 5 users (user1-user5) existed in the database with password hashes.

### Step 3: Check Backend Logs
```bash
docker compose logs backend | tail -50
```
Result: Backend was running without errors, no crash or connection issues.

### Step 4: Test Login API Directly
```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"user1","password":"password123"}'
```
Result: Returned `{"error":"Invalid credentials."}` with 401 status code.

### Step 5: Verify Password Hash
The database contained the hash: `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`

Tested the hash validity:
```bash
docker compose exec backend node -e "const bcrypt = require('bcryptjs'); bcrypt.compare('password123', '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy').then(r => console.log('Password match:', r))"
```
Result: `Password match: false`

## Root Cause
The bcrypt hash stored in the database (`init.sql`) was incorrect and did not match the password "password123". This was likely a placeholder or incorrectly generated hash.

## Solution

### Step 1: Generate Correct Hash
```bash
docker compose exec backend node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('password123', 10).then(h => console.log(h))"
```
Generated hash: `$2a$10$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW`

### Step 2: Verify New Hash
```bash
docker compose exec backend node -e "const bcrypt = require('bcryptjs'); bcrypt.compare('password123', '\$2a\$10\$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW').then(r => console.log('Verification:', r))"
```
Result: `Verification: true`

### Step 3: Update Database
This command updates all user passwords in the MySQL database to have the same password ("password123"), which is useful for fixing authentication issues or resetting demo accounts. <br>
Here's the breakdown:
- docker compose exec mysql - Execute a command in the running mysql container
- mysql - The MySQL client command-line tool
- -u bookinguser - Connect as user bookinguser
- -pbookingpass - Use password bookingpass (no space after -p)
- room_booking - Connect to the room_booking database
- -e - Execute the following SQL statement directly
- "UPDATE users SET password = '...';" - SQL that updates the password column for all rows in the users table. The password hash $2a$10$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW is a bcrypt hash of "password123". The \$ escapes the dollar signs so the shell doesn't interpret them as variables.

```bash
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking -e "UPDATE users SET password = '\$2a\$10\$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW';"
```

### Step 4: Test Login Again
```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"user1","password":"password123"}'
```
Result: Success! Received JWT token.

### Step 5: Fix init.sql File
Updated `database/init.sql` file to replace the incorrect hash with the correct one in the INSERT statement for all 5 users.

Changed from:
```sql
('user1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user1@example.com'),
```

To:
```sql
('user1', '$2a$10$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW', 'user1@example.com'),
```

## Prevention

### For Fresh Deployments
The fix in `init.sql` ensures that new deployments will have the correct password hash from the start.

### For Existing Deployments
If you encounter this issue on an existing deployment:

1. Run the update SQL command:
```bash
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking -e "UPDATE users SET password = '\$2a\$10\$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW';"
```

2. Or recreate the database completely:
```bash
docker compose down -v
docker compose up -d
```

### How to Generate Valid Bcrypt Hashes
To generate a valid bcrypt hash for any password:

```bash
docker compose exec backend node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_PASSWORD', 10).then(h => console.log(h))"
```

Or use the provided `generate-hash.js` script (requires Node.js installed locally):
```bash
node generate-hash.js
```

## Verification
After applying the fix, you can verify the password works by:

1. Browser login at http://localhost with user1/password123
2. API test: 
```bash
curl -X POST http://localhost/api/auth/login -H "Content-Type: application/json" -d '{"username":"user1","password":"password123"}'
```

Both should return a JWT token successfully.

## Files Modified
- `database/init.sql` - Updated bcrypt hashes for all 5 users

## Status
RESOLVED - All users can now login with password123.
