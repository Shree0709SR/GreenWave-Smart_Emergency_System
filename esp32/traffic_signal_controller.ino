#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "Hii";               
const char* password = "whoareyou";

// Backend API
String serverUrl = "http://172.16.7.186:5000/api/signals/state";

// Signal A Pins
int A_red = 25;
int A_yellow = 26;
int A_green = 27;

// Signal B Pins
int B_red = 14;
int B_yellow = 12;
int B_green = 13;

// Signal C Pins
int C_red = 33;
int C_yellow = 32;
int C_green = 4;

// Timing
unsigned long lastSwitch = 0;
int currentSignal = 0; // 0=A,1=B,2=C
int state = 0; // 0=GREEN,1=YELLOW

// Modes
bool priorityMode = false;
bool manualMode = false;

// Manual values
String manualSignal = "";
String manualColor = "";

// ----------------------------------
// Setup
// ----------------------------------
void setup() {
  Serial.begin(115200);

  pinMode(A_red, OUTPUT);
  pinMode(A_yellow, OUTPUT);
  pinMode(A_green, OUTPUT);

  pinMode(B_red, OUTPUT);
  pinMode(B_yellow, OUTPUT);
  pinMode(B_green, OUTPUT);

  pinMode(C_red, OUTPUT);
  pinMode(C_yellow, OUTPUT);
  pinMode(C_green, OUTPUT);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting WiFi...");
  }

  Serial.println("Connected!");

  // *** FIX 1: Set Signal A to GREEN immediately on boot ***
  setSignal(0, "green");
  lastSwitch = millis();
  Serial.println("Signal A -> GREEN (startup)");
}

// ----------------------------------
// Helper: Set all RED
// ----------------------------------
void allRed() {
  digitalWrite(A_red, HIGH);
  digitalWrite(B_red, HIGH);
  digitalWrite(C_red, HIGH);

  digitalWrite(A_green, LOW);
  digitalWrite(B_green, LOW);
  digitalWrite(C_green, LOW);

  digitalWrite(A_yellow, LOW);
  digitalWrite(B_yellow, LOW);
  digitalWrite(C_yellow, LOW);
}

// ----------------------------------
// Helper: Set Signal
// ----------------------------------
void setSignal(int sig, String color) {
  allRed();

  int r, y, g;

  if (sig == 0) { r = A_red; y = A_yellow; g = A_green; }
  else if (sig == 1) { r = B_red; y = B_yellow; g = B_green; }
  else { r = C_red; y = C_yellow; g = C_green; }

  // *** FIX 2: Turn OFF the red LED before turning on green/yellow ***
  if (color == "green") {
    digitalWrite(r, LOW);   // turn OFF red
    digitalWrite(g, HIGH);  // turn ON green
  }
  else if (color == "yellow") {
    digitalWrite(r, LOW);   // turn OFF red
    digitalWrite(y, HIGH);  // turn ON yellow
  }
  // if "red" -> already set by allRed(), nothing extra needed
}

// ----------------------------------
// Fetch Backend State
// ----------------------------------
void fetchState() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);

    int code = http.GET();

    if (code == 200) {
      String payload = http.getString();
      Serial.println(payload);

      StaticJsonDocument<512> doc;
      deserializeJson(doc, payload);

      priorityMode = doc["priority"];
      manualMode = doc["manual"];

      if (priorityMode) {
        currentSignal = doc["prioritySignal"]; // 0/1/2
      }

      if (manualMode) {
        manualSignal = doc["signal"].as<String>();
        manualColor = doc["color"].as<String>();
      }
    }

    http.end();
  }
}

// ----------------------------------
// Manual Control
// ----------------------------------
void handleManual() {
  int sig = 0;

  if (manualSignal == "A") sig = 0;
  else if (manualSignal == "B") sig = 1;
  else sig = 2;

  setSignal(sig, manualColor);
}

// ----------------------------------
// Ambulance Priority
// ----------------------------------
void handlePriority() {
  setSignal(currentSignal, "green");
}

// ----------------------------------
// Normal Cycle
// ----------------------------------
void normalCycle() {
  unsigned long now = millis();

  if (state == 0 && now - lastSwitch >= 70000) {
    // switch to yellow
    state = 1;
    lastSwitch = now;
    setSignal(currentSignal, "yellow");
  }
  else if (state == 1 && now - lastSwitch >= 3000) {
    // move to next signal
    state = 0;
    currentSignal = (currentSignal + 1) % 3;
    lastSwitch = now;
    setSignal(currentSignal, "green");
  }
}

// ----------------------------------
// Loop
// ----------------------------------
void loop() {

  fetchState();

  if (manualMode) {
    handleManual();
  }
  else if (priorityMode) {
    handlePriority();
  }
  else {
    normalCycle();
  }

  delay(1000);
}
