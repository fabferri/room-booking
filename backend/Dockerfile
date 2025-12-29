# ==================================================================================
# Dockerfile for Room Booking System Backend API
# ==================================================================================
# Builds a containerized Node.js Express application
# Based on Alpine Linux for minimal image size (~150MB vs ~900MB for standard node)
# ==================================================================================

# Use official Node.js 18 image with Alpine Linux
# Alpine is a minimal Linux distribution that reduces image size
# Node 18 is the LTS (Long Term Support) version
FROM node:18-alpine

# Set working directory inside the container
# All subsequent commands will run from this directory
WORKDIR /app

# Copy package.json and package-lock.json first (before source code)
# This leverages Docker layer caching - dependencies only reinstall when these files change
# Speeds up subsequent builds when only source code changes
COPY package*.json ./

# Install Node.js dependencies
# Uses package-lock.json for deterministic dependency versions
# Runs as a separate layer so it's cached unless package files change
RUN npm install

# Copy the rest of the application source code
# This includes server.js and any other application files
# Runs after npm install to maximize cache efficiency
COPY . .

# Document that the container listens on port 3000
# This is informational only - doesn't actually publish the port
# Actual port publishing happens in docker-compose.yml
EXPOSE 3000

# Define the command to run when container starts
# Starts the Express server using Node.js
# Uses exec form (JSON array) which is preferred over shell form
# This makes the node process PID 1, allowing proper signal handling
CMD ["node", "server.js"]
