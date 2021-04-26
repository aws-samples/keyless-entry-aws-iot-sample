#STEP 0. Set your AWS region here
REGION=us-east-1

#STEP 1. Following the blog steps, in the AWS Console, create an Amazon Connect instance and make note of your phone number, instance ID, and instance alias

#STEP 2. Get your AWS IoT Core endpoint
aws iot describe-endpoint \
    --region $REGION

#STEP 3. Create a SSM SecureString Parameter
aws ssm put-parameter \
    --name AmazonConnect-IoT-entryCode-mqttSecret \
    --type SecureString \
    --value YOUR_SECRET_HERE \
    --region $REGION

#STEP 4. Download the Amazon Root Certificate
wget https://www.amazontrust.com/repository/AmazonRootCA1.pem -O rootCA.pem

#STEP 5. Create an active certificate in AWS IoT
aws iot create-keys-and-certificate \
    --set-as-active \
    --certificate-pem-outfile iotbuzzercertificate.crt \
    --public-key-outfile iotbuzzerpublic.key \
    --private-key-outfile iotbuzzerprivate.key \
    --region $REGION

#STEP 6. Create a policy for your certificate
aws iot create-policy \
    --policy-name iotbuzzer \
    --policy-document '{"Version": "2012-10-17","Statement": [{"Effect": "Allow","Action": ["iot:Connect","iot:Publish","iot:Receive","iot:Subscribe"],"Resource": "*"}]}'