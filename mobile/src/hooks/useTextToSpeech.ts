/**
 * useTextToSpeech — TTS hook using expo-speech
 * Requirements: 14.4
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import * as Speech from 'expo-speech';

// Maps platform language codes to BCP-47 locale strings for TTS
const TTS_LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  kn: 'kn-IN',
  mr: 'mr-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  ml: 'ml-IN',
};

export interface UseTextToSpeechResult {
  speak: (text: string, language: string) => void;
  stop: () => void;
  isSpeaking: boolean;
}

export function useTextToSpeech(): UseTextToSpeechResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Track whether the component is still mounted to avoid state updates after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      Speech.stop();
    };
  }, []);

  // Requirement 14.4: convert system responses to speech
  const speak = useCallback((text: string, language: string) => {
    const locale = TTS_LOCALE_MAP[language] ?? language;

    // Stop any ongoing speech before starting new one
    Speech.stop();

    setIsSpeaking(true);
    Speech.speak(text, {
      language: locale,
      onDone: () => {
        if (mountedRef.current) setIsSpeaking(false);
      },
      onError: () => {
        if (mountedRef.current) setIsSpeaking(false);
      },
      onStopped: () => {
        if (mountedRef.current) setIsSpeaking(false);
      },
    });
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
}
