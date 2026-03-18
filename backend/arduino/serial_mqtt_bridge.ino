// Serial MQTT Bridge for Arduino Uno
// Sends JSON messages every 3 seconds and echoes incoming Serial messages

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 3000; // 3 seconds

void setup() {
  Serial.begin(9600);
  while (!Serial) {
    // Wait for Serial to be ready
  }
}

void loop() {
  unsigned long currentTime = millis();

  // Send JSON message every 3 seconds without blocking Serial reading
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = currentTime;
    Serial.print("{\"device\":\"arduino_uno\",\"msg\":\"hello\",\"uptime_ms\":");
    Serial.print(currentTime);
    Serial.println("}");
  }

  // Check for incoming messages from PC
  if (Serial.available() > 0) {
    String received = Serial.readStringUntil('\n');
    received.trim();
    if (received.length() > 0) {
      Serial.print("[FROM BROKER] ");
      Serial.println(received);
    }
  }
}