const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function generateTransactionExcel(phone, transactions) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Transactions');

    sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Fund Name', key: 'fund_name', width: 30 },
        { header: 'Amount', key: 'amount', width: 15 }
    ];

    transactions.forEach(txn => sheet.addRow(txn));

    // ✅ Ensure folder exists
    const downloadDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir);
    }

    const fileName = `Transaction_${phone}.xlsx`;
    const filePath = path.join(downloadDir, fileName);

    await workbook.xlsx.writeFile(filePath);
    return filePath;
}

module.exports = { generateTransactionExcel };
