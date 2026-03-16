#!/usr/bin/env python3
"""
MQTT Test Publisher

Simulates the full MQTT pipeline without needing an Arduino.
Publishes 5 messages to energy/house_1/data, one every 2 seconds.

Usage:
    python mqtt_test.py
"""

import json
import time
import logging

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("Error: paho-mqtt not installed. Run: pip install paho-mqtt")
    import sys
    sys.exit(1)

# Configuration
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "energy/house_1/data"
NUM_MESSAGES = 5
INTERVAL_SECONDS = 2

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)


def generate_message(sequence: int) -> dict:
    """Generate a message with slightly randomized values."""
    import random
    # Base values with small random variations
    produced = round(0.05 + random.uniform(-0.02, 0.02), 4)
    consumed = round(0.03 + random.uniform(-0.01, 0.01), 4)
    surplus = round(produced - consumed, 4)

    return {
        "house_id": "house_1",
        "energy_produced": produced,
        "energy_consumed": consumed,
        "surplus_energy": surplus
    }


def main():
    logger.info("Starting MQTT Test Publisher")
    logger.info(f"Broker: {MQTT_BROKER}:{MQTT_PORT}")
    logger.info(f"Topic: {MQTT_TOPIC}")
    logger.info(f"Publishing {NUM_MESSAGES} messages, one every {INTERVAL_SECONDS} seconds")

    # Create MQTT client with CallbackAPIVersion.VERSION1
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
        client_id="mqtt_test_publisher"
    )

    try:
        logger.info("Connecting to MQTT broker...")
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        logger.info("Connected to MQTT broker")

        for i in range(1, NUM_MESSAGES + 1):
            message = generate_message(i)
            payload = json.dumps(message)

            result = client.publish(MQTT_TOPIC, payload, qos=1)

            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"[{i}/{NUM_MESSAGES}] Published: {payload}")
            else:
                logger.error(f"[{i}/{NUM_MESSAGES}] Failed to publish: {result.rc}")

            if i < NUM_MESSAGES:
                time.sleep(INTERVAL_SECONDS)

        logger.info("All messages published. Disconnecting...")
        client.loop_stop()
        client.disconnect()
        logger.info("Disconnected cleanly. Exiting.")

    except Exception as e:
        logger.error(f"Error: {e}")
        client.loop_stop()
        client.disconnect()
        raise


if __name__ == "__main__":
    main()