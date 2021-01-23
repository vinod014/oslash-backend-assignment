'use strict';
const AWS = require('aws-sdk');
const uuid = require('uuid');
const generateLog = require('./logs.js')

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.editUser = async event => {
  let response = {}
  response.statusCode = 500;
  response.body = JSON.stringify({
    message: 'Failed to save user details action due to some error'
  });
  try {
    const requestBody = JSON.parse(event.body);
    const action = requestBody.action;
    const contentData = requestBody.content;
    const userId = requestBody.userId;
    if (action === 'changeUserDetails') {
      if (typeof contentData === 'object' && typeof userId === 'number') {
        const adminAction = createAdminAction(action, contentData, userId)
        await submitAdminAction(adminAction)
          .then(async res => {
            await generateLog('action', `Admin requested to ${action} of userId ${userId}`)
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
          message: 'Invalid user details!!'
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

const submitAdminAction = tweetInfo => {
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
    userId,
    isApproved: 0,
    isProcessed: 0,
    remarks: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
} 