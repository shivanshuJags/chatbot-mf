const express = require('express');
const path = require('path');
const { WebhookClient } = require('dialogflow-fulfillment');
const CONSTANTS = require('./constant');
const { welcomeIntentFn, exploreFundsIntentFn,
    fallbackIntentFn, categorySelectionIntentFn,
    fundSelectionIntentFn,
    captureContactIntentFn,
    portfolioValuationIntentFn,
    transactionHistoryIntentFn,
    selectPortfolioIntentFn,
    reEnterContactFn,
    captureTransactionDateIntentFn,
    userWantsToInvestMoreIntentFn,
    userWantsToExitIntentFn,
    downloadTransactionExcelIntentFn,
    viewChartIntentFn,
    investNowIntent,
    investNowIntentFn,
    captureInvestmentAmountFn } = require('./intentFunctions');

const app = express();
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
app.use('/charts', express.static(path.join(__dirname, 'charts')));
app.use(express.json());

global.sessionStore = global.sessionStore || {};

app.post('/webhook', (req, res) => {
    const agent = new WebhookClient({ request: req, response: res });
    // Set intent map
    let intentMap = new Map();
    intentMap.set(CONSTANTS.INTENT_NAME.welcome, welcomeIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.portfolio_selection, selectPortfolioIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.explore_funds, exploreFundsIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.fund_category_selection, categorySelectionIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.fundSelection, fundSelectionIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.portfolio_valuation, portfolioValuationIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.transaction_history, transactionHistoryIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.capture_contact, captureContactIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.re_eneter_contact, reEnterContactFn);
    intentMap.set(CONSTANTS.INTENT_NAME.capture_txn_date, captureTransactionDateIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.invest_now, investNowIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.user_invest_more, userWantsToInvestMoreIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.capture_investment_amount, captureInvestmentAmountFn);
    intentMap.set(CONSTANTS.INTENT_NAME.user_exit, userWantsToExitIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.download_txn_intent, downloadTransactionExcelIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.view_chart, viewChartIntentFn);

    intentMap.set(null, fallbackIntentFn);
    agent.handleRequest(intentMap);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook server is running on port ${PORT}`));
