import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const ReceiptModal = ({ isOpen, onClose, transactionData, businessInfo }) => {
  const receiptRef = useRef(null);
  const barcodeRef = useRef(null);

  useEffect(() => {
    // Generate barcode when component mounts or transaction data changes
    if (isOpen && barcodeRef.current && transactionData) {
      try {
        JsBarcode(barcodeRef.current, transactionData.receiptId || 'INV000000', {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 10,
          margin: 0
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
    
    // Prevent background scrolling when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, transactionData]);

  if (!isOpen || !transactionData) return null;

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
      
      // Total
      ctx.textAlign = 'left';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('Total', 40, y);
      
      ctx.textAlign = 'right';
      ctx.fillText(`$${transactionData.total.toFixed(2)}`, width - 40, y);
      
      // Payment info
      y += 20;
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Received Amount / ${transactionData.paymentMethod}`, 40, y);
      
      ctx.textAlign = 'right';
      ctx.fillText(`$${transactionData.paymentAmount.toFixed(2)}`, width - 40, y);
      
      // Line after totals
      y += 15;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 40, y);
      ctx.stroke();
      
      // Footer text
      y += 30;
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
      ctx.fillText(transactionData.receiptId || 'INV000003', width/2, y);
      
      // Convert to PNG and download
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `receipt-${transactionData.receiptId || 'unknown'}.png`;
      link.href = pngUrl;
      link.click();
      
    } catch (error) {
      console.error('Error generating receipt image:', error);
      alert('Failed to save the receipt image. Please try again.');
    }
  };

  const handlePrint = () => {
    try {
      // Try to print directly using the browser's print functionality
      window.print();
    } catch (error) {
      console.error('Error printing receipt:', error);
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
              .receipt-content svg {
                display: block;
                margin: 0 auto;
                width: 100%;
                max-width: 90%;
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
          `}
        </style>
        
        <div 
          className="bg-white rounded-lg max-w-md w-full mx-4 overflow-hidden shadow-2xl"
          style={{
            animation: 'scaleIn 0.3s ease-out',
            transformOrigin: 'center'
          }}
        >
          {/* Close button (X) in the top right corner */}
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700 receipt-close-btn"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Receipt content */}
          <div 
            ref={receiptRef} 
            className="bg-white p-6 pt-10 receipt-content"
            style={{ width: '300px', margin: '0 auto' }}
          >
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
              <div className="flex justify-between font-bold">
                <div className="w-1/2">Total</div>
                <div className="w-1/2 text-right">${formatCurrency(transactionData.total)}</div>
              </div>
              <div className="flex justify-between text-sm">
                <div className="w-3/5">Received Amount / {transactionData.paymentMethod}</div>
                <div className="w-2/5 text-right">${formatCurrency(transactionData.paymentAmount)}</div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="text-center text-sm">
              <p>Thanks for coming!</p>
              <p>{formatDate(transactionData.date)}</p>
            </div>
            
            {/* Barcode - using a container to ensure proper centering */}
            <div className="mt-4 flex justify-center items-center flex-col">
              <svg ref={barcodeRef} className="w-full max-w-xs mx-auto"></svg>
              <div className="text-xs mt-1 text-center w-full">{transactionData.receiptId || 'INV000003'}</div>
            </div>
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