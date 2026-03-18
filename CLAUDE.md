# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Minimal MetaMask + Energy Telemetry Demo - a self-contained blockchain web application for monitoring household energy production/consumption. Users connect via MetaMask, register houses, and view real-time energy data.

## Architecture

Three-tier monorepo:
- **Frontend**: React (Vite) + TailwindCSS + ethers.js
- **Backend**: Express + JWT auth + Supabase (PostgreSQL)
- **Blockchain**: Hardhat local network (chainId: 31337)
- **Hardware**: Arduino energy meters → Serial → MQTT → Backend

## Running the Full Stack

The full stack requires 4 terminals:

1. **Hardhat Node** - `cd hardhat && npm run node` (port 8545)
2. **Deploy Contracts** - `cd hardhat && npm run deploy` (in another terminal)
3. **Backend** - `cd backend && npm run dev` (port 5005)
4. **Frontend** - `cd frontend && npm run dev` (port 5173)

### Simulate Energy Data
```bash
cd backend
node energy-test.js simulate house_1 0.01 0.05 0.01 0.04
```

### Hardware Pipeline (MQTT)

To receive data from Arduino energy meters:

1. Start MQTT broker: `sudo systemctl start mosquitto`
2. Run MQTT subscriber: `cd backend && python mqtt_subscriber.py`
3. Run serial-to-MQTT bridge: `cd backend && python serial_mqtt_pub.py --port /dev/ttyACM0 --baud 9600`

Or simulate without hardware: `cd backend && python mqtt_test.py`

Python dependencies: `pip install -r requirements_mqtt.txt`

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

Copy from `backend/.env.example` to create your `.env`.

## Frontend Key Files

- `src/lib/eth.js` - Hardhat network config, chain ID (31337), MetaMask utilities
- `src/lib/api.js` - API client with JWT handling
- `src/pages/Dashboard.jsx` - Main energy monitoring dashboard with charts

## Hardhat Network

- URL: `http://127.0.0.1:8545`
- Chain ID: 31337 (decimal)
- The dashboard auto-switches to Hardhat or prompts user if on wrong network
- Deployed `EnergyTrading` contract address: `hardhat/deployments/EnergyTrading.json`