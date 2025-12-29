# Troubleshooting: Frontend Updates and Calendar Refresh Issues

## Problem 1: Demo Credentials Still Visible After Removal

### Issue
After removing the demo credentials section from `frontend/index.html`, the login form still displays:
```
Demo Credentials:
Username: user1, user2, user3, user4, or user5
Password: password123
```

### Diagnosis
The demo credentials HTML code was successfully removed from the source file, but the changes were not reflected in the browser because:
1. Nginx serves the frontend files and caches them
2. The browser also caches HTML files
3. Changes to frontend files require rebuilding the Nginx container

### Solution

**Step 1: Verify the file was updated**
```bash
grep -A 3 "Demo Credentials" frontend/index.html
```
If this returns no results, the file has been updated correctly.

**Step 2: Rebuild Nginx container**
```bash
docker compose build nginx && docker compose up -d nginx
```

**Step 3: Clear browser cache**
- Press `Ctrl+Shift+Delete` to open browser cache settings
- Clear cached images and files
- Press `Ctrl+Shift+R` to perform a hard reload (bypasses cache)

**Alternative:** Use incognito/private browsing mode to test without cache.

### Prevention
Whenever you modify frontend files (HTML, CSS, JS), always:
1. Rebuild the Nginx container
2. Clear browser cache or use hard reload
3. For development, consider using a volume mount to avoid rebuilding

---

## Problem 2: Calendar View Not Updating After Creating/Deleting Bookings

### Issue
When a user creates a new booking or deletes an existing booking, the Calendar View tab does not show the updated information. The calendar only updates after manually refreshing the page or clicking a calendar control.

### Diagnosis

**Step 1: Check booking creation flow**
```javascript
// In frontend/app.js, createBooking() function
async function createBooking(roomId, startTime, endTime) {
    // ... booking API call ...
    loadMyBookings();  // ✓ Refreshes "My Bookings" tab
    // Missing: Calendar refresh
}
```

**Step 2: Check booking deletion flow**
```javascript
// In frontend/app.js, deleteBooking() function  
async function deleteBooking(bookingId) {
    // ... delete API call ...
    loadMyBookings();  // ✓ Refreshes "My Bookings" tab
    // Missing: Calendar refresh
}
```

**Step 3: Check admin booking deletion flow**
```javascript
// In frontend/app.js, adminDeleteBooking() function
async function adminDeleteBooking(bookingId) {
    // ... delete API call ...
    loadAdminPanel();  // ✓ Refreshes admin panel
    // Missing: Calendar refresh
}
```

### Root Cause
The `createBooking()`, `deleteBooking()`, and `adminDeleteBooking()` functions only refresh their respective tabs (My Bookings or Admin Panel) but do not trigger a calendar refresh. Users viewing the Calendar tab see stale data until they manually interact with calendar controls.

### Solution

**Step 1: Update createBooking() function**

Modified `/frontend/app.js` around line 380:

```javascript
async function createBooking(roomId, startTime, endTime) {
    try {
        await apiCall('/bookings', {
            method: 'POST',
            body: JSON.stringify({
                room_id: roomId,
                start_time: startTime,
                end_time: endTime
            })
        });

        showSuccess(bookingSuccess, ' Room booked successfully!');
        
        bookingForm.reset();
        const today = new Date().toISOString().split('T')[0];
        bookingDate.value = today;
        
        loadMyBookings();
        
        // ADD THIS: Refresh calendar view if calendar date is set
        if (document.getElementById('calendarDate').value) {
            renderCalendar();
        }
        
        availabilityCard.style.display = 'none';
    } catch (error) {
        showError(bookingError, error.message);
    }
}
```

**Step 2: Update deleteBooking() function**

Modified `/frontend/app.js` around line 470:

```javascript
async function deleteBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }

    try {
        await apiCall(`/bookings/${bookingId}`, {
            method: 'DELETE'
        });
        loadMyBookings();
        
        // ADD THIS: Refresh calendar view if calendar date is set
        if (document.getElementById('calendarDate').value) {
            renderCalendar();
        }
    } catch (error) {
        alert('Error canceling booking: ' + error.message);
    }
}
```

**Step 3: Update adminDeleteBooking() function**

Modified `/frontend/app.js` around line 1033:

```javascript
async function adminDeleteBooking(bookingId) {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    
    try {
        await apiCall(`/admin/bookings/${bookingId}`, { method: 'DELETE' });
        loadAdminPanel();
        
        // ADD THIS: Refresh calendar view if calendar date is set
        if (document.getElementById('calendarDate').value) {
            renderCalendar();
        }
    } catch (error) {
        alert('Error deleting booking: ' + error.message);
    }
}
```

**Step 4: Apply changes**

```bash
# Rebuild Nginx container with updated JavaScript
docker compose build nginx && docker compose up -d nginx

# Clear browser cache
# Press Ctrl+Shift+Delete, then Ctrl+Shift+R
```

### How It Works

The fix adds a conditional calendar refresh after each booking operation:

```javascript
if (document.getElementById('calendarDate').value) {
    renderCalendar();
}
```

This checks if the calendar has been initialized (has a date selected). If yes, it re-renders the calendar with the updated booking data. If the calendar hasn't been used yet, it skips the refresh (no need to refresh an uninitialized view).

### Verification

**Test 1: Create a booking and check calendar**
1. Login and navigate to "Book a Room" tab
2. Create a new booking
3. Switch to "Calendar View" tab
4. The new booking should be visible immediately

**Test 2: Delete a booking from My Bookings**
1. Navigate to "My Bookings" tab
2. Delete an upcoming booking
3. Switch to "Calendar View" tab  
4. The deleted booking should be gone

**Test 3: Admin delete and calendar update**
1. Login as admin
2. Navigate to "Admin Panel"
3. Delete any booking
4. Switch to "Calendar View" tab
5. The calendar should reflect the deletion

### Files Modified
- `frontend/app.js` - Added calendar refresh calls in 3 functions:
  - `createBooking()`
  - `deleteBooking()`
  - `adminDeleteBooking()`

---

## Problem 3: Understanding Database Password Update Command

### Command Explanation

```bash
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking -e "UPDATE users SET password = '\$2a\$10\$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW';"
```

### Breakdown

| Part | Description |
|------|-------------|
| `docker compose exec mysql` | Execute a command in the running MySQL container |
| `mysql` | MySQL command-line client tool |
| `-u bookinguser` | Connect as database user "bookinguser" |
| `-pbookingpass` | Use password "bookingpass" (no space after `-p`) |
| `room_booking` | Connect to database named "room_booking" |
| `-e` | Execute the following SQL statement directly (non-interactive) |
| `"UPDATE users SET password = '...';"` | SQL UPDATE statement |
| `\$` | Escapes `$` so shell doesn't treat it as a variable |

### What It Does

This command updates the `password` column for **all rows** in the `users` table to the same bcrypt hash value.

- **Hash value:** `$2a$10$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW`
- **Plain text password:** `password123`
- **Hash type:** bcrypt with cost factor 10
- **Effect:** All users will have password `password123`

### When to Use

- **Fixing authentication issues** after incorrect password hashes in database
- **Resetting demo/test accounts** to a known password
- **Initial setup** to ensure all users can login

### Caution

This updates **ALL users** to the same password. For production:
- Update users individually by adding `WHERE username = 'specific_user'`
- Use unique passwords for each user
- Never use this in production without a WHERE clause

### Example: Update Single User

```bash
docker compose exec mysql mysql -u bookinguser -pbookingpass room_booking -e "UPDATE users SET password = '\$2a\$10\$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW' WHERE username = 'user1';"
```

---

## Summary

### Issue Resolution Checklist

When making frontend changes:
- [ ] Edit the source files (HTML/CSS/JS)
- [ ] Rebuild Nginx container: `docker compose build nginx && docker compose up -d nginx`
- [ ] Clear browser cache: `Ctrl+Shift+Delete`
- [ ] Hard reload page: `Ctrl+Shift+R`

When implementing live data updates:
- [ ] Identify all functions that modify data
- [ ] Add refresh calls for all affected views
- [ ] Test each operation to verify updates appear immediately
- [ ] Consider user's current tab/view when triggering refreshes

### Quick Reference Commands

```bash
# Rebuild and restart Nginx
docker compose build nginx && docker compose up -d nginx

# View container logs
docker compose logs -f nginx
docker compose logs -f backend

# Restart a service
docker compose restart backend

# Complete rebuild (use when major changes don't appear)
docker compose down -v
docker compose up -d
```

## Status
RESOLVED - All frontend updates now appear correctly and calendar refreshes automatically after booking operations.
