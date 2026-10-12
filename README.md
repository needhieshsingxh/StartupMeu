# StartupMeu Connect

StartupMeu Connect is a small startup discovery and investor connection marketplace. Founders can publish startup profiles, and potential investors can browse opportunities and send a connection request. Profiles and requests are stored in MongoDB; there is no authentication or sample company data.

## Features

- Browse and search startup profiles.
- Filter by industry, funding stage, location, and minimum or maximum funding requirement.
- Create, view, edit, and delete profiles.
- Submit a connection request with a name, email, and message.
- Show loading, empty, success, and error states.
- Validate inputs in the browser and API, with consistent JSON error responses.
- Responsive layout for desktop and mobile.

## Technologies

- Frontend: React 19 and Vite 6
- Backend: Node.js, Express 4, and Mongoose 8
- Database: MongoDB (local or MongoDB Atlas)

## Setup

Use Node.js and npm. Install dependencies in each application folder:

```sh
npm install --prefix backend
npm install --prefix frontend
```

Copy the environment templates, then replace placeholder values in the new local files. Never commit `.env` files.

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Backend `backend/.env` values:

```dotenv
MONGODB_URI=<your-local-or-Atlas-MongoDB-connection-string>
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

Frontend `frontend/.env` value:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

For Atlas, put the connection string supplied by your Atlas project in `MONGODB_URI`; do not put credentials in source files or share them publicly. Start the API and frontend in separate terminals:

```sh
npm run dev --prefix backend
npm run dev --prefix frontend
```

The API listens on port 5000 by default, and Vite serves the frontend at `http://localhost:5173`.

## REST API

All responses are JSON. Startup records use `name`, optional `tagline`, `description`, `industry`, `stage`, `location`, and numeric `fundingRequired`. Supported stages are `Idea`, `Pre-seed`, `Seed`, `Series A`, `Series B+`, and `Growth`. Funding values are stored as entered; the application does not assume a currency.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | API status and MongoDB connection status |
| `GET` | `/api/startups` | List profiles; optional query parameters: `search`, `industry`, `stage`, `location`, `minFunding`, `maxFunding` |
| `GET` | `/api/startups/:id` | Read one profile |
| `POST` | `/api/startups` | Create a profile; JSON body contains startup fields above |
| `PATCH` | `/api/startups/:id` | Update supplied startup fields |
| `DELETE` | `/api/startups/:id` | Delete a profile and its connection requests |
| `POST` | `/api/startups/:id/connection-requests` | Submit a request with `investorName`, `investorEmail`, and `message` |

Create and update requests validate field types, required values, lengths, funding range, and stage. Connection requests validate all three fields and require a valid email format. Successful creation responds with `201`; missing records respond with `404`; invalid input responds with `400`; unexpected API errors respond with a generic `500` message.

## Verification status

- Frontend production build: `npm run build --prefix frontend` succeeded with Vite 6.4.4; 33 modules were transformed.
- Backend API smoke check: `npm run test:api --prefix backend` was attempted and stopped because `MONGODB_URI` is not configured (`MONGODB_URI is required. Configure backend/.env before running the API smoke test.`).
- MongoDB-backed CRUD and connection-request persistence, including the health endpoint against a running API, have not been verified because no database URI was available.
- The frontend dependency installation reported 0 vulnerabilities. A separate prior backend dependency installation reported 3 high-severity advisories; dependencies were not automatically upgraded.

## CodeZero-assisted development

CodeZero was used to help build and review this assessment. Specific assisted tasks included:

1. Adding Mongoose startup and connection-request models with field constraints.
2. Implementing validated Express routes for startup discovery, CRUD, and connection requests.
3. Building the responsive React discovery interface, filters, profile dialogs, and connection form.
4. Adding Git ignore protection for environment files, dependencies, generated output, CodeZero metadata, and unrelated downloaded content.
5. Preparing setup/API documentation and recording build and API-check outcomes.

The implementation was AI-assisted and was checked with the successful frontend production build. The backend smoke check could not run without MongoDB configuration, so persistence and full end-to-end behavior remain unverified; no real startup or investor data is included.
