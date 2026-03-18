#!/usr/bin/env python3
"""
MQTT Subscriber for Energy Data

Subscribes to Mosquitto broker and forwards energy data to the Express backend.

Usage:
    python mqtt_subscriber.py

Subscribes to: energy/#
Forwards to: http://localhost:5005/energy/report
"""

import json
import logging
import sys
import requests

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("Error: paho-mqtt not installed. Run: pip install -r requirements_mqtt.txt")
    sys.exit(1)

# Configuration
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "energy/#"
BACKEND_URL = "http://localhost:5005/energy/report"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%%Y-%%m-%%d %%H:%%M:%%S"
)
logger = logging.getLogger(__name__)


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        logger.info(f"Connected to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
        client.subscribe(MQTT_TOPIC)
        logger.info(f"Subscribed to topic: {MQTT_TOPIC}")
    else:
        logger.error(f"Failed to connect to MQTT broker, return code: {rc}")


def on_disconnect(client, userdata, rc, properties=None):
    logger.warning(f"Disconnected from MQTT broker with return code: {rc}")


def on_message(client, userdata, msg):
    topic = msg.topic
    payload_raw = msg.payload.decode("utf-8")

    logger.info(f"MQTT received - Topic: {topic}")
    logger.info(f"Payload: {payload_raw}")

    # Parse JSON
    try:
        payload = json.loads(payload_raw)
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error: {e} - Skipping message")
        return

    # Convert snake_case to camelCase for backend API
    if "house_id" in payload:
        payload["houseId"] = payload.pop("house_id")
    if "energy_produced" in payload:
        payload["energyProduced"] = payload.pop("energy_produced")
    if "energy_consumed" in payload:
        payload["energyConsumed"] = payload.pop("energy_consumed")

    # Forward to backend
    try:
        response = requests.post(
            BACKEND_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        if response.status_code in (200, 201):
            logger.info(f"HTTP POST success - Status: {response.status_code}")
        else:
            logger.error(f"HTTP POST failed - Status: {response.status_code} - Body: {response.text[:200]}")

    except requests.exceptions.ConnectionError as e:
        logger.error(f"HTTP connection error: {e}")
    except requests.exceptions.Timeout as e:
        logger.error(f"HTTP timeout: {e}")
    except Exception as e:
        logger.error(f"HTTP request error: {type(e).__name__}: {e}")


def main():
    logger.info("Starting MQTT Subscriber")
    logger.info(f"Broker: {MQTT_BROKER}:{MQTT_PORT}")
    logger.info(f"Topic: {MQTT_TOPIC}")
    logger.info(f"Forwarding to: {BACKEND_URL}")

    # Create MQTT client with CallbackAPIVersion.VERSION1
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
        client_id="mqtt_subscriber"
    )

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message

    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
    except Exception as e:
        logger.error(f"Failed to connect to MQTT broker: {e}")
        sys.exit(1)

    # Blocking loop
    client.loop_forever()


if __name__ == "__main__":
    main()