// ==================== DEPENDENCIES ====================
// Express - Web framework for building REST API
const express = require('express');
// MySQL - Promise-based MySQL client for database operations
const mysql = require('mysql2/promise');
// bcryptjs - Library for hashing and comparing passwords securely
const bcrypt = require('bcryptjs');
// jsonwebtoken - Library for creating and verifying JWT tokens for authentication
const jwt = require('jsonwebtoken');
// cors - Middleware to enable Cross-Origin Resource Sharing
const cors = require('cors');
// dotenv - Loads environment variables from .env file
require('dotenv').config();

// ==================== APP CONFIGURATION ====================
const app = express();
// Server port - defaults to 3000 if not specified in environment
const PORT = process.env.PORT || 3000;
// Secret key for signing JWT tokens - should be a strong secret in production
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// ==================== MIDDLEWARE ====================
// Enable CORS to allow requests from frontend running on different port/domain
app.use(cors());
// Parse incoming JSON request bodies
app.use(express.json());

// ==================== DATABASE CONNECTION ====================
// Create MySQL connection pool for efficient database connections
// Connection pooling reuses database connections instead of creating new ones for each request
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',          // Database host (mysql service name in docker-compose)
  user: process.env.DB_USER || 'bookinguser',    // Database username
  password: process.env.DB_PASSWORD || 'bookingpass', // Database password
  database: process.env.DB_NAME || 'room_booking',    // Database name
  waitForConnections: true,  // Queue requests when all connections are in use
  connectionLimit: 10,       // Maximum number of connections in pool
  queueLimit: 0             // Unlimited queue length for waiting requests
});

// ==================== AUTHENTICATION MIDDLEWARE ====================
/**
 * Middleware to verify JWT token from Authorization header
 * Expects format: "Bearer <token>"
 * Extracts user information from token and attaches to req.user
 * Returns 401 if no token provided, 403 if token is invalid
 */
const authenticateToken = (req, res, next) => {
  // Extract Authorization header
  const authHeader = req.headers['authorization'];
  // Extract token from "Bearer <token>" format
  const token = authHeader && authHeader.split(' ')[1];

  // Return error if no token provided
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Verify token signature and expiration
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token.' });
    }
    // Attach decoded user info to request object for use in route handlers
    req.user = user;
    next();
  });
};

/**
 * Middleware to verify user has admin role
 * Must be used after authenticateToken middleware
 * Returns 403 if user is not an admin
 */
const authenticateAdmin = (req, res, next) => {
  // Check if user role is admin (requires authenticateToken to have run first)
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

// ==================== AUTH ROUTES ====================

/**
 * POST /api/auth/login
 * Public endpoint for user authentication
 * Request body: { username, password }
 * Returns: { token, user: { id, username, email, role } }
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Query database for user by username
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

    // Return generic error if user not found (don't reveal if username exists)
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = users[0];
    // Compare provided password with hashed password in database
    const validPassword = await bcrypt.compare(password, user.password);

    // Return generic error if password doesn't match
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Create JWT token with user information, expires in 24 hours
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return token and user info (excluding password)
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user's information
 * Requires: Valid JWT token
 * Returns: { id, username, email, role }
 */
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    // Fetch user from database using ID from JWT token
    const [users] = await pool.query(
      'SELECT id, username, email, role FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ==================== ROOM ROUTES ====================

/**
 * GET /api/rooms
 * Get list of all available rooms
 * Requires: Valid JWT token
 * Returns: Array of room objects ordered by room number
 */
app.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const [rooms] = await pool.query('SELECT * FROM rooms ORDER BY room_number');
    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/rooms/:roomId/availability
 * Get all bookings for a specific room on a specific date
 * URL params: roomId - The room ID
 * Query params: date - Date in YYYY-MM-DD format
 * Requires: Valid JWT token
 * Returns: Array of bookings for the room on that date
 */
app.get('/api/rooms/:roomId/availability', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { date } = req.query;

    // Validate required date parameter
    if (!date) {
      return res.status(400).json({ error: 'Date is required.' });
    }

    // Get all bookings for this room on the specified date
    const [bookings] = await pool.query(
      `SELECT id, start_time, end_time, user_id 
       FROM bookings 
       WHERE room_id = ? AND DATE(start_time) = ? 
       ORDER BY start_time`,
      [roomId, date]
    );

    res.json(bookings);
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ==================== BOOKING ROUTES ====================

/**
 * GET /api/bookings
 * Get all bookings for the authenticated user
 * Requires: Valid JWT token
 * Returns: Array of user's bookings with room details, ordered by start time (newest first)
 */
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    // Query bookings for current user with joined room information
    const [bookings] = await pool.query(
      `SELECT b.id, b.room_id, b.start_time, b.end_time, b.created_at,
              r.room_number, r.room_name
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.user_id = ?
       ORDER BY b.start_time DESC`,
      [req.user.id]
    );

    res.json(bookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/bookings
 * Create a new room booking
 * Request body: { room_id, start_time, end_time } - times in ISO 8601 format
 * Requires: Valid JWT token
 * Validates:
 *   - Required fields present
 *   - End time is after start time
 *   - Not booking in the past
 *   - Duration is within min/max limits from settings
 *   - Booking is within same day
 *   - No conflicting bookings exist
 * Returns: Created booking with room details
 */
app.post('/api/bookings', authenticateToken, async (req, res) => {
  // Get dedicated connection for transaction
  const connection = await pool.getConnection();
  
  try {
    const { room_id, start_time, end_time } = req.body;

    // Validate required fields
    if (!room_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Room ID, start time, and end time are required.' });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    const now = new Date();

    // Validate: end time must be after start time
    if (startDate >= endDate) {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }

    // Validate: cannot book in the past
    if (startDate < now) {
      return res.status(400).json({ error: 'Cannot book in the past.' });
    }

    // Calculate booking duration in minutes
    const durationMs = endDate - startDate;
    const durationMinutes = durationMs / (1000 * 60);

    // Get booking duration limits from database settings
    const [settings] = await pool.query(
      'SELECT setting_key, setting_value FROM booking_settings WHERE setting_key IN (?, ?)',
      ['min_booking_duration', 'max_booking_duration']
    );
    
    // Set default duration limits
    let minDuration = 15; // default: 15 minutes
    let maxDuration = 240; // default: 240 minutes (4 hours)
    
    // Update from database settings if available
    settings.forEach(setting => {
      if (setting.setting_key === 'min_booking_duration') {
        minDuration = parseInt(setting.setting_value);
      } else if (setting.setting_key === 'max_booking_duration') {
        maxDuration = parseInt(setting.setting_value);
      }
    });

    // Validate: booking meets minimum duration requirement
    if (durationMinutes < minDuration) {
      return res.status(400).json({ error: `Minimum booking duration is ${minDuration} minutes.` });
    }

    // Validate: booking doesn't exceed maximum duration
    if (durationMinutes > maxDuration) {
      return res.status(400).json({ error: `Maximum booking duration is ${maxDuration} minutes.` });
    }

    // Validate: booking must be within the same day
    if (startDate.toDateString() !== endDate.toDateString()) {
      return res.status(400).json({ error: 'Booking must be within the same day.' });
    }

    // Start database transaction for atomic operation
    await connection.beginTransaction();

    // Check for conflicting bookings (overlapping time slots)
    // Checks if new booking overlaps with any existing booking
    const [conflicts] = await connection.query(
      `SELECT id FROM bookings 
       WHERE room_id = ? 
       AND ((start_time < ? AND end_time > ?) 
            OR (start_time < ? AND end_time > ?)
            OR (start_time >= ? AND end_time <= ?))`,
      [room_id, end_time, start_time, end_time, end_time, start_time, end_time]
    );

    // If conflicts found, rollback and return error
    if (conflicts.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'Room is already booked for this time slot.' });
    }

    // Insert new booking into database
    const [result] = await connection.query(
      'INSERT INTO bookings (room_id, user_id, start_time, end_time) VALUES (?, ?, ?, ?)',
      [room_id, req.user.id, start_time, end_time]
    );

    // Commit transaction
    await connection.commit();

    // Fetch the created booking with room details to return
    const [newBooking] = await pool.query(
      `SELECT b.id, b.room_id, b.start_time, b.end_time, b.created_at,
              r.room_number, r.room_name
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newBooking[0]);
  } catch (error) {
    // Rollback transaction on any error
    await connection.rollback();
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    // Always release connection back to pool
    connection.release();
  }
});

/**
 * DELETE /api/bookings/:id
 * Delete a booking (user can only delete their own bookings)
 * URL params: id - Booking ID to delete
 * Requires: Valid JWT token
 * Returns: Success message
 */
app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify booking exists and belongs to the current user
    const [bookings] = await pool.query(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found or does not belong to you.' });
    }

    // Delete the booking
    await pool.query('DELETE FROM bookings WHERE id = ?', [id]);

    res.json({ message: 'Booking deleted successfully.' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ==================== ADMIN ROUTES ====================

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 * Request body: { username, password, email, role }
 * Requires: Valid JWT token with admin role
 * Returns: Created user details (without password)
 */
app.post('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    // Validate required fields
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required.' });
    }

    // Default role to 'user' if not specified
    const userRole = role || 'user';
    // Validate role is either 'user' or 'admin'
    if (!['user', 'admin'].includes(userRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin".' });
    }

    // Hash password with bcrypt (cost factor 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into database
    const [result] = await pool.query(
      'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, email, userRole]
    );

    res.status(201).json({
      id: result.insertId,
      username,
      email,
      role: userRole,
      message: 'User created successfully.'
    });
  } catch (error) {
    // Handle duplicate username or email
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/admin/users
 * Get list of all users (admin only)
 * Requires: Valid JWT token with admin role
 * Returns: Array of all users (without passwords), ordered by creation date
 */
app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user and their bookings (admin only)
 * URL params: id - User ID to delete
 * Requires: Valid JWT token with admin role
 * Prevents: Admin from deleting their own account
 * Returns: Success message
 */
app.delete('/api/admin/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting their own account (safety check)
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    // Check if user exists
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Delete user's bookings first (due to foreign key constraint)
    await pool.query('DELETE FROM bookings WHERE user_id = ?', [id]);

    // Delete the user
    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'User and their bookings deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/admin/rooms
 * Create a new room (admin only)
 * Request body: { room_number, room_name, capacity }
 * Requires: Valid JWT token with admin role
 * Validates: Capacity between 1 and 100
 * Returns: Created room details
 */
app.post('/api/admin/rooms', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { room_number, room_name, capacity } = req.body;

    // Validate required fields
    if (!room_number || !room_name || !capacity) {
      return res.status(400).json({ error: 'Room number, name, and capacity are required.' });
    }

    // Validate capacity range
    if (capacity < 1 || capacity > 100) {
      return res.status(400).json({ error: 'Capacity must be between 1 and 100.' });
    }

    // Insert new room into database
    const [result] = await pool.query(
      'INSERT INTO rooms (room_number, room_name, capacity) VALUES (?, ?, ?)',
      [room_number, room_name, capacity]
    );

    res.status(201).json({
      id: result.insertId,
      room_number,
      room_name,
      capacity,
      message: 'Room created successfully.'
    });
  } catch (error) {
    // Handle duplicate room number
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Room number already exists.' });
    }
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * DELETE /api/admin/rooms/:id
 * Delete a room (admin only)
 * URL params: id - Room ID to delete
 * Requires: Valid JWT token with admin role
 * Prevents: Deleting room if it has any bookings
 * Returns: Success message or error if room has bookings
 */
app.delete('/api/admin/rooms/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if room exists
    const [rooms] = await pool.query('SELECT * FROM rooms WHERE id = ?', [id]);

    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    // Check if room has any bookings (prevents deletion of rooms with bookings)
    const [bookings] = await pool.query('SELECT COUNT(*) as count FROM bookings WHERE room_id = ?', [id]);
    
    if (bookings[0].count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete room. It has ${bookings[0].count} existing booking(s). Delete the bookings first.` 
      });
    }

    // Delete the room
    await pool.query('DELETE FROM rooms WHERE id = ?', [id]);

    res.json({ message: 'Room deleted successfully.' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * DELETE /api/admin/bookings/:id
 * Delete any booking (admin only)
 * URL params: id - Booking ID to delete
 * Requires: Valid JWT token with admin role
 * Note: Admin can delete any user's booking
 * Returns: Success message
 */
app.delete('/api/admin/bookings/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if booking exists
    const [bookings] = await pool.query('SELECT * FROM bookings WHERE id = ?', [id]);

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Delete the booking (admin can delete any booking)
    await pool.query('DELETE FROM bookings WHERE id = ?', [id]);

    res.json({ message: 'Booking deleted successfully.' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/admin/settings
 * Get all booking settings (admin only)
 * Requires: Valid JWT token with admin role
 * Returns: Object with settings as key-value pairs including descriptions
 */
app.get('/api/admin/settings', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM booking_settings');
    
    // Convert array to key-value object for easier frontend consumption
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = {
        value: parseInt(setting.setting_value),
        description: setting.description
      };
    });

    res.json(settingsObj);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * PUT /api/admin/settings
 * Update booking settings (admin only)
 * Request body: { min_booking_duration?, max_booking_duration? }
 * Requires: Valid JWT token with admin role
 * Validates:
 *   - Min duration: 5-120 minutes
 *   - Max duration: 30-1440 minutes (24 hours)
 *   - Min must be less than max
 * Returns: Success message with updated settings
 */
app.put('/api/admin/settings', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { min_booking_duration, max_booking_duration } = req.body;

    // Validate minimum booking duration if provided
    if (min_booking_duration !== undefined) {
      const minDuration = parseInt(min_booking_duration);
      if (isNaN(minDuration) || minDuration < 5 || minDuration > 120) {
        return res.status(400).json({ error: 'Minimum duration must be between 5 and 120 minutes.' });
      }
    }

    // Validate maximum booking duration if provided
    if (max_booking_duration !== undefined) {
      const maxDuration = parseInt(max_booking_duration);
      if (isNaN(maxDuration) || maxDuration < 30 || maxDuration > 1440) {
        return res.status(400).json({ error: 'Maximum duration must be between 30 and 1440 minutes (24 hours).' });
      }
    }

    // Validate that minimum is less than maximum (if both provided)
    if (min_booking_duration !== undefined && max_booking_duration !== undefined) {
      if (parseInt(min_booking_duration) >= parseInt(max_booking_duration)) {
        return res.status(400).json({ error: 'Minimum duration must be less than maximum duration.' });
      }
    }

    // Update minimum booking duration setting
    if (min_booking_duration !== undefined) {
      await pool.query(
        'UPDATE booking_settings SET setting_value = ? WHERE setting_key = ?',
        [min_booking_duration.toString(), 'min_booking_duration']
      );
    }

    // Update maximum booking duration setting
    if (max_booking_duration !== undefined) {
      await pool.query(
        'UPDATE booking_settings SET setting_value = ? WHERE setting_key = ?',
        [max_booking_duration.toString(), 'max_booking_duration']
      );
    }

    // Fetch and return updated settings
    const [settings] = await pool.query('SELECT * FROM booking_settings');
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = {
        value: parseInt(setting.setting_value),
        description: setting.description
      };
    });

    res.json({ message: 'Settings updated successfully.', settings: settingsObj });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/settings
 * Get public booking settings (available to all authenticated users)
 * Requires: Valid JWT token
 * Returns: Object with min and max booking durations (simplified, no descriptions)
 */
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    // Only return duration settings (public info needed for booking validation)
    const [settings] = await pool.query(
      'SELECT setting_key, setting_value FROM booking_settings WHERE setting_key IN (?, ?)',
      ['min_booking_duration', 'max_booking_duration']
    );
    
    // Convert to simple key-value object
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = parseInt(setting.setting_value);
    });

    res.json(settingsObj);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/admin/bookings
 * Get all bookings from all users (admin only)
 * Requires: Valid JWT token with admin role
 * Returns: Array of all bookings with room and user details, ordered by start time
 */
app.get('/api/admin/bookings', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    // Query all bookings with joined room and user information
    const [bookings] = await pool.query(
      `SELECT b.id, b.room_id, b.start_time, b.end_time, b.created_at,
              r.room_number, r.room_name,
              u.username, u.email
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN users u ON b.user_id = u.id
       ORDER BY b.start_time DESC`
    );

    res.json(bookings);
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ==================== CALENDAR ROUTES ====================

/**
 * GET /api/calendar/bookings
 * Get bookings for calendar view with optional filtering
 * Query params:
 *   - start_date?: Filter by start date (YYYY-MM-DD)
 *   - end_date?: Filter by end date (YYYY-MM-DD)
 *   - room_id?: Filter by specific room
 * Requires: Valid JWT token
 * Returns: Array of bookings with room and user details for calendar display
 */
app.get('/api/calendar/bookings', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, room_id } = req.query;

    // Build dynamic query with optional filters
    let query = `
      SELECT b.id, b.room_id, b.user_id, b.start_time, b.end_time,
             r.room_number, r.room_name, r.capacity,
             u.username
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Add start date filter if provided
    if (start_date) {
      query += ' AND DATE(b.start_time) >= ?';
      params.push(start_date);
    }

    // Add end date filter if provided
    if (end_date) {
      query += ' AND DATE(b.start_time) <= ?';
      params.push(end_date);
    }

    // Add room filter if provided
    if (room_id) {
      query += ' AND b.room_id = ?';
      params.push(room_id);
    }

    query += ' ORDER BY b.start_time ASC';

    const [bookings] = await pool.query(query, params);

    res.json(bookings);
  } catch (error) {
    console.error('Get calendar bookings error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/calendar/availability
 * Get room availability summary for a specific date
 * Query params: date - Date in YYYY-MM-DD format (required)
 * Requires: Valid JWT token
 * Returns: Array of rooms with booking statistics and availability status
 */
app.get('/api/calendar/availability', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;

    // Validate required date parameter
    if (!date) {
      return res.status(400).json({ error: 'Date is required.' });
    }

    // Get all rooms from database
    const [rooms] = await pool.query('SELECT * FROM rooms ORDER BY room_number');

    // Get booking statistics for the specified date
    const [bookings] = await pool.query(
      `SELECT room_id, COUNT(*) as booking_count,
              MIN(start_time) as first_booking,
              MAX(end_time) as last_booking
       FROM bookings
       WHERE DATE(start_time) = ?
       GROUP BY room_id`,
      [date]
    );

    // Create a lookup map of room bookings for efficient merging
    const bookingMap = {};
    bookings.forEach(b => {
      bookingMap[b.room_id] = b;
    });

    // Combine room data with booking statistics
    const availability = rooms.map(room => ({
      ...room,
      bookings: bookingMap[room.id]?.booking_count || 0,
      status: bookingMap[room.id] ? 'booked' : 'available',
      first_booking: bookingMap[room.id]?.first_booking || null,
      last_booking: bookingMap[room.id]?.last_booking || null
    }));

    res.json(availability);
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ==================== HEALTH CHECK ====================

/**
 * GET /api/health
 * Health check endpoint to verify API is running
 * No authentication required
 * Returns: Server status and current timestamp
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ==================== SERVER STARTUP ====================

/**
 * Start Express server and listen for incoming requests
 * Logs confirmation message when server is ready
 */
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
