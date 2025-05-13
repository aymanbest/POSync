import React, { useState, useEffect } from 'react';
import { IconX, IconMinus, IconSquare, IconSquareLetterX } from '@tabler/icons-react';

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [appTitle, setAppTitle] = useState('Electron POS');

  // Handle window control actions
  const handleMinimize = () => {
    window.api.window.minimize();
  };

  const handleMaximize = () => {
    window.api.window.maximize();
    setIsMaximized(prev => !prev);
  };

  const handleClose = () => {
    window.api.window.close();
  };

  return (
    <div className="app-drag-region flex h-10 bg-dark-800 text-white items-center justify-between select-none">
      {/* App icon and title */}
      <div className="flex items-center pl-3">
        <div className="w-5 h-5 bg-primary-500 rounded mr-2 flex items-center justify-center text-white">
          <IconSquareLetterX size={14} />
        </div>
        <span className="text-sm font-semibold tracking-wide">{appTitle}</span>
      </div>

      {/* Window controls */}
      <div className="flex app-no-drag">
        <button 
          onClick={handleMinimize}
          className="w-10 h-10 flex items-center justify-center hover:bg-dark-700 transition-colors duration-150 focus:outline-none"
          aria-label="Minimize"
        >
          <IconMinus size={16} stroke={1.5} />
        </button>
        <button 
          onClick={handleMaximize}
          className="w-10 h-10 flex items-center justify-center hover:bg-dark-700 transition-colors duration-150 focus:outline-none"
          aria-label="Maximize"
        >
          <IconSquare size={16} stroke={1.5} />
        </button>
        <button 
          onClick={handleClose}
          className="w-10 h-10 flex items-center justify-center hover:bg-red-600 transition-colors duration-150 focus:outline-none"
          aria-label="Close"
        >
          <IconX size={16} stroke={1.5} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar; 