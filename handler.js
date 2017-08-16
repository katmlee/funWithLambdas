'use strict';
var uuid = require('uuid');
var aws = require('aws-sdk');

module.exports.downloadcsv = (event, context, callback) => {
  const csvDownloadId = uuid();
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      id: csvDownloadId,
    }),
  };
  var sns = new aws.SNS();

  sns.publish({
    Message: csvDownloadId,
    TargetArn:`arn:aws:sns:us-east-1:${process.env.appId}:${process.env.topicName}`,
  }, function(err, data) {
    if (err) console.log(err, err.stack);
    else console.log(data);
    callback(null, response);
  });
};

module.exports.worker = (event, context, callback) => {
  const csvDownloadId = event.Records[0].Sns.Message;
  console.log(
  "in the worker", csvDownloadId
  )
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Doing a lot of work for ' + event,
      input: event,
    }),
  };

  setTimeout(function () {
    console.log('in timeout');
    var s3 = new aws.S3({apiVersion: '2006-03-01'});
    var params = {
      Body: "some csv data",
      Bucket: process.env.bucketName,
      Key: csvDownloadId,
      ContentType: 'text/csv',
    };
    s3.putObject(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
      callback(null, response);
    });
  }, 20000);
};

module.exports.checkcsv = (event, context, callback) => {
  let csvDownloadId = (event.pathParameters || {}).csvDownloadId;
  var s3 = new aws.S3({apiVersion: '2006-03-01'});
  var params = {
    Bucket: process.env.bucketName,
    Key: csvDownloadId,
  };
  s3.headObject(params, function(err, data) {
    if (err) {
      console.log(err); // an error occurred
      const response = {
        statusCode: 404,
      };
      callback(null, response);
    } else {
      s3.getSignedUrl('getObject', params, function(err, data) {
        if (err) {
          console.log(err); // an error occurred
          const response = {
            statusCode: 500,
          };
          callback(null, response);
        } else {
          const response = {
            statusCode: 200,
            body: JSON.stringify({
              url: data,
            }),
          };
          callback(null, response);
        }
      });
    }
  });
};
