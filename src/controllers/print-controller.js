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
      
      // Load JsBarcode library
      await printWindow.webContents.executeJavaScript(`
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      `);
      
      // Escape special characters to prevent JS errors
      const escapeStr = (str) => {
        if (typeof str !== 'string') return '';
        return str
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "\\'")
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
      };
      
      // Generate items HTML
      const itemsHtml = data.items.map(item => `
        const row = document.createElement('tr');
        row.innerHTML = \`
          <td class="item-name">${escapeStr(item.name)}</td>
          <td class="item-qty">${item.quantity}</td>
          <td class="item-price">$${parseFloat(item.price).toFixed(2)}</td>
          <td class="item-total">$${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}</td>
        \`;
        itemsBody.appendChild(row);
      `).join('\n');

      // Insert receipt data
      await printWindow.webContents.executeJavaScript(`
        try {
          document.getElementById('business-name').textContent = '${escapeStr(data.businessName)}';
          document.getElementById('business-address').textContent = '${escapeStr(data.address)}';
          document.getElementById('business-phone').textContent = '${escapeStr(data.phone)}';
          document.getElementById('date').textContent = '${escapeStr(data.date)}';
          document.getElementById('receipt-id').textContent = '${escapeStr(data.receiptId)}';
          document.getElementById('barcode-text').textContent = '${escapeStr(data.receiptId)}';
          
          const itemsBody = document.getElementById('items-body');
          itemsBody.innerHTML = ''; // Clear any existing content
          
          ${itemsHtml}
          
          document.getElementById('subtotal').textContent = '$${parseFloat(data.subtotal).toFixed(2)}';
          document.getElementById('tax').textContent = '$${parseFloat(data.tax).toFixed(2)}';
          document.getElementById('total').textContent = '$${parseFloat(data.total).toFixed(2)}';
          document.getElementById('payment-method').textContent = '${escapeStr(data.paymentMethod)}';
          document.getElementById('payment-amount').textContent = '$${parseFloat(data.paymentAmount).toFixed(2)}';
          
          // Handle discount if present
          if (${data.discount > 0}) {
            const discountRow = document.getElementById('discount-row');
            discountRow.style.display = 'flex';
            document.getElementById('discount').textContent = '-$${parseFloat(data.discount).toFixed(2)}';
          }
          
          // Handle change if present
          if (${data.change > 0}) {
            const changeRow = document.getElementById('change-row');
            changeRow.style.display = 'flex';
            document.getElementById('change').textContent = '$${parseFloat(data.change).toFixed(2)}';
          }
          
          document.getElementById('footer').textContent = '${escapeStr(data.footer)}';
          
          // Generate barcode
          const barcodeContainer = document.getElementById('barcode-container');
          const barcodeCanvas = document.createElement('svg');
          barcodeContainer.appendChild(barcodeCanvas);
          
          if (window.JsBarcode) {
            JsBarcode(barcodeCanvas, '${escapeStr(data.receiptId)}', {
              format: 'CODE128',
              width: 1.5,
              height: 40,
              displayValue: false,
              margin: 0
            });
          }
          
          console.log('Receipt data loaded successfully');
          true;
        } catch (error) {
          console.error('Error loading receipt data:', error);
          throw error;
        }
      `);

      // Print the window
      const pdfPath = path.join(process.env.TEMP || process.env.TMP || '', 'receipt.pdf');
      const pdfData = await printWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: {
          width: 80000, // 80mm in microns
          height: 297000 // Adjust as needed
        },
        margins: {
          marginType: 'custom',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        }
      });

      // Save as PDF file
      fs.writeFileSync(pdfPath, pdfData);

      // Start print job
      await printWindow.webContents.print({ 
        silent: false, 
        printBackground: true, 
        deviceName: '' 
      });

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