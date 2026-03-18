# Running the Full Stack

This document describes how to run the complete Minimal MetaMask + Energy Telemetry Demo locally.

## Prerequisites

- Node.js + npm
- Python 3.8+ (for serial bridge)
- MetaMask browser extension
- A Supabase project (for database)

## Step 1: Create Supabase Tables

Run the SQL in `backend/supabase-schema.sql` in your Supabase SQL editor. This creates:
- `houses` table
- `energy_reports` table

## Step 2: Configure Backend

Copy the example env file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your Supabase credentials:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=5005
JWT_SECRET=dev_secret_change_me
```

## Step 3: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Hardhat
cd ../hardhat
npm install
```

## Step 4: Start Hardhat Node (Terminal 1)

```bash
cd hardhat
npm run node
```

Keep this terminal running. Hardhat runs on `http://127.0.0.1:8545`.

## Step 5: Deploy Contracts (Terminal 2)

```bash
cd hardhat
npm run deploy
```

Note the deployed `EnergyTrading` contract address - it's saved to `hardhat/deployments/EnergyTrading.json`.

## Step 6: Start Backend (Terminal 3)

```bash
cd backend
npm run dev
```

Backend runs on `http://localhost:5005`.

## Step 7: Start Frontend (Terminal 4)

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Step 8: Run Energy Simulation

You can either use the serial bridge (Step 8a) or the built-in simulator (Step 8b):

### Option A: Serial Bridge (requires Arduino)

Install Python dependencies:
```bash
cd backend
pip install -r requirements.txt
```

Run the bridge:
```bash
python serial_bridge.py /dev/ttyUSB0 9600
```

### Option B: Built-in Simulator

```bash
cd backend
node energy-test.js simulate house_1 0.01 0.05 0.01 0.04
```

## Step 9: Verify in Browser

1. Open `http://localhost:5173` in your browser
2. Connect MetaMask - it should prompt you to connect
3. Switch MetaMask to Hardhat network:
   - Network: Hardhat Local
   - Chain ID: 31337
   - RPC URL: `http://127.0.0.1:8545`
4. Register a house:
   - Go to Dashboard → House Management
   - Enter a house ID (e.g., `house_1`)
   - Click "Register House"
5. Run the simulation (Step 8)
6. Verify:
   - Energy Monitoring section shows totals
   - Energy Visualization shows a line chart
   - Live Energy Feed shows incoming data

## MQTT Pipeline (Arduino → PC)

This section documents running the full MQTT stack for receiving energy data from an Arduino.

### Install MQTT Dependencies

```bash
cd backend
pip install -r requirements_mqtt.txt
```

### Start Mosquitto Broker

```bash
sudo systemctl start mosquitto
```

### Run MQTT Subscriber (Terminal)

The subscriber forwards MQTT messages to the Express backend:

```bash
cd backend
python mqtt_subscriber.py
```

### Run Serial-to-MQTT Bridge (with Arduino)

When Arduino is connected via USB:

```bash
cd backend
python serial_mqtt_pub.py --port /dev/ttyACM0 --baud 9600
```

**Important:** Ensure your Arduino is running the correct sketch:
- The sketch is at `backend/arduino/serial_mqtt_bridge/serial_mqtt_bridge.ino`
- Edit `HOUSE_ID` at the top to match your registered house (default: `house_1`)
- The sketch sends JSON in format: `{"house_id":"house_1","energy_produced":0.050,"energy_consumed":0.030,"surplus_energy":0.020}`

**Find your serial port:**
```bash
ls /dev/tty* | grep -E "USB|ACM"  # Linux
mode                                 # Windows
```

### Or: Run Test Publisher (without hardware)

To simulate data without an Arduino:

```bash
cd backend
python mqtt_test.py
```

Or use the test sender for the two-way bridge (test.mosquitto.org):

```bash
cd backend
python mqtt_send_test.py
```

### Verify Data Flow

#### Subscribe to All Energy Topics

```bash
mosquitto_sub -h localhost -t "energy/#" -v
```

This shows all messages from all houses. Output format:
```
energy/house_1/data {"house_id":"house_1","energy_produced":0.050,"energy_consumed":0.030,"surplus_energy":0.020}
```

#### Subscribe to Specific House

```bash
mosquitto_sub -h localhost -t "energy/house_1/data" -v
```

#### Subscribe to Incoming/Outgoing Topics (for two-way bridge)

```bash
# Watch Arduino → broker
mosquitto_sub -h test.mosquitto.org -t "energy/arduino/outgoing" -v

# Watch broker → Arduino
mosquitto_sub -h test.mosquitto.org -t "energy/arduino/incoming" -v
```

#### Troubleshooting

```bash
# Check if mosquitto is running
systemctl status mosquitto
# or
netstat -tlnp | grep 1883

# Test publishing manually
mosquitto_pub -t "energy/test/data" -m '{"house_id":"test","energy_produced":0.05}'

# Install mosquitto tools if missing
sudo apt install mosquitto-clients
```