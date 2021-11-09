const AWS = require('aws-sdk');
AWS.config.update({
    region: 'ap-southeast-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = 'TB_INFLUENCERS';
const influencersPath = '/influencers';
const influencerPath = '/influencer';

exports.handler = async function (event) {
    console.log('Request event: ', event);
    let response;
    switch (true) {
        case event.httpMethod === 'GET' && event.path === influencerPath:
            response = await getInfluencer(event.queryStringParameters.EMAIL);
            break;
        case event.httpMethod === 'GET' && event.path === influencersPath:
            response = await getInfluencers();
            break;
        case event.httpMethod === 'POST' && event.path === influencerPath:
            response = await saveInfluencer(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PUT' && event.path === influencerPath:
            response = await updateInfluencer(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PATCH' && event.path === influencerPath:
            const requestBody = JSON.parse(event.body);
            response = await modifyInfluencer(requestBody.EMAIL);
            break;
        case event.httpMethod === 'DELETE' && event.path === influencerPath:
            response = await deleteInfluencer(JSON.parse(event.body).EMAIL);
            break;
        default:
            response = buildResponse(404, '404 Not Found');
    }
       return response;
}

async function getInfluencer(EMAIL) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'EMAIL': EMAIL
        }
    }
    return await dynamodb.get(params).promise().then((response) => {
        return buildResponse(200, response.Item);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    });
}

async function getInfluencers() {
    const params = {
        TableName: dynamodbTableName
    }
    const allInfluencers = await scanDynamoRecords(params, []);
    const body = {
        influencers: allInfluencers
    }
    return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
    try {
        const dynamoData = await dynamodb.scan(scanParams).promise();
        itemArray = itemArray.concat(dynamoData.Items);
        if (dynamoData.LastEvaluatedKey) {
            scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
            return await scanDynamoRecords(scanParams, itemArray);
        }
        return itemArray;
    } catch (error) {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    }
}

async function saveInfluencer(requestBody) {
    const params = {
        TableName: dynamodbTableName,
        Item: requestBody
    }
    return await dynamodb.put(params).promise().then(() => {
        const body = {
            Operation: 'SAVE',
            Message: 'Influencer has been successfully saved.',
            Item: requestBody
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function updateInfluencer(requestBody) {
    const params = {
        TableName: dynamodbTableName,
        Item: requestBody
    }
    return await dynamodb.put(params).promise().then(() => {
        const body = {
            Operation: 'UPDATE',
            Message: 'Influencer has been successfully updated.',
            Item: requestBody
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function modifyInfluencer(EMAIL, updateKey, updateValue) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'EMAIL': EMAIL
        },
        UpdateExpression: `set ${updateKey} = :value`,
        ExpressionAttributeValues: {
            ':value': updateValue
        },
        ReturnValues: 'UPDATED_NEW'
    }
    return await dynamodb.update(params).promise().then((response) => {
        const body = {
            Operation: 'UPDATE',
            Message: 'Influencers sucessfully updated.',
            UpdatedAttributes: response
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function deleteInfluencer(EMAIL) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'EMAIL': EMAIL
        },
        ReturnValues: 'ALL_OLD'
    }
    return await dynamodb.delete(params).promise().then((response) => {
        const body = {
            Operation: 'DELETE',
            Message: 'Influencer has been successfully deleted.',
            Item: response
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Headers': 'Access-Control-Allow-Origin',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(body)
    }
}