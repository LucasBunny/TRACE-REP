#include <WiFi.h>
#include <Arduino.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "Wokwi-GUEST";
const char* password = "";

const char* serverUrl = "https://trace-rep.vercel.app/api/telemetry/ingest";

void setup() {
  Serial.begin(115200);
  Serial.println("=== TRACE-REP REP-001 VERSAO NOVA ===");
  randomSeed(micros());

  WiFi.begin(ssid, password);
  Serial.print("Conectando ao Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConectado ao Wi-Fi!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<200> doc;

    doc["id"] = "REP-001";
    doc["temp"] = random(400, 461) / 10.0;
    doc["voltage"] = random(120, 125) / 10.0;
    doc["signal"] = random(75, 96);

    String jsonString;
    serializeJson(doc, jsonString);

    int httpResponseCode = http.POST(jsonString);

    Serial.println("\nURL utilizada:");
    Serial.println(serverUrl);

    Serial.println("JSON enviado:");
    Serial.println(jsonString);

    if (httpResponseCode > 0) {
      String response = http.getString();

      Serial.print("Código HTTP: ");
      Serial.println(httpResponseCode);

      Serial.println("Resposta do servidor:");
      Serial.println(response);
    } else {
      Serial.print("Erro no envio: ");
      Serial.println(httpResponseCode);
    }

    http.end();

  } else {
    Serial.println("Wi-Fi desconectado! Tentando reconectar...");
    WiFi.reconnect();
  }

  delay(15000);
}