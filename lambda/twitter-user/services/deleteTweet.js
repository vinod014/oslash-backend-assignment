'use strict';
const AWS = require('aws-sdk');
const generateLog = require('./logs.js')

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.delete = async event => {
  let response = {}
  response.statusCode = 500;
  response.body = JSON.stringify({
    message: 'Failed to delete tweet due to some error'
  });
  try {
    const tweetId = event.pathParameters.id;
    const tweetedBy = parseInt(event.pathParameters.uid);
    if (typeof tweetId === 'string' && !isNaN(tweetedBy)) {
      await deleteTweet(tweetId, tweetedBy)
        .then(async res => {
          if (res) {
            await generateLog('audit', `User id:${tweetedBy} deleted tweetId: ${tweetId}`)
            response.statusCode = 200;
            response.body = JSON.stringify({
              message: 'Tweet deleted successfully'
            });
          } else {
            response.statusCode = 400;
            response.body = JSON.stringify({
              message: 'Tweet not present!!'
            });
          }
        })
        .catch(err => {
          console.log('error deleting tweet ', err);
        })
    } else {
      response.statusCode = 400;
      response.body = JSON.stringify({
        message: 'Invalid tweet!!'
      });
    }
  } catch (err) {
    console.log('error', err);
  }
  return response;
};

const deleteTweet = async (tweetId, tweetedBy) => {
  const params = {
    TableName: process.env.TWEETS_TABLE,
    Key: {
      "id": tweetId
    },
    ConditionExpression: `tweetedBy = :uid`,
    ExpressionAttributeValues: {
      ":uid": tweetedBy
    },
    ReturnValues: 'ALL_OLD'
  };
  console.log('params>>>', params)
  const response = await dynamoDb.delete(params).promise();
  if (!response.Attributes) {
    return false;
  }
  return true;
}
