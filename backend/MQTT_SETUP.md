# MQTT Serial Bridge Setup Guide

## Requirements

```bash
pip install -r requirements_mqtt.txt
```

## Find your Serial port

**Linux:**
```bash
ls /dev/tty* | grep -E "USB|ACM"
```

**Windows:**
```cmd
mode
```

## Run the bridge

```bash
python serial_mqtt_bridge.py
```

If your Arduino is on a different port, edit `SERIAL_PORT` at the top of the script:
```python
SERIAL_PORT = "/dev/ttyACM0"  # or COM3 on Windows
```

## Test without Arduino

In one terminal, run the bridge:
```bash
python serial_mqtt_bridge.py
```

In another terminal, run the test publisher:
```bash
python mqtt_send_test.py
```

You should see `[MQTT→SERIAL] {"source":"pc_test","msg":"ping from broker","ts":...}` in the bridge terminal.

## Verify end-to-end

Watch live traffic on both topics:
```bash
mosquitto_sub -h test.mosquitto.org -t "energy/arduino/#" -v
```

## Expected output

**Bridge terminal (Serial → MQTT):**
```
[2026-03-18 12:00:00] [SERIAL→MQTT] {"device":"arduino_uno","msg":"hello","uptime_ms":3000}
```

**Bridge terminal (MQTT → Serial):**
```
[2026-03-18 12:00:01] [MQTT→SERIAL] {"source":"pc_test","msg":"ping from broker","ts":1234567890}
```