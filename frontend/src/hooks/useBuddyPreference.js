import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'autiassist_buddy_animation_enabled';
const CHANGE_EVENT = 'autiassist-buddy-preference-change';

function readPreference() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch (error) {
    console.warn('Buddy animation preference could not be read.', error);
    return true;
  }
}

export default function useBuddyPreference() {
  const [enabled, setEnabled] = useState(() => (
    typeof window === 'undefined' ? true : readPreference()
  ));

  useEffect(() => {
    const updatePreference = () => setEnabled(readPreference());
    window.addEventListener('storage', updatePreference);
    window.addEventListener(CHANGE_EVENT, updatePreference);
    return () => {
      window.removeEventListener('storage', updatePreference);
      window.removeEventListener(CHANGE_EVENT, updatePreference);
    };
  }, []);

  const saveEnabled = useCallback((nextEnabled) => {
    setEnabled(nextEnabled);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(nextEnabled));
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch (error) {
      console.error('Buddy animation preference could not be saved.', error);
    }
  }, []);

  return [enabled, saveEnabled];
}
