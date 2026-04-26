'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LiteModeContextType {
  isLiteMode: boolean;
  toggleLiteMode: () => void;
  setLiteMode: (enabled: boolean) => void;
}

const LiteModeContext = createContext<LiteModeContextType | undefined>(undefined);

export function LiteModeProvider({ children }: { children: ReactNode }) {
  const [isLiteMode, setIsLiteMode] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chamaconnect-lite-mode');
      if (saved !== null) {
        setIsLiteMode(JSON.parse(saved));
      }
      
      // Auto-enable lite mode for slow connections
      const connection = (navigator as any).connection;
      if (connection) {
        const isSlowConnection = connection.effectiveType === 'slow-2g' || 
                                connection.effectiveType === '2g' ||
                                connection.saveData;
        if (isSlowConnection) {
          setIsLiteMode(true);
        }
      }
    }
  }, []);

  // Save preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chamaconnect-lite-mode', JSON.stringify(isLiteMode));
      
      // Add CSS class to body for styling
      if (isLiteMode) {
        document.body.classList.add('lite-mode');
      } else {
        document.body.classList.remove('lite-mode');
      }
    }
  }, [isLiteMode]);

  const toggleLiteMode = () => {
    setIsLiteMode(prev => !prev);
  };

  const setLiteMode = (enabled: boolean) => {
    setIsLiteMode(enabled);
  };

  return (
    <LiteModeContext.Provider value={{
      isLiteMode,
      toggleLiteMode,
      setLiteMode
    }}>
      {children}
    </LiteModeContext.Provider>
  );
}

export function useLiteMode() {
  const context = useContext(LiteModeContext);
  if (context === undefined) {
    throw new Error('useLiteMode must be used within a LiteModeProvider');
  }
  return context;
}
