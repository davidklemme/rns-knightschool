'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
const subscribe = () => () => {};
export function ReadAloud({text}: {text: string}) {
  const available = useSyncExternalStore(subscribe,
    () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window, () => false);
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, [text]);
  if (!available) return null;
  return <Button variant="outline" size="sm" aria-label="Read coaching aloud" onClick={() => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'en';
    speech.rate = 0.85;
    window.speechSynthesis.speak(speech);
  }}>Listen</Button>;
}
