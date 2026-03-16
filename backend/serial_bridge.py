#!/usr/bin/env python3
"""
Serial-to-HTTP Bridge for Arduino Energy Telemetry

Reads JSON lines from Arduino over Serial and forwards to the backend.

Usage:
    python serial_bridge.py                    # Defaults: /dev/ttyUSB0, 9600
    python serial_bridge.py /dev/ttyACM0       # Custom port
    python serial_bridge.py /dev/ttyACM0 115200  # Custom port and baud

Expected JSON format from Arduino:
    {"house_id": "house_1", "energy_produced": 0.01, "energy_consumed": 0.05, "surplus_energy": -0.04}

Or (alternative camelCase):
    {"houseId": "house_1", "energyProduced": 0.01, "energyConsumed": 0.05}
"""

import json
import sys
import time
import logging
from datetime import datetime

try:
    import serial
except ImportError:
    print("Error: pyserial not installed. Run: pip install pyserial requests")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("Error: requests not installed. Run: pip install pyserial requests")
    sys.exit(1)

# Configuration
DEFAULT_SERIAL_PORT = "/dev/ttyUSB0"
DEFAULT_BAUD_RATE = 9600
BACKEND_URL = "http://localhost:5005/energy/report"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)


def convert_to_camelcase(data: dict) -> dict:
    """Convert snake_case to camelCase for backend compatibility."""
    conversion = {
        "house_id": "houseId",
        "energy_produced": "energyProduced",
        "energy_consumed": "energyConsumed",
        "surplus_energy": "surplusEnergy",
    }

    result = {}
    for key, value in data.items():
        new_key = conversion.get(key, key)
        result[new_key] = value

    # Add timestamp if not present
    if "timestamp" not in result:
        result["timestamp"] = int(time.time() * 1000)

    return result


def parse_json_line(line: str) -> dict | None:
    """Parse a single JSON line, returning None on parse error."""
    try:
        return json.loads(line.strip())
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error: {e} - Line: {line.strip()[:100]}")
        return None


def post_to_backend(data: dict) -> bool:
    """POST energy data to backend. Returns True on success."""
    try:
        response = requests.post(
            BACKEND_URL,
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        if response.status_code in (200, 201):
            logger.info(f"SUCCESS: Posted {data.get('houseId', data.get('house_id'))} - "
                       f"Status: {response.status_code}")
            return True
        else:
            logger.error(f"FAILED: POST returned {response.status_code} - {response.text[:200]}")
            return False

    except requests.exceptions.ConnectionError as e:
        logger.error(f"CONNECTION ERROR: Backend unreachable - {e}")
        return False
    except requests.exceptions.Timeout as e:
        logger.error(f"TIMEOUT: Request timed out - {e}")
        return False
    except Exception as e:
        logger.error(f"ERROR: Unexpected error - {type(e).__name__}: {e}")
        return False


def read_serial(port: str, baud_rate: int) -> None:
    """Main loop: read from serial and forward to backend."""
    logger.info(f"Starting serial bridge: {port} @ {baud_rate} baud")
    logger.info(f"Forwarding to: {BACKEND_URL}")

    serial_conn = None
    reconnect_delay = 3
    max_reconnect_delay = 30

    while True:
        try:
            if serial_conn is None or not serial_conn.is_open:
                logger.info(f"Connecting to {port}...")
                serial_conn = serial.Serial(
                    port=port,
                    baudrate=baud_rate,
                    timeout=1.0,
                    write_timeout=5.0
                )
                logger.info(f"Connected to {port}")
                reconnect_delay = 3  # Reset on successful connect

            # Read lines from serial
            while serial_conn.is_open:
                try:
                    line = serial_conn.readline()
                    if not line:
                        continue

                    # Try decode, skip binary garbage
                    try:
                        line_str = line.decode("utf-8").strip()
                    except UnicodeDecodeError:
                        logger.debug(f"Skipping binary data: {line[:20]}")
                        continue

                    if not line_str:
                        continue

                    logger.debug(f"Raw: {line_str[:100]}")

                    # Parse JSON
                    data = parse_json_line(line_str)
                    if data is None:
                        continue

                    # Convert snake_case to camelCase for backend
                    payload = convert_to_camelcase(data)

                    # Validate required fields
                    if "houseId" not in payload:
                        logger.warning(f"Missing houseId field: {payload}")
                        continue

                    # Post to backend
                    post_to_backend(payload)

                except serial.SerialException as e:
                    logger.error(f"Serial error: {e}")
                    break
                except Exception as e:
                    logger.error(f"Unexpected error in read loop: {type(e).__name__}: {e}")
                    break

        except serial.SerialException as e:
            logger.error(f"Failed to open serial port {port}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error: {type(e).__name__}: {e}")

        # Cleanup and reconnect
        if serial_conn and serial_conn.is_open:
            try:
                serial_conn.close()
            except Exception:
                pass
            serial_conn = None

        logger.info(f"Reconnecting in {reconnect_delay}s...")
        time.sleep(reconnect_delay)
        reconnect_delay = min(reconnect_delay * 2, max_reconnect_delay)


def main():
    port = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SERIAL_PORT
    baud_rate = int(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_BAUD_RATE

    logger.info(f"Serial-to-HTTP Bridge")
    logger.info(f"Port: {port}")
    logger.info(f"Baud: {baud_rate}")
    logger.info(f"Backend: {BACKEND_URL}")

    try:
        read_serial(port, baud_rate)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        sys.exit(0)


if __name__ == "__main__":
    main()