#include <WiFi.h>
#include <Arduino.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "Wokwi-GUEST";
const char* password = "";

// URL local direta através da ponte do VS Code
const char* serverUrl = "http://host.wokwi.internal:3000/api/repeaters/REP-001";

void setup() {
  Serial.begin(115200);
  
  WiFi.begin(ssid, password);
  Serial.print("A ligar ao Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nLigado com sucesso!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<200> doc;
    doc["id"] = "REP-001";
    doc["name"] = "Torre A · Centro";
    doc["location"] = "São Paulo, SP";
    doc["status"] = "ok";
    doc["temp"] = 43.5;
    doc["voltage"] = 12.1;
    doc["signal"] = 85;
    doc["updated"] = "agora";

    String jsonString;
    serializeJson(doc, jsonString);

    int httpResponseCode = http.PUT(jsonString);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("Dados enviados com sucesso! Código HTTP: ");
      Serial.println(httpResponseCode);
      Serial.println(response);
    } else {
      Serial.print("Erro no envio. Código HTTP: ");
      Serial.println(httpResponseCode);
    }

    http.end();
  } else {
    Serial.println("Wi-Fi desconectado!");
  }

  delay(10000);
}