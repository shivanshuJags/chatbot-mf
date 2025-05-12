const { showQuickOptions, showPortfolioOptions } = require('./common');
const CONSTANTS = require('./constant');
const greetingData = require('./greeting.json');
const fundData = require('./fund&category.json');
const portfolioData = require('./transactionhistory.json');

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
            agent.add("Sorry, I couldn't find that category.");
            return;
        }

        const fundNames = matchedCategory.funds.map(fund => fund.fund_name);
        const message = `Here are the funds under *${selectedCategory}*. Please select one:`;

        if (agent.requestSource === agent.TELEGRAM) {
            showQuickOptions(agent, fundNames, message);
        } else {
            agent.add(CONSTANTS.MESSAGE.fallback_welcome);
        }
    },
    fundSelectionIntentFn: function (agent) {
        const selectedFund = agent.query;
        let fundFound = null;

        for (const category of fundData) {
            fundFound = category.funds.find(f => f.fund_name.toLowerCase() === selectedFund.toLowerCase());
            if (fundFound) break;
        }

        if (!fundFound) {
            agent.add("Sorry, I couldn’t find that fund.");
            return;
        }

        const { allocation, cagr, link } = fundFound.details;
        const detailText = `
      *Selected Fund Details:*
      - Debt: ${allocation.Debt}
      - Large Cap Equity: ${allocation["Large Cap Equity"]}
      - Mid Cap Equity: ${allocation["Mid Cap Equity"]}
      - Small Cap Equity: ${allocation["Small Cap Equity"]}
      - *CAGR*: ${cagr}
      [More Details](${link})
      `;
        const options = ["Invest", "Return to Main menu"];
        if (agent.requestSource === agent.TELEGRAM) {
            showQuickOptions(agent, options, detailText);
        } else {
            agent.add(CONSTANTS.MESSAGE.fallback_welcome);
        }
    },
    portfolioValuationIntentFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        const user = global.sessionStore?.[sessionId];

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

        if (!user?.phone) {
            agent.context.set({
                name: 'awaiting_phone',
                lifespan: 2,
                parameters: { followup: 'Transaction History' }
            });
            agent.add("📞 Kindly enter your registered contact number to continue.");
            return;
        }

        agent.add(`📄 Transaction History for ${user.phone}:\n- ₹10,000 invested in Equity Fund\n- ₹5,000 redeemed from Hybrid Fund`);
    },
    captureContactIntentFn: function (agent) {
        const sessionId = agent.session.split('/').pop();
        const phone = agent.parameters["phone-number"];

        if (!/^\d{10}$/.test(phone)) {
            agent.add("❗ Please enter a valid 10-digit mobile number.");
            return;
        }

        global.sessionStore[sessionId] = { phone };
        const followupIntent = agent.context.get('awaiting_phone')?.parameters?.followup;

        if (followupIntent === CONSTANTS.INTENT_NAME.portfolio_valuation) {
            showPortfolioOptions(agent, phone);

        } else if (followupIntent === 'Transaction History') {
            agent.add(`✅ Thanks! Here's your transaction history:`);
            agent.add(`📄 - ₹10,000 in Equity Fund\n📄 - ₹5,000 redeemed from Hybrid Fund`);
        } else {
            agent.add(`✅ Thanks! Your number ${phone} has been saved.`);
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
    fallbackIntentFn: function (agent) {
        agent.add(CONSTANTS.MESSAGE.invalid_input);
    }
};

module.exports = intentFunctions;
