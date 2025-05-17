import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRCodeScanner = ({ onDetected, onClose }) => {
  const scannerContainerRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [html5QrCode, setHtml5QrCode] = useState(null);

  // Get list of cameras on component mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length) {
          setCameras(devices);
          
          // Default to the environment-facing camera if available
          const backCamera = devices.find(
            camera => camera.label.toLowerCase().includes('back') || 
                     camera.label.toLowerCase().includes('environment')
          );
          
          if (backCamera) {
            setSelectedCamera(backCamera.id);
          } else {
            setSelectedCamera(devices[0].id);
          }
        } else {
          setError('No cameras found on this device');
          setShowManualEntry(true);
        }
      })
      .catch(err => {
        console.error('Error getting cameras', err);
        setError('Could not access camera list. Please grant camera permissions.');
        setShowManualEntry(true);
      });

    // Clean up on unmount
    return () => {
      stopScanner();
    };
  }, []);

  // Initialize scanner instance when component mounts
  useEffect(() => {
    // Create scanner instance only once
    if (!html5QrCode && document.getElementById('qr-reader')) {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        setHtml5QrCode(scanner);
      } catch (err) {
        console.error('Error creating QR scanner instance:', err);
        setError(`Failed to initialize scanner: ${err.message || 'Unknown error'}`);
        setShowManualEntry(true);
      }
    }

    return () => {
      // Clean up scanner on unmount
      if (html5QrCode) {
        stopScanner();
      }
    };
  }, []);

  // Start scanner when camera is selected and scanner instance exists
  useEffect(() => {
    if (selectedCamera && html5QrCode && !showManualEntry) {
      startScanner();
    }
    
    return () => {
      if (scanning) {
        stopScanner();
      }
    };
  }, [selectedCamera, html5QrCode, showManualEntry]);

  const startScanner = async () => {
    if (!html5QrCode || !scannerContainerRef.current) return;
    
    // Don't try to start if already scanning
    if (scanning) return;

    try {
      const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        console.log(`QR Code detected: ${decodedText}`);
        setLastResult(decodedText);
        
        // Stop scanning and pass result to parent
        stopScanner();
        onDetected(decodedText);
        onClose();
      };
      
      const config = { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };
      
      setScanning(true);
      
      await html5QrCode.start(
        { deviceId: selectedCamera },
        config,
        qrCodeSuccessCallback,
        (errorMessage) => {
          // QR Code scanning is in progress, errors here are mostly related to not finding a QR code
          console.log(`QR Code scanning ongoing: ${errorMessage}`);
        }
      );
    } catch (err) {
      console.error('Error starting QR scanner:', err);
      setError(`Failed to start scanner: ${err.message || 'Unknown error'}`);
      setShowManualEntry(true);
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (html5QrCode && html5QrCode.isScanning) {
      try {
        html5QrCode.stop()
          .then(() => {
            console.log('QR Code scanning stopped.');
            setScanning(false);
          })
          .catch(err => {
            // Just log the error but don't throw it
            console.error('Error stopping QR Code scanner:', err);
            // Force the scanning state to false anyway
            setScanning(false);
          });
      } catch (err) {
        console.error('Exception when stopping QR scanner:', err);
        // Force the scanning state to false
        setScanning(false);
      }
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onDetected(manualCode.trim());
      onClose();
    }
  };

  const handleCameraChange = (e) => {
    // Stop current scanner before changing camera
    if (scanning) {
      stopScanner();
    }
    setSelectedCamera(e.target.value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-96 max-w-full relative">
        <button 
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-lg font-semibold mb-3 text-center">Scan QR Code</h2>
        
        {/* Camera Selection */}
        {cameras.length > 1 && (
          <div className="mb-4">
            <label htmlFor="camera-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Camera
            </label>
            <select
              id="camera-select"
              value={selectedCamera || ''}
              onChange={handleCameraChange}
              className="w-full border border-gray-300 p-2 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 mb-3 text-sm">{error}</div>
        )}
        
        {!showManualEntry ? (
          <div className="relative">
            <div 
              ref={scannerContainerRef} 
              id="qr-reader"
              className="border border-gray-300 rounded-md overflow-hidden w-full mx-auto"
              style={{ height: "280px", position: "relative" }}
            ></div>
            
            <div className="text-sm text-gray-500 mt-2 text-center">
              Position QR code within the scanner area
            </div>
            
            {scanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-blue-500 opacity-50 rounded-md"></div>
                <div className="w-48 h-48 border-2 border-blue-500 rounded-md"></div>
              </div>
            )}
            
            {lastResult && (
              <div className="mt-2 bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-sm">
                Detected: {lastResult.substring(0, 30)}{lastResult.length > 30 ? '...' : ''}
              </div>
            )}
            
            <div className="mt-3 text-center">
              <button
                onClick={() => {
                  stopScanner();
                  setShowManualEntry(true);
                }}
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Enter QR code manually
              </button>
            </div>
          </div>
        ) : (
          <div className="py-2">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label htmlFor="manual-code" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter QR Code Value
                </label>
                <input
                  id="manual-code"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Type QR code value"
                  autoFocus
                />
              </div>
              <div className="flex justify-between">
                {cameras.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualEntry(false);
                    }}
                    className="text-blue-600 hover:text-blue-800 underline text-sm"
                  >
                    Back to scanner
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md ml-auto text-sm"
                  disabled={!manualCode.trim()}
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodeScanner; 