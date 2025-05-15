
# 💬 Mutual Fund Chatbot (Dialogflow + Telegram + Node.js)

This project is a full-featured mutual fund support chatbot built using **Dialogflow ES**, **Node.js webhook**, and integrated with **Telegram**. It helps users:
- Check their mutual fund portfolio
- Explore available fund categories
- View transaction history
- Make investments
- Generate charts and download reports

---

## 🚀 Features

- 📞 Validates contact number before accessing user data
- 📊 View fund allocation with pie chart (Telegram)
- 🗃️ Check portfolio valuation
- 📅 Filter transaction history by date or financial year
- 📂 Download transaction report in Excel format
- 💸 Simulated investment with persistent storage
- 📌 Context-aware routing between different flows
- 💬 Inline keyboards and HTML responses for rich Telegram UX

---

## 🛠 Tech Stack

- **Dialogflow ES**
- **Node.js + Express**
- **Telegram Bot Integration**
- **Canvas / Chart.js** (for chart generation)
- **XLSX** (for Excel download)
- **dotenv** (for config management)
- **chrono-node** (for flexible date parsing)

---

## 📁 Folder Structure

```
mutual-fund-bot/
├── index.js                  # Webhook server
├── intentFunctions.js        # Logic handlers for intents
├── common.js                 # Shared utility functions
├── greeting.json             # Suggestions data
├── fund&category.json        # Fund categories and allocation
├── transactionhistory.json   # Sample transaction data
├── downloads/                # Excel download files
├── constant.js               # Constant file
└── package.json
```

---

## 🔧 Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/your-username/mutual-fund-bot.git
cd mutual-fund-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup `.env`

Create a `.env` file at root:

```env
BASE_URL=https://your-deployment-url.com
BOT_TOKEN:telegram bot token
```

### 4. Start webhook server

```bash
npm start
```

---

## 🔌 Telegram Integration

Follow the [Dialogflow + Telegram integration guide](https://cloud.google.com/dialogflow/es/docs/integrations/telegram) to:

1. Connect your Telegram bot
2. Enable webhook fulfillment in Dialogflow
3. Set up your bot's **webhook URL** (use your deployed domain or devtunnel)

---

## 📈 Chart & Excel Generation

- Pie charts are rendered using `canvas` and saved under `/charts/`
- Excel files are generated via `xlsx` and served from `/downloads/`
- Clicking "Download" or "View Chart" from Telegram triggers image/file response

---

## ✅ Supported Date Formats

When filtering transactions, you can type:

- `Current Financial Year`
- `Previous Financial Year`
- `April 2023`
- `10 April 2024 to 25 April 2024`
- `2024-12-11` (YYYY-MM-DD)

---

## 🧪 Sample Intents

| Intent Name               | Description                           |
|---------------------------|----------------------------------------|
| Default Welcome Intent    | Entry point with quick suggestions     |
| Explore Funds             | Lists fund categories                  |
| Portfolio Valuation       | Shows portfolio after validation       |
| Transaction History       | Shows past investments                 |
| Capture Contact Number    | Validates and stores user phone        |
| Capture Investment Amount | Captures and processes new investment  |
| View Chart                | Renders allocation pie chart           |
| Download Excel            | Sends XLSX file with past transactions |

---

## 👨‍💻 Author

Built by **Shivanshu Sahu** for [Nagarro/NAGP Workshop].

---

## 📜 License

MIT License – feel free to customize or extend.
