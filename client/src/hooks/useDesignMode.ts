import { useState, useEffect } from 'react';

type DesignMode = 'basic' | 'professional';

export function useDesignMode() {
  const [mode, setMode] = useState<DesignMode>(() => {
    const saved = localStorage.getItem('snapbag-design-mode');
    return (saved as DesignMode) || 'professional';
  });

  useEffect(() => {
    localStorage.setItem('snapbag-design-mode', mode);
    
    // Apply the class to the body for global styling
    document.body.classList.remove('snapbag-basic', 'snapbag-professional');
    document.body.classList.add(`snapbag-${mode}`);
  }, [mode]);

  const toggleMode = () => {
    setMode(current => current === 'basic' ? 'professional' : 'basic');
  };

  const isProfessional = mode === 'professional';

  return {
    mode,
    setMode,
    toggleMode,
    isProfessional,
    // Helper functions for styling
    cardClass: isProfessional ? 'pro-card' : '',
    buttonClass: isProfessional ? 'pro-button' : '',
    gradientClass: isProfessional ? 'snapbag-gradient-pro' : 'snapbag-gradient'
  };
}