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
 
const AWS = require('aws-sdk');
const mqttSecretSsmName = process.env.mqttSecretSsmName;
const mqttTopic = process.env.mqttTopic;
const mqttEndpoint = process.env.mqttEndpoint;
const iotdata = new AWS.IotData({endpoint: mqttEndpoint});
const ddbDocClient = new AWS.DynamoDB.DocumentClient();
const ssm = new AWS.SSM({apiVersion: '2014-11-06'});
const dynamoTableName = process.env.dDBTableName;

async function getParameter(mqttSecretSsmName) {
    var params = {
      Name: mqttSecretSsmName,
      WithDecryption: true
    };
    mqttSecret = await ssm.getParameter(params).promise();
    //console.log(JSON.stringify(mqttSecret));
    return mqttSecret.Parameter.Value;
}



async function validateCode (entryCode, customerAddress, date) {
    console.log('Running DDB Code Validation on ' + entryCode + ' and ' + customerAddress);
    
    var params = {
        TableName: dynamoTableName,
        KeyConditionExpression: '#entryCode = :entryCode and #customerAddress = :customerAddress',
        FilterExpression: '#active <> :false and (#expiryTime >= :currentTime or attribute_not_exists(#expiryTime))',
        ExpressionAttributeNames: {
            "#entryCode": "entryCode",
            "#customerAddress": "contactAddress",
            "#expiryTime": "expiryTime-TTL",
            "#active": "active"
        },
        ExpressionAttributeValues: {
            ":entryCode": entryCode,
            ":customerAddress": customerAddress,
            ":currentTime": date,
            ":false": false
        }
    };
    
    validCodes = await ddbDocClient.query(params).promise();
    console.log(validCodes);
    //Check if valid entry code is found
    if (validCodes.Items.length >= 1) {
        //If entrycode is use once only, invalidate it after 5 minutes.
        if (validCodes.Items[0].oneTimeUse == true) {
            //TransactWrite
            var params = {
                TransactItems: [
                {
                    Update: {
                        Key: {
                            contactAddress: customerAddress,
                            entryCode: entryCode
                        },
                        TableName: dynamoTableName, 
                        UpdateExpression: 'SET #expiryTime = :newExpiryTime',
                        ConditionExpression: '#oneTimeUse = :true and (#expiryTime >= :newExpiryTime or attribute_not_exists(#expiryTime))',
                        ExpressionAttributeNames: {
                            "#expiryTime": "expiryTime-TTL",
                            "#oneTimeUse": "oneTimeUse"
                        },
                        ExpressionAttributeValues: {
                            ':true': true,
                            ':newExpiryTime': date+300000
                        },
                        ReturnValuesOnConditionCheckFailure: 'ALL_OLD'
                    }
                },
                ],
                ReturnConsumedCapacity: 'TOTAL',
                ReturnItemCollectionMetrics: 'NONE'
            };
        try {
            transactWrite = await ddbDocClient.transactWrite(params).promise();
            console.log('Invalidating entryCode, results: ' + JSON.stringify(transactWrite));
            return {status: 200};            
        } catch(err) {
            console.log(err);
            if (err.code === 'TransactionCanceledException') {
                console.log('Code expiration already pending');
                return {status: 200};      
            } else {
                return {status: 400, Message: 'TransactWrite failure, other reason'};
            }
            
        }
            //if transactWrite not an error, return hash, else return error.
        } else {
            return {status: 200};
        }
    } else {
        return {status: 400, Message: 'Invalid entryCode or contactAddress'};
    }
}

exports.handler = async function(event, context) {
    console.log("EVENT: \n" + JSON.stringify(event))
    var date = Date.now();
    var entryCode = parseInt(event['Details']['Parameters']['EntryCode'],10);
    var customerAddress = event['Details']['ContactData']['CustomerEndpoint']['Address'];
    var mqttSecret = getParameter(mqttSecretSsmName);
    
    var entryCodeValid = validateCode(entryCode, customerAddress, date);
    
    var result;
    await Promise.all([mqttSecret,entryCodeValid]).then(async (results) => {
    console.log(results[1]);
        if (results[1].status === 200) {
            var params = {
                topic: mqttTopic,
                payload: {
                    'secret': results[0],
                    'customerAddress': customerAddress,
                    'entryCode': entryCode,
                    'event': 'unlock'
                },
                qos: 0
            };
            params.payload = JSON.stringify(params.payload);
            //console.log(params.payload);
            
            try {
                var iotPublishResult = await iotdata.publish(params).promise();
                console.log("Successfully published to AWS IoT");
                result = { 
                    "status" : 200
                };
            } catch (err) {
                console.log(err);
                result = { 
                    "status" : 400,
                    "Message" : "Unable to publish to queue",
                    "errorCode" : "408"
                    };
            }
            

        } else { 
            //Invalid Code
            console.log('No matching entryCode and PhoneNumber found');
            result = { 
                "status" : 400,
                "Message" : "Invalid Entry Code",
                "errorCode" : "410"
                };
        }
        
    });
    return result;
}