# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Minimal MetaMask + Energy Telemetry Demo - a self-contained blockchain web application for monitoring household energy production/consumption. Users connect via MetaMask, register houses, and view real-time energy data.

## Architecture

Three-tier monorepo:
- **Frontend**: React (Vite) + TailwindCSS + ethers.js
- **Backend**: Express + JWT auth + Supabase (PostgreSQL)
- **Blockchain**: Hardhat local network (chainId: 31337)

## Commands

### Start Backend
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:5005`

### Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

### Start Hardhat (optional - for blockchain features)
```bash
cd hardhat
npm install
npm run node        # Start local node (port 8545)
npm run deploy      # Deploy contracts in another terminal
```

### Simulate Energy Data
```bash
cd backend
node energy-test.js simulate house_1 0.01 0.05 0.01 0.04
```

## Key API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/login` | POST | No | Get JWT token (body: `{walletAddress}`) |
| `/houses/register` | POST | JWT | Register a house |
| `/houses/my` | GET | JWT | List user's houses |
| `/energy/report` | POST | No | Submit energy reading |
| `/energy/summary` | GET | JWT | Aggregated energy totals |
| `/energy/history/:houseId` | GET | JWT | Per-house energy history |

Energy reporting endpoints are intentionally unauthenticated to allow hardware/CLI simulators to POST without JWTs.

## Database Schema

Tables in Supabase (run SQL from `backend/supabase-schema.sql`):
- `houses`: house_id, owner_wallet, meter_id, created_at
- `energy_reports`: house_id, energy_produced, energy_consumed, surplus_energy, timestamp

## Configuration

Backend requires `backend/.env`:
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
PORT=5005
JWT_SECRET=dev_secret_change_me
```

## Frontend Key Files

- `src/lib/eth.js` - Hardhat network config, chain ID (31337), MetaMask utilities
- `src/lib/api.js` - API client with JWT handling
- `src/pages/Dashboard.jsx` - Main energy monitoring dashboard with charts

## Hardhat Network

- URL: `http://127.0.0.1:8545`
- Chain ID: 31337 (decimal)
- The dashboard auto-switches to Hardhat or prompts user if on wrong network