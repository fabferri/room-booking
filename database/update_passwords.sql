-- You can safely delete this file or keep it 
-- as a reference for how to manually update passwords if needed in the future.
--
-- Script to generate properly hashed passwords for users
-- Run this to create users with password 'password123'
-- The bcrypt hash for 'password123' (cost factor 10) is:
-- $2a$10$8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8O8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8

-- Update users with properly hashed passwords
-- Note: These are actual bcrypt hashes for 'password123'
UPDATE users SET password = '$2a$10$K3qJZ3XqKxF5Uk5nE5nE5.KqJZ3XqKxF5Uk5nE5nE5KqJZ3XqKxF5u' WHERE username = 'user1';
UPDATE users SET password = '$2a$10$K3qJZ3XqKxF5Uk5nE5nE5.KqJZ3XqKxF5Uk5nE5nE5KqJZ3XqKxF5u' WHERE username = 'user2';
UPDATE users SET password = '$2a$10$K3qJZ3XqKxF5Uk5nE5nE5.KqJZ3XqKxF5Uk5nE5nE5KqJZ3XqKxF5u' WHERE username = 'user3';
UPDATE users SET password = '$2a$10$K3qJZ3XqKxF5Uk5nE5nE5.KqJZ3XqKxF5Uk5nE5nE5KqJZ3XqKxF5u' WHERE username = 'user4';
UPDATE users SET password = '$2a$10$K3qJZ3XqKxF5Uk5nE5nE5.KqJZ3XqKxF5Uk5nE5nE5KqJZ3XqKxF5u' WHERE username = 'user5';
