/**
 * useVoiceInput — Speech-to-text hook using @react-native-voice/voice
 * Requirements: 14.1, 14.2, 14.3, 14.5
 */
import { useState, useEffect, useCallback } from 'react';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';

// Maps platform language codes to BCP-47 locale strings for STT
const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  kn: 'kn-IN',
  mr: 'mr-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  ml: 'ml-IN',
};

export interface UseVoiceInputResult {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: (locale: string) => Promise<void>;
  stopListening: () => Promise<void>;
  resetTranscript: () => void;
}

export function useVoiceInput(): UseVoiceInputResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Requirement 14.1: convert speech to text; wire up Voice event handlers
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const result = e.value?.[0] ?? '';
      setTranscript(result);
      setIsListening(false);
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      // Requirement 14.5: on failure set error so UI can show retry prompt
      setError(e.error?.message ?? 'Voice recognition failed');
      setIsListening(false);
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
    };

    return () => {
      // Clean up on unmount
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Requirement 14.1: start recognition with the given locale (e.g. 'en-US')
  const startListening = useCallback(async (locale: string) => {
    setError(null);
    setTranscript('');
    try {
      // Accept either a short code ('en') or a full locale ('en-US')
      const bcp47 = LOCALE_MAP[locale] ?? locale;
      setIsListening(true);
      await Voice.start(bcp47);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start voice recognition';
      setError(message);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } finally {
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return { isListening, transcript, error, startListening, stopListening, resetTranscript };
}
