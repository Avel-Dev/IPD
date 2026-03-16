#!/usr/bin/env python3
"""
Serial-to-MQTT Bridge for Arduino Energy Telemetry

Reads JSON lines from Arduino over Serial and publishes to MQTT broker.

Usage:
    python serial_mqtt_pub.py                    # Defaults: /dev/ttyUSB0, 9600
    python serial_mqtt_pub.py --port /dev/ttyACM0
    python serial_mqtt_pub.py --port /dev/ttyUSB0 --baud 115200

Expected JSON format from Arduino:
    {"house_id": "house_1", "energy_produced": 0.05, "energy_consumed": 0.03, "surplus_energy": 0.02}
"""

import argparse
import json
import sys
import time
import logging
import threading

try:
    import serial
except ImportError:
    print("Error: pyserial not installed. Run: pip install -r requirements_mqtt.txt")
    sys.exit(1)

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("Error: paho-mqtt not installed. Run: pip install -r requirements_mqtt.txt")
    sys.exit(1)

# Configuration
DEFAULT_SERIAL_PORT = "/dev/ttyUSB0"
DEFAULT_BAUD_RATE = 9600
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_QOS = 1
RECONNECT_DELAY = 3

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)


def parse_json_line(line: str) -> dict | None:
    """Parse a single JSON line, returning None on parse error."""
    try:
        return json.loads(line.strip())
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error: {e} - Line: {line.strip()[:100]}")
        return None


class SerialMQTTBridge:
    def __init__(self, serial_port: str, baud_rate: int):
        self.serial_port = serial_port
        self.baud_rate = baud_rate
        self.serial_conn = None
        self.running = True

        # MQTT client with CallbackAPIVersion.VERSION1
        self.mqtt_client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
            client_id="serial_mqtt_bridge"
        )
        self.mqtt_client.on_connect = self._on_connect
        self.mqtt_client.on_disconnect = self._on_disconnect

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            logger.info(f"MQTT connected to {MQTT_BROKER}:{MQTT_PORT}")
        else:
            logger.error(f"MQTT connection failed with code {rc}")

    def _on_disconnect(self, client, userdata, rc, properties=None):
        logger.warning(f"MQTT disconnected with code {rc}")

    def start_mqtt(self):
        """Start MQTT client in background thread."""
        try:
            self.mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.mqtt_client.loop_start()
            logger.info("MQTT background loop started")
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")

    def stop_mqtt(self):
        """Stop MQTT client."""
        self.running = False
        self.mqtt_client.loop_stop()
        self.mqtt_client.disconnect()
        logger.info("MQTT client stopped")

    def publish(self, house_id: str, data: dict):
        """Publish data to MQTT topic."""
        topic = f"energy/{house_id}/data"
        payload = json.dumps(data)

        try:
            result = self.mqtt_client.publish(topic, payload, qos=MQTT_QOS)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"MQTT published to {topic}: {payload}")
            else:
                logger.error(f"MQTT publish failed with code {result.rc}")
        except Exception as e:
            logger.error(f"MQTT publish error: {e}")

    def connect_serial(self) -> bool:
        """Connect to serial port."""
        try:
            self.serial_conn = serial.Serial(
                port=self.serial_port,
                baudrate=self.baud_rate,
                timeout=1.0,
                write_timeout=5.0
            )
            logger.info(f"Serial connected to {self.serial_port} @ {self.baud_rate} baud")
            return True
        except serial.SerialException as e:
            logger.error(f"Failed to open serial port {self.serial_port}: {e}")
            return False

    def disconnect_serial(self):
        """Disconnect from serial port."""
        if self.serial_conn and self.serial_conn.is_open:
            try:
                self.serial_conn.close()
            except Exception:
                pass
            self.serial_conn = None

    def read_serial_loop(self):
        """Main loop: read from serial and publish to MQTT."""
        while self.running:
            if self.serial_conn is None or not self.serial_conn.is_open:
                if not self.connect_serial():
                    logger.info(f"Reconnecting in {RECONNECT_DELAY}s...")
                    time.sleep(RECONNECT_DELAY)
                    continue

            try:
                line = self.serial_conn.readline()
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

                logger.info(f"Serial received: {line_str}")

                # Parse JSON
                data = parse_json_line(line_str)
                if data is None:
                    continue

                # Validate house_id
                house_id = data.get("house_id")
                if not house_id:
                    logger.warning(f"Missing house_id field: {data}")
                    continue

                # Publish to MQTT
                self.publish(house_id, data)

            except serial.SerialException as e:
                logger.error(f"Serial error: {e}")
                self.disconnect_serial()
            except Exception as e:
                logger.error(f"Unexpected error in read loop: {type(e).__name__}: {e}")

        logger.info("Serial read loop stopped")

    def run(self):
        """Run the bridge."""
        logger.info(f"Starting Serial-to-MQTT Bridge")
        logger.info(f"Serial: {self.serial_port} @ {self.baud_rate} baud")
        logger.info(f"MQTT: {MQTT_BROKER}:{MQTT_PORT}")

        # Start MQTT client in background
        self.start_mqtt()

        try:
            self.read_serial_loop()
        except KeyboardInterrupt:
            logger.info("Shutting down...")
        finally:
            self.stop_mqtt()
            self.disconnect_serial()


def main():
    parser = argparse.ArgumentParser(
        description="Bridge Serial to MQTT for Arduino Energy Telemetry"
    )
    parser.add_argument(
        "--port",
        type=str,
        default=DEFAULT_SERIAL_PORT,
        help=f"Serial port (default: {DEFAULT_SERIAL_PORT})"
    )
    parser.add_argument(
        "--baud",
        type=int,
        default=DEFAULT_BAUD_RATE,
        help=f"Baud rate (default: {DEFAULT_BAUD_RATE})"
    )

    args = parser.parse_args()

    bridge = SerialMQTTBridge(args.port, args.baud)
    bridge.run()


if __name__ == "__main__":
    main()