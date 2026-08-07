'use client';

import { useEffect, useRef, useState } from 'react';

type QuestionSpeakerButtonProps = {
  sessionId: string;
  questionId: string;
};

export function QuestionSpeakerButton({
  sessionId,
  questionId,
}: QuestionSpeakerButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>(
    'idle',
  );

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setStatus('idle');
  }, [questionId]);

  async function play() {
    if (status === 'playing') {
      audioRef.current?.pause();
      setStatus('idle');
      return;
    }

    try {
      setStatus('loading');

      if (!audioRef.current) {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, questionId }),
        });

        if (!response.ok) {
          throw new Error('Question audio is unavailable.');
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;

        const audio = new Audio(objectUrl);
        audioRef.current = audio;
        audio.onended = () => setStatus('idle');
        audio.onerror = () => setStatus('error');
      }

      await audioRef.current.play();
      setStatus('playing');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }

  return (
    <button
      type="button"
      onClick={() => void play()}
      disabled={status === 'loading'}
      aria-label={status === 'playing' ? 'Pause question audio' : 'Play question audio'}
      className="rounded-full border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
    >
      {status === 'loading'
        ? 'Loading audio…'
        : status === 'playing'
          ? 'Pause audio'
          : status === 'error'
            ? 'Retry audio'
            : '▶ Hear question'}
    </button>
  );
}
