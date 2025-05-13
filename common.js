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

function buildTransactionTable(phone, transactions) {
    let message = `📋 Transactions for ${phone}:\n\n`;

    // Start with monospace formatting using <code> tags which is well-supported
    message += "<code>";

    // Add headers with proper spacing
    message += "Date       | Fund Name            | Amount\n";
    message += "-----------|-----------------------|----------\n";

    // Add each transaction with consistent spacing
    transactions.forEach(t => {
        const date = t.date.padEnd(10);
        const fund = t.fund_name.padEnd(22);
        const amount = `₹ ${t.amount.toString().padStart(7)}`;
        message += `${date} | ${fund} | ${amount}\n`;
    });

    // Close the monospace block
    message += "</code>";

    return message;
}

function handleTransactionHistory(formattedTable, agent) {
    const combinedPayload = {
        text: `${formattedTable}\n\n<b>Would you like to invest more or exit?</b>`,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Invest More", callback_data: "Invest More" },
                    { text: "Exit", callback_data: "Exit" }
                ]
            ]
        }
    };

    // Send as one payload
    const payload = new Payload('TELEGRAM', combinedPayload, { sendAsMessage: true });
    agent.add(payload);
}


module.exports = {
    showQuickOptions,
    showPortfolioOptions,
    buildTransactionTable,
    handleTransactionHistory
};
