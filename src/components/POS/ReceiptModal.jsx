import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const ReceiptModal = ({ isOpen, onClose, transactionData, businessInfo }) => {
  const receiptRef = useRef(null);
  const barcodeRef = useRef(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    // Debug logging
    console.log('Receipt Modal Data:', transactionData);
    console.log('Business Info:', businessInfo);
    
    if (isOpen && transactionData) {
      // Mark as rendered to trigger re-render
      setIsRendered(true);
      
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
      
      // Small delay to ensure DOM is ready for barcode generation
      const timer = setTimeout(() => {
        if (barcodeRef.current) {
          try {
            JsBarcode(barcodeRef.current, transactionData.receiptId || 'INV000000', {
              format: 'CODE128',
              width: 1.5,
              height: 40,
              displayValue: true,
              fontSize: 10,
              margin: 0
            });
            console.log('Barcode generated successfully');
          } catch (error) {
            console.error('Error generating barcode:', error);
          }
        } else {
          console.error('Barcode ref is not available');
        }
      }, 100);
      
      return () => {
        clearTimeout(timer);
      };
    } else {
      document.body.style.overflow = 'auto';
    }
    
    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, transactionData, isRendered]);

  if (!isOpen) return null;
  
  // Check if transaction data is valid and has required fields
  const isValidTransaction = transactionData && 
    transactionData.items && 
    Array.isArray(transactionData.items) &&
    typeof transactionData.subtotal === 'number' &&
    typeof transactionData.total === 'number';
  
  // If transaction data is invalid, show debug info
  if (!isValidTransaction) {
    console.error('Invalid transaction data:', transactionData);
    return (
      <>
        <div 
          className="fixed inset-0 modal-overlay"
          onClick={handleOverlayClick}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            zIndex: 40
          }}
        />
        
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 overflow-hidden shadow-2xl p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4">Receipt Data Error</h2>
            <p className="mb-4">The receipt cannot be displayed because the transaction data is invalid or incomplete.</p>
            
            <div className="bg-gray-100 p-4 rounded-lg mb-4 overflow-auto max-h-60">
              <pre className="text-xs">{JSON.stringify(transactionData, null, 2)}</pre>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const handleShare = () => {
    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set dimensions
      const width = 380;
      const height = 600; // Estimated height
      
      canvas.width = width;
      canvas.height = height;
      
      // Fill white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      
      // Set font styles
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      
      // Business name
      ctx.font = 'bold 18px Arial';
      ctx.fillText(businessInfo?.businessName || 'My POS Store', width/2, 30);
      
      // Contact info
      ctx.font = '12px Arial';
      ctx.fillText(`+${businessInfo?.phone || '555-123-4567'}`, width/2, 50);
      ctx.fillText(businessInfo?.address || '123 Main St', width/2, 70);
      
      // Set left align for the next sections
      ctx.textAlign = 'left';
      
      // Customer & Employee
      ctx.font = '12px Arial';
      ctx.fillText('Customer', 40, 100);
      ctx.fillText('Employee', 40, 120);
      
      // Right aligned info
      ctx.textAlign = 'right';
      ctx.fillText('WALK-IN', width - 40, 100);
      ctx.fillText(businessInfo?.employee || 'Cashier', width - 40, 120);
      
      // Headers
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('Description', 40, 150);
      
      ctx.textAlign = 'center';
      ctx.fillText('Qty', width - 120, 150);
      
      ctx.textAlign = 'right';
      ctx.fillText('Total', width - 40, 150);
      
      // Line
      ctx.beginPath();
      ctx.moveTo(40, 160);
      ctx.lineTo(width - 40, 160);
      ctx.strokeStyle = '#cccccc';
      ctx.stroke();
      
      // Items
      let y = 180;
      ctx.font = '12px Arial';
      
      transactionData.items.forEach(item => {
        ctx.textAlign = 'left';
        ctx.fillText(item.name, 40, y);
        
        ctx.textAlign = 'center';
        ctx.fillText(`${item.quantity}x $${item.price.toFixed(2)}`, width - 120, y);
        
        ctx.textAlign = 'right';
        ctx.fillText(`$${(item.quantity * item.price).toFixed(2)}`, width - 40, y);
        
        y += 20;
      });
      
      // Line before totals
      y += 10;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 40, y);
      ctx.stroke();
      
      y += 20;
      
      // Totals
      ctx.textAlign = 'left';
      ctx.font = '12px Arial';
      
      // Subtotal
      ctx.fillText('Subtotal', 40, y);
      ctx.textAlign = 'right';
      ctx.fillText(`$${transactionData.subtotal.toFixed(2)}`, width - 40, y);
      y += 20;
      
      // Discount if applicable
      if (transactionData.discount > 0) {
        ctx.textAlign = 'left';
        ctx.fillText(`Discount ${transactionData.discountType === 'percentage' ? `(${transactionData.discountValue}%)` : ''}`, 40, y);
        ctx.textAlign = 'right';
        ctx.fillText(`-$${transactionData.discount.toFixed(2)}`, width - 40, y);
        y += 20;
      }
      
      // Tax if applicable
      if (transactionData.taxType !== 'disabled') {
        ctx.textAlign = 'left';
        const taxText = `${transactionData.taxName || 'Tax'} (${transactionData.taxRate}%)${transactionData.taxType === 'included' ? ' (Included)' : ''}`;
        ctx.fillText(taxText, 40, y);
        ctx.textAlign = 'right';
        ctx.fillText(`$${transactionData.tax.toFixed(2)}`, width - 40, y);
        y += 20;
      }
      
      // Total
      ctx.textAlign = 'left';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('Total', 40, y);
      ctx.textAlign = 'right';
      ctx.fillText(`$${transactionData.total.toFixed(2)}`, width - 40, y);
      y += 20;
      
      // Payment info
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Received (${transactionData.paymentMethod})`, 40, y);
      ctx.textAlign = 'right';
      ctx.fillText(`$${transactionData.paymentAmount.toFixed(2)}`, width - 40, y);
      y += 20;
      
      // Change if applicable
      if (transactionData.change > 0) {
        ctx.textAlign = 'left';
        ctx.fillText('Change', 40, y);
        ctx.textAlign = 'right';
        ctx.fillText(`$${transactionData.change.toFixed(2)}`, width - 40, y);
        y += 20;
      }
      
      // Line after totals
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 40, y);
      ctx.stroke();
      
      // Footer text
      y += 20;
      ctx.textAlign = 'center';
      ctx.fillText("Thanks for coming!", width/2, y);
      
      // Format date
      const d = new Date(transactionData.date);
      const formattedDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      
      y += 20;
      ctx.fillText(formattedDate, width/2, y);
      
      // Add real barcode using JsBarcode directly on canvas
      y += 30;
      
      // Create a temporary canvas for the barcode
      const barcodeCanvas = document.createElement('canvas');
      
      // Generate barcode on the temporary canvas
      JsBarcode(barcodeCanvas, transactionData.receiptId || 'INV000000', {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: false, // We'll add the text manually
        margin: 0,
        background: '#FFFFFF'
      });
      
      // Calculate position to center the barcode
      const barcodeWidth = Math.min(300, barcodeCanvas.width);
      const barcodeX = (width - barcodeWidth) / 2;
      
      // Draw the barcode on the main canvas
      ctx.drawImage(
        barcodeCanvas, 
        0, 0, barcodeCanvas.width, barcodeCanvas.height, // Source rectangle
        barcodeX, y, barcodeWidth, 50 // Destination rectangle
      );
      
      // Add receipt ID under barcode
      y += 65;
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(transactionData.receiptId || 'INV000000', width/2, y);
      
      // Convert to PNG and download
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `receipt-${transactionData.receiptId || 'INV000000'}.png`;
      link.href = pngUrl;
      link.click();
      
    } catch (error) {
      console.error('Error generating receipt image:', error);
      alert('Failed to save the receipt image. Please try again.');
    }
  };

  const handlePrint = async () => {
    try {
      // Format the date for printing
      const d = new Date(transactionData.date);
      const formattedDate = formatDate(transactionData.date);
      
      // Prepare data for the receipt printer
      const printData = {
        businessName: businessInfo?.businessName || 'POS System',
        address: businessInfo?.address || '',
        phone: businessInfo?.phone || '',
        employee: businessInfo?.employee || 'Cashier',
        date: formattedDate,
        receiptId: transactionData.receiptId || 'INV000000',
        items: transactionData.items,
        subtotal: transactionData.subtotal,
        discount: transactionData.discount,
        tax: transactionData.tax,
        total: transactionData.total,
        paymentMethod: transactionData.paymentMethod,
        paymentAmount: transactionData.paymentAmount,
        change: transactionData.change,
        footer: "Thanks for coming!"
      };
      
      // Call the print API
      const result = await window.api.print.printReceipt(printData);
      
      if (!result.success) {
        console.error('Print failed:', result.error);
        // Fallback to browser print if electron print fails
        window.print();
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      // Fallback to browser print
      window.print();
    }
  };

  const handleOverlayClick = (e) => {
    // Close modal when clicking outside the receipt card
    if (e.target.classList.contains('modal-overlay')) {
      onClose();
    }
  };

  // Format date to display
  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  // Format currency based on settings
  const formatCurrency = (amount) => {
    return `${amount.toFixed(2)}`;
  };

  return (
    <>
      {/* Dark overlay with animation */}
      <div 
        className="fixed inset-0 modal-overlay"
        onClick={handleOverlayClick}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(3px)',
          zIndex: 40,
          animation: 'fadeIn 0.2s ease-in-out'
        }}
      />
      
      <div className="fixed inset-0 flex items-center justify-center z-50 receipt-modal">
        {/* Additional styles for receipt and overlay animation */}
        <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              .receipt-modal, .receipt-modal * {
                visibility: visible;
              }
              .receipt-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 0;
              }
              .receipt-content svg {
                display: block;
                margin: 0 auto;
                width: 100%;
                max-width: 90%;
              }
              .receipt-close-btn, .receipt-actions {
                display: none !important;
              }
            }
            
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            @keyframes scaleIn {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            
            /* Force black text on white background for receipt content regardless of theme */
            .receipt-paper {
              background-color: white !important;
              color: black !important;
            }
            
            .receipt-paper h1,
            .receipt-paper p,
            .receipt-paper div {
              color: black !important;
            }
            
            .receipt-paper .text-right {
              text-align: right !important;
            }
            
            .receipt-paper .text-center {
              text-align: center !important;
            }
          `}
        </style>
        
        <div 
          className="bg-white dark:bg-dark-800 rounded-lg max-w-md w-full mx-4 overflow-hidden shadow-2xl"
          style={{
            animation: 'scaleIn 0.3s ease-out',
            transformOrigin: 'center'
          }}
        >
          {/* Header with close button */}
          <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 dark:border-dark-600">
            <h2 className="font-medium text-dark-800 dark:text-white">Receipt</h2>
            <button 
              onClick={onClose}
              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Receipt content */}
          <div 
            ref={receiptRef} 
            className="receipt-paper p-6 receipt-content"
            style={{ width: '300px', margin: '0 auto' }}
          >
            {(() => {
              try {
                return (
                  <>
                    {/* Business Name */}
                    <h1 className="text-xl font-bold text-center">{businessInfo?.businessName || 'POS System'}</h1>
                    <p className="text-center text-sm">+{businessInfo?.phone || '212123'}</p>
                    <p className="text-center text-sm mb-4">{businessInfo?.address || 'adrešes'}</p>
                    
                    {/* Customer/Employee Info */}
                    <div className="flex justify-between mb-4 text-sm">
                      <div className="w-1/2">
                        <p>Customer</p>
                        <p>Employee</p>
                      </div>
                      <div className="w-1/2 text-right">
                        <p>WALK-IN</p>
                        <p>{businessInfo?.employee || 'islam'}</p>
                      </div>
                    </div>
                    
                    {/* Items */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm font-medium">
                        <div className="w-1/2">Description</div>
                        <div className="w-1/4 text-center">Qty</div>
                        <div className="w-1/4 text-right">Total</div>
                      </div>
                      
                      {transactionData.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm py-1">
                          <div className="w-1/2 truncate pr-2">{item.name}</div>
                          <div className="w-1/4 text-center">{item.quantity}x ${formatCurrency(item.price)}</div>
                          <div className="w-1/4 text-right">${formatCurrency(item.price * item.quantity)}</div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Totals */}
                    <div className="border-t border-b py-2 mb-2">
                      {/* Subtotal */}
                      <div className="flex justify-between text-sm">
                        <div className="w-1/2">Subtotal</div>
                        <div className="w-1/2 text-right">${formatCurrency(transactionData.subtotal)}</div>
                      </div>
                      
                      {/* Discount if applicable */}
                      {transactionData.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <div className="w-1/2">
                            Discount {transactionData.discountType === 'percentage' ? `(${transactionData.discountValue}%)` : ''}
                          </div>
                          <div className="w-1/2 text-right text-red-500">-${formatCurrency(transactionData.discount)}</div>
                        </div>
                      )}
                      
                      {/* Tax if applicable */}
                      {transactionData.taxType !== 'disabled' && (
                        <div className="flex justify-between text-sm">
                          <div className="w-1/2">
                            {transactionData.taxName || 'Tax'} ({transactionData.taxRate}%)
                            {transactionData.taxType === 'included' ? ' (Included)' : ''}
                          </div>
                          <div className="w-1/2 text-right">${formatCurrency(transactionData.tax)}</div>
                        </div>
                      )}
                      
                      {/* Total */}
                      <div className="flex justify-between font-bold mt-1">
                        <div className="w-1/2">Total</div>
                        <div className="w-1/2 text-right">${formatCurrency(transactionData.total)}</div>
                      </div>
                      
                      {/* Payment */}
                      <div className="flex justify-between text-sm mt-1">
                        <div className="w-3/5">Received Amount / {transactionData.paymentMethod}</div>
                        <div className="w-2/5 text-right">${formatCurrency(transactionData.paymentAmount)}</div>
                      </div>
                      
                      {/* Change if applicable */}
                      {transactionData.change > 0 && (
                        <div className="flex justify-between text-sm">
                          <div className="w-1/2">Change</div>
                          <div className="w-1/2 text-right">${formatCurrency(transactionData.change)}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Footer */}
                    <div className="text-center text-sm">
                      <p>Thanks for coming!</p>
                      <p>{formatDate(transactionData.date)}</p>
                    </div>
                    
                    {/* Barcode - using a container to ensure proper centering */}
                    <div className="mt-4 flex justify-center items-center flex-col">
                      <svg ref={barcodeRef} className="w-full max-w-xs mx-auto"></svg>
                      <div className="text-xs mt-1 text-center w-full">{transactionData.receiptId || 'INV000000'}</div>
                    </div>
                  </>
                );
              } catch (error) {
                console.error('Error rendering receipt content:', error);
                return (
                  <div className="text-center py-8">
                    <div className="text-red-500 mb-4">
                      <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium mb-2">Error Displaying Receipt</h3>
                    <p className="text-gray-600 mb-4">There was an error displaying the receipt content.</p>
                    <pre className="bg-gray-100 p-2 rounded text-xs text-left overflow-auto max-h-40">
                      {error.toString()}
                    </pre>
                  </div>
                );
              }
            })()}
          </div>
          
          {/* Action buttons */}
          <div className="flex border-t receipt-actions">
            <button 
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-white bg-green-500 hover:bg-green-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
            <button 
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-white bg-blue-500 hover:bg-blue-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReceiptModal; 