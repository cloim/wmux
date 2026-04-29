import { useEffect } from 'react';
import { useStore } from '../stores';

export function useWindowFocusState() {
  useEffect(() => {
    const setFocused = (focused: boolean) => {
      useStore.getState().setWindowFocused(focused);
    };

    setFocused(document.hasFocus());

    const handleFocus = () => setFocused(true);
    const handleBlur = () => setFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
}
