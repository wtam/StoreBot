/*-----------------------------------------------------------------------------
This Bot demonstrates how to use an IntentDialog with a LuisRecognizer to add 
natural language support to a bot. The example also shows how to use 
UniversalBot.send() to push notifications to a user.

For a complete walkthrough of creating this bot see the article below.

    http://docs.botframework.com/builder/node/guides/understanding-natural-language/

-----------------------------------------------------------------------------*/

var builder = require('botbuilder');
var restify = require('restify');

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
            session.beginDialog('/firstRun');
        } else {
            next();
        }
    }
});
bot.dialog('/firstRun', [
    function (session) {
        builder.Prompts.text(session, "Hello, I'm a Store Bot.....What's your name?");
    },
    function (session, results) {
        // We'll save the prompts result and return control to main through
        // a call to replaceDialog(). We need to use replaceDialog() because
        // we intercepted the original call to main and we want to remove the
        // /firstRun dialog from the callstack. If we called endDialog() here
        // the conversation would end since the /firstRun dialog is the only 
        // dialog on the stack.
        session.userData.name = results.response;
        session.send("%s, I can help you to find product from e-Store", session.userData.name);
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

        //see the result from entityReconginer
        console.log(faceProduct);
        console.log(lipsProduct);
        console.log(eyesProduct);

        //check which result has retun, if no retun, its not bull but length is typically 0
        if (faceProduct.length > 0) {
            //builder.Prompts.text(session, "is BeautyProduct::Face enquiry");
            //session.send('Here are the Beauty Face products?');
            //var productImage = builder.CardImage.create(session, 'http://www.watsons.com.hk/medias/sys_master/front/prd/8808647360542.jpg');
            //var reply = builder.CardAction.showImage(session, 'http://www.watsons.com.hk/medias/sys_master/front/prd/8808647360542.jpg');
            //console.log(productImage);
            var replyText = "Beauty Face Product: ";
            var imageURL = "http://www.watsons.com.hk/medias/sys_master/front/prd/8808647360542.jpg";
            var reply = new builder.Message()
                .setText(session, replyText)
                .addAttachment({ fallbackText: replyText, contentType: 'image/jpeg', contentUrl: imageURL });
            session.send(reply);
        } else if (lipsProduct.length > 0) {
            //builder.Prompts.text(session, "is a BeautyProduct.Lips enquiry");
            session.send('Here are the Beauty Lips products');
        } else if (eyesProduct.length > 0) {
            //builder.Prompts.text(session, "is a BeautyProduct.Eyes enquiry");
            session.send('Here are the Beauty Eyes products');
        };
    }
]);

intents.matches('BabyEnquiry', [

    function (session, args, next) {
        console.log(args);
        //builder.Prompts.text(session, "is a baby enquiry");
        // Resolve and store any entities passed from LUIS.
        var milkProduct = builder.EntityRecognizer.findAllEntities(args.entities, 'BabyProduct::MilkPowder');
        var diaperProduct = builder.EntityRecognizer.findAllEntities(args.entities, 'BabyProduct::Diapers');
        if (milkProduct.length > 0) {
            session.send('Here are the Baby milk products?');
        } else if (diaperProduct.length > 0) {
            session.send('Here are the Baby Diaper products?');
        };
    }
]);


intents.onDefault(builder.DialogAction.send("You can say something like: Do you have any milk powder for Baby?"));

