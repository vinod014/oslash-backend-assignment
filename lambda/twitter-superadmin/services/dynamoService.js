'use strict';
const AWS = require('aws-sdk');
const uuid = require('uuid');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function getItem(params) {
  try {
    const dbData = await dynamoDb.get(params).promise();
    return dbData
  } catch (error) {
    console.log('error fetching db data>>', error)
    return false;
  }
}

async function updateItem(params) {
  try {
    const dbData = await dynamoDb.update(params).promise();
    return dbData
  } catch (error) {
    console.log('error fetching db data>>', error)
    return false;
  }
}

async function scanItems(params) {
  let scanResults = [];
  let items;
  do {
    items = await dynamoDb.scan(params).promise();
    items.Items.forEach((item) => scanResults.push(item));
    params.ExclusiveStartKey = items.LastEvaluatedKey;
  } while (typeof items.LastEvaluatedKey != "undefined");
  return scanResults;
}

module.exports = { getItem, updateItem, scanItems }