// ==================================================================================
// Room Booking System - Frontend Application
// ==================================================================================
// Single Page Application (SPA) for managing room bookings
// Features:
//   - User authentication (login/logout)
//   - Room browsing and availability checking
//   - Booking creation and management
//   - Calendar views (day/week/month)
//   - Admin panel for system management
// ==================================================================================

// ==================================================================================
// API CONFIGURATION
// ==================================================================================

// Base URL for all API calls - proxied through nginx to backend server
const API_BASE_URL = '/api';

// Application version for debugging and cache management
const APP_VERSION = 'v2.0-fix-login';

// Log application initialization for debugging
console.log('========================================');
console.log('Room Booking App Version:', APP_VERSION);
console.log('App.js loaded successfully');
console.log('API_BASE_URL:', API_BASE_URL);
console.log('========================================');

// ==================================================================================
// STATE MANAGEMENT
// ==================================================================================
// Global application state stored in memory

// JWT authentication token - persisted in localStorage for session management
// Retrieved on page load to maintain login across refreshes
let authToken = localStorage.getItem('authToken');

// Current logged-in user object with properties: id, username, email, role
// Populated after successful login
let currentUser = null;

// Array of available rooms loaded from the backend
// Used to populate dropdowns and display room information
let rooms = [];

console.log('Initial authToken:', authToken);

// ==================================================================================
// DOM ELEMENT REFERENCES
// ==================================================================================
// Cached references to frequently accessed DOM elements for better performance

// Authentication screen elements
const loginScreen = document.getElementById('loginScreen');  // Login form container
const appScreen = document.getElementById('appScreen');      // Main app container (shown after login)
const loginForm = document.getElementById('loginForm');      // Login form element
const loginError = document.getElementById('loginError');    // Login error message display
const logoutBtn = document.getElementById('logoutBtn');      // Logout button
const currentUserSpan = document.getElementById('currentUser'); // Current user display

// Booking form elements
const bookingForm = document.getElementById('bookingForm');  // Booking creation form
const roomSelect = document.getElementById('roomSelect');    // Room selection dropdown
const bookingDate = document.getElementById('bookingDate'); // Date picker for bookings
const bookingError = document.getElementById('bookingError'); // Booking error messages
const bookingSuccess = document.getElementById('bookingSuccess'); // Booking success messages
const bookingsList = document.getElementById('bookingsList'); // User's bookings list container

// Availability checking elements
const availabilityCard = document.getElementById('availabilityCard'); // Availability display card
const availabilityTimeline = document.getElementById('availabilityTimeline'); // Timeline visualization
const selectedRoomName = document.getElementById('selectedRoomName'); // Selected room display

console.log('DOM elements loaded:');
console.log('loginForm:', loginForm);
console.log('loginScreen:', loginScreen);
console.log('appScreen:', appScreen);

// ==================================================================================
// UTILITY FUNCTIONS
// ==================================================================================

/**
 * Display error message to user with auto-hide after 5 seconds
 * @param {HTMLElement} element - The error message container element
 * @param {string} message - Error message to display
 */
function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
    // Auto-hide error message after 5 seconds
    setTimeout(() => element.classList.remove('show'), 5000);
}

/**
 * Display success message to user with auto-hide after 5 seconds
 * @param {HTMLElement} element - The success message container element
 * @param {string} message - Success message to display
 */
function showSuccess(element, message) {
    element.textContent = message;
    element.classList.add('show');
    // Auto-hide success message after 5 seconds
    setTimeout(() => element.classList.remove('show'), 5000);
}

/**
 * Format ISO datetime string to readable format with date and time
 * @param {string} dateString - ISO 8601 datetime string
 * @returns {string} Formatted string like "Dec 28, 2025, 02:30 PM"
 */
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format ISO datetime string to time only
 * @param {string} dateString - ISO 8601 datetime string
 * @returns {string} Formatted time string like "02:30 PM"
 */
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================================================================================
// API FUNCTIONS
// ==================================================================================

/**
 * Generic API call wrapper function
 * Handles authentication headers, error handling, and JSON parsing
 * @param {string} endpoint - API endpoint path (e.g., '/rooms', '/auth/login')
 * @param {Object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Object>} Parsed JSON response from API
 * @throws {Error} If API returns error response
 */
async function apiCall(endpoint, options = {}) {
    // Prepare headers with JSON content type
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Add JWT token to Authorization header if user is logged in
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Make HTTP request to API
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    // Parse JSON response
    const data = await response.json();

    // Throw error if request was not successful
    if (!response.ok) {
        throw new Error(data.error || 'An error occurred');
    }

    return data;
}

// ==================================================================================
// AUTHENTICATION
// ==================================================================================

/**
 * Authenticate user with backend API
 * On success: stores token, updates state, shows app, reveals admin elements if applicable
 * @param {string} username - Username entered in login form
 * @param {string} password - Password entered in login form
 */
async function login(username, password) {
    try {
        // Call login API endpoint
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        console.log('Login response:', data);
        
        // Store authentication token and user info in application state
        authToken = data.token;
        currentUser = data.user;
        
        console.log('Current user after login:', currentUser);
        console.log('User role after login:', currentUser ? currentUser.role : 'undefined');
        
        // Persist token in localStorage for session management
        localStorage.setItem('authToken', authToken);
        
        // Switch to main application screen
        showApp();
        
        // Show admin-only UI elements if user has admin role
        if (currentUser && currentUser.role === 'admin') {
            console.log('Logged in user is admin, showing admin elements');
            document.querySelectorAll('.admin-only').forEach(el => {
                console.log('Showing admin element:', el);
                el.style.display = '';
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        // Display error message to user
        if (loginError) {
            showError(loginError, error.message || 'Login failed');
        } else {
            alert('Login failed: ' + (error.message || 'Unknown error'));
        }
    }
}

/**
 * Log out current user
 * Clears authentication state and returns to login screen
 */
function logout() {
    // Clear authentication state
    authToken = null;
    currentUser = null;
    // Remove token from localStorage
    localStorage.removeItem('authToken');
    // Return to login screen
    showLogin();
}

/**
 * Show login screen and hide main application
 */
function showLogin() {
    loginScreen.classList.add('active');
    appScreen.classList.remove('active');
}

/**
 * Show main application screen after successful login
 * Initializes app state: loads rooms, bookings, sets date defaults, manages admin UI
 */
function showApp() {
    // Switch to application screen
    loginScreen.classList.remove('active');
    appScreen.classList.add('active');
    
    // Display welcome message with username
    currentUserSpan.textContent = `Welcome, ${currentUser.username}!`;
    
    // Load initial data
    loadRooms();
    loadMyBookings();
    
    // Set default date to today in booking form
    const today = new Date().toISOString().split('T')[0];
    bookingDate.value = today;
    
    // Prevent booking in the past by setting minimum date to today
    bookingDate.min = today;
    
    // Show or hide admin-only elements based on user role
    console.log('Checking user role for admin access:', currentUser.role);
    if (currentUser && currentUser.role === 'admin') {
        console.log('User is admin - showing admin elements');
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = '';
        });
    } else {
        console.log('User is not admin - hiding admin elements');
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
}

// ==================================================================================
// ROOM MANAGEMENT
// ==================================================================================

/**
 * Load all available rooms from backend and populate room selection dropdown
 * Also loads and displays current booking constraints (min/max duration)
 */
async function loadRooms() {
    try {
        // Fetch all rooms from API
        rooms = await apiCall('/rooms');
        
        // Clear and repopulate room select dropdown
        roomSelect.innerHTML = '<option value="">-- Select a room --</option>';
        
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            // Display format: "R101 - Conference Room A (Capacity: 10)"
            option.textContent = `${room.room_number} - ${room.room_name} (Capacity: ${room.capacity})`;
            roomSelect.appendChild(option);
        });
        
        // Load and display current booking constraints
        await updateBookingFormConstraints();
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

/**
 * Fetch and display booking duration constraints from backend settings
 * Shows minimum and maximum booking durations with user-friendly formatting
 */
async function updateBookingFormConstraints() {
    try {
        // Get current booking settings from API
        const settings = await apiCall('/settings');
        const constraintsDiv = document.getElementById('bookingConstraints');
        
        if (settings && settings.min_booking_duration && settings.max_booking_duration) {
            const minMinutes = settings.min_booking_duration;
            const maxMinutes = settings.max_booking_duration;
            
            // Format maximum duration in user-friendly way (e.g., "4 hours" instead of "240 minutes")
            let maxDisplay = `${maxMinutes} minutes`;
            if (maxMinutes >= 60) {
                const hours = Math.floor(maxMinutes / 60);
                const mins = maxMinutes % 60;
                if (mins === 0) {
                    maxDisplay = `${hours} hour${hours > 1 ? 's' : ''}`;
                } else {
                    maxDisplay = `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`;
                }
            }
            
            // Display constraints to user
            constraintsDiv.innerHTML = `
                <p>📌 Booking duration: min ${minMinutes} minutes, max ${maxDisplay}</p>
                <p>📌 Bookings must be within the same day</p>
            `;
        }
    } catch (error) {
        console.error('Error loading booking constraints:', error);
    }
}

// ==================================================================================
// BOOKING MANAGEMENT
// ==================================================================================

/**
 * Create a new booking via API
 * @param {number} roomId - ID of the room to book
 * @param {string} startTime - ISO 8601 datetime string for booking start
 * @param {string} endTime - ISO 8601 datetime string for booking end
 */
async function createBooking(roomId, startTime, endTime) {
    try {
        // Send booking request to API
        await apiCall('/bookings', {
            method: 'POST',
            body: JSON.stringify({
                room_id: roomId,
                start_time: startTime,
                end_time: endTime
            })
        });

        // Show success message
        showSuccess(bookingSuccess, ' Room booked successfully!');
        
        // Reset form to default state
        bookingForm.reset();
        const today = new Date().toISOString().split('T')[0];
        bookingDate.value = today;
        
        // Refresh bookings list to show new booking
        loadMyBookings();
        
        // Refresh calendar view if calendar date is set
        if (document.getElementById('calendarDate').value) {
            renderCalendar();
        }
        
        // Hide availability card
        availabilityCard.style.display = 'none';
    } catch (error) {
        // Display error message from API (e.g., room already booked, invalid duration, etc.)
        showError(bookingError, error.message);
    }
}

/**
 * Load and display current user's bookings
 * Categorizes bookings as past or upcoming and provides cancel option for upcoming bookings
 */
async function loadMyBookings() {
    try {
        // Fetch user's bookings from API
        const bookings = await apiCall('/bookings');
        
        // Show empty state if no bookings exist
        if (bookings.length === 0) {
            bookingsList.innerHTML = `
                <div class="empty-state">
                    <h3>📅 No bookings yet</h3>
                    <p>Book a room to get started!</p>
                </div>
            `;
            return;
        }

        // Render bookings list
        bookingsList.innerHTML = bookings.map(booking => {
            const startDate = new Date(booking.start_time);
            const endDate = new Date(booking.end_time);
            const now = new Date();
            // Determine if booking is in the past
            const isPast = endDate < now;
            
            return `
                <div class="booking-item">
                    <div class="booking-info">
                        <h4>🏢 ${booking.room_number} - ${booking.room_name}</h4>
                        <p><strong>📅 Date:</strong> ${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        <p><strong>⏰ Time:</strong> ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}</p>
                        <span class="booking-status ${isPast ? 'status-past' : 'status-upcoming'}">
                            ${isPast ? 'Past' : 'Upcoming'}
                        </span>
                    </div>
                    ${!isPast ? `<button class="btn btn-danger" onclick="deleteBooking(${booking.id})">Cancel Booking</button>` : ''}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading bookings:', error);
        // Show error state if API call fails
        bookingsList.innerHTML = `
            <div class="empty-state">
                <h3> Error loading bookings</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * Delete a booking (cancel reservation)
 * @param {number} bookingId - ID of the booking to delete
 */
async function deleteBooking(bookingId) {
    // Confirm cancellation with user
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }

    try {
        // Send delete request to API
        await apiCall(`/bookings/${bookingId}`, {
            method: 'DELETE'
        });
        loadMyBookings();
        
        // Refresh calendar view if calendar date is set
        if (document.getElementById('calendarDate').value) {
            renderCalendar();
        }
    } catch (error) {
        alert('Error canceling booking: ' + error.message);
    }
}

async function loadAvailability(roomId, date) {
    try {
        console.log('Loading availability for room:', roomId, 'date:', date);
        const bookings = await apiCall(`/rooms/${roomId}/availability?date=${date}`);
        console.log('Received bookings:', bookings);
        const room = rooms.find(r => r.id == roomId);
        
        if (!room) {
            console.error('Room not found:', roomId);
            return;
        }
        
        selectedRoomName.textContent = `${room.room_number} - ${room.room_name} on ${new Date(date).toLocaleDateString()}`;
        
        if (bookings.length === 0) {
            availabilityTimeline.innerHTML = `
                <div class="timeline-slot available">
                    <p><strong> Room is available all day!</strong></p>
                </div>
            `;
        } else {
            availabilityTimeline.innerHTML = bookings.map(booking => `
                <div class="timeline-slot booked">
                    <p><strong> Booked:</strong> ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}</p>
                </div>
            `).join('');
        }
        
        availabilityCard.style.display = 'block';
        console.log('Availability card displayed');
    } catch (error) {
        console.error('Error loading availability:', error);
        availabilityCard.style.display = 'none';
    }
}

// ==================================================================================
// EVENT LISTENERS - FORM SUBMISSION HANDLERS
// ==================================================================================
// Set up event listeners for user interactions after DOM is loaded

console.log('Setting up event listeners...');

// ==================================================================================
// LOGIN FORM HANDLER
// ==================================================================================

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        console.log('Login form submitted!');
        e.preventDefault();
        
        // Get credentials from form inputs
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        console.log('Attempting login with username:', username);
        login(username, password);
    });
    console.log('Login form event listener attached');
} else {
    console.error('loginForm element not found!');
}

// ==================================================================================
// LOGOUT BUTTON HANDLER
// ==================================================================================

if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
    console.log('Logout button event listener attached');
}

// ==================================================================================
// BOOKING FORM HANDLER
// ==================================================================================
// Handles new booking creation from the booking form

bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form values
    const roomId = roomSelect.value;
    const date = bookingDate.value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    // Validate all fields are filled
    if (!roomId || !date || !startTime || !endTime) {
        showError(bookingError, 'Please fill in all fields');
        return;
    }
    
    // Combine date and time into ISO 8601 datetime format
    const startDateTime = `${date}T${startTime}:00`;
    const endDateTime = `${date}T${endTime}:00`;
    
    // Submit booking
    createBooking(roomId, startDateTime, endDateTime);
});

// Room and date change - show availability
roomSelect.addEventListener('change', () => {
    if (roomSelect.value && bookingDate.value) {
        loadAvailability(roomSelect.value, bookingDate.value);
    } else {
        availabilityCard.style.display = 'none';
    }
});

bookingDate.addEventListener('change', () => {
    if (roomSelect.value && bookingDate.value) {
        loadAvailability(roomSelect.value, bookingDate.value);
    } else {
        availabilityCard.style.display = 'none';
    }
});

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');
        
        // Load data for the active tab
        if (tabName === 'myBookings') {
            loadMyBookings();
        } else if (tabName === 'calendar') {
            loadCalendar();
        } else if (tabName === 'adminPanel') {
            loadAdminPanel();
        }
    });
});

// ==================== CALENDAR FUNCTIONS ====================

async function loadCalendar() {
    const calendarDate = document.getElementById('calendarDate');
    const calendarView = document.getElementById('calendarView');
    const calendarRoom = document.getElementById('calendarRoom');
    const calendarContent = document.getElementById('calendarContent');
    
    console.log('loadCalendar() called');
    
    // Make sure rooms are loaded first
    if (rooms.length === 0) {
        console.log('Rooms not loaded yet, loading now...');
        await loadRooms();
        console.log('Rooms loaded:', rooms.length);
    } else {
        console.log('Rooms already loaded:', rooms.length);
    }
    
    // Set default date to today
    if (!calendarDate.value) {
        calendarDate.value = new Date().toISOString().split('T')[0];
        console.log('Set default date to:', calendarDate.value);
    }
    
    // Populate room select
    if (calendarRoom.options.length === 1) {
        console.log('Populating calendar room dropdown with', rooms.length, 'rooms');
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = `${room.room_number} - ${room.room_name}`;
            calendarRoom.appendChild(option);
        });
    }
    
    console.log('Calling renderCalendar()');
    await renderCalendar();
}

async function renderCalendar() {
    const calendarDate = document.getElementById('calendarDate').value;
    const calendarView = document.getElementById('calendarView').value;
    const calendarRoom = document.getElementById('calendarRoom').value;
    const calendarContent = document.getElementById('calendarContent');
    
    if (!calendarDate) return;
    
    try {
        const date = new Date(calendarDate);
        let startDate, endDate;
        
        if (calendarView === 'day') {
            startDate = endDate = calendarDate;
        } else if (calendarView === 'week') {
            const dayOfWeek = date.getDay();
            const diff = date.getDate() - dayOfWeek;
            startDate = new Date(date.setDate(diff)).toISOString().split('T')[0];
            endDate = new Date(date.setDate(diff + 6)).toISOString().split('T')[0];
        } else if (calendarView === 'month') {
            startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
            endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        }
        
        let url = `/calendar/bookings?start_date=${startDate}&end_date=${endDate}`;
        if (calendarRoom) {
            url += `&room_id=${calendarRoom}`;
        }
        
        console.log('Fetching calendar bookings from:', url);
        const bookings = await apiCall(url);
        console.log('Received bookings:', bookings);
        
        if (calendarView === 'day') {
            renderDayView(bookings, calendarDate);
        } else if (calendarView === 'week') {
            renderWeekView(bookings, startDate, endDate);
        } else if (calendarView === 'month') {
            renderMonthView(bookings, startDate, endDate);
        }
    } catch (error) {
        calendarContent.innerHTML = `<p class="error">Error loading calendar: ${error.message}</p>`;
    }
}

function renderDayView(bookings, date) {
    const calendarContent = document.getElementById('calendarContent');
    const calendarRoom = document.getElementById('calendarRoom').value;
    
    console.log('renderDayView() called with', bookings.length, 'bookings');
    console.log('Rooms array has', rooms.length, 'rooms');
    
    const roomsToShow = calendarRoom ? 
        rooms.filter(r => r.id == calendarRoom) : 
        rooms;
    
    console.log('Rooms to display:', roomsToShow.length);
    
    let html = '<div class="day-view"><h4>' + new Date(date).toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    }) + '</h4>';
    
    if (roomsToShow.length === 0) {
        html += '<p class="error"> No rooms available. Please wait for rooms to load or refresh the page.</p>';
    }
    
    roomsToShow.forEach(room => {
        const roomBookings = bookings.filter(b => b.room_id === room.id);
        
        html += `
            <div class="room-schedule">
                <h5>${room.room_number} - ${room.room_name} (${room.capacity} people)</h5>
                <div class="timeline">
        `;
        
        if (roomBookings.length === 0) {
            html += '<p class="available"> Available all day</p>';
        } else {
            roomBookings.forEach(booking => {
                const isOwnBooking = booking.user_id === currentUser.id;
                html += `
                    <div class="booking-slot ${isOwnBooking ? 'own-booking' : ''}">
                        <strong>⏰ ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}</strong>
                        <span>Booked by: ${booking.username}</span>
                    </div>
                `;
            });
        }
        
        html += '</div></div>';
    });
    
    html += '</div>';
    console.log('Day view HTML generated, length:', html.length);
    calendarContent.innerHTML = html;
}

function renderWeekView(bookings, startDate, endDate) {
    const calendarContent = document.getElementById('calendarContent');
    const calendarRoom = document.getElementById('calendarRoom').value;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d).toISOString().split('T')[0]);
    }
    
    let html = '<div class="week-view"><table class="calendar-table"><thead><tr><th>Room</th>';
    
    days.forEach(day => {
        const date = new Date(day);
        html += `<th>${date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}</th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    const roomsToShow = calendarRoom ? 
        rooms.filter(r => r.id == calendarRoom) : 
        rooms;
    
    roomsToShow.forEach(room => {
        html += `<tr><td><strong>${room.room_number}</strong></td>`;
        
        days.forEach(day => {
            const dayBookings = bookings.filter(b => 
                b.room_id === room.id && 
                b.start_time.startsWith(day)
            );
            
            html += '<td>';
            if (dayBookings.length === 0) {
                html += '<span class="badge badge-success">Free</span>';
            } else {
                html += `<span class="badge badge-danger">${dayBookings.length} booking(s)</span>`;
                dayBookings.forEach(b => {
                    const isOwnBooking = b.user_id === currentUser.id;
                    html += `<div class="mini-booking ${isOwnBooking ? 'own' : ''}" title="${b.room_number} - ${b.username}">${formatTime(b.start_time)}</div>`;
                });
            }
            html += '</td>';
        });
        
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    calendarContent.innerHTML = html;
}

function renderMonthView(bookings, startDate, endDate) {
    const calendarContent = document.getElementById('calendarContent');
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d).toISOString().split('T')[0]);
    }
    
    const monthName = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    let html = `<div class="month-view"><h4>${monthName}</h4><div class="month-grid">`;
    
    dates.forEach(date => {
        const dayBookings = bookings.filter(b => b.start_time.startsWith(date));
        const dayNum = new Date(date).getDate();
        
        // Group bookings by room
        const roomBookings = {};
        dayBookings.forEach(b => {
            if (!roomBookings[b.room_number]) {
                roomBookings[b.room_number] = [];
            }
            roomBookings[b.room_number].push(b);
        });
        
        let bookingDetails = '';
        Object.keys(roomBookings).forEach(roomNum => {
            bookingDetails += `<div class="room-booking-count">${roomNum}: ${roomBookings[roomNum].length}</div>`;
        });
        
        html += `
            <div class="month-day ${dayBookings.length > 0 ? 'has-bookings' : ''}">
                <div class="day-number">${dayNum}</div>
                <div class="day-bookings">
                    ${dayBookings.length > 0 ? bookingDetails : '<span class="free-day">Free</span>'}
                </div>
            </div>
        `;
    });
    
    html += '</div></div>';
    calendarContent.innerHTML = html;
}

document.getElementById('calendarRefresh')?.addEventListener('click', renderCalendar);
document.getElementById('calendarView')?.addEventListener('change', renderCalendar);
document.getElementById('calendarDate')?.addEventListener('change', renderCalendar);
document.getElementById('calendarRoom')?.addEventListener('change', renderCalendar);

// ==================== ADMIN FUNCTIONS ====================

async function loadAdminPanel() {
    if (currentUser.role !== 'admin') return;
    
    try {
        const users = await apiCall('/admin/users');
        displayUsers(users);
        
        const allRooms = await apiCall('/rooms');
        displayRooms(allRooms);
        
        const allBookings = await apiCall('/admin/bookings');
        displayAdminBookings(allBookings);
        
        // Load current settings
        const settings = await apiCall('/admin/settings');
        displaySettings(settings);
    } catch (error) {
        console.error('Error loading admin panel:', error);
    }
}

function displayUsers(users) {
    const usersTable = document.getElementById('usersTable');
    
    if (users.length === 0) {
        usersTable.innerHTML = '<p>No users found.</p>';
        return;
    }
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created At</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        const isCurrentUser = user.id === currentUser.id;
        const deleteButton = isCurrentUser 
            ? '<span class="text-muted">Cannot delete yourself</span>' 
            : `<button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id}, '${user.username}')">Delete</button>`;
        
        html += `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td><span class="badge ${user.role === 'admin' ? 'badge-danger' : 'badge-info'}">${user.role}</span></td>
                <td>${formatDateTime(user.created_at)}</td>
                <td>${deleteButton}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    usersTable.innerHTML = html;
}

function displayRooms(rooms) {
    const roomsTable = document.getElementById('roomsTable');
    
    if (rooms.length === 0) {
        roomsTable.innerHTML = '<p>No rooms found.</p>';
        return;
    }
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Room Number</th>
                    <th>Room Name</th>
                    <th>Capacity</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    rooms.forEach(room => {
        html += `
            <tr>
                <td>${room.id}</td>
                <td>${room.room_number}</td>
                <td>${room.room_name}</td>
                <td>${room.capacity} people</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteRoom(${room.id}, '${room.room_number}')">Delete</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    roomsTable.innerHTML = html;
}

function displayAdminBookings(bookings) {
    const adminBookingsList = document.getElementById('adminBookingsList');
    
    if (bookings.length === 0) {
        adminBookingsList.innerHTML = '<p>No bookings found.</p>';
        return;
    }
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Room</th>
                    <th>User</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    bookings.forEach(booking => {
        html += `
            <tr>
                <td>${booking.id}</td>
                <td>${booking.room_number} - ${booking.room_name}</td>
                <td>${booking.username}</td>
                <td>${formatDateTime(booking.start_time)}</td>
                <td>${formatDateTime(booking.end_time)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="adminDeleteBooking(${booking.id})">Delete</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    adminBookingsList.innerHTML = html;
}

function displaySettings(settings) {
    const minDurationInput = document.getElementById('minDuration');
    const maxDurationInput = document.getElementById('maxDuration');
    
    if (settings.min_booking_duration) {
        minDurationInput.value = settings.min_booking_duration.value;
    }
    
    if (settings.max_booking_duration) {
        maxDurationInput.value = settings.max_booking_duration.value;
    }
}

async function adminDeleteBooking(bookingId) {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    
    try {
        await apiCall(`/admin/bookings/${bookingId}`, { method: 'DELETE' });
        loadAdminPanel();
        
        // Refresh calendar view if calendar date is set
        if (document.getElementById('calendarDate').value) {
            renderCalendar();
        }
    } catch (error) {
        alert('Error deleting booking: ' + error.message);
    }
}

async function deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to delete user "${username}"? This will also delete all their bookings.`)) return;
    
    try {
        await apiCall(`/admin/users/${userId}`, { method: 'DELETE' });
        alert(`User "${username}" deleted successfully.`);
        loadAdminPanel();
    } catch (error) {
        alert('Error deleting user: ' + error.message);
    }
}

async function deleteRoom(roomId, roomNumber) {
    if (!confirm(`Are you sure you want to delete room "${roomNumber}"?`)) return;
    
    try {
        await apiCall(`/admin/rooms/${roomId}`, { method: 'DELETE' });
        alert(`Room "${roomNumber}" deleted successfully.`);
        loadAdminPanel();
        loadRooms(); // Refresh room list in booking form
    } catch (error) {
        alert('Error deleting room: ' + error.message);
    }
}

// Create user form
document.getElementById('createUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const createUserError = document.getElementById('createUserError');
    const createUserSuccess = document.getElementById('createUserSuccess');
    
    const username = document.getElementById('newUsername').value;
    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;
    
    try {
        await apiCall('/admin/users', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, role })
        });
        
        showSuccess(createUserSuccess, 'User created successfully!');
        document.getElementById('createUserForm').reset();
        loadAdminPanel();
    } catch (error) {
        showError(createUserError, error.message);
    }
});

// Create room form
document.getElementById('createRoomForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const createRoomError = document.getElementById('createRoomError');
    const createRoomSuccess = document.getElementById('createRoomSuccess');
    
    const room_number = document.getElementById('newRoomNumber').value;
    const room_name = document.getElementById('newRoomName').value;
    const capacity = parseInt(document.getElementById('newRoomCapacity').value);
    
    try {
        await apiCall('/admin/rooms', {
            method: 'POST',
            body: JSON.stringify({ room_number, room_name, capacity })
        });
        
        showSuccess(createRoomSuccess, 'Room created successfully!');
        document.getElementById('createRoomForm').reset();
        loadAdminPanel();
        loadRooms(); // Refresh room list in booking form
    } catch (error) {
        showError(createRoomError, error.message);
    }
});

// Settings form handler
document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const settingsError = document.getElementById('settingsError');
    const settingsSuccess = document.getElementById('settingsSuccess');
    
    const min_booking_duration = parseInt(document.getElementById('minDuration').value);
    const max_booking_duration = parseInt(document.getElementById('maxDuration').value);
    
    // Validate that min < max
    if (min_booking_duration >= max_booking_duration) {
        showError(settingsError, 'Minimum duration must be less than maximum duration.');
        return;
    }
    
    try {
        const response = await apiCall('/admin/settings', {
            method: 'PUT',
            body: JSON.stringify({ min_booking_duration, max_booking_duration })
        });
        
        showSuccess(settingsSuccess, response.message || 'Settings updated successfully!');
        
        // Update the booking form constraints display
        updateBookingFormConstraints();
    } catch (error) {
        showError(settingsError, error.message);
    }
});

// ==================================================================================
// APPLICATION INITIALIZATION
// ==================================================================================
// Runs when page loads - verifies authentication and shows appropriate screen

if (authToken) {
    // User has token in localStorage - verify it's still valid
    apiCall('/auth/me')
        .then(user => {
            console.log('User loaded:', user);
            console.log('User role:', user.role);
            currentUser = user;
            
            // Show main application
            showApp();
            
            // Show admin-only UI elements if user is an administrator
            if (user.role === 'admin') {
                console.log('User is admin, showing admin elements');
                document.querySelectorAll('.admin-only').forEach(el => {
                    console.log('Showing admin element:', el);
                    el.style.display = '';
                });
            }        })
        .catch(() => {
            // Token is invalid or expired - log user out
            logout();
        });
} else {
    // No token found - show login screen
    showLogin();
}
