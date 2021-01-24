'use strict';
const AWS = require('aws-sdk');
const uuid = require('uuid');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports = async function (type, message) {
  const timestamp = new Date().getTime();
  const log = {
    id: uuid.v1(),
    type,
    message,
    application: 'twitter-admin',
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