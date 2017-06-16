   var fs = require('fs');
    var util = require('util');
    var request = require('request');

    var clientId = 'speechtest-app';                             // Can be anything
    ///var clientSecret = '3c3cb8d386544dabb9cc5cf7f93eb799'; // API key from Azure marketplace
    var clientSecret = '1d52b999664841558ddfafae59b679ba'
    var accessToken = null;

    var str = 'This is a demo to call Microsoft text to speach service in Node.js.';

    //console.log('Converting from text -> speech -> text.');
    //console.log('Input text: "' + str + '"');

    getAccessToken(clientId, clientSecret, function (err, accessToken) {
        if (err) return console.log("Fail to get Token:" , err);
        console.log('Got access token: ' + accessToken)
        /*
       // textToSpeech(str, 'test.wav', accessToken, function (err) {
        textToSpeech(str, 'test.wav', function (err) {
            if (err) return console.log(err);
            console.log('Wrote out: ' + 'test.wav');
    
            //speechToText('test.wav', accessToken, function (err, res) {
             speechToText('test.wav', function (err, res) {
                if (err) return console.log(err);
                console.log('Confidence ' + res.results[0].confidence + ' for: "' + res.results[0].lexical + '"');
            });
        });*/
    }) 

    // ==== Helpers ====

  function getAccessToken(clientId, clientSecret, callback) {
        request.post({
            /*url: 'https://oxford-speech.cloudapp.net/token/issueToken',
            form: {
                'grant_type': 'client_credentials',
                'client_id': encodeURIComponent(clientId),
                'client_secret': encodeURIComponent(clientSecret),
                'scope': 'https://speech.platform.bing.com'
            } */
            uri: 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken',
            headers: {
                'Content-Type' : 'application/json',
                'accept' : 'application/jwt',
                'Ocp-Apim-Subscription-Key' :'1d52b999664841558ddfafae59b679ba'
            }  
        }, function (err, resp, body) {
            if (err) return callback(err);
            try {
                //var accessToken = JSON.parse(body).access_token;
                ///accessToken = JSON.parse(body).access_token;
                accessToken = body
                if (accessToken) {
                    callback(null, accessToken);
                } else {
                    callback(body);
                }
            } catch (e) {
                callback(e);
            }
        });
    }

        //function textToSpeech(text, filename, accessToken, callback) {
       // exports.textToSpeech = function textToSpeech (text, filename, accessToken, callback) {
exports.textToSpeech = function textToSpeech(text, filename, callback) {
        var ssmlTemplate = "<speak version='1.0' xml:lang='en-us'><voice xml:lang='%s' xml:gender='%s' name='%s'>%s</voice></speak>";
        request.post({
            url: 'https://speech.platform.bing.com/synthesize',
            //https://www.microsoft.com/cognitive-services/en-us/speech-api/documentation/api-reference-rest/bingvoiceoutput
            //body: util.format(ssmlTemplate, 'en-US', 'Female', 'Microsoft Server Speech Text to Speech Voice (en-US, ZiraRUS)', text),
            body: util.format(ssmlTemplate, 'zh-HK', 'Female', 'Microsoft Server Speech Text to Speech Voice (zh-HK, Tracy, Apollo)', text),
            encoding: null,
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'riff-16khz-16bit-mono-pcm',
                'User-Agent': 'TTSNodeJS', // or whatever else
                'X-Search-AppId': '07D3234E49CE426DAA29772419F436CA',
                'X-Search-ClientID': '1ECFAE91408841A480F00935DC390960',
            }
        }, function (err, resp, body) {
            if (err) return callback(err);
            fs.writeFile(filename, body, 'binary', function (err) {
                if (err) return callback(err);
                callback(null);
            });
        });
    }


//exports.speechToText = function speechToText(filename, accessToken, callback) {
exports.speechToText = function speechToText(filename, callback) {
        fs.readFile(filename, function (err, waveData) {
            if (err) return callback(err);
            request.post({
                url: 'https://speech.platform.bing.com/recognize/query',
                qs: {
                    'scenarios': 'ulm',
                    'appid': 'D4D52672-91D7-4C74-8AD8-42B1D98141A5', // This magic value is required
                    'locale': 'en-US',
                    'device.os': 'wp10',
                    'version': '3.0',
                    'format': 'json',
                    //'requestid': '1d4b6030-9099-11e0-91e4-0800200c9a66', // can be anything
                    'requestid': 'b2c95ede-97eb-4c88-81e4-80f32d6aef75',
                    //'instanceid': '1d4b6030-9099-11e0-91e4-0800200c9a66' // can be anything
                    'instanceid': '106a4690-b664-ca61-addb-cdc705560792'
                },
                body: waveData,
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'audio/wav; samplerate=16000',
                    'Content-Length': waveData.length
                }
            }, function (err, resp, body) {
                if (err) return callback(err);
                try {
                    callback(null, JSON.parse(body));
                } catch (e) {
                    callback(e);
                }
            });
        });
}