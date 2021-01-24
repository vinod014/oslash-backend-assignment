'use strict';
const AWS = require('aws-sdk');
const uuid = require('uuid');
const httpService = require('../utility/http-request.utility');
const dynamoService = require('./dynamoService');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports = async function (callbackDetails, actionContent) {
  let response = {};
  try {
    const actionType = callbackDetails.type;
    const callbackContent = callbackDetails.callback_content;
    switch (actionType) {
      case 'Rest':
        if (callbackContent.request_type == 'Post') {
          response = await processPostRequest(callbackContent, actionContent)
        }
        else if (callbackContent.request_type == 'Delete') {
          response = await processDeleteRequest(callbackContent, actionContent)
        }
        else {
          response['processed'] = false;
          response['message'] = `Rest type ${callbackContent.request_type} not yet configured`;
        }
        break;
      case 'DbQuery':
        response = await processUpdateQuery(callbackContent, actionContent)
        break;
    }
  } catch (error) {
    response['processed'] = false;
    response['message'] = `Error while processing callback error message: ${error.message}`;
  }
  return response;
}

const processPostRequest = async (callbackContent, actionContent) => {
  const processResponse = {};
  processResponse['processed'] = false;
  const requestUrl = callbackContent.request_url;
  const requestBody = {}
  const requestHeader = {}
  let isValidActionContent = true;
  callbackContent.required_fields.forEach(element => {
    if (!actionContent.hasOwnProperty(element)) {
      isValidActionContent = false;
    } else {
      requestBody[`${element}`] = actionContent[`${element}`]
    }
  });
  console.log(isValidActionContent);
  // if (callbackContent.required_headers.length > 0) {
  //   Can implement requestHeader logic
  // }
  if (isValidActionContent) {
    await httpService.sendPostRequest(requestUrl, requestHeader, requestBody)
      .then((apiResponse) => {
        if (apiResponse.status == 200) {
          processResponse['processed'] = true;
        }
        processResponse['message'] = apiResponse.data;
      })
      .catch((err) => {
        processResponse['message'] = `${err.message}`;
      })
  } else {
    processResponse['message'] = 'Insufficient action content.'
  }
  return processResponse
}

const processDeleteRequest = async (callbackContent, actionContent) => {
  const processResponse = {};
  processResponse['processed'] = false;
  let requestUrl = `${callbackContent.request_url}`;
  const requestParams = {}
  const requestHeader = {}
  let isValidActionContent = true;
  callbackContent.required_fields.forEach(element => {
    if (!actionContent.hasOwnProperty(element)) {
      isValidActionContent = false;
    } else {
      requestUrl = requestUrl.replace(element, actionContent[`${element}`])
    }
  });
  // if (callbackContent.required_headers.length > 0) {
  //   Can implement requestHeader logic
  // }
  if (isValidActionContent) {
    await httpService.sendDeleteRequest(requestUrl, requestParams, requestHeader)
      .then((apiResponse) => {
        if (apiResponse.status == 200) {
          processResponse['processed'] = true;
        }
        processResponse['message'] = apiResponse.data;
      })
      .catch((err) => {
        processResponse['message'] = `${err.message}`;
      })
  } else {
    processResponse['message'] = 'Insufficient action content.'
  }
  return processResponse
}

const processUpdateQuery = async (callbackContent, actionContent) => {
  const processResponse = {};
  processResponse['processed'] = false;
  const tableName = callbackContent.query_table;
  let isValidActionContent = true;
  let set = "set ";
  let i = 0;
  let expression = {}
  callbackContent.required_fields.forEach(element => {
    if (!actionContent.hasOwnProperty(element)) {
      isValidActionContent = false;
    } else {
      if (element != 'id') {
        set = set + `${element} = :${i},`;
        expression[`:${i}`] = `${actionContent[`${element}`]}`
      }
    }
  });
  set = set + `updatedAt = :u`;
  expression[':u'] = new Date().getTime();
  if (isValidActionContent) {
    const updateParams = {
      TableName: tableName,
      Key: {
        id: actionContent['id']
      },
      UpdateExpression: set,
      ExpressionAttributeValues: expression
    }
    await dynamoService.updateItem(updateParams)
      .then((dbData) => {
        if (dbData) {
          processResponse['processed'] = true;
        }
        processResponse['message'] = dbData
      })
      .catch((err) => {
        processResponse['message'] = `${err.message}`;
      })
  } else {
    processResponse['message'] = 'Insufficient action content.'
  }
  return processResponse
}