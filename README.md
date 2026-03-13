## Minimal MetaMask + Energy Telemetry Demo

This folder contains a self-contained demo app:

- **Frontend**: React (Vite) + Tailwind + ethers
- **Backend**: Express (JWT) + Supabase persistence
- **Contracts**: Hardhat local node + sample contract
- **Telemetry**: CLI simulation sending energy reports

### Prerequisites

- Node.js + npm
- MetaMask
- A Supabase project (SQL editor access)

### 1) Create tables in Supabase

Run the SQL in:

- `backend/supabase-schema.sql`

This creates:

- `houses`
- `energy_reports` (FK to `houses.house_id`)

### 2) Configure backend env

Create `backend/.env`:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
PORT=5005
JWT_SECRET=dev_secret_change_me
```

### 3) Start backend

```bash
cd backend
npm install
npm run dev
```

Backend: `http://localhost:5005`

### 4) Start frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

### 5) Hardhat local network (optional)

```bash
cd hardhat
npm install
npm run node
```

In another terminal:

```bash
cd hardhat
npm run deploy
```

### 6) Register a house

- Login with MetaMask
- Dashboard → **House Management**
- Register `house_1` (or any ID)

### 7) Start live energy simulation (1 second interval)

```bash
cd backend
node energy-test.js simulate house_1 0.01 0.05 0.01 0.04
```

You should see the dashboard **chart** and **Live Energy Feed** update continuously.

## Minimal MetaMask + JWT Dashboard (Local Hardhat)

This is a **self-contained minimal** blockchain web app that runs locally:

- **Frontend**: React (Vite) + TailwindCSS + ethers.js
- **Backend**: Node.js + Express (JWT, stateless)
- **Chain**: Hardhat local network (`http://127.0.0.1:8545`)
- **Database**: none

### Prerequisites

- Node.js + npm
- MetaMask installed in your browser

### 1) Start Hardhat local node

```bash
cd minimal/hardhat
npm install
npm run node
```

Keep this terminal running.

### 2) Deploy the sample contract

In a new terminal:

```bash
cd minimal/hardhat
npm run deploy
```

### 3) Start the backend (JWT auth)

In a new terminal:

```bash
cd minimal/backend
npm install
npm run dev
```

Backend runs on `http://localhost:5005`.

Optional env vars:

- `JWT_SECRET`: secret used to sign tokens (defaults to `dev_secret_change_me`)
- `JWT_EXPIRES_IN`: token lifetime (defaults to `1h`)
- `PORT`: backend port (defaults to `5005`)

### 4) Start the frontend

In a new terminal:

```bash
cd minimal/frontend
npm install
npm run dev
```

Open the app at `http://localhost:5173`.

### MetaMask notes

- The dashboard expects **Hardhat local** network (chainId **31337**).
- If MetaMask is on another chain, the dashboard shows a **Switch to Hardhat** button (it will add the network if missing).

