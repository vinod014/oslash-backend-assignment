'use strict';
const AWS = require('aws-sdk');
const uuid = require('uuid');
const generateLog = require('./logs.js')

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.addActions = async event => {
  let response = {}
  response.statusCode = 500;
  response.body = JSON.stringify({
    message: 'Failed to save admin action due to some error'
  });
  try {
    const requestBody = JSON.parse(event.body);
    const action = requestBody.action;
    const content = requestBody.content;
    const userId = requestBody.userId;
    const validActions = process.env.TWEET_ACTIONS.split(',');
    if (validActions.includes(action)) {
      if (typeof content === 'object' && typeof userId === 'number') {
        const adminAction = createAdminAction(action, content, userId)
        await submitAdminAction(adminAction)
          .then(async res => {
            await generateLog('action', `Admin id ${userId} requested to ${action} with content ${JSON.stringify(content)}`)
            response.statusCode = 200;
            response.body = JSON.stringify({
              message: 'Action saved successfully'
            });
          })
          .catch(err => {
            console.log('error storing Action ', err);
          })
      } else {
        response.statusCode = 400;
        response.body = JSON.stringify({
          message: 'Invalid content details!!'
        });
      }
    } else {
      response.statusCode = 400;
      response.body = JSON.stringify({
        message: 'Invalid Action!!'
      });
    }
  } catch (err) {
    console.log('error', err);
  }
  return response;
};

const submitAdminAction = async tweetInfo => {
  const tweetDbData = {
    TableName: process.env.ACTIONS_TABLE,
    Item: tweetInfo,
  };
  return dynamoDb.put(tweetDbData).promise()
    .then(res => tweetInfo);
}

const createAdminAction = (action, content, userId) => {
  const timestamp = new Date().getTime();
  return {
    id: uuid.v1(),
    action,
    content,
    createdBy: userId,
    isApproved: false,
    isProcessed: false,
    approvedBy: 0,
    remarks: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
} 