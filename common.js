const { Payload, Image } = require('dialogflow-fulfillment');
const transaction_history = require('./transactionhistory.json');
const { MESSAGE } = require('./constant');

function showQuickOptions(agent, options, displayMsg) {

    const telegramPayload = {
        telegram: {
            text: displayMsg,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: options?.map(option => [
                    { text: option, callback_data: option }
                ]) || [],
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
    message += "<code>";
    message += "Date       | Fund Name            | Amount\n";
    message += "-----------|-----------------------|----------\n";

    transactions.forEach(t => {
        const date = t.date.padEnd(10);
        const fund = t.fund_name.padEnd(22);
        const amount = `₹ ${t.amount.toString().padStart(7)}`;
        message += `${date} | ${fund} | ${amount}\n`;
    });
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
                    { text: "Download Excel and Exit", callback_data: "Download Excel and Exit" },
                    { text: "Exit", callback_data: "Exit" }
                ]
            ]
        }
    };

    // Send as one payload
    const payload = new Payload('TELEGRAM', combinedPayload, { sendAsMessage: true });
    agent.add(payload);
}

function buildFundDisplay(agent, fundDetails, selectedFund) {
    const { allocation, cagr, link } = fundDetails;
    const safeFund = escapeHtml(selectedFund);

    let message = `<b>📘 ${safeFund}</b>\n\n`;
    message += `<b>💼 Fund Allocation:</b>\n`;
    message += `💰 <b>Debt:</b> ${allocation.Debt}\n`;
    message += `📈 <b>Large Cap Equity:</b> ${allocation["Large Cap Equity"]}\n`;
    message += `📉 <b>Mid Cap Equity:</b> ${allocation["Mid Cap Equity"]}\n`;
    message += `📊 <b>Small Cap Equity:</b> ${allocation["Small Cap Equity"]}\n`;
    message += `<b>📈 CAGR:</b> ${cagr}\n`;
    message += `🔗 <a href="${link}">More Details</a>`;

    const combinedPayload = {
        text: `${message}`,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: "📊 View Pie Chart", callback_data: "view_chart" }],
                [{ text: "Invest Now", callback_data: "Invest Now" }],
                [{ text: "Main Menu", callback_data: "Main Menu" }]
            ]
        }
    };
    const payload = new Payload(agent.TELEGRAM, combinedPayload, { sendAsMessage: true });
    agent.add(payload);
}

function handleExcelDownload(agent, downloadUrl) {

    const telegramPayload = {
        text: `📥 Click below to download your transaction report (Excel):`,
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "📄 Download Report", url: downloadUrl }
                ]
            ]
        }
    };

    agent.add(new Payload(agent.TELEGRAM, telegramPayload, { sendAsMessage: true, rawPayload: true }));
}
function handleViewChart(agent, fund) {
    // Create a custom payload that exactly matches Telegram's requirements
    const telegramPayload = {
        telegram: {
            // Use the exact Telegram Bot API endpoint structure
            method: 'sendPhoto',
            parameters: {
                photo: fund.chart,
                caption: `📊 Allocation chart for ${fund.fund_name}`,
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{ text: "Invest Now", callback_data: "Invest Now" }],
                        [{ text: "Main Menu", callback_data: "Main Menu" }]
                    ]
                })
            }
        }
    };

    // Add debugging
    console.log('Attempting to send Telegram photo with payload:', JSON.stringify(telegramPayload));

    // Send using Payload
    agent.add(new Payload(agent.TELEGRAM, telegramPayload));

    // Add a fallback text response just in case
    agent.add(`Here's the allocation chart for ${fund.fund_name}`);
}

function getCurrentFinancialYear() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (0 = Jan)

    let startDate, endDate;

    if (currentMonth < 3) { // Before April
        startDate = new Date(currentYear - 1, 3, 1); // April 1 last year
        endDate = new Date(currentYear, 2, 31);      // March 31 this year
    } else {
        startDate = new Date(currentYear, 3, 1);     // April 1 this year
        endDate = new Date(currentYear + 1, 2, 31);  // March 31 next year
    }

    return { startDate, endDate };
}

function getPreviousFinancialYear() {
    const { startDate: currentFYStart } = getCurrentFinancialYear();
    const prevFYStart = new Date(currentFYStart);
    prevFYStart.setFullYear(prevFYStart.getFullYear() - 1);

    const prevFYEnd = new Date(currentFYStart);
    prevFYEnd.setDate(prevFYEnd.getDate() - 1);

    return { startDate: prevFYStart, endDate: prevFYEnd };
}

function debugDate(date, label = "Date") {
    if (!date || isNaN(date.getTime())) {
        console.log(`${label}: INVALID DATE`);
        return;
    }
}

function replaceDynamicText(template, value) {
    const safeValue = escapeHtml(value);
    return template.replace('%s', `${safeValue}`);
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
module.exports = {
    showQuickOptions,
    showPortfolioOptions,
    buildTransactionTable,
    handleTransactionHistory,
    getCurrentFinancialYear,
    getPreviousFinancialYear,
    handleExcelDownload,
    handleViewChart,
    replaceDynamicText,
    buildFundDisplay,
    debugDate
};
