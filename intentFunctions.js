const chrono = require('chrono-node');
const path = require('path');
const { generateTransactionExcel } = require('./excel_util');
const CONSTANTS = require('./constant');
const greetingData = require('./greeting.json');
const fundData = require('./fund&category.json');
const portfolioData = require('./transactionhistory.json');
const { showQuickOptions, showPortfolioOptions, buildTransactionTable, handleTransactionHistory, getCurrentFinancialYear, getPreviousFinancialYear, handleExcelDownload, replaceDynamicText, buildFundDisplay, handleViewChart } = require('./common');

const intentFunctions = {
    welcomeIntentFn: function (agent) {
        const sessionId = agent.session.split('/').pop();

        // Clear any stored session info
        if (global.sessionStore?.[sessionId]) {
            delete global.sessionStore[sessionId];
        }

        // Clear all active contexts
        agent.contexts.forEach(ctx => {
            const contextName = ctx.name.split('/').pop();
            agent.context.set({
                name: contextName,
                lifespan: 0
            });
        });

        if (agent.requestSource === agent.TELEGRAM) {
            showQuickOptions(agent, greetingData.suggestions, CONSTANTS.MESSAGE.welcome);
        } else {
            agent.add(CONSTANTS.MESSAGE.fallback_welcome);
        }
    },
    exploreFundsIntentFn: function (agent) {
        console.log('exploreFundsIntentFn');
        const categories = fundData.map(item => item.category);
        if (agent.requestSource === agent.TELEGRAM) {
            showQuickOptions(agent, categories, CONSTANTS.MESSAGE.explore_funds_greeting);
        } else {
            agent.add(CONSTANTS.MESSAGE.fallback_welcome);
        }
    },
    categorySelectionIntentFn: function (agent) {
        const selectedCategory = agent.query;
        const matchedCategory = fundData.find(
            item => item.category.toLowerCase() === selectedCategory.toLowerCase()
        );

        if (!matchedCategory) {
            agent.add(CONSTANTS.MESSAGE.no_category);
            return;
        }

        const fundNames = matchedCategory.funds.map(fund => fund.fund_name);
        const message = replaceDynamicText(CONSTANTS.MESSAGE.select_category, selectedCategory);

        console.log('categorySelectionIntentFn');
        if (agent.requestSource === agent.TELEGRAM) {
            showQuickOptions(agent, fundNames, message);
        } else {
            agent.add(CONSTANTS.MESSAGE.fallback_welcome);
        }
    },
    fundSelectionIntentFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        const selectedFund = agent.query;
        global.sessionStore[sessionId] = {
            ...global.sessionStore[sessionId],
            selectedService: CONSTANTS.INTENT_NAME.explore_funds
        };
        let fundFound = null;

        for (const category of fundData) {
            fundFound = category.funds.find(f => f.fund_name.toLowerCase() === selectedFund.toLowerCase());
            if (fundFound) break;
        }
        if (!fundFound) {
            agent.add(CONSTANTS.MESSAGE.no_fund);
            return;
        }

        global.sessionStore[sessionId] = {
            ...(global.sessionStore[sessionId] || {}),
            lastSelectedFund: fundFound
        };

        buildFundDisplay(agent, fundFound.details, selectedFund);
    },
    portfolioValuationIntentFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        const user = global.sessionStore?.[sessionId];
        global.sessionStore[sessionId] = {
            ...global.sessionStore[sessionId],
            selectedService: CONSTANTS.INTENT_NAME.portfolio_valuation
        };

        if (!user?.phone) {
            agent.context.set({
                name: 'awaiting_phone',
                lifespan: 2,
                parameters: { followup: CONSTANTS.INTENT_NAME.portfolio_valuation }
            });
            global.sessionStore[sessionId] = {
                ...global.sessionStore[sessionId],
                followup: CONSTANTS.INTENT_NAME.portfolio_valuation
            };
            agent.add("📞 Kindly enter your registered contact number to proceed.");
            return;
        }

        agent.add(`📊 Portfolio Value for ${user.phone}: ₹2,50,000 (sample).`);
    },
    transactionHistoryIntentFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        const user = global.sessionStore?.[sessionId];

        global.sessionStore[sessionId] = {
            ...global.sessionStore[sessionId],
            selectedService: CONSTANTS.INTENT_NAME.transaction_history
        };

        if (!user?.phone) {
            agent.context.set({
                name: 'awaiting_phone',
                lifespan: 2,
                parameters: { followup: 'Transaction History' }
            });
            agent.add("📞 Kindly enter your registered contact number to continue.");
            return;
        }

        agent.context.set({
            name: 'awaiting_transaction_date',
            lifespan: 2
        });

        agent.add("📅 Kindly enter a date or select a period:\n- Current Financial Year\n- Previous Financial Year");
    },
    captureContactIntentFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        const phone = agent.parameters["phone-number"];

        if (!/^\d{10}$/.test(phone)) {
            agent.add("❗ Please enter a valid 10-digit mobile number.");
            return;
        }

        global.sessionStore[sessionId] = {
            ...global.sessionStore[sessionId],
            phone
        };
        const followupIntent = agent.context.get('awaiting_phone')?.parameters?.followup;

        if (followupIntent === CONSTANTS.INTENT_NAME.portfolio_valuation) {
            showPortfolioOptions(agent, phone);

        } else if (followupIntent === CONSTANTS.INTENT_NAME.transaction_history) {
            const options = ["Current Financial Year", "Previous Financial Year"];
            showQuickOptions(agent, options, "📆 Kindly provide a time period to view your transaction history:");

            // Set context so we can capture the date next
            agent.context.set({
                name: 'awaiting_transaction_date',
                lifespan: 2,
                parameters: {
                    phone
                }
            });
        } else if (followupIntent === CONSTANTS.INTENT_NAME.invest_now) {
            agent.context.set({
                name: 'awaiting_investment_amount',
                lifespan: 2
            });
            const userRecord = portfolioData.find(u => u.mobile === phone);

            if (!userRecord || !userRecord.transactions || userRecord.transactions.length === 0) {
                agent.add("❌ No record found for this number. Please register or try again later.");
                showQuickOptions(agent, ["Main Menu"], "Would you like to go back?");
                return;
            }

            const amounts = ['1000', '2000', '5000', '10000'];
            showQuickOptions(agent, amounts, "💸 Please enter or select an investment amount (less than ₹50,000):");
        } else {
            agent.add(`✅ test`);
        }
    },
    reEnterContactFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        const followup = global.sessionStore?.[sessionId]?.followup;

        agent.context.set({
            name: 'awaiting_phone',
            lifespan: 2,
            parameters: {
                followup
            }
        });

        agent.add("📞 Kindly enter your registered 10-digit mobile number.");
    },
    selectPortfolioIntentFn: function (agent) {
        const selectedPortfolio = agent.query;
        const sessionId = agent.session.split('/').pop();
        const phone = global.sessionStore?.[sessionId]?.phone;

        if (!phone) {
            agent.add("❗ Contact number is missing. Please re-enter your mobile number.");
            return;
        }

        const userPortfolio = portfolioData.find(u => u.mobile === phone);
        if (!userPortfolio) {
            agent.add("🚫 No portfolios found for this number.");
            showQuickOptions(agent, ["Invest"], "Would you like to invest instead?");
            return;
        }

        const match = userPortfolio.transactions.find(p => p.fund_name === selectedPortfolio);

        if (!match) {
            agent.add("❗ Invalid portfolio selection. Please choose again.");
            const ids = userPortfolio.transactions.map(p => p.fund_id);
            showQuickOptions(agent, ids, "Please select a valid portfolio:");
            return;
        }

        const currentDate = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        agent.add(`📈 Your Portfolio *${match.fund_id}* valuation is *${match.amount}* as of *${currentDate}*`);
    },
    captureTransactionDateIntentFn: function (agent) {
        const activeContexts = agent.contexts;
        const hasDateContext = activeContexts.some(ctx => ctx.name.includes('awaiting_transaction_date'));

        if (!hasDateContext) {
            agent.add("⚠️ Unexpected input. Let's start again from the main menu.");
            return;
        }

        const sessionId = agent.session.split('/').pop();
        const phone = global.sessionStore?.[sessionId]?.phone;

        if (!phone) {
            agent.add("❗ Session expired. Please enter your contact number again.");
            return;
        }

        const rawText = agent.query?.toLowerCase() || '';
        let startDate, endDate;

        if (rawText.includes("current financial year")) {
            const { startDate: fyStart, endDate: fyEnd } = getCurrentFinancialYear();
            startDate = fyStart;
            endDate = fyEnd;
        }
        else if (rawText.includes("previous financial year")) {
            const { startDate: fyStart, endDate: fyEnd } = getPreviousFinancialYear();
            startDate = fyStart;
            endDate = fyEnd;
        }
        else if (/^\d{4}-\d{2}-\d{2}$/.test(rawText)) {
            const [year, month, day] = rawText.split('-').map(Number);
            startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
            endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
        }
        else {
            try {
                const parsedRange = chrono.parse(rawText);

                if (!parsedRange.length) {
                    agent.add("⚠️ Please enter a valid date or date range (e.g., 'April 2023', '10 April 2024 to 25 April 2024').");
                    return;
                }

                const result = parsedRange[0];
                startDate = result.start?.date();
                endDate = result.end?.date() || startDate;
            } catch (error) {
                console.error("Error parsing date with chrono:", error);
                agent.add("❗ I couldn't understand that date format. Please try again with a clearer date or range.");
                return;
            }
        }

        if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            agent.add("❗ Invalid date format. Please try again.");
            return;
        }

        if (endDate > new Date()) {
            agent.add("🚫 Date cannot be in the future.");
            return;
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const userData = portfolioData.find(u => u.mobile === phone);
        if (!userData || !userData.transactions.length) {
            agent.add("❌ No transactions found for this number.");
            return;
        }

        const filtered = userData.transactions.filter(txn => {
            const [year, month, day] = txn.date.split('-').map(Number);
            const txnDate = new Date(year, month - 1, day);
            return txnDate >= startDate && txnDate <= endDate;
        });

        if (!filtered.length) {
            agent.add("📭 No transactions found in the selected date range.");
            return;
        }

        const formattedTable = buildTransactionTable(phone, filtered);
        handleTransactionHistory(formattedTable, agent);
    },
    downloadTransactionExcelIntentFn: async function (agent) {
        const sessionId = agent.session.split('/').pop();
        const phone = global.sessionStore?.[sessionId]?.phone;

        if (!phone) {
            agent.add("❗ Please enter your registered number again.");
            return;
        }

        const userData = portfolioData.find(u => u.mobile === phone);
        if (!userData || !userData.transactions.length) {
            agent.add("📭 No transactions found.");
            return;
        }

        const filePath = await generateTransactionExcel(phone, userData.transactions);

        const downloadUrl = `https://n6274q7s-3000.inc1.devtunnels.ms/downloads/${path.basename(filePath)}`;
        handleExcelDownload(agent, downloadUrl);
    },
    viewChartIntentFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        const fundId = global.sessionStore?.[sessionId]?.lastSelectedFundId;

        if (!fundId) {
            agent.add("⚠️ No fund selected. Please choose a fund first.");
            return;
        }

        const fund = fundData
            .flatMap(cat => cat.funds)
            .find(f => f.fund_id === fundId);

        if (!fund || !fund.chart) {
            agent.add("📉 Chart not available for this fund.");
            return;
        }
        handleViewChart(agent, fund);
    },
    investNowIntentFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        const phone = global.sessionStore?.[sessionId]?.phone;
        const selectedService = global.sessionStore?.[sessionId]?.selectedService;
        if (!phone) {
            agent.context.set({
                name: 'awaiting_phone',
                lifespan: 2,
                parameters: { followup: CONSTANTS.INTENT_NAME.invest_now }
            });

            agent.add("📞 Please enter your 10-digit mobile number to proceed with investment.");
            return;
        }
    },
    captureInvestmentAmountFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        const phone = global.sessionStore?.[sessionId]?.phone;
        const selectedFund = global.sessionStore?.[sessionId]?.lastSelectedFund;

        const inputAmount = agent.query?.trim();
        const amount = Number(inputAmount);
        if (!phone || !selectedFund["fund_id"] || !selectedFund["fund_name"]) {
            agent.add("⚠️ Something went wrong. Please start again from the main menu.");
            return;
        }

        // Validate amount
        if (isNaN(amount) || amount <= 0 || amount > 50000) {
            agent.add("❗ Please enter a valid investment amount (numeric, less than ₹50,000).");
            const amounts = ['1000', '2000', '5000', '10000'];
            showQuickOptions(agent, amounts, "💸 Try again:");
            return;
        }

        const investment = {
            date: new Date().toISOString().split("T")[0],
            amount,
            fund_name: selectedFund["fund_name"]
        };
        agent.add(` Thank you for investing ₹${amount} in *${selectedFund["fund_name"]}* on *${investment.date}*.\nWe appreciate your trust in us! 🙏`);
    },
    userWantsToInvestMoreIntentFn: function (agent) {
        agent.add(CONSTANTS.MESSAGE.invest_more_msg);
        const fundCategories = fundData.map(item => item.category);
        showQuickOptions(agent, fundCategories, CONSTANTS.MESSAGE.fund_category_continue);
    },
    userWantsToExitIntentFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        delete global.sessionStore[sessionId];
        agent.add(CONSTANTS.MESSAGE.thankyou_msg);
    },
    fallbackIntentFn: function (agent) {
        agent.add(CONSTANTS.MESSAGE.invalid_input);
    }
};

module.exports = intentFunctions;
