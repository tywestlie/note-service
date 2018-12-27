'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.submit = (event, context, callback) => {
  const requestBody = JSON.parse(event.body);
  const message = requestBody.message;
  const tag = requestBody.tag;

  if (typeof message !== 'string' || typeof tag !== 'string') {
    console.error('Validation Failed');
    callback(new Error('Couldn\'t submit message because of validation errors.'));
    return;
  }

  submitNote(noteInfo(message, tag))
  .then(res => {
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        message: `Sucessfully submitted message with tag: ${tag}`,
        noteId: res.id
      })
    });
  })
  .catch(err => {
    console.log(err);
    callback(null, {
      statusCode: 500,
      body: JSON.stringify({
        message: `Unable to submit message with tag: ${tag}`
      })
    })
  });
};

const submitNote = note => {
  console.log('Submitting note');
  const noteInfo = {
    TableName: process.env.NOTE_TABLE,
    Item: note,
  };
  return dynamoDb.put(noteInfo).promise()
  .then(res => note);
};

const noteInfo = (message, tag) => {
  const timestamp = new Date().getTime();
  return {
    id: uuid.v1(),
    message: message,
    tag: tag,
    submittedAt: timestamp,
    updatedAt: timestamp,
  };
};

module.exports.list = (event, context, callback) => {
    var params = {
        TableName: process.env.NOTE_TABLE,
        ProjectionExpression: "id, message, tag, updatedAt"
    };

    console.log("Scanning Notes table.");
    const onScan = (err, data) => {

        if (err) {
            console.log('Scan failed to load data. Error JSON:', JSON.stringify(err, null, 2));
            callback(err);
        } else {
            console.log("Scan succeeded.");
            return callback(null, {
                statusCode: 200,
                body: JSON.stringify({
                    notes: data.Items
                })
            });
        }

    };
    dynamoDb.scan(params, onScan);
};

module.exports.tags = (event, context, callback) => {
  console.log(event)
  const params = {
    TableName: process.env.NOTE_TABLE,
    FilterExpression: '#tag = :tag',
    ExpressionAttributeNames: {
      '#tag': 'tag',
     },
    ExpressionAttributeValues: {
      ':tag': event.pathParameters.tag,
     },
  };

  const onScan = (err, data) => {
      if (err) {
          console.log('Scan failed to load data. Error JSON:', JSON.stringify(err, null, 2));
          callback(err);
      } else {
          console.log("Scan succeeded.");
          return callback(null, {
              statusCode: 200,
              body: JSON.stringify({
                  notes: data.Items
              })
          });
      }

  };
  dynamoDb.scan(params, onScan);
};
