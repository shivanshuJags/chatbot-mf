const chrono = require('chrono-node');
const path = require('path');
const fs = require('fs');
const { generateTransactionExcel } = require('./excel_util');
const CONSTANTS = require('./constant');
const greetingData = require('./greeting.json');
const fundData = require('./fund&category.json');
const { showQuickOptions, showPortfolioOptions, buildTransactionTable, handleTransactionHistory, getCurrentFinancialYear, getPreviousFinancialYear, handleExcelDownload, replaceDynamicText, buildFundDisplay, handleViewChart, getPortfolioData } = require('./common');
require('dotenv').config();

const intentFunctions = {
    welcomeIntentFn: function (agent) {
        const sessionId = agent.session.split('/').pop();

        if (global.sessionStore) {
            delete global.sessionStore[sessionId];
        }

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
        const categories = fundData.map(item => item.category);

        if (!categories.length) {
            agent.add(CONSTANTS.MESSAGE.no_category);
            return;
        }

        if (agent.requestSource === agent.TELEGRAM) {
            showQuickOptions(agent, categories, CONSTANTS.MESSAGE.explore_funds_greeting);
        } else {
            agent.add(CONSTANTS.MESSAGE.fallback_welcome);
        }
    },
    categorySelectionIntentFn: function (agent) {
        const selectedCategory = agent.query.toLowerCase().trim();
        const matchedCategory = fundData.find(item =>
            selectedCategory.includes(item.category.toLowerCase())
        );

        if (!matchedCategory) {
            agent.add(CONSTANTS.MESSAGE.no_category);
            const options = fundData.map(f => f.category);
            showQuickOptions(agent, options, CONSTANTS.MESSAGE.explore_funds_greeting);
            return;
        }

        const fundNames = matchedCategory.funds.map(fund => fund.fund_name);
        const message = replaceDynamicText(CONSTANTS.MESSAGE.select_category, matchedCategory.category);

        agent.context.set({
            name: 'awaiting_fund_selection',
            lifespan: 2,
            parameters: {
                category: matchedCategory.category
            }
        });

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
            agent.add(replaceDynamicText(CONSTANTS.MESSAGE.enter_mobile, ''));
            return;
        }
        agent.add(CONSTANTS.MESSAGE.something_wrong);
    },
    transactionHistoryIntentFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        const user = global.sessionStore?.[sessionId];
        const phone = user?.phone;

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
            agent.add(replaceDynamicText(CONSTANTS.MESSAGE.enter_mobile, ''));
            return;
        }

        agent.context.set({
            name: 'awaiting_transaction_date',
            lifespan: 2,
            parmeters: {
                phone
            }
        });

        const options = ["Current Financial Year", "Previous Financial Year"];
        showQuickOptions(agent, options, "📆");
    },
    captureContactIntentFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        const phone = agent.parameters["phone-number"];

        if (!/^\d{10}$/.test(phone)) {
            agent.add(CONSTANTS.MESSAGE.enter_number);
            return;
        }

        global.sessionStore[sessionId] = {
            ...global.sessionStore[sessionId],
            phone
        };
        const followupIntent = agent.context.get('awaiting_phone')?.parameters?.followup;

        if (followupIntent === CONSTANTS.INTENT_NAME.portfolio_valuation) {
            agent.context.set({
                name: 'awaiting_portfolio_selection',
                lifespan: 2,
                parameters: { phone: phone }
            });
            showPortfolioOptions(agent, phone);

        } else if (followupIntent === CONSTANTS.INTENT_NAME.transaction_history) {
            const options = ["Current Financial Year", "Previous Financial Year"];
            showQuickOptions(agent, options, CONSTANTS.MESSAGE.select_year_type);

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
            const portfolioData = getPortfolioData();
            const userRecord = portfolioData.find(u => u.mobile === phone);

            if (!userRecord || !userRecord.transactions || userRecord.transactions.length === 0) {
                agent.add(CONSTANTS.MESSAGE.no_record_msg);
                showQuickOptions(agent, ["Main Menu"], "Would you like to go back?");
                return;
            }

            const amounts = CONSTANTS.MESSAGE.investment_amount_options;
            showQuickOptions(agent, amounts, CONSTANTS.MESSAGE.select_investment_amount);
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

        agent.add(`${CONSTANTS.MESSAGE.enter_mobile} again`);
    },
    selectPortfolioIntentFn: function (agent) {
        const selectedPortfolio = agent.query;
        const sessionId = agent.session.split('/').pop();
        const phone = global.sessionStore?.[sessionId]?.phone;

        if (!phone) {
            agent.add(`${CONSTANTS.MESSAGE.enter_mobile} again`);
            return;
        }
        const portfolioData = getPortfolioData();
        const userPortfolio = portfolioData.find(u => u.mobile === phone);
        if (!userPortfolio) {
            agent.add(CONSTANTS.MESSAGE.no_portfolio_found_msg);
            showQuickOptions(agent, ["Invest"], "Would you like to invest instead?");
            return;
        }
        const match = userPortfolio.transactions.find(item =>
            selectedPortfolio.includes(item.fund_name)
        );
        if (!match) {
            agent.add(CONSTANTS.MESSAGE.no_portfolio_found);
            const fundName = userPortfolio.transactions.map(p => p.fund_name);
            showQuickOptions(agent, fundName, "Please select a valid portfolio:");
            return;
        }

        const currentDate = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const message = `Your Portfolio <b>${match.fund_id}</b> valuation is <b>${match.amount}</b> as of <b>${currentDate}</b>`
        showQuickOptions(agent, [], message);
    },
    captureTransactionDateIntentFn: function (agent) {
        const activeContexts = agent.contexts;
        const hasDateContext = activeContexts.some(ctx => ctx.name.includes('awaiting_transaction_date'));

        if (!hasDateContext) {
            agent.add(CONSTANTS.MESSAGE.something_wrong);
            return;
        }

        const sessionId = agent.session.split('/').pop();
        const phone = global.sessionStore?.[sessionId]?.phone;

        if (!phone) {
            agent.add(CONSTANTS.MESSAGE.something_wrong);
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
                    agent.add(CONSTANTS.MESSAGE.select_range);
                    return;
                }

                const result = parsedRange[0];
                startDate = result.start?.date();
                endDate = result.end?.date() || startDate;
            } catch (error) {
                console.error("Error parsing date with chrono:", error);
                agent.add(CONSTANTS.MESSAGE.date_format_error);
                return;
            }
        }

        if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            agent.add("Invalid date format. Please try again.");
            return;
        }

        if (endDate > new Date()) {
            agent.add("Date cannot be in the future.");
            return;
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const portfolioData = getPortfolioData();
        const userData = portfolioData.find(u => u.mobile === phone);
        if (!userData || !userData.transactions.length) {
            agent.add(`${CONSTANTS.MESSAGE.no_transaction} in the selected date range.`);
            return;
        }

        const filtered = userData.transactions.filter(txn => {
            const [year, month, day] = txn.date.split('-').map(Number);
            const txnDate = new Date(year, month - 1, day);
            return txnDate >= startDate && txnDate <= endDate;
        });

        if (!filtered.length) {
            agent.add(`${CONSTANTS.MESSAGE.no_transaction} in the selected date range.`);
            return;
        }

        const recentTransactions = filtered
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3);
        const formattedTable = buildTransactionTable(userData, recentTransactions);
        handleTransactionHistory(formattedTable, agent);
    },
    downloadTransactionExcelIntentFn: async function (agent) {
        const sessionId = agent.session.split('/').pop();
        const phone = global.sessionStore?.[sessionId]?.phone;

        if (!phone) {
            agent.add(CONSTANTS.MESSAGE.enter_number);
            return;
        }

        const portfolioData = getPortfolioData();
        const userData = portfolioData.find(u => u.mobile === phone);
        if (!userData || !userData.transactions.length) {
            agent.add(CONSTANTS.MESSAGE.no_transaction);
            return;
        }

        const filePath = await generateTransactionExcel(phone, userData.transactions);

        const downloadUrl = `${process.env.BASE_URL}/downloads/${path.basename(filePath)}`;
        handleExcelDownload(agent, downloadUrl);
    },
    viewChartIntentFn: async function (agent) {
        const sessionId = agent.session.split('/').pop();
        const selectedFund = global.sessionStore?.[sessionId]?.lastSelectedFund;
        if (!selectedFund.fund_id) {
            agent.add(CONSTANTS.MESSAGE.no_fund_selection);
            return;
        }

        const fund = fundData
            .flatMap(cat => cat.funds)
            .find(f => f.fund_id === selectedFund.fund_id);

        if (!fund) {
            agent.add(CONSTANTS.MESSAGE.no_chart);
            return;
        }
        await handleViewChart(agent, fund);
    },
    investNowIntentFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        const phone = global.sessionStore?.[sessionId]?.phone;
        if (!phone) {
            agent.context.set({
                name: 'awaiting_phone',
                lifespan: 2,
                parameters: { followup: CONSTANTS.INTENT_NAME.invest_now }
            });
            agent.add(replaceDynamicText(CONSTANTS.MESSAGE.enter_mobile, 'investment'));
        } else {
            agent.context.set({
                name: 'awaiting_investment_amount',
                lifespan: 2
            });
            const portfolioData = getPortfolioData();
            const userRecord = portfolioData.find(u => u.mobile === phone);

            if (!userRecord || !userRecord.transactions || userRecord.transactions.length === 0) {
                agent.add(CONSTANTS.MESSAGE.no_record_msg);
                showQuickOptions(agent, ["Main Menu"], CONSTANTS.MESSAGE.something_wrong);
                return;
            }

            const amounts = CONSTANTS.MESSAGE.investment_amount_options;
            showQuickOptions(agent, amounts, CONSTANTS.MESSAGE.select_investment_amount);
        }
    },
    captureInvestmentAmountFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        const phone = global.sessionStore?.[sessionId]?.phone;
        const selectedFund = global.sessionStore?.[sessionId]?.lastSelectedFund;

        const inputAmount = agent.query?.trim();
        const amount = Number(inputAmount);

        if (!phone || !selectedFund?.fund_id || !selectedFund?.fund_name) {
            agent.add(CONSTANTS.MESSAGE.something_wrong);
            return;
        }

        if (isNaN(amount) || amount <= 0 || amount > 50000) {
            agent.add(CONSTANTS.MESSAGE.select_investment_amount);
            showQuickOptions(agent, CONSTANTS.MESSAGE.investment_amount_options, CONSTANTS.MESSAGE.tryAgain_investment);
            return;
        }

        const today = new Date().toISOString().split("T")[0];
        const fundId = selectedFund.fund_id;
        const fundName = selectedFund.fund_name;

        const portfolioData = getPortfolioData();
        const user = portfolioData.find(u => u.mobile === phone);

        if (!user) {
            agent.add(CONSTANTS.MESSAGE.no_portfolio_found_msg);
            return;
        }

        const fund = user.transactions.find(t => t.fund_id === fundId);

        if (fund) {
            if (!fund.history) fund.history = [];

            fund.history.push({
                deposit_date: today,
                price: amount
            });

            fund.date = today;
            fund.amount = fund.history.reduce((sum, entry) => sum + entry.price, 0);
        } else {
            user.transactions.push({
                date: today,
                amount,
                fund_name: fundName,
                fund_id: fundId,
                history: [
                    {
                        deposit_date: today,
                        price: amount
                    }
                ]
            });
        }
        const transactionFilePath = path.join(__dirname, 'transactionhistory.json');
        fs.writeFileSync(transactionFilePath, JSON.stringify(portfolioData, null, 2));
        const message = `Thank you for investing ₹${amount} in <b>${fundName}</b> on <b>${today}</b>.\nWe appreciate your trust in us! 🙏`;
        showQuickOptions(agent, [], message);
    }
    ,
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
