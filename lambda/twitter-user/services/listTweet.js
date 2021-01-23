'use strict';
const AWS = require('aws-sdk');
const generateLog = require('./logs.js')

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();
module.exports.list = async (event) => {
  let response = {}
  response.statusCode = 500;
  response.body = JSON.stringify({
    message: 'Failed to get tweets due to some error'
  });
  try {
    const tweetedBy = parseInt(event.pathParameters.id);
    if (!isNaN(tweetedBy)) {
      const params = {
        TableName: process.env.TWEETS_TABLE,
        FilterExpression: "#tweetedBy = :tweetedByValue",
        ExpressionAttributeNames: {
          "#tweetedBy": "tweetedBy",
        },
        ExpressionAttributeValues: { ":tweetedByValue": tweetedBy }
      };
      let scanResults = [];
      let items;
      do {
        items = await dynamoDb.scan(params).promise();
        items.Items.forEach((item) => scanResults.push(item));
        params.ExclusiveStartKey = items.LastEvaluatedKey;
      } while (typeof items.LastEvaluatedKey != "undefined");
      if (scanResults.length > 0) {
        await generateLog('audit', `User id:${tweetedBy} listed his/her tweets`)
        response.statusCode = 200;
        response.body = JSON.stringify({
          data: scanResults
        });
      } else {
        response.statusCode = 200;
        response.body = JSON.stringify({
          message: 'No tweets found'
        });
      }
    } else {
      response.statusCode = 400;
      response.body = JSON.stringify({
        message: 'Invalid userId'
      })
    }
  } catch (err) {
    console.log('error', err);
  }
  return response;
};
