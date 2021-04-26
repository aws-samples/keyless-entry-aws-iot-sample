# GitHub Actions SAM Deployment Example
The purpose of this repository is to provide example code for the [Build your own keyless entry system with Amazon Connect and AWS IoT](http://placeholder.com/placeholder) implementation guide. For full detail on the implementation steps, please visit the guide page.

## Contents
- **amazonconnect-contactflows**: An example Amazon Connect Contact Flow for triggering the door unlock function.
- **aws-cli-scripts**: Contains the necessary AWS CLI commands to create the IoT components necessary for connecting your local IoT device to IoT Core.
- **cloudformation-template**: This AWS CloudFormation template deploys the AWS infrastructure to host the solution
- **lambda-validateEntryCode**: An AWS Lambda function that executes based on the IVR options selected in Amazon Connect.  This lambda function validates the send an unlock code against the code provided for a given phone number in the Amazon DynamoDB table.

