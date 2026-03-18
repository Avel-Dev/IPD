#!/usr/bin/env python3
"""
MQTT Test Publisher - Send a test message to energy/arduino/incoming
Tests the broker -> Arduino direction without hardware
"""

import time
import sys
import os
from datetime import datetime

# Try to import paho-mqtt, install if missing
try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("Installing paho-mqtt...")
    os.system("pip install paho-mqtt>=2.0.0")
    import paho.mqtt.client as mqtt

# Configuration
MQTT_BROKER = "test.mosquitto.org"
MQTT_PORT = 1883
TEST_TOPIC = "energy/arduino/incoming"
CLIENT_ID = "mqtt_test_publisher"


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"[INFO] Connected to {MQTT_BROKER}:{MQTT_PORT}")
    else:
        print(f"[ERROR] Connection failed with code {rc}")
        sys.exit(1)


def on_publish(client, userdata, mid, properties=None):
    print(f"[INFO] Message {mid} published successfully")


def main():
    # Create client
    client = mqtt.Client(
        client_id=CLIENT_ID,
        callback_api_version=mqtt.CallbackAPIVersion.VERSION1
    )
    client.on_connect = on_connect
    client.on_publish = on_publish

    # Build test message
    timestamp = int(time.time())
    message = f'{{"source":"pc_test","msg":"ping from broker","ts":{timestamp}}}'
    print(f"[INFO] Test message: {message}")

    try:
        # Connect
        print(f"[INFO] Connecting to {MQTT_BROKER}:{MQTT_PORT}...")
        client.connect(MQTT_BROKER, MQTT_PORT, 60)

        # Publish and wait for acknowledgment
        result = client.publish(TEST_TOPIC, message, qos=1)
        result.wait_for_publish()
        print(f"[INFO] Published to {TEST_TOPIC}")

        # Disconnect cleanly
        client.disconnect()
        print("[INFO] Disconnected - Test complete")
        sys.exit(0)

    except Exception as e:
        print(f"[ERROR] {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()