'use strict';
const AWS = require('aws-sdk');

const dynamoService = require('./dynamoService.js');
const processCallback = require('./callbackService');
const logService = require('./logs');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();
module.exports.approveAction = async (event) => {
  let response = {}
  response.statusCode = 500;
  response.body = JSON.stringify({
    message: 'Failed to approve admin action due to some error'
  });
  try {
    const requestBody = JSON.parse(event.body);
    const actionId = requestBody.actionId;
    const approverId = requestBody.userId;
    if (typeof actionId === 'string' && typeof approverId === 'number') {
      const actionParams = {
        TableName: process.env.ACTIONS_TABLE,
        Key: {
          "id": actionId
        }
      };
      const actionData = await dynamoService.getItem(actionParams);
      if (typeof actionData === 'object' && 'Item' in actionData) {
        const actionDetails = actionData.Item;
        const actionName = actionDetails.action;
        const callbackParams = {
          TableName: process.env.CALLBACKS_TABLE,
          Key: {
            "name": actionName
          }
        };
        const callbackData = await dynamoService.getItem(callbackParams);
        const callbackDetails = callbackData.Item;
        const actionContent = actionDetails.content;
        const callbackResponse = await processCallback(callbackDetails, actionContent);
        await updateAdminAction(callbackResponse, actionDetails.id, approverId);
        await logService.generateLog('audit', `Super admin ${approverId} approved admin request with action id ${actionId}`)
        response.statusCode = 200;
        response.body = JSON.stringify({
          processed: callbackResponse.processed
        });;
      } else {
        response.statusCode = 400;
        response.body = JSON.stringify({
          message: 'Admin action not found!'
        })
      }
    } else {
      response.statusCode = 400;
      response.body = JSON.stringify({
        message: 'Invalid request details'
      })
    }
  } catch (err) {
    console.log('error', err);
  }
  return response;
};

const updateAdminAction = async (callbackResponse, id, approverId) => {
  const adminActionData = {
    TableName: process.env.ACTIONS_TABLE,
    Key: {
      id
    },
    UpdateExpression: "set isApproved = :a, isProcessed=:p, remarks=:r, approvedBy=:u",
    ExpressionAttributeValues: {
      ":a": true,
      ":p": callbackResponse.processed,
      ":r": callbackResponse.message,
      ":u": approverId
    }
  };
  dynamoService.updateItem(adminActionData);
}
