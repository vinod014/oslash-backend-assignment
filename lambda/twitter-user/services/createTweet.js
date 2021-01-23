'use strict';
const AWS = require('aws-sdk');
const uuid = require('uuid');
const generateLog = require('./logs.js')

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.create = async event => {
  let response = {}
  response.statusCode = 500;
  response.body = JSON.stringify({
    message: 'Failed to save tweet due to some error'
  });
  try {
    const requestBody = JSON.parse(event.body);
    const tweet = requestBody.tweet;
    const tweetedBy = requestBody.userId;
    if (typeof tweet === 'string' && typeof tweetedBy === 'number') {
      const tweetInfo = createTweetsInfo(tweet, tweetedBy)
      await submitTweet(tweetInfo)
        .then(async res => {
          await generateLog('action', `User id:${tweetedBy} tweeted: ${tweet}`)
          response.statusCode = 200;
          response.body = JSON.stringify({
            message: 'Tweet saved successfully'
          });
        })
        .catch(err => {
          console.log('error storing tweet ', err);
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

const submitTweet = tweetInfo => {
  const tweetDbData = {
    TableName: process.env.TWEETS_TABLE,
    Item: tweetInfo,
  };
  return dynamoDb.put(tweetDbData).promise()
    .then(res => tweetInfo);
}

const createTweetsInfo = (tweet, tweetedBy) => {
  const timestamp = new Date().getTime();
  return {
    id: uuid.v1(),
    tweet,
    tweetedBy,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
} 