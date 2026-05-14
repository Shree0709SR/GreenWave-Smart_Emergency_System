import { useState, useRef, useCallback } from 'react';

/**
 * useVoiceAssistant — Web Speech API hook for the SETCS Driver Dashboard
 * Provides speech-to-text (dictation) and text-to-speech (readback)
 */
export default function useVoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  // Initialize SpeechRecognition
  const getRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Indian English
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;
    return recognition;
  }, []);

  /**
   * Start listening — returns a Promise that resolves with the final transcript
   */
  const startListening = useCallback(() => {
    return new Promise((resolve, reject) => {
      const recognition = getRecognition();
      if (!recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      let finalTranscript = '';

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript.trim() || interim);
      };

      recognition.onend = () => {
        setIsListening(false);
        const result = finalTranscript.trim();
        setTranscript(result);
        resolve(result);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'no-speech') {
          resolve('');
        } else {
          reject(event.error);
        }
      };

      try {
        setTranscript('');
        recognition.start();
      } catch (e) {
        // Already started
        reject(e);
      }
    });
  }, [getRecognition]);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop();
    }
  }, []);

  /**
   * Speak text aloud using SpeechSynthesis
   */
  const speak = useCallback((text, options = {}) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang || 'en-IN';
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      // Try to pick a good voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(); };

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  /**
   * Stop speaking
   */
  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    isSpeaking,
    supported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    setTranscript,
  };
}
