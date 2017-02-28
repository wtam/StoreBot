//"use strict";
const handoff_1 = require('./handoff.js');
function commandsMiddleware(handoff) {
    return {
        botbuilder: (session, next) => {
            if (session.message.type === 'message') {
                command(session, next, handoff);
            }
        }
    };
}
exports.commandsMiddleware = commandsMiddleware;
function command(session, next, handoff) {
    if (handoff.isAgent(session)) {
        console.log('commandMiddleware: agentCommand');
        agentCommand(session, next, handoff);
    }
    else {
        console.log('commandMiddleware: customerCommand');
        customerCommand(session, next, handoff);
    }
}
function agentCommand(session, next, handoff) {
    const message = session.message;
    const conversation = handoff.getConversation({ agentConversationId: message.address.conversation.id });
    const inputWords = message.text.split(' ');
    if (inputWords.length == 0)
        return;
    // Commands to execute whether connected to a customer or not
    if (inputWords[0] === 'options') {
        console.log('agentCommand: options');
        sendAgentCommandOptions(session);
        return;
    }
    else if (inputWords[0] === 'list') {
        console.log('agentCommand: list');
        session.send(currentConversations(handoff));
        return;
    }
    // Commands to execute when not connected to a customer
    if (!conversation) {
        switch (inputWords[0]) {
            case 'connect':
                console.log('agentCommand: connect');
                const newConversation = handoff.connectCustomerToAgent(inputWords.length > 1
                    ? { customerName: inputWords.slice(1).join(' ') }
                    : { bestChoice: true }, message.address);
                if (newConversation) {
                    session.send("You are connected to " + newConversation.customer.user.name);
                }
                else {
                    session.send("No customers waiting.");
                }
                break;
            default:
                sendAgentCommandOptions(session);
                break;
        }
        return;
    }
    if (conversation.state !== handoff_1.ConversationState.Agent) {
        // error state -- should not happen
        session.send("Shouldn't be in this state - agent should have been cleared out.");
        console.log("Shouldn't be in this state - agent should have been cleared out");
        return;
    }
    if (message.text === 'disconnect') {
        console.log('agentCommand: disconnect');
        if (handoff.connectCustomerToBot({ customerConversationId: conversation.customer.conversation.id })) {
            session.send("Customer " + conversation.customer.user.name + " is now connected to the bot.");
        }
        return;
    }
    next();
}
function customerCommand(session, next, handoff) {
    const message = session.message;
    if (message.text === 'speak to agent') {
        console.log('customerCommand: speak to agent');
        // lookup the conversation (create it if one doesn't already exist)
        const conversation = handoff.getConversation({ customerConversationId: message.address.conversation.id }, message.address);
        if (conversation.state == handoff_1.ConversationState.Bot) {
            handoff.addToTranscript({ customerConversationId: conversation.customer.conversation.id }, message.text);
            handoff.queueCustomerForAgent({ customerConversationId: conversation.customer.conversation.id });
            session.send("Connecting you to the next available agent.");
            return;
        }
    }
    return next();
}
function sendAgentCommandOptions(session) {
    const commands = ' ### Agent Options\n - Type *connect* to connect to customer who has been waiting longest.\n - Type *connect { user name }* to connect to a specific conversation\n - Type *list* to see a list of all current conversations.\n - Type *disconnect* while talking to a user to end a conversation.\n - Type *options* at any time to see these options again.';
    session.send(commands);
    return;
}
function currentConversations(handoff) {
    const conversations = handoff.currentConversations();
    if (conversations.length === 0) {
        return "No customers are in conversation.";
    }
    let text = '### Current Conversations \n';
    conversations.forEach(conversation => {
        const starterText = ' - *' + conversation.customer.user.name + '*';
        switch (handoff_1.ConversationState[conversation.state]) {
            case 'Bot':
                text += starterText + ' is talking to the bot\n';
                break;
            case 'Agent':
                text += starterText + ' is talking to an agent\n';
                break;
            case 'Waiting':
                text += starterText + ' is waiting to talk to an agent\n';
                break;
        }
    });
    return text;
}
