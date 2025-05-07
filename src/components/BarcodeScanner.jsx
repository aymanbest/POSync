import React, { useEffect, useRef, useState } from 'react';
import Quagga from 'quagga';

const BarcodeScanner = ({ onDetected, onClose }) => {
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [isQuaggaInitialized, setIsQuaggaInitialized] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  useEffect(() => {
    // Request camera permission
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(() => {
        setPermissionGranted(true);
        startScanner();
      })
      .catch(err => {
        console.error('Camera access error:', err);
        setError('Camera access denied. Please grant permission to use the camera.');
        // Show manual entry if camera access is denied
        setShowManualEntry(true);
      });

    return () => {
      // Clean up - only stop if Quagga was properly initialized
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopScanner = () => {
    if (isQuaggaInitialized) {
      try {
        Quagga.stop();
        setIsQuaggaInitialized(false);
      } catch (error) {
        console.error("Error stopping Quagga:", error);
      }
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onDetected(manualBarcode.trim());
      onClose();
    }
  };

  const startScanner = () => {
    if (scannerRef.current) {
      const config = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            facingMode: "environment", // use rear camera on mobile devices
            // Allow dynamic sizing based on container, don't restrict too much
            width: 320,
            height: 240,
          },
          area: {
            // Entire element is active scanning area
            top: "0%",
            right: "0%",
            left: "0%",
            bottom: "0%"
          },
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "codabar_reader",
            "upc_reader",
            "upc_e_reader",
            "i2of5_reader"
          ],
          debug: {
            showCanvas: false,
            showPatches: false,
            showFoundPatches: false,
            showSkeleton: false,
            showLabels: false,
            showPatchLabels: false,
            showRemainingPatchLabels: false,
          }
        },
        multiple: false, // Only detect one barcode at a time
      };

      // Try to use workers if available, otherwise fallback to single-threaded
      try {
        if (window.Worker) {
          // Web Workers are supported
          config.numOfWorkers = 2;
          config.frequency = 10;
        } else {
          // Web Workers are not supported, use single-threaded mode
          console.log("Web Workers not supported, using single-threaded mode");
          config.numOfWorkers = 0;
          config.frequency = 5;
        }
      } catch (e) {
        console.log("Error checking for Web Workers, using single-threaded mode:", e);
        config.numOfWorkers = 0;
        config.frequency = 5;
      }

      Quagga.init(config, function(err) {
        if (err) {
          console.error("Error starting Quagga:", err);
          
          // Try again with single-threaded mode if there was an error
          if (config.numOfWorkers > 0) {
            console.log("Retrying with single-threaded mode");
            config.numOfWorkers = 0;
            Quagga.init(config, function(err2) {
              if (err2) {
                console.error("Error starting Quagga in single-threaded mode:", err2);
                setError("Failed to initialize the barcode scanner. Please try again or use manual entry.");
                setShowManualEntry(true);
                return;
              }
              
              setScanning(true);
              setIsQuaggaInitialized(true);
              Quagga.start();
              setupQuaggaCallbacks();
            });
            return;
          }
          
          setError("Failed to initialize the barcode scanner. Please try manual entry.");
          setShowManualEntry(true);
          return;
        }
        
        setScanning(true);
        setIsQuaggaInitialized(true);
        Quagga.start();
        setupQuaggaCallbacks();
      });
    }
  };

  const setupQuaggaCallbacks = () => {
    // Register callback for barcode detection
    Quagga.onDetected((result) => {
      if (result && result.codeResult) {
        const code = result.codeResult.code;
        setLastResult(code);
        
        // Immediately use the detected code instead of waiting for multiple detections
        stopScanner();
        onDetected(code);
        onClose();
      }
    });
    
    // Also listen for processing errors
    Quagga.onProcessed((result) => {
      const drawingCtx = Quagga.canvas.ctx.overlay;
      const drawingCanvas = Quagga.canvas.dom.overlay;

      if (result) {
        if (result.boxes) {
          drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
          result.boxes.filter(function (box) {
            return box !== result.box;
          }).forEach(function (box) {
            Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
          });
        }

        if (result.box) {
          Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "#00F", lineWidth: 2 });
        }

        if (result.codeResult && result.codeResult.code) {
          Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, { color: 'red', lineWidth: 3 });
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-3 w-80 relative"> {/* Increased width to 80 (20rem) */}
        <button 
          onClick={handleClose}
          className="absolute top-1 right-1 text-gray-500 hover:text-gray-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-base font-semibold mb-2">Scan Barcode</h2>
        
        {error && (
          <div className="text-red-500 mb-2 text-xs">{error}</div>
        )}
        
        {!permissionGranted && !showManualEntry ? (
          <div className="text-center py-3">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-1 text-xs text-gray-500">Requesting camera access...</p>
          </div>
        ) : (
          <>
            {!showManualEntry ? (
              <div className="relative">
                <div 
                  ref={scannerRef} 
                  className="border border-gray-300 rounded-md overflow-hidden w-full mx-auto"
                  style={{ height: "200px" }} // Increased height for better camera view
                ></div>
                <div className="text-xs text-gray-500 mt-1 text-center">
                  Position barcode within scanner area
                </div>
                {scanning && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 border-2 border-red-500 opacity-50 rounded-md"></div>
                    <div className="absolute top-1/2 left-0 w-full border-t-2 border-red-500 opacity-50" style={{ transform: 'translateY(-50%)' }}></div>
                    <div className="absolute top-0 left-1/2 h-full border-l-2 border-red-500 opacity-50" style={{ transform: 'translateX(-50%)' }}></div>
                  </div>
                )}
                {lastResult && (
                  <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-center py-0.5 text-xs">
                    Detected: {lastResult.substring(0, 12)}{lastResult.length > 12 ? '...' : ''}
                  </div>
                )}
                <div className="mt-2 text-center">
                  <button
                    onClick={() => setShowManualEntry(true)}
                    className="text-blue-600 hover:text-blue-800 underline text-xs"
                  >
                    Enter barcode manually
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-2">
                <form onSubmit={handleManualSubmit} className="space-y-2">
                  <div>
                    <label htmlFor="manual-barcode" className="block text-xs font-medium text-gray-700 mb-1">
                      Enter Barcode
                    </label>
                    <input
                      id="manual-barcode"
                      type="text"
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      className="w-full border border-gray-300 p-1.5 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Type barcode number"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-between">
                    {permissionGranted && (
                      <button
                        type="button"
                        onClick={() => setShowManualEntry(false)}
                        className="text-blue-600 hover:text-blue-800 underline text-xs"
                      >
                        Back to scanner
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md ml-auto text-xs"
                      disabled={!manualBarcode.trim()}
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner; 