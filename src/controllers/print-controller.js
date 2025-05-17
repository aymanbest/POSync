const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const receiptline = require('receiptline');

let printWindow = null;

// Helper function to get currency symbol
const getCurrencySymbol = (currencyCode) => {
  const symbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CNY': '¥',
    'INR': '₹',
    'CAD': 'C$',
    'AUD': 'A$',
    'MAD': 'DH'
  };
  
  return symbols[currencyCode] || currencyCode;
};

// Build receipt document using receiptline markdown syntax
const buildReceiptDocument = (data) => {
  // Get currency symbol
  const currencySymbol = getCurrencySymbol(data.currency || 'MAD');
  
  // Header section with business info
  let doc = `
{align:center}
^^^${data.businessName}^^^

${data.address || ''}
+${data.phone || ''}

{align:left}
Date: ${data.date}
Receipt: ${data.receiptId}
--------------------------

`;

  // Add QR code with receipt ID and date
  const qrData = `ID:${data.receiptId},Date:${data.date},Total:${parseFloat(data.total).toFixed(2)}`;
  doc += `
{align:center}
{code:${qrData};option:qrcode,5,m}

{align:left}
`;

  // Items section with clearer layout
  doc += `
{width:24,8,10}
{border:line}
Item | Qty | Price
{border:line}
`;

  // Add items
  data.items.forEach(item => {
    const itemTotal = (parseFloat(item.price) * parseInt(item.quantity)).toFixed(2);
    doc += `${item.name} | ${item.quantity} | ${currencySymbol}${itemTotal}\n`;
  });

  // Add totals section
  doc += `
{border:line}
{align:right}
{width:32,10}
Subtotal: | ${currencySymbol}${parseFloat(data.subtotal).toFixed(2)}
`;

  // Add discount if present
  if (data.discount > 0) {
    doc += `Discount: | -${currencySymbol}${parseFloat(data.discount).toFixed(2)}\n`;
  }

  // Add tax
  doc += `Tax: | ${currencySymbol}${parseFloat(data.tax).toFixed(2)}\n`;
  
  // Add total
  doc += `^^TOTAL: | ${currencySymbol}${parseFloat(data.total).toFixed(2)}^^\n`;
  
  // Add payment info
  doc += `
{align:left}
{width:*}
Payment Method: ${data.paymentMethod}
Amount Received: ${currencySymbol}${parseFloat(data.paymentAmount).toFixed(2)}
`;

  // Add change if present
  if (data.change > 0) {
    doc += `Change: ${currencySymbol}${parseFloat(data.change).toFixed(2)}\n`;
  }

  // Add footer
  doc += `
--------------------------
{align:center}
${data.footer || "Thanks for coming!"}
`;

  return doc;
};

const setupPrintHandlers = () => {
  // Handler for generating receipt SVG
  ipcMain.handle('print:generateReceiptSvg', async (event, data) => {
    try {
      // Generate receipt using receiptline
      const doc = buildReceiptDocument(data);
      
      // Transform to SVG
      const svg = receiptline.transform(doc, {
        cpl: 40, // Characters per line - slightly narrower for better display
        encoding: 'multilingual',
        command: 'svg'
      });
      
      return { success: true, svg };
    } catch (error) {
      console.error('Error generating receipt SVG:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle receipt printing
  ipcMain.handle('print:receipt', async (event, data) => {
    try {
      // Generate receipt using receiptline
      const doc = buildReceiptDocument(data);
      
      // Transform to SVG for display
      const svg = receiptline.transform(doc, {
        cpl: 40,
        encoding: 'multilingual',
        command: 'svg'
      });
      
      // Generate printer commands for printing (optional for future direct printing)
      const command = receiptline.transform(doc, {
        cpl: 42,
        encoding: 'multilingual',
        upsideDown: false,
        gamma: 1.8,
        command: 'escpos'
      });
      
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

      // Create a simple HTML page with the SVG content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Receipt</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              background-color: white;
            }
            .receipt-container {
              width: 80mm;
              background-color: white;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            ${svg}
          </div>
        </body>
        </html>
      `;
      
      // Create a temporary HTML file
      const tempHtmlPath = path.join(process.env.TEMP || process.env.TMP || '', 'receipt.html');
      fs.writeFileSync(tempHtmlPath, htmlContent);
      
      // Load the HTML file
      await printWindow.loadFile(tempHtmlPath);

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

      // For direct printing to thermal printer (optional enhancement)
      // This would require additional setup with a printer driver
      // const printerName = data.printerName || '';
      // if (printerName) {
      //   // Use command for direct printing to thermal printer
      //   // This would require additional implementation
      // }

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