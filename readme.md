# WedPlan Backend API

Backend API for **WedPlan**, a wedding service booking platform where customers can discover wedding services, vendors can manage their services and bookings, and admins can manage users, services, and platform activities.

## Features

- User management (Customer, Vendor, Admin)
- Vendor service management
- Service approval system
- Service search and filtering
- Customer booking management
- Vendor booking management
- Booking status updates
- Stripe payment verification
- Vendor premium subscription management
- Admin dashboard statistics
- User blocking and unblocking
- Admin service management

## Technologies Used

- Node.js
- Express.js
- MongoDB
- Better Auth
- Stripe
- JavaScript
- dotenv
- CORS

## Project Setup

### 1. Clone the repository

```bash
git clone YOUR_BACKEND_REPOSITORY_URL
```

### 2. Navigate to the project directory

```bash
cd your-backend-folder
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the root directory.

```env
PORT=5000

DB_USER=your_mongodb_username
DB_PASSWORD=your_mongodb_password

FRONTEND_URL=http://localhost:3000

STRIPE_SECRET_KEY=your_stripe_secret_key
```

Replace the placeholder values with your actual credentials.

### 5. Run the server

```bash
npm start
```

For development:

```bash
npm run dev
```

Server runs at:

```text
http://localhost:5000
```

## Database

**Database Name:** `phWedPlanDB`

### Collections

| Collection | Description |
|---|---|
| `user` | Stores registered users and their roles |
| `services` | Stores wedding services posted by vendors |
| `session` | Stores authentication sessions |
| `bookings` | Stores customer booking information |
| `payments` | Stores payment verification records |
| `transactions` | Stores transaction information |

## API Documentation

Base URL:

```text
http://localhost:5000
```

### General

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Check server status |

### User APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users` | Get all users |
| GET | `/users/:id` | Get user details |
| GET | `/users/:id/premium` | Check vendor premium information |
| PATCH | `/users/:id` | Update user information |
| GET | `/admin/users` | Get users for admin management |
| PATCH | `/admin/users/:id/status` | Update user status |

### Service APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/services` | Get approved services |
| POST | `/services` | Create a new service |
| GET | `/services/:serviceId` | Get service details |
| PUT | `/services/:id` | Update a service |
| DELETE | `/services/:id` | Delete a service |
| GET | `/vendor/services?vendorId=ID` | Get vendor services |
| GET | `/vendor/services/count/:vendorId` | Get vendor service count |
| GET | `/admin/services` | Get services for admin |
| PATCH | `/admin/services/:id/status` | Update service approval status |

**Service Notes:**
- Newly created services receive a `Pending` status.
- Public service listing returns approved services.
- Service listing supports search, category, location, and sorting filters.

### Booking APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/bookings` | Create a booking |
| GET | `/customer/bookings` | Get customer bookings |
| GET | `/customer/bookings/:customerId` | Get bookings by customer |
| GET | `/vendor/bookings?vendorId=ID` | Get vendor bookings |
| GET | `/vendor/bookings/:vendorId` | Get bookings by vendor |
| PATCH | `/vendor/bookings/:vendorId/:bookingId/status` | Update booking status |
| PATCH | `/customer/bookings/:customerId/:bookingId/cancel` | Cancel a booking |

### Payment APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/payments/checkout-verify` | Verify Stripe checkout payment |

The payment verification endpoint:
- Retrieves the Stripe checkout session.
- Checks payment status.
- Validates vendor and subscription plan information.
- Saves payment information.
- Updates vendor subscription details.
- Prevents duplicate payment records for the same checkout session.

### Admin Dashboard APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/dashboard/stats` | Get admin dashboard statistics |

Dashboard statistics include:
- Total users
- Total vendors
- Total customers
- Published services
- Total transactions
- Active users
- Blocked users
- Pending services

## Example API Requests

### Create a Service

```http
POST /services
Content-Type: application/json
```

Example request body:

```json
{
  "title": "Wedding Photography",
  "category": "Photography",
  "description": "Professional wedding photography service",
  "price": 25000,
  "location": "Dhaka",
  "vendorId": "VENDOR_ID"
}
```

New services are created with a pending approval status.

### Create a Booking

```http
POST /bookings
Content-Type: application/json
```

Example request body:

```json
{
  "serviceId": "SERVICE_ID",
  "eventDate": "2026-12-20",
  "eventLocation": "Dhaka, Bangladesh",
  "message": "I want to book this service."
}
```

### Update Booking Status

```http
PATCH /vendor/bookings/VENDOR_ID/BOOKING_ID/status
Content-Type: application/json
```

Example request body:

```json
{
  "status": "Confirmed"
}
```

## Frontend Integration

The frontend can communicate with this backend using the following base URL:

```javascript
const BASE_URL = "http://localhost:5000";
```

For authenticated requests using cookies:

```javascript
const response = await fetch(`${BASE_URL}/users`, {
  method: "GET",
  credentials: "include",
  headers: {
    "Content-Type": "application/json"
  }
});
```

For production, replace the local backend URL with your deployed backend URL.

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Backend server port |
| `DB_USER` | MongoDB username |
| `DB_PASSWORD` | MongoDB password |
| `FRONTEND_URL` | Frontend application URL |
| `STRIPE_SECRET_KEY` | Stripe secret API key |

**Important:** Never upload your `.env` file or expose your Stripe secret key and MongoDB credentials publicly.

## Notes

- MongoDB is used as the primary database.
- Stripe is used for payment verification.
- Better Auth is used for authentication integration.
- Admin APIs are provided for managing users and services.
- Authentication and authorization middleware should be verified and enabled for protected routes before production deployment.

## Author

**WedPlan Development Team**

## License

This project is developed for the WedPlan wedding service booking platform.