
module.exports = {
    MESSAGE: {
        welcome: 'Hi, welcome to Pluto Mutual Fund Services. What service would you like to use?',
        reply_option_msg: 'What would you like to do?',
        fallback_welcome: 'Hi, welcome to Pluto Mutual Fund Services. Please type your request.',
        invalid_input: 'Sorry, I didn’t understand that. Can you try again?',
        explore_funds_greeting: 'Kindly select one of categories to see funds:',
        select_portfolio_msg: '📊 Kindly select one of your portfolios:',
        mobile_options: ["Enter Registered Number Again", "Main Menu"],
        no_portfolio_invest_options: ["Invest More", "Enter Registered Number Again", "Main Menu"],
        no_portfolio_found_msg: 'No Portfolio found associted to this number',
        no_portfolio_found: '🚫 No portfolios found for your number.\nPlease try again with a registered number or go back to the main menu.',
        thankyou_msg:'🙏 Thank you for using our services. Have a great day!',
        fund_category_continue:'📊 Kindly select a fund category to continue:',
        invest_more_msg:'🔁 Great! Let’s help you invest more.',
    },
    INTENT_NAME: {
        welcome: 'Default Welcome Intent',
        explore_funds: 'Explore Funds',
        fund_category_selection: 'Fund Category Selection',
        fundSelection: 'Fund Detail Selection',
        capture_contact: "Capture Contact",
        re_eneter_contact: 'ReEnter Contact',
        portfolio_valuation: "Portfolio Valuation",
        transaction_history: "Transaction History",
        portfolio_selection: "Select Portfolio",
        capture_txn_date: 'Capture Transaction Date',
        user_invest_more: 'User Wants to Invest More',
        user_exit: 'User Wants to Exit',
        download_txn_intent:'Download Transaction Excel'
    }
}