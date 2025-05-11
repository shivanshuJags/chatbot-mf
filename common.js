const { Payload } = require('dialogflow-fulfillment');

function showQuickOptions(agent, options, displayMsg) {

    const telegramPayload = {
        telegram: {
            text: displayMsg,
            reply_markup: {
                inline_keyboard: options.map(option => [
                    { text: option, callback_data: option }
                ]),
                one_time_keyboard: true,
                resize_keyboard: true
            }
        }
    }

    const payload = new Payload(agent.TELEGRAM, telegramPayload, { sendAsMessage: true, rawPayload: true });
    agent.add(payload);
}

module.exports = {
    showQuickOptions
};
