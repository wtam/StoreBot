/*-----------------------------------------------------------------------------
This Bot demonstrates how to use an IntentDialog with a LuisRecognizer to add 
natural language support to a bot. The example also shows how to use 
UniversalBot.send() to push notifications to a user.

For a complete walkthrough of creating this bot see the article below.

    http://docs.botframework.com/builder/node/guides/understanding-natural-language/

-----------------------------------------------------------------------------*/

var builder = require('botbuilder');
var restify = require('restify');

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
// need different appid etc for the web app, for now just run it locally and ignore it
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

var Fiber = require('fibers');
function sleep(milliseconds) {
    var fiber = Fiber.current;
    setTimeout(function () {
        //console.log(log_sequence_counter++ + task + ' callback');
        fiber.run();
    }, milliseconds);
    //console.log(log_sequence_counter++ + task + ' thread/fiber suspended');
    Fiber.yield();
    //console.log(log_sequence_counter++ + task + ' thread/fiber resumed');
}


bot.dialog('/firstRun', [
    function (session) {
        var str = "Welcome to the Tropical Island Store, I'm the Customer Service Bot.....What's your name?";
        var strChinese = "歡迎黎到 Tropical Island Store，我係 Lee 道 嘅, Customer Service Bot,  我應該點稱呼你？"
        //console.log('Converting from text -> speech');
        //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
        /*speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
            if (err) return console.log(err);
            console.log('Wrote out: ' + 'voiceRespond.wav');
            player('voiceRespond.wav');
        }) 
        builder.Prompts.text(session, str)*/  
        var task1 = function () { builder.Prompts.text(session, str) };
        var task2 = function () { sleep(1000); player('./media/TropicalStoreGreeting.wav'); };
        Fiber(task1).run();
        Fiber(task2).run();

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
        var str = session.userData.name + ",....I can help you to find products like gift, drink and food easily from this Tropical Island Store";
        var strChinese = session.userData.name + ", .....我可以幫你係 Tropical Island Store 裡面揾到 你想要嘅 禮物, 飲品 同 食品";
        //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
        speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
            if (err) return console.log(err);
            //console.log('Wrote out: ' + 'voiceRespond.wav');
            player('voiceRespond.wav');
        });
        session.send(str);
        session.endDialog();

    }
]);


//Add intent handlers

intents.matches('TropicalIslandProductEnquiry', [

    function (session, args, next) {
        console.log(args);

        // Resolve and store any entities passed from LUIS.
        var ToyProduct = builder.EntityRecognizer.findAllEntities(args.entities, 'TropicalIslandProduct::Toy');
        var DrinkProduct = builder.EntityRecognizer.findAllEntities(args.entities, 'TropicalIslandProduct::Drink');
        var FoodProduct = builder.EntityRecognizer.findAllEntities(args.entities, 'TropicalIslandProduct::Food');

        //check which result has retun, if no retun, its not bull but length is typically 0
        if (DrinkProduct.length > 0) {
                 
          //var str = "Our CoConut Milk is very refreshing, would you like to try some?";
            var strChinese = "我地嘅...CoConut Milk 消暑解渴，你想唔想試下呀!";
            var reply = new builder.Message().setText(session, str);
            //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
            /*speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
                    if (err) return console.log(err);
                    console.log('Wrote out: ' + 'voiceRespond.wav');
                    player('voiceRespond.wav');
            });*/
            reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://localhost:3978/coconut.jpg' });
            //reply.addAttachment({ contentType: 'audio/wav', contentUrl: 'http://storebotwebapp.azurewebsites.net/bbCream.wav'} );
            /*
            //Tryinh to use HeroCard?...
                
                reply.attachments.Add(new HeroCard(
                {
                    Title: 'You may like this BeautyProduct Face enquiry',
                    subtitle: 'Loreal BB Cream, HK$140',
                    images: [
                        { url: 'http://storebotwebapp.azurewebsites.net/bbCream.jpg', }
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
                //session.send(reply);
                var task1 = function () { session.send(reply) };
                var task2 = function () { sleep(1000); player('./media/coconutMilk.wav'); };
                Fiber(task1).run();
                Fiber(task2).run();
                //console.log(session.message.text);
                //appInsight  custom event
                appInsightClient.trackEvent("TropicalIslandProductEnquiryDrink");
                send_to_StorebotEventHub.sendrequests(session.userData.name, "TropicalIslandProductEnquiryDrink", session.message.text, 0.5);
       
        } else if (ToyProduct.length > 0) {
     
            var str = "Our Cute Baby sea turtle is the SuperStar here, everyone love it";
            var strChinese = "得意又可愛嘅 海龜寶寶系我地 Lee 道 嘅 Super Star，好多人都鐘意嫁!";
                //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
                /*speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
                    if (err) return console.log(err);
                    //console.log('Wrote out: ' + 'voiceRespond.wav');
                    player('voiceRespond.wav');
                });*/
                var reply = new builder.Message().setText(session, str);
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://localhost:3978/turtle.jpg' });
                //reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://storebotwebapp.azurewebsites.net/lipstick.jpg' });
                //session.send(reply);
                
                var task1 = function () { session.send(reply) };
                var task2 = function () { sleep(1000); player('./media/turtle.wav'); };
                Fiber(task1).run();
                Fiber(task2).run();
                //appInsight  custom event
                appInsightClient.trackEvent("TropicalIslandProductEnquiryToy");
                send_to_StorebotEventHub.sendrequests(session.userData.name, "TropicalIslandProductEnquiryToy", session.message.text, 0.5); //change 0.5 to avg sentinment
            
        } else if (FoodProduct.length > 0) {
          
                var str = "Canned Tuna Fish is Tropical Island special product, is very deliciuous";
                var strChinese = "罐裝吞拿魚, 系我地 Lee 道 Tropical Island, 嘅特產,  好好食嫁!";
                //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
                /*speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
                    if (err) return console.log(err);
                    //console.log('Wrote out: ' + 'voiceRespond.wav');
                    player('voiceRespond.wav');
                });*/
                var reply = new builder.Message().setText(session, str);
                reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://localhost:3978/tuna.jpg' });
                //reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://storebotwebapp.azurewebsites.net/eyeShadow.jpg' });
                //session.send(reply);
                
                var task1 = function () { session.send(reply) };
                var task2 = function () { sleep(1000); player('./media/tuna.wav'); };
                Fiber(task1).run();
                Fiber(task2).run();
                //appInsight  custom event
                appInsightClient.trackEvent("TropicalIslandProductEnquiryFood");
                send_to_StorebotEventHub.sendrequests(session.userData.name, "TropicalIslandProductEnquiryFood", session.message.text, 0.5); //change 0.5 to avg sentinment
            
        } else {
            var str = "We've other gift, drink and food products, you may try toys or juice ";
            var strChinese = "我地有其他 禮物, 飲品 同 食品，你可以試試問下 玩具 或 果汁";
            //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
            /*speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
                if (err) return console.log(err);
                //console.log('Wrote out: ' + 'voiceRespond.wav');
                player('voiceRespond.wav');
            });*/
            var reply = new builder.Message().setText(session, str);
            //session.send(reply);           
              
            var task1 = function () { session.send(reply); };
            var task2 = function () { sleep(1000); player('./media/otherTropicalStoreProduct.wav'); };
            Fiber(task1).run();
            Fiber(task2).run(); 
        }
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
            send_to_StorebotEventHub.sendrequests(session.userData.name, "CustomerDisatisfaction", session.message.text, 0.1); //change 0.1 to avg sentinment
            var str = ":(";
            //speech.textToSpeech("I am so sad", 'voiceRespond.wav', function (err) {
            /*speech.textToSpeech("我好唔開心", 'voiceRespond.wav', function (err) {
                if (err) return console.log(err);
                //console.log('Wrote out: ' + 'voiceRespond.wav');
                player('voiceRespond.wav');
            });*/
            var reply = new builder.Message().setText(session, str);
            //reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://data2.whicdn.com/images/69773875/large.jpg' });
            reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://storebotwebapp.azurewebsites.net/sad.jpg' });
            //session.send(reply);
            //player('./media/unhappy.wav');
            var task1 = function () { session.send(reply); };
            var task2 = function () { sleep(1000); player('./media/unhappy.wav'); };
            Fiber(task1).run();
            Fiber(task2).run();
        } else if (builder.EntityRecognizer.findEntity(args.entities, 'Like')) {
            console.log(args);
            //appInsight  custom event
            appInsightClient.trackEvent("CustomerSatisfaction");
            send_to_StorebotEventHub.sendrequests(session.userData.name, "CustomerSatisfaction", session.message.text, 0.9); //change 0.9 to avg sentinmentsend_to_StorebotEventHub(1, "CustomerSatisfaction", 0.9); //change 0.9 to avg sentinment
            var str = ":)";
            //speech.textToSpeech("That's great", 'voiceRespond.wav', function (err) {
            /*speech.textToSpeech("我好開心可以幫到您", 'voiceRespond.wav', function (err) {
                if (err) return console.log(err);
                //console.log('Wrote out: ' + 'voiceRespond.wav');
                player('voiceRespond.wav');
            });*/
            var reply = new builder.Message().setText(session, str);
            reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://localhost:3978/happytropical.jpg' });
            //reply.addAttachment({ contentType: 'image/jpeg', contentUrl: 'http://storebotwebapp.azurewebsites.net/happy.png' });
            //session.send(reply);
            
            var task1 = function () { session.send(reply); };
            var task2 = function () { sleep(1000); player('./media/TropicalStoreHappy.wav'); };
            Fiber(task1).run();
            Fiber(task2).run();
        } else {
            var str = "I'm sorry that I don't understand your respond:(";
            var strChinese = "對唔住，我唔知道你講乜:("
            //speech.textToSpeech(str, 'voiceRespond.wav', function (err) {
            /*speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
                if (err) return console.log(err);
                //console.log('Wrote out: ' + 'voiceRespond.wav');
                player('voiceRespond.wav');
            });*/
            var reply = new builder.Message().setText(session, str);
            var task1 = function () { session.send(reply); };
            var task2 = function () { sleep(1000); player('./media/dontUnderstand.wav'); };
            Fiber(task1).run();
            Fiber(task2).run();
        }
    }
]);

intents.matches('TropicalIslandStoreHelp', [

    function (session, args, next) {
        console.log(args);
        var str = session.userData.name + ",....I can help you to find products like gift, drink and food easily from this Tropical Island Store";
        var strChinese = session.userData.name + ",....我可以幫你係 Tropical Island Store 裡面揾到 你想要嘅 禮物, 飲品 同 食品";
        speech.textToSpeech(strChinese, 'voiceRespond1.wav', function (err) {
            if (err) return console.log(err);
            //console.log('Wrote out: ' + 'voiceRespond.wav');
            player('voiceRespond1.wav');
        });
        var reply = new builder.Message().setText(session, str);
        //appInsight  custom event
        appInsightClient.trackEvent("TropicalIslandStoreHelp");
        send_to_StorebotEventHub.sendrequests(session.userData.name, "TropicalIslandStoreHelp", session.message.text, 0.5); //change 0.5 to avg sentinment   
        session.send(reply);
    }
]);

intents.onDefault([
    function (session, args, next) {
        var strChinese = "你可以試試問嚇, 禮物, 飲品 同 食品？";
        /*speech.textToSpeech(strChinese, 'voiceRespond.wav', function (err) {
            if (err) return console.log(err);
            //console.log('Wrote out: ' + 'voiceRespond.wav');
            player('voiceRespond.wav');
        });*/
        var str = "You can ask something about gift, food and drink etc.";
        var reply = new builder.Message().setText(session, str);      
        var task1 = function () { session.send(reply); };
        var task2 = function () { sleep(1000); player('./media/TropicalStoreOnDefault.wav'); };
        Fiber(task1).run();
        Fiber(task2).run();
    }
]);