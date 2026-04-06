/**
 * VoiceInputButton — reusable microphone button with STT integration
 * Requirements: 14.1, 14.2, 14.3, 14.5
 */
import React, { useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useVoiceInput } from '../hooks/useVoiceInput';

export interface VoiceInputButtonProps {
  /** Called with the recognised transcript once STT completes */
  onTranscript: (text: string) => void;
  /** BCP-47 locale or short code ('en', 'hi', 'kn', 'mr', 'te', 'ta', 'ml') */
  language: string;
  disabled?: boolean;
}

export function VoiceInputButton({
  onTranscript,
  language,
  disabled = false,
}: VoiceInputButtonProps): React.ReactElement {
  const { isListening, transcript, error, startListening, stopListening, resetTranscript } =
    useVoiceInput();

  // Forward transcript to parent as soon as it is ready
  useEffect(() => {
    if (transcript) {
      onTranscript(transcript);
      resetTranscript();
    }
  }, [transcript, onTranscript, resetTranscript]);

  const handlePress = async () => {
    if (error) {
      // Retry after a previous failure
      resetTranscript();
      await startListening(language);
    } else if (isListening) {
      await stopListening();
    } else {
      await startListening(language);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          isListening && styles.buttonListening,
          disabled && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        disabled={disabled}
        accessibilityLabel={isListening ? 'Stop listening' : 'Start voice input'}
        accessibilityRole="button"
      >
        {isListening ? (
          // Animated indicator while listening
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          // Microphone icon (unicode fallback — replace with an icon library if available)
          <Text style={styles.micIcon}>🎤</Text>
        )}
      </TouchableOpacity>

      {/* Requirement 14.5: show retry prompt on STT failure */}
      {error ? (
        <TouchableOpacity onPress={handlePress} style={styles.retryContainer}>
          <Text style={styles.retryText}>Voice recognition failed. Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonListening: {
    backgroundColor: '#F44336',
  },
  buttonDisabled: {
    backgroundColor: '#9E9E9E',
    elevation: 0,
  },
  micIcon: {
    fontSize: 24,
  },
  retryContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF3E0',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  retryText: {
    color: '#E65100',
    fontSize: 13,
    textAlign: 'center',
  },
});
