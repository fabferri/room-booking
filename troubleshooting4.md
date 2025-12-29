# Troubleshooting Guide

This document contains common issues encountered during development and their solutions.

## Table of Contents
1. [Login Issues](#login-issues)
2. [Calendar View Not Showing Bookings](#calendar-view-not-showing-bookings)
3. [Admin Panel Visibility](#admin-panel-visibility)
4. [File Syntax Errors](#file-syntax-errors)
5. [Container Management](#container-management)
6. [Browser Cache Issues](#browser-cache-issues)

---

## Login Issues

### Problem: Login fails in the web interface

**Symptoms:**
- Login button does nothing
- No response when submitting credentials
- Browser console shows JavaScript errors

**Diagnosis Commands:**
```bash
# Test backend API directly
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Test through nginx proxy
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Check backend logs
docker compose logs backend --tail 50

# Verify HTML has required elements
grep -E "id=\"(loginForm|username|password)\"" /home/dev/docker-example/frontend/index.html
```

**Common Causes:**
1. Missing or duplicate closing tags in HTML
2. JavaScript syntax errors (extra braces, missing semicolons)
3. Missing script tag in HTML
4. DOM elements accessed before page load

**Solutions:**

**Fix 1: Check HTML structure**
```bash
# Verify HTML is complete
tail -10 /home/dev/docker-example/frontend/index.html

# Should end with:
# </div>
# <script src="app.js"></script>
# </body>
# </html>
```

**Fix 2: Verify JavaScript syntax**
```bash
# Check for extra closing braces
tail -5 /home/dev/docker-example/frontend/app.js

# Should NOT have extra } after the closing logic
```

**Fix 3: Rebuild containers**
```bash
docker compose build nginx
docker compose up -d nginx
```

**Fix 4: Clear browser cache**
- Press Ctrl+Shift+Delete
- Select "Cached images and files"
- Click "Clear data"
- Close and reopen browser

---

## Calendar View Not Showing Bookings

### Problem: Calendar views (Day/Week/Month) show no rooms or bookings

**Symptoms:**
- Calendar tab loads but shows empty
- Console shows "0 rooms" in logs
- Day view shows "No rooms available" message

**Diagnosis Commands:**
```bash
# Test calendar API endpoint
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

curl -s "http://localhost/api/calendar/bookings?start_date=2025-12-28&end_date=2025-12-28" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Check if rooms are loaded
docker compose exec nginx cat /usr/share/nginx/html/app.js | grep -A 10 "loadCalendar"
```

**Root Cause:**
The `loadCalendar()` function was called before the `rooms` array was populated, resulting in empty room lists.

**Solution:**
Add await to ensure rooms are loaded before rendering calendar:

```javascript
async function loadCalendar() {
    // Make sure rooms are loaded first
    if (rooms.length === 0) {
        console.log('Rooms not loaded yet, loading now...');
        await loadRooms();
    }
    
    // Continue with calendar rendering
    await renderCalendar();
}
```

**Rebuild and test:**
```bash
docker compose build nginx
docker compose up -d nginx
```

---

## Admin Panel Visibility

### Problem: Regular users can see admin panel or admin cannot see it

**Symptoms:**
- User with role "user" sees "Admin Panel" tab
- User with role "admin" does not see "Admin Panel" tab

**Diagnosis Commands:**
```bash
# Test user role from API
curl -s "http://localhost/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Check if admin-only class is being toggled
docker compose exec nginx grep -n "admin-only" /usr/share/nginx/html/app.js
```

**Root Cause:**
The `showApp()` function did not check user role to hide/show admin elements.

**Solution:**
Add role-based visibility in `showApp()`:

```javascript
function showApp() {
    loginScreen.classList.remove('active');
    appScreen.classList.add('active');
    currentUserSpan.textContent = `Welcome, ${currentUser.username}!`;
    loadRooms();
    loadMyBookings();
    
    // Show/hide admin-only elements based on user role
    if (currentUser && currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = '';
        });
    } else {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
}
```

---

## File Syntax Errors

### Problem: JavaScript file has syntax errors preventing execution

**Common Errors:**
1. Extra closing brace at end of file
2. Missing closing tags in HTML
3. Duplicate closing tags

**Diagnosis:**
```bash
# Check last lines of JavaScript
tail -20 /home/dev/docker-example/frontend/app.js

# Check HTML closing tags
tail -10 /home/dev/docker-example/frontend/index.html

# Count specific tags
grep -c "</html>" /home/dev/docker-example/frontend/index.html
# Should return 1, not 2
```

**Solutions:**

**Fix duplicate HTML closing tags:**
```bash
# Remove duplicate </html> if exists
# Edit the file manually or use sed
sed -i '$ d' /home/dev/docker-example/frontend/index.html  # Remove last line if duplicate
```

**Fix extra JavaScript closing brace:**
Check that the file ends with:
```javascript
} else {
    showLogin();
}
```
NOT:
```javascript
} else {
    showLogin();
}
}  // Extra brace - REMOVE THIS
```

---

## Container Management

### Rebuild Specific Container
```bash
# Rebuild nginx only
docker compose build nginx
docker compose up -d nginx

# Rebuild backend only
docker compose build backend
docker compose up -d backend

# Rebuild all
docker compose build
docker compose up -d
```

### Restart Services
```bash
# Restart specific service
docker compose restart backend
docker compose restart nginx

# Restart all services
docker compose restart
```

### Complete Restart (when containers won't restart)
```bash
# Stop all containers and restart
docker compose down
docker compose up -d

# Wait for database to be ready
docker compose ps
# Look for "healthy" status on room_booking_db
```

### View Logs
```bash
# View all logs
docker compose logs

# View specific service logs
docker compose logs backend
docker compose logs nginx
docker compose logs mysql

# Follow logs in real-time
docker compose logs -f backend

# Last 50 lines
docker compose logs --tail 50 backend
```

### Check Container Status
```bash
# List all containers
docker compose ps

# Check if containers are running
docker ps | grep room_booking
```

### Execute Commands in Containers
```bash
# Check file exists in nginx
docker compose exec nginx test -f /usr/share/nginx/html/app.js && echo "File exists"

# View file content
docker compose exec nginx cat /usr/share/nginx/html/index.html | tail -10

# Check served files
docker compose exec nginx ls -la /usr/share/nginx/html/
```

---

## Browser Cache Issues

### Problem: Changes not visible in browser after rebuilding containers

**Symptoms:**
- Container rebuilt but browser shows old version
- Console shows old app version
- New features not appearing

**Force Refresh Methods:**

**Method 1: Hard Reload**
- Windows/Linux: Ctrl+Shift+R or Ctrl+F5
- Mac: Cmd+Shift+R

**Method 2: Clear Cache Completely**
1. Press Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
2. Select "Cached images and files"
3. Select "All time" for time range
4. Click "Clear data"

**Method 3: Disable Cache in DevTools**
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Keep DevTools open while testing

**Method 4: Incognito/Private Window**
- Open new incognito window
- Navigate to http://localhost
- Test functionality

**Verification:**
Check console for version indicator:
```
Room Booking App Version: v2.0-fix-login
```

If you see this, the new version is loaded.

---

## Debugging Tips

### Add Console Logging
Add debug logs to track execution:
```javascript
console.log('Function called:', functionName);
console.log('User role:', currentUser.role);
console.log('Rooms loaded:', rooms.length);
```

### Check API Responses
Use browser DevTools Network tab:
1. Open DevTools (F12)
2. Go to Network tab
3. Perform action (login, load calendar, etc.)
4. Click on API request
5. View Response tab

### Verify DOM Elements
In browser console:
```javascript
document.getElementById('loginForm')
document.getElementById('calendarContent')
document.querySelectorAll('.admin-only')
```

### Test API Endpoints Directly
```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' | \
  jq -r '.token')

# Test authenticated endpoints
curl -s http://localhost/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .

curl -s http://localhost/api/rooms \
  -H "Authorization: Bearer $TOKEN" | jq .

curl -s "http://localhost/api/calendar/bookings?start_date=2025-12-28&end_date=2025-12-28" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Quick Fix Checklist

When something doesn't work, try these steps in order:

1. **Check browser console** (F12) for JavaScript errors
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Hard reload page** (Ctrl+Shift+R)
4. **Rebuild containers**:
   ```bash
   docker compose build nginx
   docker compose up -d nginx
   ```
5. **Check backend logs**:
   ```bash
   docker compose logs backend --tail 50
   ```
6. **Verify files are updated in container**:
   ```bash
   docker compose exec nginx cat /usr/share/nginx/html/app.js | grep "APP_VERSION"
   ```
7. **Test API directly** with curl commands
8. **Try incognito window** to rule out cache issues
9. **Complete restart** if all else fails:
   ```bash
   docker compose down
   docker compose up -d
   ```

---

## Common Error Messages

### "Cannot delete yourself"
**Cause:** Admin trying to delete their own account
**Solution:** This is expected behavior for safety

### "Cannot delete room. It has X existing booking(s)"
**Cause:** Trying to delete a room with active bookings
**Solution:** Delete the bookings first, then delete the room

### "Username or email already exists"
**Cause:** Trying to create user with duplicate username/email
**Solution:** Use a different username or email

### "Room number already exists"
**Cause:** Trying to create room with duplicate room number
**Solution:** Use a different room number

### "Invalid credentials"
**Cause:** Wrong username or password
**Solution:** Verify credentials, default password is "password123"

---

## Performance Issues

### Slow Container Startup
```bash
# Check if database is ready
docker compose logs mysql | grep "ready for connections"

# Wait for healthy status
watch -n 1 docker compose ps
```

### Database Connection Errors
```bash
# Restart backend after database is ready
docker compose restart backend

# Check database connectivity
docker compose exec backend ping -c 3 mysql
```

---

## File Locations Reference

Important files and their locations:
```
/home/dev/docker-example/
├── frontend/
│   ├── index.html          # Main HTML file
│   ├── app.js              # Frontend JavaScript
│   └── styles.css          # CSS styles
├── backend/
│   └── server.js           # Backend API
├── nginx/
│   └── nginx.conf          # Nginx configuration
├── database/
│   └── init.sql            # Database schema
└── docker-compose.yml      # Container configuration
```

Files served by nginx (inside container):
```
/usr/share/nginx/html/
├── index.html
├── app.js
└── styles.css
```

---

## Advanced Troubleshooting

### Check Nginx Configuration
```bash
# View nginx config
docker compose exec nginx cat /etc/nginx/nginx.conf

# Test nginx configuration
docker compose exec nginx nginx -t
```

### Database Queries
```bash
# Access MySQL
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking

# Check users
SELECT id, username, email, role FROM users;

# Check rooms
SELECT * FROM rooms;

# Check bookings
SELECT b.id, r.room_number, u.username, b.start_time, b.end_time 
FROM bookings b 
JOIN rooms r ON b.room_id = r.id 
JOIN users u ON b.user_id = u.id;
```

### Network Issues
```bash
# Check if containers can communicate
docker compose exec backend ping -c 3 mysql
docker compose exec nginx ping -c 3 backend

# Check ports
netstat -tulpn | grep -E '(80|3000|3306)'
```

---

## Prevention Best Practices

1. **Always rebuild nginx** after frontend changes
2. **Always restart backend** after backend changes
3. **Clear browser cache** after deployments
4. **Use browser DevTools** to verify changes loaded
5. **Check container logs** before and after changes
6. **Test API endpoints** with curl before browser testing
7. **Use version indicators** in code to verify updates
8. **Keep backup** of working configurations
9. **Document changes** as you make them
10. **Test in incognito** window for clean slate

---

## Getting Help

If issues persist:

1. Check all logs:
   ```bash
   docker compose logs > full-logs.txt
   ```

2. Export container state:
   ```bash
   docker compose ps > container-status.txt
   ```

3. Verify file checksums:
   ```bash
   md5sum frontend/app.js
   docker compose exec nginx md5sum /usr/share/nginx/html/app.js
   ```

4. Check system resources:
   ```bash
   docker stats
   ```
