'use strict';
const AWS = require('aws-sdk');

const dynamoService = require('./dynamoService.js');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();
module.exports.getData = async (event) => {
  let response = {}
  response.statusCode = 500;
  response.body = JSON.stringify({
    message: 'Failed to get insights.'
  });
  try {
    const requestBody = JSON.parse(event.body);
    const tableName = requestBody.tableName;
    const query = requestBody.query;
    if (typeof query === 'object' && typeof tableName === 'string') {
      let filter = '';
      let attribNames = {};
      let attribValues = {};
      if (Object.keys(query).length > 1) {
        for (let key in query) {
          if (parseInt(key) % 2 != 0) {
            filter += query[`${key}`];
          } else {
            filter += `#${query[`${key}`][0]} ${query[`${key}`][1]} :${query[`${key}`][0]}val `;
            attribNames[`#${query[`${key}`][0]}`] = query[`${key}`][0];
            attribValues[`:${query[`${key}`][0]}val`] = query[`${key}`][2]
          }
        }
      } else {
        filter += `#${query[0][0]} ${query[0][1]} :${query[0][0]}val`;
        attribNames[`#${query[0][0]}`] = query[0][0];
        attribValues[`:${query[0][0]}val`] = query[0][2]
      }
      const params = {
        TableName: tableName,
        FilterExpression: filter,
        ExpressionAttributeNames: attribNames,
        ExpressionAttributeValues: attribValues
      };
      const scanResults = await dynamoService.scanItems(params)
      if (scanResults.length > 0) {
        response.statusCode = 200;
        response.body = JSON.stringify({
          dataCount: scanResults.length,
          data: scanResults
        });
      } else {
        response.statusCode = 200;
        response.body = JSON.stringify({
          message: 'No data found!!'
        });
      }
    } else {
      response.statusCode = 400;
      response.body = JSON.stringify({
        message: 'Invalid query!!'
      });
    }
  } catch (error) {
    console.log('error fetching insights', error);
  }
  return response;
}