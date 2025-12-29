-- ==================================================================================
-- Room Booking System - Database Initialization Script
-- ==================================================================================
-- This script creates the database schema and populates initial data
-- for the Room Booking System application.
--
-- Tables created:
--   1. users - Application users with authentication credentials
--   2. rooms - Available meeting rooms
--   3. bookings - Room reservations
--   4. booking_settings - Configurable system settings
--
-- Initial data:
--   - 6 users (1 admin + 5 regular users)
--   - 10 meeting rooms of various capacities
--   - Default booking duration settings
-- ==================================================================================

-- Note: Database is created by Docker container initialization
-- Uncomment below if running this script manually outside Docker
-- CREATE DATABASE IF NOT EXISTS room_booking;
-- USE room_booking;

-- ==================================================================================
-- USERS TABLE
-- ==================================================================================
-- Stores user accounts with authentication and authorization information
-- Supports role-based access control (admin vs regular user)

CREATE TABLE IF NOT EXISTS users (
    -- Primary key: Auto-incrementing unique identifier
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Username: Unique login identifier (max 50 characters)
    username VARCHAR(50) UNIQUE NOT NULL,
    
    -- Password: Bcrypt hashed password (255 chars to accommodate hash length)
    password VARCHAR(255) NOT NULL,
    
    -- Email: Unique email address for user identification and communication
    email VARCHAR(100) UNIQUE NOT NULL,
    
    -- Role: User access level - 'user' for regular users, 'admin' for administrators
    -- Default is 'user' for security (least privilege principle)
    role ENUM('user', 'admin') DEFAULT 'user',
    
    -- Created timestamp: Automatically set when user is created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================================
-- ROOMS TABLE
-- ==================================================================================
-- Stores information about available meeting rooms
-- Each room has a unique number and defined capacity

CREATE TABLE IF NOT EXISTS rooms (
    -- Primary key: Auto-incrementing unique identifier
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Room number: Unique identifier displayed to users (e.g., "R101")
    room_number VARCHAR(10) UNIQUE NOT NULL,
    
    -- Room name: Descriptive name for the room (e.g., "Conference Room A")
    room_name VARCHAR(100) NOT NULL,
    
    -- Capacity: Maximum number of people the room can accommodate
    capacity INT DEFAULT 1,
    
    -- Created timestamp: Automatically set when room is created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================================
-- BOOKINGS TABLE
-- ==================================================================================
-- Stores room reservations/bookings made by users
-- Links users to rooms with specific time slots
-- Foreign keys ensure referential integrity (cascade deletes for cleanup)

CREATE TABLE IF NOT EXISTS bookings (
    -- Primary key: Auto-incrementing unique identifier
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Foreign key to rooms table: Which room is being booked
    room_id INT NOT NULL,
    
    -- Foreign key to users table: Who is making the booking
    user_id INT NOT NULL,
    
    -- Start time: When the booking begins
    start_time DATETIME NOT NULL,
    
    -- End time: When the booking ends
    end_time DATETIME NOT NULL,
    
    -- Created timestamp: When the booking was made
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints with CASCADE delete:
    -- If a room is deleted, all its bookings are deleted
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    -- If a user is deleted, all their bookings are deleted
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Composite index for efficient queries by room and time range
    -- Used when checking availability and conflicts
    INDEX idx_room_time (room_id, start_time, end_time),
    
    -- Index for efficient user booking queries
    INDEX idx_user (user_id)
);

-- ==================================================================================
-- BOOKING SETTINGS TABLE
-- ==================================================================================
-- Stores configurable system-wide settings for booking constraints
-- Allows administrators to modify booking rules without code changes

CREATE TABLE IF NOT EXISTS booking_settings (
    -- Primary key: Auto-incrementing unique identifier
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Setting key: Unique identifier for the setting (e.g., "min_booking_duration")
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    
    -- Setting value: The actual value of the setting (stored as string)
    setting_value VARCHAR(100) NOT NULL,
    
    -- Description: Human-readable explanation of what this setting controls
    description VARCHAR(255),
    
    -- Updated timestamp: Automatically updated whenever setting is changed
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==================================================================================
-- INITIAL DATA INSERTION
-- ==================================================================================

-- ==================================================================================
-- INSERT USERS
-- ==================================================================================
-- Creates 6 default users: 1 administrator and 5 regular users
-- All users have the same password: "password123"
-- Password is hashed using bcrypt with cost factor 10 for security
-- Hash: $2a$10$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW
--
-- IMPORTANT: In production, change default passwords immediately!
-- Default credentials:
--   Admin: username=admin, password=password123
--   Users: username=user1-5, password=password123

INSERT INTO users (username, password, email, role) VALUES
-- Administrator account with full system access
('admin', '$2a$10$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW', 'admin@example.com', 'admin'),

-- Regular user accounts with standard access
('user1', '$2a$10$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW', 'user1@example.com', 'user'),
('user2', '$2a$10$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW', 'user2@example.com', 'user'),
('user3', '$2a$10$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW', 'user3@example.com', 'user'),
('user4', '$2a$10$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW', 'user4@example.com', 'user'),
('user5', '$2a$10$vONnYIMKzty7JLwHWNf8EO.xrUCHIZ5z.lGkwy2WaoW8usSVL6CeW', 'user5@example.com', 'user');

-- ==================================================================================
-- INSERT ROOMS
-- ==================================================================================
-- Creates 10 meeting rooms with varying capacities
-- Room types:
--   - Conference Rooms: Large spaces for team meetings (8-10 people)
--   - Meeting Rooms: Medium spaces for group discussions (6 people)
--   - Huddle Rooms: Small spaces for quick meetings (4 people)
--   - Board Room: Executive meeting space (12 people)
--   - Training Room: Large space for training sessions (15 people)
--   - Interview Rooms: Small spaces for interviews (3 people)

INSERT INTO rooms (room_number, room_name, capacity) VALUES
-- Large conference rooms for team meetings
('R101', 'Conference Room A', 10),
('R102', 'Conference Room B', 8),

-- Medium meeting rooms for group discussions
('R103', 'Meeting Room 1', 6),
('R104', 'Meeting Room 2', 6),

-- Small huddle rooms for quick meetings
('R105', 'Huddle Room 1', 4),
('R106', 'Huddle Room 2', 4),

-- Executive board room
('R107', 'Board Room', 12),

-- Training and development space
('R108', 'Training Room', 15),

-- Interview rooms for candidate meetings
('R109', 'Interview Room 1', 3),
('R110', 'Interview Room 2', 3);

-- ==================================================================================
-- INSERT BOOKING SETTINGS
-- ==================================================================================
-- Configures default booking duration constraints
-- These settings can be modified by administrators through the admin panel
--
-- Default values:
--   - Minimum duration: 15 minutes (prevents very short bookings)
--   - Maximum duration: 240 minutes / 4 hours (prevents all-day bookings)
--
-- Note: Values are stored as strings but interpreted as integers (minutes)

INSERT INTO booking_settings (setting_key, setting_value, description) VALUES
-- Minimum allowed booking duration (in minutes)
('min_booking_duration', '15', 'Minimum booking duration in minutes'),

-- Maximum allowed booking duration (in minutes)
('max_booking_duration', '240', 'Maximum booking duration in minutes (4 hours)');
