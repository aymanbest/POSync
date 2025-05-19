import React, { useEffect, useRef, useState } from 'react';

const ProductCamera = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [stream, setStream] = useState(null);

  // Get list of cameras on component mount
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          if (videoDevices.length > 0) {
            setCameras(videoDevices);
            
            // Default to the environment-facing camera if available
            const backCamera = videoDevices.find(
              camera => camera.label.toLowerCase().includes('back') || 
                      camera.label.toLowerCase().includes('environment')
            );
            
            if (backCamera) {
              setSelectedCamera(backCamera.deviceId);
            } else {
              setSelectedCamera(videoDevices[0].deviceId);
            }
          } else {
            setError('No cameras found on this device');
          }
        })
        .catch(err => {
          console.error('Error getting cameras', err);
          setError('Could not access camera list. Please grant camera permissions.');
        });
    } else {
      setError('Media devices not supported in this browser');
    }

    return () => {
      stopCamera();
    };
  }, []);

  // Start camera when camera is selected
  useEffect(() => {
    if (selectedCamera) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [selectedCamera]);

  const startCamera = async () => {
    try {
      if (stream) {
        stopCamera();
      }
      
      const constraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment"
        }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      setError(`Failed to start camera: ${err.message || 'Unknown error'}`);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to data URL
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Pass image data to parent component
    onCapture(imageData);
    
    // Stop camera
    stopCamera();
    
    // Close modal
    onClose();
  };

  const handleCameraChange = (e) => {
    setSelectedCamera(e.target.value);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-700 rounded-lg p-4 w-96 max-w-full relative">
        <button 
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-500 dark:text-dark-300 hover:text-gray-800 dark:hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-lg font-semibold mb-3 text-center text-dark-800 dark:text-white">Take Product Photo</h2>
        
        {/* Camera Selection */}
        {cameras.length > 1 && (
          <div className="mb-4">
            <label htmlFor="camera-select" className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
              Select Camera
            </label>
            <select
              id="camera-select"
              value={selectedCamera || ''}
              onChange={handleCameraChange}
              className="w-full border border-gray-300 dark:border-dark-500 p-2 text-sm rounded-md bg-white dark:bg-dark-600 text-dark-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {cameras.map((camera) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 dark:text-red-400 mb-3 text-sm">{error}</div>
        )}
        
        <div className="relative">
          <div className="border border-gray-300 dark:border-dark-500 rounded-md overflow-hidden w-full mx-auto bg-black">
            <video 
              ref={videoRef} 
              className="w-full h-64 object-cover"
              autoPlay 
              playsInline
            ></video>
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-dark-400 mt-2 text-center">
            Position product in the center of the frame
          </div>
        </div>
        
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleCapture}
            className="bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white px-4 py-2 rounded-full flex items-center justify-center w-16 h-16"
            disabled={!stream}
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCamera; 