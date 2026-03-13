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

