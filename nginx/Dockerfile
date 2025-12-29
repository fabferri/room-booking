# ==================================================================================
# Dockerfile for Room Booking System Nginx Web Server
# ==================================================================================
# Builds a containerized Nginx server that:
#   1. Serves static frontend files (HTML, CSS, JavaScript)
#   2. Acts as reverse proxy for backend API requests
#   3. Handles SPA routing by redirecting all requests to index.html
# Based on Alpine Linux for minimal image size (~25MB)
# ==================================================================================

# Use official Nginx image with Alpine Linux
# Alpine version is much smaller than standard nginx image (~25MB vs ~140MB)
FROM nginx:alpine

# Copy custom Nginx configuration file
# This configures the reverse proxy and static file serving behavior
# Source: nginx/nginx.conf in project root
# Destination: Nginx's main configuration directory
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy frontend application files (HTML, CSS, JS)
# These are the static files for the single-page application
# Source: frontend/ directory in project root
# Destination: Nginx's default static file serving directory
COPY frontend /usr/share/nginx/html

# Set proper permissions for served files
# 755 = owner can read/write/execute, group and others can read/execute
# chown ensures nginx user owns the files (security best practice)
RUN chmod -R 755 /usr/share/nginx/html && chown -R nginx:nginx /usr/share/nginx/html

# Document that the container listens on port 80
# This is informational only - actual port publishing happens in docker-compose.yml
EXPOSE 80

# Start Nginx in foreground mode (required for Docker)
# "daemon off" keeps Nginx running in foreground so container doesn't exit
# This is necessary because Docker containers stop when main process exits
CMD ["nginx", "-g", "daemon off;"]