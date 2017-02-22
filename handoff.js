"use strict";
const builder = require("botbuilder");
const provider_1 = require("./provider");
// Options for state of a conversation
// Customer talking to bot, waiting for next available agent or talking to an agent
var ConversationState;
(function (ConversationState) {
    ConversationState[ConversationState["Bot"] = 0] = "Bot";
    ConversationState[ConversationState["Waiting"] = 1] = "Waiting";
    ConversationState[ConversationState["Agent"] = 2] = "Agent";
})(ConversationState = exports.ConversationState || (exports.ConversationState = {}));
;
class Handoff {
    // if customizing, pass in your own check for isAgent and your own versions of methods in defaultProvider
    constructor(bot, isAgent, provider = provider_1.defaultProvider) {
        this.bot = bot;
        this.isAgent = isAgent;
        this.provider = provider;
        this.connectCustomerToAgent = (by, agentAddress) => this.provider.connectCustomerToAgent(by, agentAddress);
        this.connectCustomerToBot = (by) => this.provider.connectCustomerToBot(by);
        this.queueCustomerForAgent = (by) => this.provider.queueCustomerForAgent(by);
        this.addToTranscript = (by, text) => this.provider.addToTranscript(by, text);
        this.getConversation = (by, customerAddress) => this.provider.getConversation(by, customerAddress);
        this.currentConversations = () => this.provider.currentConversations();
        this.provider.init();
    }
    routingMiddleware() {
        return {
            botbuilder: (session, next) => {
                // Pass incoming messages to routing method
                if (session.message.type === 'message') {
                    this.routeMessage(session, next);
                }
            },
            send: (event, next) => {
                // Messages sent from the bot do not need to be routed
                this.trancribeMessageFromBot(event, next);
            }
        };
    }
    routeMessage(session, next) {
        if (this.isAgent(session)) {
            this.routeAgentMessage(session);
        }
        else {
            this.routeCustomerMessage(session, next);
        }
    }
    routeAgentMessage(session) {
        const message = session.message;
        const conversation = this.getConversation({ agentConversationId: message.address.conversation.id });
        // if the agent is not in conversation, no further routing is necessary
        if (!conversation)
            return;
        if (conversation.state !== ConversationState.Agent) {
            // error state -- should not happen
            session.send("Shouldn't be in this state - agent should have been cleared out.");
            console.log("Shouldn't be in this state - agent should have been cleared out");
            return;
        }
        // send text that agent typed to the customer they are in conversation with
        this.bot.send(new builder.Message().address(conversation.customer).text(message.text));
    }
    routeCustomerMessage(session, next) {
        const message = session.message;
        // method will either return existing conversation or a newly created conversation if this is first time we've heard from customer
        const conversation = this.getConversation({ customerConversationId: message.address.conversation.id }, message.address);
        this.addToTranscript({ customerConversationId: conversation.customer.conversation.id }, message.text);
        switch (conversation.state) {
            case ConversationState.Bot:
                return next();
            case ConversationState.Waiting:
                session.send("Connecting you to the next available agent.");
                return;
            case ConversationState.Agent:
                if (!conversation.agent) {
                    session.send("No agent address present while customer in state Agent");
                    console.log("No agent address present while customer in state Agent");
                    return;
                }
                this.bot.send(new builder.Message().address(conversation.agent).text(message.text));
                return;
        }
    }
    // These methods are wrappers around provider which handles data
    trancribeMessageFromBot(message, next) {
        this.provider.addToTranscript({ customerConversationId: message.address.conversation.id }, message.text);
        next();
    }
}
exports.Handoff = Handoff;
;
