const { Payload } = require('dialogflow-fulfillment');
const transaction_history = require('./transactionhistory.json');

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

function showPortfolioOptions(agent, phone) {
    const userPortfolio = transaction_history.find(u => u.mobile === phone);

    if (!userPortfolio) {
        agent.add("🚫 No portfolios found for your number.");
        showQuickOptions(agent, ["Invest"], "Would you like to invest instead?");
        return;
    }

    const options = userPortfolio.transactions.map(p => p.fund_name);
    showQuickOptions(agent, options, "📊 Kindly select one of your portfolios:");
}

module.exports = {
    showQuickOptions,
    showPortfolioOptions
};
