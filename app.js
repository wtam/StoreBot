/*-----------------------------------------------------------------------------
This Bot demonstrates how to use an IntentDialog with a LuisRecognizer to add 
natural language support to a bot. The example also shows how to use 
UniversalBot.send() to push notifications to a user.

For a complete walkthrough of creating this bot see the article below.

    http://docs.botframework.com/builder/node/guides/understanding-natural-language/

-----------------------------------------------------------------------------*/

var builder = require('botbuilder');
var restify = require('restify');
var geo = require("geotrouvetou"); //find the nearest geolocation https://github.com/jbpin/geo-trouvetou 
//set up for GPS
var geoloc = require("geocode-wifi");
// Not accurate.... need improvement using https://github.com/spark/node-wifiscanner/blob/master/examples/geolocation.js
//var wifiScanner = require('node-wifiscanner'); //https://www.npmjs.com/package/geocode-wifi
// Command: netsh wlan show networks mode=Bssid
// *****Importance: the result still not show full wifi list unless clicking the laptop wifi icon to ensure yo usee the other wifi network
var wifiScanner = require('node-wifi-scanner'); //https://github.com/ancasicolica/node-wifi-scanner
/*
wifiScanner.scan(function (err, towers) {
    if (err) {
        console.error(err);
        return;
    }
    console.log(towers)
    geoloc(towers, function (err, location) {
        if (err) throw err

        console.log(location) // => { lat: 38.0690894, lng: -122.8069356, accuracy: 42 } 
    })
})*/
//start ApplicationInsight
var appInsights = require("applicationinsights"); 
process.env.APPINSIGHTS_INSTRUMENTATIONKEY = "e3f5eb91-50e1-4517-a46a-32ee83d08e9b";
appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY).start();
var appInsightClient = appInsights.getClient();

//require speech.js
var speech = require('./speech.js');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create Chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());
//Serve a static web page
server.get(/.*/, restify.serveStatic({
    'directory': '.',
    //'default': 'index.html',
    'default': 'voiceRespond.wav'
}));

// Create LUIS recognizer that points at our model and add it as the root '/' dialog for our Cortana Bot.
//This is the StorBotLuis
//preview Luis model have issue of intents always return null
//var model = 'https://api.projectoxford.ai/luis/v1/application/preview?id=f567c7e9-c4ab-442d-8956-41cb1c8bcffc&subscription-key=7e282443df6b4699b0fdc189cde863d5&q=';
var model = 'https://api.projectoxford.ai/luis/v1/application?id=f567c7e9-c4ab-442d-8956-41cb1c8bcffc&subscription-key=7e282443df6b4699b0fdc189cde863d5&q=';
var recognizer = new builder.LuisRecognizer(model);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', intents);

//setup the store that has Chinese medicine for closest geolocation detection
//map Waston store addrees to its geolocation using http://www.latlong.net/
var tree = new geo.GeoTrouvetou();
var AberdeenCentre = new geo.GeoPoint(22.248307, 114.152440);
var TaikooShing = new geo.GeoPoint(22.285665, 114.217413);
var KwunTong = new geo.GeoPoint(22.310423, 114.224628);
var TsimShaTsui = new geo.GeoPoint(22.299033, 114.173381);
var WhampoaGarden = new geo.GeoPoint(22.299196, 114.173618);
var Mongkok = new geo.GeoPoint(22.318539, 114.169271);
var YuenLong = new geo.GeoPoint(22.444258, 114.027732);
var Fanling = new geo.GeoPoint(22.492709, 114.139395);

//use geotrouvetou to prepare to calculate the closet store location
tree.addPoint(AberdeenCentre);     //Shop 6C, Hoi Chu Court, Aberdeen Centre, Aberdeen, H.K.
tree.addPoint(TaikooShing);     //Shop No.124, First Floor, Cityplaza, 18 Taikoo Shing, Island East, H.K
tree.addPoint(KwunTong);     //Crocodile Centre, Hoi Yuen Road, Kwun Tong, Kowloon
tree.addPoint(TsimShaTsui);     //Shop 5, G/F & Basement, Hang Sang Building, 18 Carnarvon Road, Tsim Sha Tsui, Kowloon
tree.addPoint(WhampoaGarden);     //Shop No. G3A on the Ground Floor, Site 2, Whampoa Garden, Hung Hom, Kowloon
tree.addPoint(Mongkok);     //Shop No.C1, G/F. & Whole of Mezzanine Floor, Wu Sang House, 655 Nathan Road, Mongkok, Kowloon
tree.addPoint(YuenLong);     //142 Castle Peak Road,Yuen Long, N.T.
tree.addPoint(Fanling);     //Shop No. 28B, Level 2, Fanling Town Centre, Fanling, N.T.

// Install First Run middleware and dialog
bot.use({
    botbuilder: function (session, next) {
        if (!session.userData.firstRun) {
            session.userData.firstRun = true;
            session.beginDialog('/firstRun');
        } else {
            next();
        }
    }
});

bot.dialog('/firstRun', [
    function (session) {
        builder.Prompts.text(session, "Hello, I'm a Store Bot.....What's your name?");
        //builder.Prompts.text(session, "妮妲, 下周或到訪 做好打風準備");
        //var str = "妮妲, 下周或到訪 做好打風準備";
        var str = "Hello, I'm a Store Bot.....What's your name?";
        /*
        //console.log('Converting from text -> speech');
        speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
            if (err) return console.log(err);
            console.log('Wrote out: ' + 'voiceRespond.wav');
            var reply = new builder.Message().setText(session, str);
            reply.addAttachment({ contentType: 'audio/wav', contenUrl: { "audio": 'http://storebotwebapp.azurewebsites.net' } });
            session.send(reply);
        });*/
    },
    function (session, results) {

        //kornHill
        //var closest = tree.findClosest(new geo.GeoPoint(22.282832, 114.216016));

        // We'll save the prompts result and return control to main through
        // a call to replaceDialog(). We need to use replaceDialog() because
        // we intercepted the original call to main and we want to remove the
        // /firstRun dialog from the callstack. If we called endDialog() here
        // the conversation would end since the /firstRun dialog is the only 
        // dialog on the stack.
        session.userData.name = results.response
        /*
        var str = session.userData.name + "I can help you to find product from e- Store and medicine service";
        //console.log('Converting from text -> speech');
        speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
            if (err) return console.log(err);
            console.log('Wrote out: ' + 'voiceRespond.wav');
            builder.Prompts.attachment('voiceRespond.wav');
        }); */
        session.send("%s, I can help you to find product from e-Store and medicine service", session.userData.name);
        session.replaceDialog('/');
    }
]); 

/*
dialog.onBegin(function (session, args, next) {
    builder.Prompts.text(session, "Hello, I'm a Store Bot... What's your name?");
    session.dialogData.name = args.name;
    session.send("Hi %s, I can help you to find product from eStore", args.name);
    next();
});*/

//Add intent handlers

intents.matches('BeautyEnquiry', [

    function (session, args, next) {
        //console.log(args);

        // Resolve and store any entities passed from LUIS.
        var faceProduct = builder.EntityRecognizer.findAllEntities(args.entities, 'BeautyProduct::Face');
        var lipsProduct = builder.EntityRecognizer.findAllEntities(args.entities, 'BeautyProduct::Lips');
        var eyesProduct = builder.EntityRecognizer.findAllEntities(args.entities, 'BeautyProduct::Eyes');

        //check which result has retun, if no retun, its not bull but length is typically 0
        if (faceProduct.length > 0) {
            console.log(faceProduct);
         
            //builder.Prompts.text(session, "is BeautyProduct::Face enquiry");  
            if (builder.EntityRecognizer.findAllEntities(faceProduct.entities, "BB Cream")) {
                var str = "We've Lorea BB Cream, would you like to try it?";
                var reply = new builder.Message().setText(session, str);
                speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
                    if (err) return console.log(err);
                    console.log('Wrote out: ' + 'voiceRespond.wav');
                });
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://www.watsons.com.hk/medias/sys_master/front/prd/8808647360542.jpg' }, { contentType: 'audio/wav', contentUrl: 'http://storebotwebapp.azurewebsites.net', name: 'voiceRespond.wav' });
                
                //reply.addAttachment({ contentType: 'audio/wav', contentUrl: 'http://storebotwebapp.azurewebsites.net'} );
                /*
                //Tryinh to use HeroCard?...
                
                reply.attachments.Add(new HeroCard(
                {
                    Title: 'You may like this BeautyProduct Face enquiry',
                    subtitle: 'Loreal BB Cream, HK$140',
                    images: [
                        { url: 'http://www.watsons.com.hk/medias/sys_master/front/prd/8808647360542.jpg', }
                    ],
                    contentType: 'application/vnd.microsoft.card.hero',
                    buttons: [
                        {
                            type: 'openURL',
                            title: 'Add to Shopping Cart',
                            value: 'http://www.watsons.com.hk/product-l%27oreal/lucent-magique-miracle-bb-cream-30ml/p/BP_272195'
                        }
                    ],
                }));*/
                //appInsight  custom event
                appInsightClient.trackEvent("BeautyFaceProductEnquiryBBCream");
            } else if (builder.EntityRecognizer.findAllEntities(faceProduct.entities, "2 way cake")) {
                var str = "We've Lorea true match two way powder, would you like to try it?";
                var reply = new builder.Message().setText(session, str);
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://www.watsons.com.hk/medias/sys_master/front/prd/8798530404382.jpg' });
                //appInsight  custom event
                appInsightClient.trackEvent("BeautyFaceProductEnquiry2WayCake");
            }
            session.send(reply);
        } else if (lipsProduct.length > 0) {
            console.log(lipsProduct);
            //builder.Prompts.text(session, "is a BeautyProduct.Lips enquiry");
            if (builder.EntityRecognizer.findAllEntities(lipsProduct.entities, "lipstick")) {
                var str = "We've Maybelline watershine pure lip, would you like to try it?";
                var reply = new builder.Message().setText(session, str);
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://www.watsons.com.hk/medias/sys_master/front/prd/8799512231966.jpg' });
                //appInsight  custom event
                appInsightClient.trackEvent("BeautyFaceProductEnquiryLips");
            }
            session.send(reply);
        } else if (eyesProduct.length > 0) {
            console.log(eyesProduct);
            //builder.Prompts.text(session, "is a BeautyProduct.Eyes enquiry");
            if (builder.EntityRecognizer.findAllEntities(lipsProduct.entities, "eye shadow")) {
                var str = "We've Maybelline Big Eye shadow pink, would you like to try it?";
                var reply = new builder.Message().setText(session, str);
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://www.watsons.com.hk/medias/sys_master/front/prd/8808664858654.jpg' });
                //appInsight  custom event
                appInsightClient.trackEvent("BeautyFaceProductEnquiryEyes");
            }
            session.send(reply);
        };
    }
]);

intents.matches('BabyEnquiry', [

    function (session, args, next) {
        //console.log(args);
        //builder.Prompts.text(session, "is a baby enquiry");
        // Resolve and store any entities passed from LUIS.
        var milkProduct = builder.EntityRecognizer.findAllEntities(args.entities, 'BabyProduct::MilkPowder');
        var diaperProduct = builder.EntityRecognizer.findAllEntities(args.entities, 'BabyProduct::Diapers');

        if (milkProduct.length > 0) {
            console.log(milkProduct);
            //var reply = new builder.Message().setText(session, "Baby Milk Product: ");
            if (builder.EntityRecognizer.findAllEntities(milkProduct.entities, "milk")) {
                var str = "How about Friso Gold Baby Milk?";
                var reply = new builder.Message().setText(session, str);
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://www.watsons.com.hk/medias/sys_master/front/prd/8802574958622.jpg' });
                //appInsight  custom event
                appInsightClient.trackEvent("BabyProductEnquiryMilkPowder");
            }
            session.send(reply);
        } else if (diaperProduct.length > 0) {
            console.log(diaperProduct);
            if (builder.EntityRecognizer.findAllEntities(milkProduct.entities, "diaper")) {
                var str = "How about Pampers baby diaper?";
                var reply = new builder.Message().setText(session, str);
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://www.watsons.com.hk/medias/sys_master/front/prd/8815012249630.jpg' });
                //appInsight  custom event
                appInsightClient.trackEvent("BabyProductEnquiryDiapers");
            }
            session.send(reply);
        };
    }
]);

intents.matches('ChineseMedicineEnquiry', [

    function (session, args, next) {
        //console.log(args);
        //builder.Prompts.text(session, "is a baby enquiry");
        // Resolve and store any entities passed from LUIS.
        var chineseMedicineService = builder.EntityRecognizer.findAllEntities(args.entities, 'ChineseMedicineService');
        console.log(chineseMedicineService);

        //appInsight  custom event
        appInsightClient.trackEvent("ChineseMedicinetEnquiry");

        //find the closest store that has ChineseMedicineservice
        wifiScanner.scan(function (err, towers) {
            //if (err) throw err;
            //kornHill GeoPoint(22.282832, 114.216016)
            console.log(towers);
            geoloc(towers, function (err, location) {
                //if (err) throw err;
                console.log(location); // => { lat: 38.0690894, lng: -122.8069356, accuracy: 42 } 
                //find the closeset location
                var closestStore = tree.findClosest(new geo.GeoPoint(location.lat, location.lng));
                console.log(closestStore);
                //recommend to goto the closet store
                switch (closestStore) {
                    //case AberdeenCentre : session.send("%s, you can visit our store at Shop 6C, Hoi Chu Court, Aberdeen Centre", session.userData.name);
                    case AberdeenCentre:
                        console.log("%s, you can visit our store at Shop 6C, Hoi Chu Court, Aberdeen Centre for Chinese Medicine", session.userData.name);
                        var reply = new builder.Message().setText(session, "%s, you can visit our store at Shop 6C, Hoi Chu Court, Aberdeen Centre for Chinese Medicine", session.userData.name);
                        break;
                    case TaikooShing:
                        console.log("%s, you can visit our store at Shop No.124, First Floor, Cityplaza for Chinese Medicine", session.userData.name);
                        var reply = new builder.Message().setText(session, "%s, you can visit our store at Shop No.124, First Floor, Cityplaza for Chinese Medicine", session.userData.name);
                        break;
                    case KwunTong:
                        console.log("%s, you can visit our store at Crocodile Centre, Kwun Tong for Chinese Medicine", session.userData.name);
                        var reply = new builder.Message().setText(session, "%s, you can visit our store at Crocodile Centre, Kwun Tong for Chinese Medicine", session.userData.name);
                        break;
                    case TsimShaTsui:
                        console.log("%s, you can visit our store at Shop 5, G/F & Basement, Hang Sang Building, Tsim Sha Tsui for Chinese Medicine", session.userData.name);
                        var reply = new builder.Message().setText(session, "%s, you can visit our store at Shop 5, G/F & Basement, Hang Sang Building, Tsim Sha Tsui for Chinese Medicine", session.userData.name);
                        break;
                    case WhampoaGarden:
                        console.log("%s, you can visit our store at Shop No. G3A on the Ground Floor, Site 2, Whampoa Garden for Chinese Medicine", session.userData.name);
                        var reply = new builder.Message().setText(session, "%s, you can visit our store at Shop No.G3A on the Ground Floor, Site 2, Whampoa Garden for Chinese Medicine", session.userData.name);
                        break;
                    case Mongkok:
                        console.log("%s, you can visit our store at Shop No.C1, G/F. & Whole of Mezzanine Floor, Mongkok for Chinese Medicine", session.userData.name);
                        var reply = new builder.Message().setText(session, "%s, you can visit our store at Shop No.C1, G/F. & Whole of Mezzanine Floor, Mongkok for Chinese Medicine", session.userData.name);
                        break;
                    case YuenLong:
                        console.log("%s, you can visit our store at 142 Castle Peak Road,Yuen Long for Chinese Medicine", session.userData.name);
                        var reply = new builder.Message().setText(session, "%s, you can visit our store at 142 Castle Peak Road,Yuen Long for Chinese Medicine", session.userData.name);
                        break;
                    case Fanling:
                        console.log("%s, you can visit our store at Shop No. 28B, Level 2, Fanling Town Centre for Chinese Medicine", session.userData.name);
                        var reply = new builder.Message().setText(session, "%s, you can visit our store at Shop No. 28B, Level 2, Fanling Town Centre for Chinese Medicine", session.userData.name);
                        break;
                };
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://www.watsons.com.hk/medias/sys_master/h68/h1e/8835002794014.jpg' });
                session.send(reply);
            }) //geoloc
        })//wifi scanner
    }
]);

intents.matches('CustomerRespond', [
    function (session, args, next) {
        console.log(args);    
        if (builder.EntityRecognizer.findEntity(args.entities, 'CustomerRespond::DisLike')) {
            console.log("Customer Not Like it");
            //appInsight  custom event
            appInsightClient.trackEvent("CustomerDisLike");
            //session.send(reply);
        } else if (builder.EntityRecognizer.findEntity(args.entities, 'CustomerRespond::Like')) {
            console.log("Customer Like it");
            //appInsight  custom event
            appInsightClient.trackEvent("CustomerLike");
            //session.send(reply);
        }
    }
]);

intents.matches('Help', [

    function (session, args, next) {
        //console.log(args);
        var str = session.userData.name + ", I can help you to find product from e- Store and medicine service.";
        var reply = new builder.Message().setText(session, str);
       
        //appInsight  custom event
         appInsightClient.trackEvent("Help");
            
        session.send(reply);       
    }
]);

intents.onDefault(builder.DialogAction.send("You can say something like: Do you have any milk powder for Baby?"));




