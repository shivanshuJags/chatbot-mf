const { Payload, Image } = require('dialogflow-fulfillment');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { MESSAGE } = require('./constant');
const transactionFilePath = path.join(__dirname, 'transactionhistory.json');

require('dotenv').config();
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
    const portfolioData = getPortfolioData();
    const userPortfolio = portfolioData.find(u => u.mobile === phone);

    if (!userPortfolio) {
        agent.add(MESSAGE.no_portfolio_found);
        showQuickOptions(agent, MESSAGE.mobile_options, MESSAGE.reply_option_msg);
        return;
    }

    const options = userPortfolio.transactions.map(p => p.fund_name + ' Valuation');

    options.length > 0 ?
        showQuickOptions(agent, options, MESSAGE.select_portfolio_msg) :
        showQuickOptions(agent, MESSAGE.no_portfolio_invest_options, MESSAGE.no_portfolio_found_msg)
}

function buildTransactionTable(userData, transactions) {
    let message = `📋 Transactions for ${userData.name} - (${userData.mobile}) (showing last ${transactions.length}):\n\n`;
    message += "<code>";
    message += "Date       | Fund Name              | Amount\n";
    message += "-----------|----------------------- |----------\n";

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
    message += `💰 <b>Debt:</b> ${allocation.debt}\n`;
    message += `📈 <b>Large Cap Equity:</b> ${allocation?.large_cap}\n`;
    message += `📉 <b>Mid Cap Equity:</b> ${allocation?.mid_cap}\n`;
    message += `📊 <b>Small Cap Equity:</b> ${allocation?.small_cap}\n`;
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

async function handleViewChart(agent, fund) {
    try {
        const fundName = fund.fund_name;
        const botToken = process.env.BOT_TOKEN;
        const chartData = {
            type: 'pie',
            data: {
                labels: ['Debt', 'Large Cap Equity', 'Mid Cap Equity', 'Small Cap Equity'],
                datasets: [{
                    data: [
                        parseInt(fund.details.allocation.debt || 30),
                        parseInt(fund.details.allocation.large_cap || 50),
                        parseInt(fund.details.allocation.mid_cap || 22),
                        parseInt(fund.details.allocation.small_cap || 25)
                    ],
                    backgroundColor: ['#f0ad4e', '#5bc0de', '#5cb85c', '#d9534f']
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: `${fundName} Allocation`,
                        font: { size: 18 }
                    },
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                },
                layout: {
                    padding: 20
                }
            }
        };
        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartData))}&backgroundColor=white&width=500&height=500`;
        const telegramPayload = agent.originalRequest.payload;
        let chatId;
        if (telegramPayload.data.callback_query) {
            chatId = telegramPayload.data.callback_query.message.chat.id;
            const callbackQueryId = telegramPayload.data.callback_query.id;
            await axios.post(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                callback_query_id: callbackQueryId
            });
        } else if (telegramPayload.data.message) {
            chatId = telegramPayload.data.message.chat.id;
        } else {
            agent.add('Sorry, I could not display the chart right now.');
            return;
        }

        // Ensure we have a chat ID
        if (!chatId) {
            agent.add('Sorry, I could not display the chart right now.');
            return;
        }
        await axios.get(chartUrl);
        const response = await axios.post(
            `https://api.telegram.org/bot${botToken}/sendPhoto`,
            {
                chat_id: chatId,
                photo: chartUrl,
                caption: `📊 Allocation chart for ${fundName}`,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Invest Now", callback_data: "Invest Now" }],
                        [{ text: "Main Menu", callback_data: "Main Menu" }]
                    ]
                }
            }
        );
        agent.add('');

    } catch (error) {
        console.error('Error sending chart:', error);

        if (error.response && error.response.data) {
            console.error('Telegram API error details:', error.response.data);
        }
        const fundName = fund?.fund_name || "the fund";
        agent.add(`Sorry, I couldn't display the chart for ${fundName} right now.`);
    }
}

function getCurrentFinancialYear() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let startDate, endDate;

    if (currentMonth < 3) {
        startDate = new Date(currentYear - 1, 3, 1);
        endDate = new Date(currentYear, 2, 31);
    } else {
        startDate = new Date(currentYear, 3, 1);
        endDate = new Date(currentYear + 1, 2, 31);
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

function getPortfolioData() {
    const data = fs.readFileSync(transactionFilePath, 'utf-8');
    return JSON.parse(data);
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
    getPortfolioData,
    debugDate
};
