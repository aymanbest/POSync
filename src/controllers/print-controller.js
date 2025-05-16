const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const receiptline = require('receiptline');

let printWindow = null;

// Build receipt document using receiptline markdown syntax
const buildReceiptDocument = (data) => {
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

{width:24,10,8}
Item | Qty | Total
{border:line}
`;

  // Add items
  data.items.forEach(item => {
    const itemTotal = (parseFloat(item.price) * parseInt(item.quantity)).toFixed(2);
    doc += `${item.name} | ${item.quantity}x $${parseFloat(item.price).toFixed(2)} | $${itemTotal}\n`;
  });

  // Add totals section
  doc += `
{border:line}
{align:right}
Subtotal: $${parseFloat(data.subtotal).toFixed(2)}
`;

  // Add discount if present
  if (data.discount > 0) {
    doc += `Discount: -$${parseFloat(data.discount).toFixed(2)}\n`;
  }

  // Add tax
  doc += `Tax: $${parseFloat(data.tax).toFixed(2)}\n`;
  
  // Add total
  doc += `^^TOTAL: $${parseFloat(data.total).toFixed(2)}^^\n`;
  
  // Add payment info
  doc += `
{align:left}
Payment Method: ${data.paymentMethod}
Amount Received: $${parseFloat(data.paymentAmount).toFixed(2)}
`;

  // Add change if present
  if (data.change > 0) {
    doc += `Change: $${parseFloat(data.change).toFixed(2)}\n`;
  }

  // Add footer
  doc += `
--------------------------
{align:center}
${data.footer || "Thanks for coming!"}

{code:${data.receiptId};option:code128,3,40,hri}
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