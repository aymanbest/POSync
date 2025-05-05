const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let printWindow = null;

const setupPrintHandlers = () => {
  // Handle receipt printing
  ipcMain.handle('print:receipt', async (event, data) => {
    try {
      // Create a hidden window for printing
      if (!printWindow) {
        printWindow = new BrowserWindow({
          width: 800,
          height: 600,
          show: false, // Hidden window
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
          }
        });
      }

      // Load receipt template
      await printWindow.loadFile(path.join(__dirname, '../templates/receipt.html'));

      // Insert receipt data
      await printWindow.webContents.executeJavaScript(`
        document.getElementById('receipt-data').innerHTML = '${JSON.stringify(data)}';
        document.getElementById('business-name').textContent = '${data.businessName}';
        document.getElementById('date').textContent = '${data.date}';
        document.getElementById('receipt-id').textContent = '${data.receiptId}';
        
        const itemsTable = document.getElementById('items-table');
        const itemsBody = document.getElementById('items-body');
        
        ${data.items.map(item => `
          const row = document.createElement('tr');
          row.innerHTML = \`
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${item.price.toFixed(2)}</td>
            <td>${(item.price * item.quantity).toFixed(2)}</td>
          \`;
          itemsBody.appendChild(row);
        `).join('\n')}
        
        document.getElementById('subtotal').textContent = '${data.subtotal.toFixed(2)}';
        document.getElementById('tax').textContent = '${data.tax.toFixed(2)}';
        document.getElementById('total').textContent = '${data.total.toFixed(2)}';
        document.getElementById('payment-method').textContent = '${data.paymentMethod}';
        document.getElementById('footer').textContent = '${data.footer}';
      `);

      // Print the window
      const pdfPath = path.join(process.env.TEMP || process.env.TMP || '', 'receipt.pdf');
      const data = await printWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: {
          marginType: 'custom',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        }
      });

      // Save as PDF file
      fs.writeFileSync(pdfPath, data);

      // Start print job
      printWindow.webContents.print({ silent: false, printBackground: true, deviceName: '' });

      return { success: true, path: pdfPath };
    } catch (error) {
      console.error('Error printing receipt:', error);
      return { success: false, error: error.message };
    }
  });
};

module.exports = {
  setupPrintHandlers
}; 