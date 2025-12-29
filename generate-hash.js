// ==================================================================================
// Password Hash Generator for Room Booking System
// ==================================================================================
// This utility script generates bcrypt password hashes for use in the database.
// 
// Purpose:
//   - Generate secure bcrypt hashes for initial user passwords
//   - Verify that generated hashes work correctly
//   - Useful for creating/updating passwords in init.sql or database
//
// Usage:
//   node generate-hash.js
//
// To generate hash for different password:
//   1. Change the 'password' variable below
//   2. Run: node generate-hash.js
//   3. Copy the generated hash to init.sql or use in SQL UPDATE statement
//
// Security Note:
//   - Never commit real passwords to version control
//   - Always use strong, unique passwords in production
//   - Cost factor of 10 provides good balance of security and performance
// ==================================================================================

// Import bcryptjs library for password hashing
const bcrypt = require('bcryptjs');

/**
 * Generates a bcrypt hash for a given password and verifies it works
 * 
 * Bcrypt is a one-way hashing function designed for passwords:
 *   - Incorporates a salt to protect against rainbow table attacks
 *   - Uses a cost factor to make brute-force attacks computationally expensive
 *   - Cost factor of 10 means 2^10 (1024) iterations
 */
async function generateHash() {
    // Password to hash - change this to generate hash for different password
    const password = 'password123';
    
    // Generate bcrypt hash with cost factor of 10
    // Higher cost = more secure but slower to compute
    // Cost factor of 10 is standard for most applications
    const hash = await bcrypt.hash(password, 10);
    
    // Display the generated hash
    console.log('Bcrypt hash for "password123":');
    console.log(hash);
    
    // Verify the hash works by comparing original password with generated hash
    // This ensures the hash was generated correctly
    const isValid = await bcrypt.compare(password, hash);
    console.log('\nVerification:', isValid ? 'SUCCESS' : 'FAILED');
}

// Execute the hash generation
generateHash();
