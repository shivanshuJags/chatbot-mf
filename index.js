const express = require('express');
const { WebhookClient, Payload } = require('dialogflow-fulfillment');

const fundData = require('./fund&category.json');
const txnData = require('./transactionhistory.json');
const greetingData = require('./greeting.json');
const CONSTANTS = require('./constant');
const { showQuickOptions } = require('./common');
const { welcomeIntentFn, exploreFundsIntentFn, fallbackIntentFn, categorySelectionIntentFn } = require('./intentFunctions');

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
    const agent = new WebhookClient({ request: req, response: res });
    // Set intent map
    let intentMap = new Map();
    intentMap.set(CONSTANTS.INTENT_NAME.welcome, welcomeIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.explore_funds, exploreFundsIntentFn);
    intentMap.set(CONSTANTS.INTENT_NAME.fund_category_selection, categorySelectionIntentFn);
    intentMap.set(null, fallbackIntentFn);
    agent.handleRequest(intentMap);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook server is running on port ${PORT}`));
