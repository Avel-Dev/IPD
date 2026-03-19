// Serial MQTT Bridge for Arduino Uno
// Sends energy telemetry JSON - memory efficient, non-blocking

// ===== CONFIGURATION =====
const char* HOUSE_ID = "house_3";  // Change this to your house ID
const unsigned long SEND_INTERVAL = 3000;  // 3 seconds
// =========================

unsigned long lastSendTime = 0;
char jsonBuffer[128];  // Fixed buffer to avoid heap fragmentation

void setup() {
  Serial.begin(9600);
  while (!Serial) {
    // Wait for Serial to be ready
  }
}

void loop() {
  unsigned long currentTime = millis();

  // Send energy data every 3 seconds without blocking
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = currentTime;

    // Simulated energy values (replace with actual sensor readings)
    float energy_produced = 0.05;
    float energy_consumed = 0.03;
    float surplus = energy_produced - energy_consumed;

    // Build JSON using char buffer (no String class)
    int len = snprintf(jsonBuffer, sizeof(jsonBuffer),
      "{\"house_id\":\"%s\",\"energy_produced\":%.3f,\"energy_consumed\":%.3f,\"surplus_energy\":%.3f}",
      HOUSE_ID, energy_produced, energy_consumed, surplus);

    if (len > 0 && len < sizeof(jsonBuffer)) {
      Serial.println(jsonBuffer);
    }
  }

  // Echo incoming messages from PC (non-blocking, char buffer)
  if (Serial.available() > 0) {
    int idx = 0;
    while (Serial.available() && idx < sizeof(jsonBuffer) - 1) {
      char c = Serial.read();
      if (c == '\n' || c == '\r') break;
      jsonBuffer[idx++] = c;
    }
    jsonBuffer[idx] = '\0';

    if (idx > 0) {
      Serial.print("[FROM BROKER] ");
      Serial.println(jsonBuffer);
    }
  }
}
