'use strict';
const AWS = require('aws-sdk');
const uuid = require('uuid');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();
async function list(event) {
  let response = {}
  response.statusCode = 500;
  response.body = JSON.stringify({
    message: 'Failed to get logs due to some error'
  });
  try {
    const logType = event.pathParameters.type;
    if (typeof logType === 'string') {
      const params = {
        TableName: process.env.LOGS_TABLE,
        FilterExpression: "#type = :typeValue",
        ExpressionAttributeNames: {
          "#type": "type",
        },
        ExpressionAttributeValues: { ":typeValue": logType }
      };
      let scanResults = [];
      let items;
      do {
        items = await dynamoDb.scan(params).promise();
        items.Items.forEach((item) => scanResults.push(item.message));
        params.ExclusiveStartKey = items.LastEvaluatedKey;
      } while (typeof items.LastEvaluatedKey != "undefined");
      if (scanResults.length > 0) {
        await generateLog('audit', `Super admin viewed logs`)
        response.statusCode = 200;
        response.body = JSON.stringify({
          data: scanResults
        });
      } else {
        response.statusCode = 200;
        response.body = JSON.stringify({
          message: 'No logs found'
        });
      }
    } else {
      response.statusCode = 400;
      response.body = JSON.stringify({
        message: 'Invalid log type'
      })
    }
  } catch (err) {
    console.log('error', err);
  }
  return response;
};

async function generateLog(type, message) {
  const timestamp = new Date().getTime();
  const log = {
    id: uuid.v1(),
    type,
    message,
    application: 'twitter-superAdmin',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const logDbData = {
    TableName: process.env.LOGS_TABLE,
    Item: log,
  };
  return dynamoDb.put(logDbData).promise()
    .then(res => logDbData);
}

module.exports = { list, generateLog }