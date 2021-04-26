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
const iotdata = new AWS.IotData({endpoint: 'aevahu80uzg6g-ats.iot.us-east-1.amazonaws.com'});
const ddbDocClient = new AWS.DynamoDB.DocumentClient();
const ssm = new AWS.SSM({apiVersion: '2014-11-06'});
const mqttSecretSsmName = process.env.mqttSecretSsmName;
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
        FilterExpression: '#active = :active and #expiryDate >= :expiryDate',
        ExpressionAttributeNames: {
            "#entryCode": "entryCode",
            "#customerAddress": "contactAddress",
            "#expiryDate": "expiryDate",
            "#active": "active"
        },
        ExpressionAttributeValues: {
            ":entryCode": entryCode,
            ":customerAddress": customerAddress,
            ":expiryDate": date.UTC(),
            ":active": true
        }
    };
    
    validCodes = await ddbDocClient.query(params).promise();
    console.log('validCodes');
    if (validCodes.Items.length >= 1) {
        if (validCodes.Items[0].oneTimeUse == true) {
            //TransactWrite
            var md5 = crypto.createHash('md5').update(GUID+hash).digest('hex');
            var params = {
                TransactItems: [
                {
                    Update: {
                        Key: {
                            contactAddress: eventHash,
                            entryCode: Table 
                        },
                        TableName: dynamoTableName, 
                        UpdateExpression: 'SET #guid = :guid',
                        ConditionExpression: 'attribute_not_exists(#guid) and #hash = :hash',
                        ExpressionAttributeNames: {
                            "#hash": "team-hash",
                            "#guid": "GUID"
                        },
                        ExpressionAttributeValues: {
                            ':hash': hash,
                            ':guid': GUID
                        },
                        ReturnValuesOnConditionCheckFailure: 'ALL_OLD'
                    }
                },
                ],
                ClientRequestToken: md5,
                ReturnConsumedCapacity: 'NONE',
                ReturnItemCollectionMetrics: 'NONE'
            };
        try {
            //transactWrite = await docClient.transactWrite(params).promise();
            console.log('Got to Transact Write');
            output = {'message': 
                {'AccountHash': hash, 'Table': Table, 'eventHash': eventHash, 'GUID': GUID, 'transactWriteResponse': transactWrite}
            }
        } catch(err) {
            console.log(err);
            if (err && (attempt < 6 || attempt == undefined) ) {
                if (attempt == undefined) attempt = 1;
                setTimeout(function(){dDBGetAccHash(eventHash, eventTeams, GUID, Table, attempt+1);}, attempt*3);
                console.log('Error: ' + attempt);
            }
        }
            //if transactWrite not an error, return hash, else return error.
            return output.message;        
            
            
            
        } else {
            return {result: 200};
        }
    } else {return {result: 400, error: 'Invalid entryCode or contactAddress'};}
}

async function cleanUpInactiveCodes(){}

exports.handler = function(event, context) {
    //console.log("EVENT: \n" + JSON.stringify(event))
    var date = new Date();
    var entryCode = event['Details']['Parameters']['EntryCode'];
    var customerAddress = event['Details']['ContactData']['CustomerEndpoint']['Address'];
    var mqttSecret = getParameter(mqttSecretSsmName);
    var entryCodeValid = validateCode(entryCode, customerAddress, date);
    Promise.all([mqttSecret,entryCodeValid]).then((results) => {
        
        if (results[1].result === 200) {
            var params = {
                topic: 'AWSIoT/Hass/connect/buzzer_request',
                payload: {
                    'mqttSecret': results[0],
                    'customerAddress': customerAddress,
                    'entryCode': entryCode
                },
                qos: 0
            };
            params.payload = JSON.stringify(params.payload);
            console.log(params.payload);
            
            
            iotdata.publish(params, function(err, data) {
                if(err){
                    console.log(err);
                }
                else{
                    console.log("Success");
                    console.log(data);
                    context.succeed();
                }
            });    
        } else { 
            //Invalid Code
            console.log(results[1].result);
            return results[1];
        }
        
            
    
    });    
}