# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Minimal MetaMask + Energy Telemetry Demo - a self-contained blockchain web application for monitoring household energy production/consumption. Users connect via MetaMask, register houses, and view real-time energy data from Arduino hardware or simulation.

## Architecture

Four-tier monorepo:
- **Frontend**: React (Vite) + TailwindCSS + ethers.js (port 5173)
- **Backend**: Express + JWT auth + Supabase (port 5005)
- **Blockchain**: Hardhat local network (port 8545, chainId: 31337)
- **Hardware**: Arduino energy meters → Serial → MQTT → Backend

## Common Commands

```bash
# Install all dependencies
cd backend && npm install
cd frontend && npm install
cd hardhat && npm install

# Start the full stack (4 terminals)

# Terminal 1: Hardhat node
cd hardhat && npm run node

# Terminal 2: Deploy contracts
cd hardhat && npm run deploy

# Terminal 3: Backend
cd backend && npm run dev

# Terminal 4: Frontend
cd frontend && npm run dev
```

### Simulate Energy Data (no hardware needed)
```bash
cd backend
node energy-test.js simulate house_1 0.01 0.05 0.01 0.04
```

### Hardware Pipeline (Arduino + MQTT)
```bash
# Install Python dependencies
pip install -r requirements_mqtt.txt

# Start MQTT broker
sudo systemctl start mosquitto

# Terminal: MQTT subscriber (forwards to backend)
python mqtt_subscriber.py

# Terminal: Serial-to-MQTT bridge (with Arduino)
python serial_mqtt_pub.py --port /dev/ttyACM0 --baud 9600

# Or simulate without hardware
python mqtt_test.py
```

### Find Arduino serial port
```bash
ls /dev/tty* | grep -E "USB|ACM"
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

Copy from `backend/.env.example` to create your `.env`.

## Key Source Files

- `frontend/src/lib/eth.js` - Hardhat network config, chain ID (31337), MetaMask utilities
- `frontend/src/lib/api.js` - API client with JWT handling
- `frontend/src/pages/Dashboard.jsx` - Main energy monitoring dashboard
- `frontend/src/components/EnergyLineChart.jsx` - SVG time-series chart
- `backend/server.js` - Express server with all API routes
- `backend/supabaseClient.js` - Supabase database client
- `hardhat/contracts/EnergyTrading.sol` - Smart contract

## Hardhat Network

- URL: `http://127.0.0.1:8545`
- Chain ID: 31337 (decimal)
- Deployed contract: `hardhat/deployments/EnergyTrading.json`
- The dashboard auto-switches to Hardhat or prompts user if on wrong network

## Arduino Sketch

The Arduino sketch is at `backend/arduino/serial_mqtt_bridge/serial_mqtt_bridge.ino`. Set `HOUSE_ID` to match your registered house. It publishes JSON to MQTT topic `energy/<house_id>/data`.