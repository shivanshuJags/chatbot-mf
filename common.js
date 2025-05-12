const { Payload } = require('dialogflow-fulfillment');
const transaction_history = require('./transactionhistory.json');
const { MESSAGE } = require('./constant');

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
        agent.add(MESSAGE.no_portfolio_found);
        showQuickOptions(agent, MESSAGE.mobile_options, MESSAGE.reply_option_msg);
        return;
    }

    const options = userPortfolio.transactions.map(p => p.fund_name);

    options.length > 0 ?
        showQuickOptions(agent, options, MESSAGE.select_portfolio_msg) :
        showQuickOptions(agent, MESSAGE.no_portfolio_invest_options, MESSAGE.no_portfolio_found_msg)

}

module.exports = {
    showQuickOptions,
    showPortfolioOptions
};
