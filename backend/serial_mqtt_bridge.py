#!/usr/bin/env python3
"""
Serial to MQTT Bridge - Full duplex communication between Arduino and MQTT broker
"""

import serial
import threading
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

# ============================================================
# Configuration - Easy to change
# ============================================================
SERIAL_PORT = "/dev/ttyUSB0"  # Change to COM3 on Windows or /dev/ttyACM0
BAUD_RATE = 9600
MQTT_BROKER = "test.mosquitto.org"
MQTT_PORT = 1883
PUBLISH_TOPIC = "energy/arduino/outgoing"  # Arduino -> broker
SUBSCRIBE_TOPIC = "energy/arduino/incoming"  # broker -> Arduino


# ============================================================
# Global state
# ============================================================
ser = None
mqtt_client = None
stop_event = threading.Event()


def log_message(direction, message):
    """Log messages with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{direction}] {message}")


def on_connect(client, userdata, flags, rc, properties=None):
    """Callback when connected to MQTT broker"""
    if rc == 0:
        log_message("MQTT", f"Connected to broker at {MQTT_BROKER}:{MQTT_PORT}")
        client.subscribe(SUBSCRIBE_TOPIC, qos=1)
    else:
        log_message("MQTT", f"Connection failed with code {rc}")


def on_disconnect(client, userdata, rc, properties=None):
    """Callback when disconnected from MQTT broker"""
    log_message("MQTT", f"Disconnected with code {rc}")


def on_message(client, userdata, msg):
    """Callback when MQTT message received - forward to Serial"""
    try:
        payload = msg.payload.decode('utf-8')
        log_message("MQTT→SERIAL", payload)
        if ser and ser.is_open:
            ser.write((payload + '\n').encode('utf-8'))
            ser.flush()
    except UnicodeDecodeError:
        log_message("WARN", f"Skipping non-UTF8 message from MQTT")
    except Exception as e:
        log_message("ERROR", f"Failed to write to Serial: {e}")


def read_serial_thread():
    """Background thread to read from Serial and publish to MQTT"""
    global ser

    while not stop_event.is_set():
        try:
            if ser and ser.is_open:
                if ser.in_waiting > 0:
                    try:
                        line = ser.readline().decode('utf-8').strip()
                        if line:
                            log_message("SERIAL→MQTT", line)
                            result = mqtt_client.publish(PUBLISH_TOPIC, line, qos=1)
                            result.wait_for_publish()
                    except UnicodeDecodeError:
                        log_message("WARN", "Skipping non-UTF8 line from Serial")
                    except Exception as e:
                        log_message("ERROR", f"Failed to read Serial: {e}")
                        # Attempt to reopen port
                        try:
                            ser.close()
                            time.sleep(3)
                            ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
                            log_message("SERIAL", "Reopened Serial port")
                        except Exception as re:
                            log_message("ERROR", f"Failed to reopen Serial: {re}")
            else:
                time.sleep(0.1)
        except serial.SerialException as e:
            log_message("ERROR", f"Serial error: {e}")
            time.sleep(3)
            try:
                ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
                log_message("SERIAL", "Reopened Serial port")
            except Exception as re:
                log_message("ERROR", f"Failed to reopen Serial: {re}")
        except Exception as e:
            log_message("ERROR", f"Unexpected error in Serial thread: {e}")
            time.sleep(1)


def main():
    global ser, mqtt_client

    # Open Serial port
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        log_message("SERIAL", f"Opened {SERIAL_PORT} at {BAUD_RATE} baud")
    except serial.SerialException as e:
        log_message("ERROR", f"Cannot open Serial port {SERIAL_PORT}: {e}")
        sys.exit(1)

    # Create MQTT client
    mqtt_client = mqtt.Client(
        client_id="serial_mqtt_bridge",
        callback_api_version=mqtt.CallbackAPIVersion.VERSION1
    )
    mqtt_client.on_connect = on_connect
    mqtt_client.on_disconnect = on_disconnect
    mqtt_client.on_message = on_message

    # Enable automatic reconnection
    mqtt_client.reconnect_delay_set(1, 30)

    # Connect to MQTT broker
    try:
        log_message("MQTT", f"Connecting to {MQTT_BROKER}:{MQTT_PORT}...")
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
    except Exception as e:
        log_message("ERROR", f"Failed to connect to MQTT broker: {e}")
        if ser:
            ser.close()
        sys.exit(1)

    # Start Serial reader thread (daemon)
    serial_thread = threading.Thread(target=read_serial_thread, daemon=True)
    serial_thread.start()

    log_message("BRIDGE", "Running - Press Ctrl+C to stop")

    # Keep main thread alive
    try:
        stop_event.wait()
    except KeyboardInterrupt:
        log_message("BRIDGE", "Shutting down...")
        stop_event.set()

    # Clean shutdown
    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    if ser:
        ser.close()
    log_message("BRIDGE", "Stopped")


if __name__ == "__main__":
    main()