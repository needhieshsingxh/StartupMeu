# StartupMeu Connect

StartupMeu Connect is a small startup discovery and investor connection marketplace. Founders can publish startup profiles, and potential investors can browse opportunities and send a connection request. Profiles and requests are stored in MongoDB. The current MVP does not include authentication or real company data.

## Features

- Browse and search startup profiles.
- Filter by industry, funding stage, location, and minimum or maximum funding requirement.
- Create, view, edit, and delete startup profiles.
- Submit an investor connection request with a name, email, and message.
- Display loading, empty, success, and error states.
- Validate inputs in the browser and API, with consistent JSON error responses.
- Responsive layout for desktop and mobile.

## Technologies

- **Frontend:** React 19, Vite 6
- **Backend:** Node.js, Express 4
- **Database:** MongoDB with Mongoose 8
- **API:** REST with JSON request and response bodies

## Prerequisites

- Node.js and npm
- A MongoDB instance, either local or hosted on MongoDB Atlas

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
MONGODB_URI=<your-local-or-Atlas-MongoDB-connection-string>
CLIENT_ORIGIN=http://localhost:5173
```

Configure `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Replace the MongoDB placeholder with your own connection string. Never commit real `.env` files, credentials, API keys, or database connection strings.

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

## REST API

All endpoints return JSON.

Startup profiles use these fields:

- `name` — required startup name
- `tagline` — optional short description
- `description` — startup overview
- `industry` — industry or sector
- `stage` — funding stage
- `location` — startup location
- `fundingRequired` — numeric funding requirement

Supported stages are `Idea`, `Pre-seed`, `Seed`, `Series A`, `Series B+`, and `Growth`. Funding values are stored as entered; the application does not assume a currency.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | API health and MongoDB connection status |
| `GET` | `/api/startups` | List startups; supports `search`, `industry`, `stage`, `location`, `minFunding`, and `maxFunding` query parameters |
| `GET` | `/api/startups/:id` | Retrieve one startup profile |
| `POST` | `/api/startups` | Create a startup profile |
| `PATCH` | `/api/startups/:id` | Update a startup profile |
| `DELETE` | `/api/startups/:id` | Delete a startup profile and its connection requests |
| `POST` | `/api/startups/:id/connection-requests` | Submit a connection request |

Connection request bodies contain `investorName`, `investorEmail`, and `message`.

Create and update requests validate field types, required values, lengths, funding ranges, and supported stages. Connection requests validate required fields and email format.

Successful creation returns HTTP `201`; missing records return `404`; invalid input returns `400`; unexpected API errors return a generic `500` response.

## Verification Status

- **Frontend production build:** `npm run build --prefix frontend` succeeded with Vite 6.4.4; 33 modules were transformed.
- **Backend API smoke test:** `npm run test:api --prefix backend` passed.
- The successful backend smoke test verified API health, input validation, startup creation, filtered listing, detail retrieval, update, connection request persistence, deletion, and cleanup against the configured MongoDB database.
- **Dependencies:** Frontend dependency installation reported zero vulnerabilities. An earlier backend dependency installation reported three high-severity advisories; dependencies were not automatically upgraded.

These results reflect the checks executed during development. They do not constitute a production security audit or a guarantee of production readiness.

## CodeZero-Assisted Development

CodeZero was used during implementation and review of this assessment. Specific assisted tasks included:

1. Adding Mongoose startup and connection-request models with field constraints.
2. Implementing validated Express routes for startup discovery, CRUD operations, and connection requests.
3. Building the React discovery interface, search and filter controls, startup profiles, and connection form.
4. Adding Git ignore protection for environment files, dependencies, generated output, and local CodeZero metadata.
5. Preparing setup and API documentation and recording actual build and API-check results.

The implementation used AI assistance, and generated changes were reviewed and tested through the available development workflow. The successful frontend build and backend API smoke test are documented above. The MVP does not include real startup or investor data, and its connection requests do not represent actual investment commitments.
