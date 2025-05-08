const express = require('express');
const app = express();
app.use(express.json());

const fundData = require('./fund&category.json');
const txnData = require('./transactionhistory.json');
const greetingData = require('./greeting.json');

app.post('/webhook', (req, res) => {

    try {
        const intent = req.body.queryResult.intent.displayName;
        if (intent === 'GetFundCategories') {
            const categories = fundData.map(c => c.category).join(', ');
            res.json({ fulfillmentText: `Available categories: ${categories}` });

        } else if (intent === 'ListFundsByCategory') {
            const category = req.body.queryResult.parameters['category'];

            if (!category) {
                return res.json({ fulfillmentText: "Please specify a fund category like Equity, Debt, or Hybrid." });
            }
            const match = fundData.find(c => c.category.toLowerCase() === category.toLowerCase());

            if (match) {
                const fundList = match.funds.map(f => f.fund_name).join(', ');
                res.json({ fulfillmentText: `Funds in ${category}: ${fundList}` });
            } else {
                res.json({ fulfillmentText: `No funds found in that category.` });
            }

        } else if (intent === 'GetTransactionHistory') {
            const mobile = req.body.queryResult.parameters['phone-number'];
            const user = txnData.find(u => u.mobile === mobile);

            if (user) {
                const txns = user.transactions.map(t => `₹${t.amount} in ${t.fund_name} on ${t.date}`).join('; ');
                res.json({ fulfillmentText: `Your transactions: ${txns}` });
            } else {
                res.json({ fulfillmentText: `No transactions found for that number.` });
            }

        } else if (intent === 'Default Welcome Intent') {
            res.json({
                fulfillmentText: greetingData.message,
                payload: {
                    telegram: {
                        text: greetingData.message,
                        reply_markup: {
                            keyboard: [
                                ["Portfolio Valuation"],
                                ["Explore Funds"],
                                ["Transaction History"]
                            ],
                            resize_keyboard: true,
                            one_time_keyboard: false
                        }
                    }
                }
            });
        } else {
            res.json({ fulfillmentText: "I didn’t understand that." });
        }
    } catch (error) {
        console.error("Webhook error:", error);
        res.status(500).json({ fulfillmentText: "Server error. Please try again later." });
    }

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook server is running on port ${PORT}`));
