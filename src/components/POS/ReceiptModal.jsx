import React, { useState, useEffect, useRef } from 'react';
// Import receiptline only in the main process, not in the renderer
// We'll use IPC to communicate with the main process for receipt generation

const ReceiptModal = ({ isOpen, onClose, transactionData, businessInfo }) => {
  const receiptRef = useRef(null);
  const [receiptSvg, setReceiptSvg] = useState('');
  const [isRendered, setIsRendered] = useState(false);
  const [error, setError] = useState(null);
  const [receiptHeight, setReceiptHeight] = useState(0);

  useEffect(() => {
    // Debug logging
    console.log('Receipt Modal Data:', transactionData);
    console.log('Business Info:', businessInfo);
    
    if (isOpen && transactionData) {
      try {
        // Generate receipt using the main process via IPC
        generateReceiptSvg(transactionData, businessInfo)
          .then(svg => {
            setReceiptSvg(svg);
            setIsRendered(true);
            setError(null);
            
            // After SVG is rendered, get its height to adjust container
            setTimeout(() => {
              if (receiptRef.current) {
                const svgElement = receiptRef.current.querySelector('svg');
                if (svgElement) {
                  setReceiptHeight(svgElement.getBoundingClientRect().height);
                }
              }
            }, 100);
          })
          .catch(err => {
            console.error('Error generating receipt:', err);
            setError(err.message || 'Failed to generate receipt');
          });
      } catch (err) {
        console.error('Error setting up receipt generation:', err);
        setError(err.message || 'Failed to generate receipt');
      }
      
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, transactionData, businessInfo]);

  // Function to generate receipt SVG via IPC
  const generateReceiptSvg = async (data, business) => {
    // Format the receipt data
    const receiptData = {
      businessName: business?.businessName || 'POS System',
      address: business?.address || '',
      phone: business?.phone || '',
      employee: business?.employee || 'Cashier',
      date: formatDate(data.date),
      receiptId: data.receiptId || 'INV000000',
      items: data.items,
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
      total: data.total,
      paymentMethod: data.paymentMethod,
      paymentAmount: data.paymentAmount,
      change: data.change,
      footer: "Thanks for coming!"
    };
    
    // Call the main process to generate the receipt
    const result = await window.api.print.generateReceiptSvg(receiptData);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to generate receipt');
    }
    
    return result.svg;
  };

  if (!isOpen) return null;
  
  // Check if transaction data is valid and has required fields
  const isValidTransaction = transactionData && 
    transactionData.items && 
    Array.isArray(transactionData.items) &&
    typeof transactionData.subtotal === 'number' &&
    typeof transactionData.total === 'number';
  
  // If transaction data is invalid, show debug info
  if (!isValidTransaction || error) {
    console.error('Invalid transaction data or error:', transactionData, error);
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
              <pre className="text-xs">{JSON.stringify(error || transactionData, null, 2)}</pre>
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

  const handleShare = async () => {
    try {
      // Generate receipt SVG through main process
      const svg = await generateReceiptSvg(transactionData, businessInfo);
      
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Create an image from the SVG
      const img = new Image();
      img.onload = () => {
        // Set canvas dimensions
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the image
        ctx.drawImage(img, 0, 0);
        
        // Convert to PNG and download
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `receipt-${transactionData.receiptId || 'INV000000'}.png`;
        link.href = pngUrl;
        link.click();
      };
      
      // Set the SVG as the image source
      // Need to convert the SVG to a data URL
      const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
    } catch (error) {
      console.error('Error generating receipt image:', error);
      alert('Failed to save the receipt image. Please try again.');
    }
  };

  const handlePrint = async () => {
    try {
      // Format the date for printing
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

  // Calculate modal height based on viewport
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
  const modalMaxHeight = viewportHeight * 0.85; // 85% of viewport height
  const contentMaxHeight = modalMaxHeight - 120; // Subtract header and footer height

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
            
            /* Adjust SVG to fit container */
            .receipt-content svg {
              display: block;
              width: 100%;
              max-width: 300px;
              margin: 0 auto;
              height: auto !important;
            }
            
            /* Hide scrollbar but allow scrolling if needed */
            .receipt-content {
              scrollbar-width: none; /* Firefox */
              -ms-overflow-style: none; /* IE and Edge */
            }
            
            .receipt-content::-webkit-scrollbar {
              display: none; /* Chrome, Safari, Opera */
            }
          `}
        </style>
        
        <div 
          className="bg-white dark:bg-dark-800 rounded-lg max-w-md w-full mx-4 overflow-hidden shadow-2xl flex flex-col"
          style={{
            animation: 'scaleIn 0.3s ease-out',
            transformOrigin: 'center',
            maxHeight: `${modalMaxHeight}px`
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
            className="receipt-paper p-4 receipt-content overflow-auto flex-grow flex items-center justify-center"
            style={{ 
              maxHeight: `${contentMaxHeight}px`,
              overflowY: receiptHeight > contentMaxHeight ? 'auto' : 'hidden'
            }}
          >
            <div 
              className="receipt-svg-container"
              dangerouslySetInnerHTML={{ __html: receiptSvg }}
            />
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