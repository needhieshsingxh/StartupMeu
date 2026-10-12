# StartupMeu Connect

StartupMeu Connect is a startup discovery and investor connection marketplace. Founders can publish startup profiles and manage their listings, and potential investors can browse opportunities, filter by funding criteria, and submit direct connection requests.

## Features

- **Startup Discovery & Search:** Browse and search startup profiles by keyword across names, taglines, descriptions, and industries.
- **Multi-Attribute Filtering:** Filter startups by industry, funding stage, location, and minimum or maximum funding requirements in combination.
- **User Authentication:** Secure user registration and login with `bcryptjs` password hashing and signed JSON Web Tokens (JWT).
- **Owner Authorization:** Startups are owned by the creator. Only the verified owner can edit or delete their profile; unauthorized attempts receive HTTP 403 Forbidden.
- **Investor Connection Requests:** Potential investors can submit introduction requests. Startup owners can review incoming requests sent to their listings.
- **Responsive Interface:** Clean, accessible interface built with React 19, responsive across desktop, tablet, and mobile.
- **State Feedback:** Loading indicators, empty states, and dismissible banners for operational success and error handling.

## Technologies

- **Frontend:** React 19, Vite 6
- **Backend:** Node.js, Express 4
- **Database:** MongoDB with Mongoose 8
- **Authentication & Security:** `bcryptjs` for password hashing, `jsonwebtoken` (JWT) for session authorization, CORS credentials configuration
- **API:** REST with JSON request and response bodies

## Prerequisites

- Node.js (v18+ or v20+) and npm
- A MongoDB instance (local `mongod` or MongoDB Atlas cluster)

## Setup

### 1. Install dependencies

Run these commands from the project root:

```sh
npm install --prefix backend
npm install --prefix frontend
```

### 2. Configure environment variables

Copy the example environment files:

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Configure `backend/.env`:

```dotenv
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/startupmeu_connect
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/startupmeu_connect_test
```

Configure `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

> **Security Note:** Replace the placeholders with your own secret strings and database URIs. Never commit real `.env` files, production credentials, or connection strings to version control.

### 3. Start the application

Open two terminals from the project root.

Start the backend:

```sh
npm run dev --prefix backend
```

Start the frontend:

```sh
npm run dev --prefix frontend
```

The backend listens on port `5000` by default. The Vite frontend is served at `http://localhost:5173`.

## Authentication and Ownership Behavior

1. **Public Access:** Startup directory listing, detail views, and investor connection request submissions are publicly accessible.
2. **Authenticated Actions:** Creating a startup requires an authenticated session. The backend automatically associates the authenticated user as the startup's `owner`.
3. **Owner Authorization:** Editing (`PATCH /api/startups/:id`) or deleting (`DELETE /api/startups/:id`) a startup strictly verifies that `startup.owner` matches the authenticated user ID. Any attempt to supply an owner ID from the client is stripped and ignored. Non-owners receive HTTP 403 Forbidden.
4. **Legacy Records:** Unowned legacy records remain publicly readable and are protected from modification by regular users.
5. **Connection Request Access:** Only the startup owner can view the list of connection requests submitted for their startup (`GET /api/startups/:id/connection-requests`).

## REST API

All endpoints communicate via JSON.

### Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Register a new user (`name`, `email`, `password`, `role`) | No |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT token (`email`, `password`) | No |
| `GET` | `/api/auth/me` | Retrieve current authenticated user profile | Bearer Token |

### Startup & Discovery Endpoints (`/api/startups`)

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/api/health` | API health and database connectivity status | No |
| `GET` | `/api/startups` | List startups; supports `search`, `industry`, `stage`, `location`, `minFunding`, and `maxFunding` query parameters | No |
| `GET` | `/api/startups/:id` | Retrieve one startup profile | No |
| `POST` | `/api/startups` | Create a startup profile (sets owner to authenticated user) | Bearer Token |
| `PATCH` | `/api/startups/:id` | Update a startup profile (owner only) | Bearer Token (Owner) |
| `DELETE` | `/api/startups/:id` | Delete a startup profile and associated connection requests | Bearer Token (Owner) |
| `POST` | `/api/startups/:id/connection-requests` | Submit an investor connection request (`investorName`, `investorEmail`, `message`) | No (Optional Auth) |
| `GET` | `/api/startups/:id/connection-requests` | List connection requests for a startup | Bearer Token (Owner) |

## Testing

### Safe API Integration Testing

The backend test suite (`backend/scripts/test-api.js`) requires a dedicated test database to prevent accidental data loss in your development environment:

```sh
# Run isolated API integration tests (both commands supported)
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/startupmeu_connect_test npm run test:api --prefix backend
# or
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/startupmeu_connect_test npm test --prefix backend
```

- **Safety Guarantee:** The script verifies `TEST_MONGODB_URI` and refuses to run destructively against the primary development database.
- **Targeted Cleanup:** Test cleanup removes only records specifically generated during the test run (`testStartupId`, `testUserAId`, `testUserBId`). It never executes blanket database purges.

### Frontend Filter Unit Testing

The frontend filter test suite verifies parameter serialization, bound validation, and filter combinations:

```sh
# Run frontend filter unit tests (both commands supported)
npm run test:filters --prefix frontend
# or
npm test --prefix frontend
```

### Backend User Model Unit Testing

The backend User model unit test verifies the actual Mongoose `pre('save')` password-hashing hook, 60-character bcrypt hash generation, and `comparePassword()` validation without requiring a live database connection:

```sh
npm run test:unit --prefix backend
```

## Production Build

To verify and bundle the frontend for production:

```sh
npm run build --prefix frontend
```

Vite outputs optimized static assets to `frontend/dist/`.

## Verification Status

- **Frontend Production Build:** `npm run build --prefix frontend` succeeded with Vite 6.4.4 (34 modules transformed, bundle generated in `frontend/dist/`).
- **Frontend Filter Unit Tests:** `npm run test:filters --prefix frontend` passed all checks for parameter serialization, non-negative range validation, and combination queries.
- **Backend User Model Unit Tests:** `npm run test:unit --prefix backend` passed all assertions verifying the registered Mongoose `pre('save')` hook, bcrypt 12-round hashing, and `comparePassword()` match/rejection without requiring a live database connection.
- **Backend Dependencies & Manifest:** `bcryptjs` and `jsonwebtoken` installed and declared in `backend/package.json`.
- **Database Safety Guard:** `npm run test:api --prefix backend` confirmed database isolation enforcement by rejecting execution when `TEST_MONGODB_URI` is not configured.
- **Live Database Limitation:** Integration tests requiring live MongoDB connections were blocked in the local test environment due to `connect ECONNREFUSED 127.0.0.1:27017`. Once an active MongoDB daemon or Atlas cluster URI is provided in `backend/.env`, the full integration suite executes cleanly.
- **Dependency Audit:** Frontend dependency audit reported `0 vulnerabilities`. Backend dependency audit reported 3 high-severity advisories originating from `nodemon`'s dependency on `chokidar@3.6.0` (`braces`). In accordance with project instructions, `npm audit fix --force` was not applied to avoid breaking changes to developer tooling.

## AI-Assisted Development

AI assistance was utilized during the development and review of this assessment:

1. **Initial CodeZero Tasks:**
   - Defining initial Mongoose startup and connection-request schemas.
   - Establishing baseline Express CRUD endpoints and routes.
   - Creating initial discovery interface and search filters.
   - Setting up basic Git ignore rules and initial README.
2. **Assessment Completion & Security Hardening (Current Phase):**
   - Implemented complete user authentication (User model, bcrypt hashing, JWT issuance and verification middleware).
   - Enforced owner authorization on startup mutations and connection request access.
   - Added maximum funding filter to both backend query parsing and frontend UI controls.
   - Built frontend authentication modal and dynamic owner controls.
   - Implemented safe test database isolation guards and frontend filter unit tests.
   - Corrected project metadata and documentation.
