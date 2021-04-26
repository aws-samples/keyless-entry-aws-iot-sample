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

//1. Define your device name and the AWS IoT Topics your device will subscribe to and publish messages to
#define THING_NAME "Esp32B" //Optionally, rename the device
#define MQTT_LASTWILL_TOPIC "Esp32B/lastwill"
#define MQTT_PUB_TOPIC "Esp32B/buzzer/output"
#define MQTT_SUB_TOPIC "Esp32B/buzzer/input"

//2. Enter the secret you used for AWS Systems Manager's secret parameter
#define SECRET_KEY "XXXXXXXX"

//3. Enter your WIFI credentials and your IoT Endpoint
const char WIFI_SSID[] = "XXXXXXXXXXXXX";
const char WIFI_PASSWORD[] = "XXXXXXXXXXXXXX";
const char AWS_IOT_ENDPOINT[] = "XXXXXXXXXXXXXXXX.iot.XX-XXXX-X.amazonaws.com";

//4. Amazon Root CA 1
static const char AWS_CERT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
-----END CERTIFICATE-----
)EOF";

//5. Device Certificate
static const char AWS_CERT_CRT[] PROGMEM = R"KEY(
-----BEGIN CERTIFICATE-----
-----END CERTIFICATE-----
)KEY";

//6. Device Private Key
static const char AWS_CERT_PRIVATE[] PROGMEM = R"KEY(
-----BEGIN RSA PRIVATE KEY-----
-----END RSA PRIVATE KEY-----
)KEY";