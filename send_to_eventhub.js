﻿//Source: https://github.com/tomconte/EventHubDemo 

var https = require('https');
var crypto = require('crypto');
var moment = require('moment');
var BSON = require('buffalo');

// Allow more than the default of 5 open sockets
https.globalAgent.maxSockets = 100;

// Event Hubs parameters
var namespace = 'storeboteventhub-ns'; // Replace with your Service Bus namespace
var hubname = 'storeboteventhub'; // Replace with your Event Hub name

// Shared Access Key parameters
// Replace with the Policy Name and Primary (or Secondary) Key from your Event Hub configuration
var my_key_name = 'send';
//var my_key = 'T5sASDwt0RdN2sCMTmB1uyWVxqcEA4aZUxn4+bOwIKg=';
var my_key = 'aND782fnI6UugOobFYmAz+OJU4eTDHAjgI6hKf+qeEk='
//Endpoint=sb://storeboteventhub-ns.servicebus.windows.net/;SharedAccessKeyName=send;SharedAccessKey=T5sASDwt0RdN2sCMTmB1uyWVxqcEA4aZUxn4+bOwIKg=

// Sample payload to send
//var payload = { Temperature: 1.0, Humidity: 0.25 };
var payload = {username: "Will", serviceIntent: "BeautyFaceProductEnquiryLips", serviceScore: 0.5};


// Prefix for device names
var deviceprefix = 'StoeBot-';

// Create a SAS token
// See http://msdn.microsoft.com/library/azure/dn170477.aspx

function create_sas_token(uri, key_name, key) {
    // Token expires in one hour -> 10 yrs
    var expiry = moment().add(10, 'years').unix();

    var string_to_sign = encodeURIComponent(uri) + '\n' + expiry;
    var hmac = crypto.createHmac('sha256', key);
    hmac.update(string_to_sign);
    var signature = hmac.digest('base64');
    var token = 'SharedAccessSignature sr=' + encodeURIComponent(uri) + '&sig=' + encodeURIComponent(signature) + '&se=' + expiry + '&skn=' + key_name;

    return token;
}

// Create a bunch of SAS tokens for different emulated devices

var device_tokens = [];

var devicename;
var device_sas;
var deviceid;

//for (var i = 0; i < 1; i++) {
    //devicename = deviceprefix + i;
devicename = "StoreBot0";
device_tokens.push(create_sas_token('https://' + namespace + '.servicebus.windows.net' + '/' + hubname + '/publishers/' + devicename + '/messages', my_key_name, my_key));
//device_tokens.push(create_sas_token('Endpoint=sb://storeboteventhub-ns.servicebus.windows.net/;SharedAccessKeyName=send;SharedAccessKey=T5sASDwt0RdN2sCMTmB1uyWVxqcEA4aZUxn4+bOwIKg=', my_key_name, my_key));
//}

// Set up a timer to measure total execution time

console.time('send requests');

process.on('exit', function () {
    console.timeEnd('send requests');
});

/*
** Send a batch of requests to the Event Hub
*/
exports.sendrequests = function sendRequests(username, ServiceIntent, ServiceConversation, ServiceScore) {
    // for (var i = 0; i < nb; i++) {

    // Pick a random device and its corresponding SAS key
    //deviceid = Math.floor((Math.random() * 100));
    deviceid = username;
    //devicename = deviceprefix + deviceid;
    devicename = "StoreBot0";
    device_sas = device_tokens[0];
    //console.log("Device Token: " + device_tokens[0]);

    // Assemble BSON payload
    //payload.Temperature++;
    //payload.time = new Date().toISOString();
    //console.log(payload.time);
    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(Date.now() - tzoffset)).toISOString();
    payload.time = localISOTime;
    //console.log(localISOTime);
    payload.username = username;
    payload.serviceIntent = ServiceIntent;
    payload.userConversation = ServiceConversation;
    payload.serviceScore = ServiceScore;
    console.log(payload);
    //var b = BSON.serialize(payload);
    var b = JSON.stringify(payload);
    console.log(b);

    // Create the HTTP/S request
    var options = {
        hostname: namespace + '.servicebus.windows.net',
        port: 443,
        path: '/' + hubname + '/publishers/' + devicename + '/messages',
        method: 'POST',
        json: true,
        headers: {
            'Authorization': device_sas,
            'Content-Length': b.length,
            //'Content-Type': 'application/atom+xml;type=entry;charset=utf-8'
            'Content-Type': 'application/json',
        }
    };

    
        // Send the request
        var req = https.request(options, function (res) {
            //console.log("statusCode: ", res.statusCode);
            res.on('data', function (d) {
                process.stdout.write(d);
            });
        }).on('error', function (e) {
            console.error(e);
        });
/*
    var req = https.request({
        url: 'https://' + namespace + '.servicebus.windows.net' + '/' + hubname + '/publishers/' + devicename + '/messages', my_key_name, my_key,
        method: "POST",
        json: true,
        headers: {
            "Authorization": device_sas,
            "Content-Length": b.length,
            "content-type": "application/json",
        },
        body: b
    }).on('error', function (e) {
            console.error(e);
        });
*/
        // Write the payload
        //req.write(JSON.stringify(b));
        req.write(b);
        req.end();
    //} 
}

/*
** Launch a few batches of requests
*/
/*
for (var i = 0; i < 100; i++) {
    sendRequests(100);
} */