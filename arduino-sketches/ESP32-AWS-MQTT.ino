/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

#include <Arduino_JSON.h>
#include <WiFiClientSecure.h>
#include <WiFi.h>
#include <MQTT.h>
#include <MQTTClient.h>

//Ensure you flash the corresponding Secrets.h file on your device
#include "Secrets.h"

WiFiClientSecure net;
MQTTClient client;

// variables to store the current output state
String output27State = "off";
// variable for storing the potentiometer value
int potValue = 0;
// Potentiometer is connected to GPIO 34 (Analog ADC1_CH6) 
const int potPin = 34;
// variable for Hall Effect Sensor
int hallValue = 0;
// Assign output variables to GPIO pins
const int output27 = 27;

long lastMsg = 0;

// Check wifi and connection to MQTT on AWS IoT
void connect() {
  Serial.print("Checking wifi...");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(1000);
  }

  Serial.print("\nConnecting ");
  Serial.print(THING_NAME);
  Serial.print(" to AWS IoT\n");
  while (!client.connect(THING_NAME)) {
    Serial.print(".");
    delay(1000);
  }

  Serial.println("Connected to AWS IoT!");
  client.subscribe(MQTT_SUB_TOPIC);
}

void setup()
{
  Serial.begin(115200);
  // Initialize the output variables as outputs
  pinMode(output27, OUTPUT);
  digitalWrite(output27, LOW);

  // Configure WiFiClientSecure to use the AWS IoT device credentials
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);
 
  //Connect to wifi and AWS IoT
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  client.begin(AWS_IOT_ENDPOINT, 8883, net);
  client.onMessage(messageReceived);

  // Create FreeRTOS Task to listen for voltage on the sensor and publish a message to MQTT
  xTaskCreate(
    publishRing
    ,  "publishRing"
    ,  8192  // Stack size
    ,  NULL
    ,  1  // Priority
    ,  NULL);

  connect();
}

// Task to send an unlock door signal when a message is received with the correct secret from AWS IoT
void messageReceived(String &topic, String &payload) {
  Serial.println("incoming: " + topic + " - " + payload);
  JSONVar message = JSON.parse(payload);
  String event = JSON.stringify(message["event"]);
  String secret = JSON.stringify(message["secret"]);
  if (event == JSON.stringify("unlock") && secret ==  JSON.stringify(SECRET_KEY)) {
      Serial.println("Creating Unlock FreeRTOS Task");
      xTaskCreate(
        unlockDoor
        ,  "unlockDoor"
        ,  1024  // Stack size
        ,  NULL
        ,  1  // Priority
        ,  NULL);
  }
}

// FreeRTOS task to handle the length of the door unlock signal and  the pin voltage state
void unlockDoor(void * unused) {
      Serial.println("GPIO 27 on");
      output27State = "on";
      digitalWrite(output27, HIGH);
      //Unlock for 4000 milliseconds
      vTaskDelay(4000); 
      Serial.println("GPIO 27 off");
      output27State = "off";
      digitalWrite(output27, LOW);
      vTaskDelete(NULL);
}

// FreeRTOS task for listening to the voltage sensor value and publishing messages if voltage is detected on the connected line
void publishRing(void *unused) {
  (void) unused;

  for (;;) {
    // Reading potentiometer value
    potValue = analogRead(potPin);
    // Serial.print("/nPotentiometer Value: ");
    // Serial.print(potValue);
    
    // Depending on your solution, you may need to modify the Potentiometer value  above or below 2000
    if (potValue > 2000) {
      JSONVar message;
      int now = millis();
      message["event"] = "Door event";
      message["potValue"] = potValue;
      // Publish message only if voltage detected more than 5 seconds ago, avoiding repeat messages for the same notification
      if (now - lastMsg > 5000) {
        lastMsg = now;
        Serial.print("/nDoor detected, Publishing message to MQTT: ");
        Serial.print(JSON.stringify(message));
        client.publish(MQTT_PUB_TOPIC, JSON.stringify(message)); // You can activate the retain flag by setting the third parameter to true
      }
    }
    vTaskDelay(100);
  }
}

void loop() {
  client.loop();
  delay(10);
  if (!client.connected()) {
    connect();
  }
}