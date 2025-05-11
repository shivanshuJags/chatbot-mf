const { showQuickOptions } = require('./common');
const CONSTANTS = require('./constant');
const greetingData = require('./greeting.json');
const fundData = require('./fund&category.json');


const intentFunctions = {
    welcomeIntentFn: function welcome(agent) {
        if (agent.requestSource === agent.TELEGRAM) {
            showQuickOptions(agent, greetingData.suggestions, CONSTANTS.MESSAGE.welcome);
        } else {
            agent.add(CONSTANTS.MESSAGE.fallback_welcome);
        }
    },
    exploreFundsIntentFn: function exploreFunds(agent) {
        const categories = fundData.map(item => item.category);
        if (agent.requestSource === agent.TELEGRAM) {
            showQuickOptions(agent, categories, CONSTANTS.MESSAGE.explore_funds_greeting);
        } else {
            agent.add(CONSTANTS.MESSAGE.fallback_welcome);
        }
    },
    categorySelectionIntentFn: function handleCategorySelection(agent) {
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
    fallbackIntentFn: function fallbackResponse(agent) {
        agent.add(CONSTANTS.MESSAGE.invalid_input);
    }
};

module.exports = intentFunctions;
