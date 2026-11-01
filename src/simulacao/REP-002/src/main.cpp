#include <WiFi.h>
#include <Arduino.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "Wokwi-GUEST";
const char* password = "";

// URL local direta através da ponte do VS Code
const char* serverUrl = "https://trace-rep.vercel.app/api/repeaters/REP-002";

void setup() {
  Serial.begin(115200);
  randomSeed(micros());
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
    doc["id"] = "REP-002";
    doc["name"] = "Torre B - Norte";
    doc["location"] = "Guarulhos, SP";
    doc["status"] = "ok";
    doc["temp"] = random(400, 461) / 10.0;
    doc["voltage"] = random(120, 125) / 10.0;
    doc["signal"] = random(75, 96);
    doc["updated"] = "agora";

    String jsonString;
    serializeJson(doc, jsonString);

    int httpResponseCode = http.PUT(jsonString);

    Serial.println("URL utilizada:");
    Serial.println(serverUrl);

    Serial.println("JSON enviado:");
    Serial.println(jsonString);

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

  delay(5000);
}