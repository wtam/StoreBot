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
//set up for GPS, current implementation assuming use in native client that impletment from Bot's Direct API
var geoloc = require("geocode-wifi");
// Not accurate.... need improvement using https://github.com/spark/node-wifiscanner/blob/master/examples/geolocation.js
//var wifiScanner = require('node-wifiscanner'); //https://www.npmjs.com/package/geocode-wifi
// Command: netsh wlan show networks mode=Bssid
// *****Importance: the result still not show full wifi list unless clicking the laptop wifi icon to ensure yo usee the other wifi network
var wifiScanner = require('node-wifi-scanner'); //https://github.com/ancasicolica/node-wifi-scanner

//start ApplicationInsight
var appInsights = require("applicationinsights"); 
process.env.APPINSIGHTS_INSTRUMENTATIONKEY = "e3f5eb91-50e1-4517-a46a-32ee83d08e9b";
appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY).start();
var appInsightClient = appInsights.getClient();

// require speech.js for Text to speech
var speech = require('./speech.js');

//Send telemetry to Evenhub
var send_to_StorebotEventHub = require('./send_to_eventhub.js');

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
// voice respond for native client, below comment is required, don't remove!!!!!!
var edge = require('edge');
var player = edge.func(function () {/*
    async (input) => {
        var player = new System.Media.SoundPlayer((string)input);
        player.PlaySync();
        return null;
    }
*/ });

// Create Chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//Serve files download
server.get(/.*/, restify.serveStatic({
    'directory': 'media',
    'index': false,
    //'default': 'sad.jpg',
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
            session.userData.isLogging = true;  //logging user conversation to session.message.text
            session.beginDialog('/firstRun');
        } else {
            next();
        }
    }
});

bot.dialog('/firstRun', [
    function (session) {
        var str = "Hello, I'm a E-Store Bot.....What's your name?";
        var strChinese = "你好啊，我係一個 E Store Bot.....我應該點稱呼你？"
        builder.Prompts.text(session, str);
        //console.log('Converting from text -> speech');
        //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
        speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
            if (err) return console.log(err);
            console.log('Wrote out: ' + 'voiceRespond.wav');
            player('voiceRespond.wav');
        }) 
        //player('./media/greeting.wav');
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
        var str = session.userData.name + ",....I can help you to find Beauty or Baby product from e-Store and medicine service";
        var strChinese = session.userData.name + ", .....我可意係 E Store 裡面幫你揾到 美容或嬰兒產品 同 醫療服務";
        //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
        speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
            if (err) return console.log(err);
            //console.log('Wrote out: ' + 'voiceRespond.wav');
            player('voiceRespond.wav');
        });
        session.send(str);
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
            //builder.Prompts.text(session, "is BeautyProduct::Face enquiry");  
             if (builder.EntityRecognizer.findAllEntities(faceProduct.entities, "BB Cream")) {
            //if (builder.EntityRecognizer.findBestMatch("BB Cream", faceProduct.entity)) {
                 var str = "We've Lorea BB Cream, would you like to try it?";
                 var strChinese = "我地有...Lorea  BB Cream，你想唔想試下呀!";
                var reply = new builder.Message().setText(session, str);
                //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
                speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
                    if (err) return console.log(err);
                    //console.log('Wrote out: ' + 'voiceRespond.wav');
                    player('voiceRespond.wav');
                });
                //reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://www.watsons.com.hk/medias/sys_master/front/prd/8808647360542.jpg' });
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://storebotwebapp.azurewebsites.net/bbCream.jpg' });   
               //reply.addAttachment({ contentType: 'audio/wav', contentUrl: 'http://storebotwebapp.azurewebsites.net/bbCream.wav'} );
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
                session.send(reply);
                //player('./media/bbCream.wav');
                //console.log(session.message.text);
                //appInsight  custom event
                appInsightClient.trackEvent("BeautyFaceProductEnquiryBBCream");
                send_to_StorebotEventHub.sendrequests(session.userData.name, "BeautyFaceProductEnquiryBBCream", session.message.text, 0.5);             
             } else if (builder.EntityRecognizer.findAllEntities(args.entities, "2 way cake")) {
                 //This code never execute as the entity never match!
                 var str = "We've Lorea true match two way powder, would you like to try it?";
                 //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
                 speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
                     if (err) return console.log(err);
                     //console.log('Wrote out: ' + 'voiceRespond.wav');
                     player('voiceRespond.wav');
                 });
                 //player('voiceRespond.wav');
                var reply = new builder.Message().setText(session, str);
                //reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://www.watsons.com.hk/medias/sys_master/front/prd/8798530404382.jpg' });
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://storebotwebapp.azurewebsites.net/2wayCake.jpg' });
                session.send(reply);
                 //appInsight  custom event
                appInsightClient.trackEvent("BeautyFaceProductEnquiry2WayCake");
                send_to_StorebotEventHub.sendrequests(session.userData.name, "BeautyFaceProductEnquiry2WayCake", session.message.text, 0.5); //change 0.5 to avg sentinment
            }
            //session.send(reply);
        } else if (lipsProduct.length > 0) {
            console.log(lipsProduct);
            //builder.Prompts.text(session, "is a BeautyProduct.Lips enquiry");
            if (builder.EntityRecognizer.findAllEntities(lipsProduct.entities, "lipstick")) {
                var str = "We've Maybelline watershine pure lip, would you like to try it?";
                var strChinese = "我地有 Maybelline watershine pure lip 唇膏，你想唔想試下呀!";
                //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
                speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
                    if (err) return console.log(err);
                    //console.log('Wrote out: ' + 'voiceRespond.wav');
                    player('voiceRespond.wav');
                });
                var reply = new builder.Message().setText(session, str);
                //reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://www.watsons.com.hk/medias/sys_master/front/prd/8799512231966.jpg' });
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://storebotwebapp.azurewebsites.net/lipstick.jpg' });
                session.send(reply);
                //player('./media/lipstick.wav');
                //appInsight  custom event
                appInsightClient.trackEvent("BeautyFaceProductEnquiryLips");
                send_to_StorebotEventHub.sendrequests(session.userData.name, "BeautyFaceProductEnquiryLips", session.message.text, 0.5); //change 0.5 to avg sentinment
            }
            //session.send(reply);
        } else if (eyesProduct.length > 0) {
            console.log(eyesProduct);
            //builder.Prompts.text(session, "is a BeautyProduct.Eyes enquiry");
            if (builder.EntityRecognizer.findAllEntities(lipsProduct.entities, "eye shadow")) {
                var str = "We've Maybelline Big Eye shadow pink, would you like to try it?";
                var strChinese = "我地有......Maybelline Big Eye shadow pink，你想唔想試下呀!";
                //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
                speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
                    if (err) return console.log(err);
                    //console.log('Wrote out: ' + 'voiceRespond.wav');
                    player('voiceRespond.wav');
                });
                var reply = new builder.Message().setText(session, str);
                //reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://www.watsons.com.hk/medias/sys_master/front/prd/8808664858654.jpg' });
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://storebotwebapp.azurewebsites.net/eyeShadow.jpg' });
                session.send(reply);
                //player('./media/eyeShadow.wav');
                //appInsight  custom event
                appInsightClient.trackEvent("BeautyFaceProductEnquiryEyes");
                send_to_StorebotEventHub.sendrequests(session.userData.name, "BeautyFaceProductEnquiryEyes", session.message.text, 0.5); //change 0.5 to avg sentinment
            }
            //session.send(reply);
        } else {
            var str = "I've other Beauty Face products, you may try BB Cream or Lipstick ";
            var strChinese = "我地有其他 美容產品，你可以嘗試 BB 霜 或 唇膏";
            //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
            speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
                if (err) return console.log(err);
                //console.log('Wrote out: ' + 'voiceRespond.wav');
                player('voiceRespond.wav');
            });
            builder.Prompts.text(session, str);
            //player('./media/otherBeautyProduct.wav');
        }
    }
]);

intents.matches('BabyEnquiry', [

    function (session, args, next) {
        //console.log(args);
        // Resolve and store any entities passed from LUIS.
        var milkProduct = builder.EntityRecognizer.findAllEntities(args.entities, 'BabyProduct::MilkPowder');
        var diaperProduct = builder.EntityRecognizer.findAllEntities(args.entities, 'BabyProduct::Diapers');

        if (milkProduct.length > 0) {
            console.log(milkProduct);
            //var reply = new builder.Message().setText(session, "Baby Milk Product: ");
            if (builder.EntityRecognizer.findAllEntities(milkProduct.entities, "milk")) {
                var str = "How about Friso Gold Baby Milk?";
                var strChinese = "我地有.....Friso Gold 嬰兒奶粉, 你想唔想試下呀!";
                //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
                speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
                    if (err) return console.log(err);
                    //console.log('Wrote out: ' + 'voiceRespond.wav');
                    player('voiceRespond.wav');
                });
                var reply = new builder.Message().setText(session, str);
                //reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://www.watsons.com.hk/medias/sys_master/front/prd/8802574958622.jpg' });
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://storebotwebapp.azurewebsites.net/milkPowder.jpg' });
                session.send(reply);
                //player('./media/milkPowder.wav');
                //appInsight  custom event
                appInsightClient.trackEvent("BabyProductEnquiryMilkPowder");
                send_to_StorebotEventHub.sendrequests(session.userData.name, "BabyProductEnquiryMilkPowder", session.message.text, 0.5); //change 0.5 to avg sentinment
            }
            //session.send(reply);
        } else if (diaperProduct.length > 0) {
            console.log(diaperProduct);
            if (builder.EntityRecognizer.findAllEntities(milkProduct.entities, "diaper")) {
                var str = "How about Pampers baby diaper?";
                var strChinese = "我地有......Pampers 嬰兒紙尿褲, 你想唔想試下呀!";
                //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
                speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
                    if (err) return console.log(err);
                    //console.log('Wrote out: ' + 'voiceRespond.wav');
                    player('voiceRespond.wav');
                });
                var reply = new builder.Message().setText(session, str);
                //reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://www.watsons.com.hk/medias/sys_master/front/prd/8815012249630.jpg' });
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://storebotwebapp.azurewebsites.net/diaper.jpg' });
                session.send(reply);
                //player('./media/diaper.wav');
                //appInsight  custom event
                appInsightClient.trackEvent("BabyProductEnquiryDiapers");
                send_to_StorebotEventHub.sendrequests(session.userData.name, "BabyProductEnquiryDiapers", session.message.text, 0.5); //change 0.5 to avg sentinment
            }
        } else {
                var str = "I've other Baby products, you may try diaper or milk";
                var strChinese = "我地有其他嬰兒用品，你可以嘗試尿布或奶粉";
                //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
                speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
                    if (err) return console.log(err);
                    //console.log('Wrote out: ' + 'voiceRespond.wav');
                    player('voiceRespond.wav');
                });
                builder.Prompts.text(session, str);
            }
    }
]);

intents.matches('ChineseMedicineEnquiry', [

    function (session, args, next) {
        //console.log(args);
        // Resolve and store any entities passed from LUIS.
        var chineseMedicineService = builder.EntityRecognizer.findAllEntities(args.entities, 'ChineseMedicineService');
        console.log(chineseMedicineService);

        //var str = session.userData.name + ",....you can visit one of our medicine service";
        var strChinese = session.userData.name + ", .....您可以來睇睇我地嘅中醫醫療服務";
        //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
        speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
            if (err) return console.log(err);
            //console.log('Wrote out: ' + 'voiceRespond.wav');
            player('voiceRespond.wav');
        });

        //appInsight  custom event
        appInsightClient.trackEvent("ChineseMedicinetEnquiry");
        send_to_StorebotEventHub.sendrequests(session.userData.name, "ChineseMedicinetEnquiry", session.message.text, 0.5); //change 0.5 to avg sentinment

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
                //reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://www.watsons.com.hk/medias/sys_master/h68/h1e/8835002794014.jpg' });
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://storebotwebapp.azurewebsites.net/chineseMEdicine.jpg' });
                session.send(reply);
            }) //geoloc
        })//wifi scanner
    }
]);

intents.matches('CustomerRespond', [
    function (session, args, next) {
        console.log(args);    
        //var dislike = builder.EntityRecognizer.findAllEntities(args.entities, 'CustomerDisLike');
        //var like = builder.EntityRecognizer.findAllEntities(args.entities, 'CustomerLike');

        if (builder.EntityRecognizer.findEntity(args.entities, 'DisLike')) {
            console.log(args);
            //appInsight  custom event
            appInsightClient.trackEvent("CustomerDisatisfaction");
            send_to_StorebotEventHub.sendrequests(session.userData.name, "CustomerDisatisfaction", session.message.text,  0.1); //change 0.1 to avg sentinment
            var str = ":(";
            //speech.textToSpeech("I am so sad", 'voiceRespond.wav', function (err) {
            speech.textToSpeech("我好唔開心", 'voiceRespond.wav', function (err) {
                if (err) return console.log(err);
                //console.log('Wrote out: ' + 'voiceRespond.wav');
                player('voiceRespond.wav');
            });
            var reply = new builder.Message().setText(session, str);
            //reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://data2.whicdn.com/images/69773875/large.jpg' });
            reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://storebotwebapp.azurewebsites.net/sad.jpg' });
            session.send(reply);
            //player('./media/unhappy.wav');
        } else if (builder.EntityRecognizer.findEntity(args.entities, 'Like')) {
            console.log(args);
            //appInsight  custom event
            appInsightClient.trackEvent("CustomerSatisfaction");
            send_to_StorebotEventHub.sendrequests(session.userData.name, "CustomerSatisfaction", session.message.text, 0.9); //change 0.9 to avg sentinmentsend_to_StorebotEventHub(1, "CustomerSatisfaction", 0.9); //change 0.9 to avg sentinment
            var str = ":)";
            //speech.textToSpeech("That's great", 'voiceRespond.wav', function (err) {
            speech.textToSpeech("我好開心", 'voiceRespond.wav', function (err) {
                if (err) return console.log(err);
                //console.log('Wrote out: ' + 'voiceRespond.wav');
                player('voiceRespond.wav');
            });
            var reply = new builder.Message().setText(session, str);
            //reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://blog.ccbcmd.edu/vwright/files/2013/12/DespicableMe-Minions-Hoorah-600x222.jpg' });
            //reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'https://gladysenglishclass.files.wordpress.com/2014/03/011813-despicableme-minions-hoorah-600x222.jpg?w=714' });
            reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://storebotwebapp.azurewebsites.net/happy.png' });
            session.send(reply);
            //player('./media/happy.wav');
        } else {
            var str = "I'm sorry that I don't understand your respond:(";
            var strChinese = "對唔住，我唔知道你講乜:("
            //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
            speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
                if (err) return console.log(err);
                //console.log('Wrote out: ' + 'voiceRespond.wav');
                player('voiceRespond.wav');
            });
            //player('voiceRespond.wav');
            builder.Prompts.text(session, str);
        }
        //session.send(reply);
    }
]);

intents.matches('Help', [

    function (session, args, next) {
        //console.log(args);
        var str = session.userData.name + ", I can help you to find product from e- Store and medicine service.";
        var strChinese = session.userData.name + "我可意係 E Store 裡面幫你揾到 美容或嬰兒產品 同 醫療服務";
        speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
            if (err) return console.log(err);
            //console.log('Wrote out: ' + 'voiceRespond.wav');
            player('voiceRespond.wav');
        });
        //player('voiceRespond.wav');
        var reply = new builder.Message().setText(session, str);
        //appInsight  custom event
         appInsightClient.trackEvent("Help");
         send_to_StorebotEventHub.sendrequests(session.userData.name, "Help", session.message.text, 0.5); //change 0.5 to avg sentinment   
        session.send(reply);       
    }
]);

intents.onDefault([
    function (session, args, next) {
        var strChinese = session.userData.name + "你可以試試問一 D , 美容產品 或 嬰兒用品？";
        speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
            if (err) return console.log(err);
            //console.log('Wrote out: ' + 'voiceRespond.wav');
            player('voiceRespond.wav');
        });
        //builder.DialogAction.send("You can say something like: Do you have any milk powder for Baby?");
        var str = "You can ask something like Beauty or Baby product etc.";
        builder.Prompts.text(session, str);
    }
]);
