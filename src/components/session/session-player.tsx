'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { QuestionSpeakerButton } from '@/components/session/question-speaker-button';
import {
  continueSessionAction,
  submitResponseAction,
} from '@/modules/session/response-actions';

type StoredFeedback = {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextStep: string | null;
};

type SessionPlayerProps = {
  sessionId: string;
  practiceTitle: string;
  scenario: string;
  question: {
    id: string;
    prompt: string;
    position: number;
  };
  questionCount: number;
  initialAttempt?: {
    transcript: string;
    feedback: StoredFeedback;
  } | null;
};

type PlayerPhase =
  | 'ready'
  | 'recording'
  | 'transcribing'
  | 'evaluating'
  | 'feedback'
  | 'continuing'
  | 'error';

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}

export function SessionPlayer({
  sessionId,
  practiceTitle,
  scenario,
  question,
  questionCount,
  initialAttempt,
}: SessionPlayerProps) {
  const router = useRouter();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<PlayerPhase>(
    initialAttempt ? 'feedback' : 'ready',
  );
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState(initialAttempt?.transcript ?? '');
  const [feedback, setFeedback] = useState<StoredFeedback | null>(
    initialAttempt?.feedback ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecordingSeconds(0);
  }

  function cleanupStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function processRecording(blob: Blob) {
    try {
      setPhase('transcribing');
      const formData = new FormData();
      const extension = blob.type.includes('mp4') ? 'm4a' : 'webm';
      formData.append('file', blob, `answer.${extension}`);
      formData.append('sessionId', sessionId);

      const transcriptionResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const transcriptionBody = (await transcriptionResponse.json()) as {
        transcript?: string;
        error?: string;
      };

      if (!transcriptionResponse.ok || !transcriptionBody.transcript?.trim()) {
        throw new Error(
          transcriptionBody.error ?? 'We could not transcribe that answer.',
        );
      }

      const nextTranscript = transcriptionBody.transcript.trim();
      setTranscript(nextTranscript);
      setPhase('evaluating');

      const result = await submitResponseAction({
        sessionId,
        questionId: question.id,
        transcript: nextTranscript,
      });

      setFeedback({
        score: result.evaluation.score,
        summary: result.evaluation.summary,
        strengths: result.evaluation.strengths,
        improvements: result.evaluation.improvements,
        nextStep: result.evaluation.nextStep,
      });
      setPhase('feedback');
    } catch (caught) {
      console.error(caught);
      setError(
        caught instanceof Error
          ? caught.message
          : 'Something went wrong while processing your answer.',
      );
      setPhase('error');
    }
  }

  async function startRecording() {
    try {
      setError(null);
      setTranscript('');
      setFeedback(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const preferredType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : undefined;

      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        cleanupStream();
        resetTimer();
        setError('Recording failed. Please check your microphone and try again.');
        setPhase('error');
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        cleanupStream();
        resetTimer();

        if (blob.size === 0) {
          setError('No audio was captured. Please try again.');
          setPhase('error');
          return;
        }

        void processRecording(blob);
      };

      recorder.start(250);
      setPhase('recording');
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((current) => current + 1);
      }, 1000);
    } catch (caught) {
      console.error(caught);
      cleanupStream();
      resetTimer();
      setError(
        'Microphone access is required for this practice. Allow access and try again.',
      );
      setPhase('error');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }

  function retry() {
    setTranscript('');
    setFeedback(null);
    setError(null);
    setPhase('ready');
  }

  async function continuePractice() {
    try {
      setError(null);
      setPhase('continuing');
      await continueSessionAction({
        sessionId,
        completedQuestionId: question.id,
      });
      router.refresh();
    } catch (caught) {
      console.error(caught);
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not continue the practice.',
      );
      setPhase('error');
    }
  }

  const isBusy = ['transcribing', 'evaluating', 'continuing'].includes(phase);

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_420px]">
      <main className="flex min-h-[65vh] flex-col px-6 py-8 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between gap-4 border-b pb-5">
          <div>
            <p className="text-sm text-[var(--muted)]">{practiceTitle}</p>
            <p className="mt-1 text-sm font-medium">
              Question {question.position + 1} of {questionCount}
            </p>
          </div>
          <div className="text-sm text-[var(--muted)]">
            {Math.round(((question.position + 1) / questionCount) * 100)}%
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-3xl space-y-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                  Your prompt
                </p>
                <QuestionSpeakerButton
                  sessionId={sessionId}
                  questionId={question.id}
                />
              </div>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                {question.prompt}
              </h1>
            </div>

            <div className="rounded-2xl bg-[var(--surface)] p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Scenario
              </p>
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                {scenario}
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 rounded-2xl border p-8 text-center">
              {phase === 'recording' ? (
                <>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 text-lg font-semibold">
                    {formatSeconds(recordingSeconds)}
                  </div>
                  <div>
                    <p className="font-medium">Recording your answer</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Speak naturally. You can retry after you see the feedback.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="rounded-xl bg-[var(--accent)] px-6 py-3 font-medium text-[var(--accent-foreground)]"
                  >
                    Stop answer
                  </button>
                </>
              ) : isBusy ? (
                <div className="py-6">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <p className="mt-4 font-medium">
                    {phase === 'transcribing'
                      ? 'Transcribing your answer…'
                      : phase === 'evaluating'
                        ? 'Evaluating against the rubric…'
                        : 'Moving to the next question…'}
                  </p>
                </div>
              ) : phase === 'feedback' ? (
                <div className="w-full text-left">
                  <p className="text-center text-sm text-[var(--muted)]">
                    Answer submitted
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent)] text-3xl text-[var(--accent-foreground)]">
                    🎙
                  </div>
                  <div>
                    <p className="font-medium">Ready when you are</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Your browser will ask for microphone permission.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void startRecording()}
                    className="rounded-xl bg-[var(--accent)] px-6 py-3 font-medium text-[var(--accent-foreground)]"
                  >
                    Start answer
                  </button>
                </>
              )}
            </div>

            {error ? (
              <div className="rounded-xl border p-4 text-sm">
                <p className="font-medium">We hit a problem</p>
                <p className="mt-1 text-[var(--muted)]">{error}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-3 rounded-lg border px-3 py-2 font-medium"
                >
                  Try again
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <aside className="border-t bg-[var(--surface)] px-6 py-8 lg:border-l lg:border-t-0 lg:px-8">
        {feedback ? (
          <div className="space-y-7">
            <div>
              <p className="text-sm font-medium text-[var(--muted)]">
                Practice feedback
              </p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl font-semibold tracking-tight">
                  {feedback.score}
                </span>
                <span className="pb-1 text-[var(--muted)]">/ 100</span>
              </div>
            </div>

            <div>
              <h2 className="font-semibold">Summary</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {feedback.summary}
              </p>
            </div>

            {transcript ? (
              <details className="rounded-xl border bg-[var(--background)] p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Your transcript
                </summary>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {transcript}
                </p>
              </details>
            ) : null}

            <div>
              <h2 className="font-semibold">What you did well</h2>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--muted)]">
                {feedback.strengths.map((strength) => (
                  <li key={strength}>✓ {strength}</li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-semibold">Improve</h2>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--muted)]">
                {feedback.improvements.map((improvement) => (
                  <li key={improvement}>→ {improvement}</li>
                ))}
              </ul>
            </div>

            {feedback.nextStep ? (
              <div className="rounded-xl border bg-[var(--background)] p-4">
                <p className="text-sm font-medium">Next step</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  {feedback.nextStep}
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={retry}
                className="rounded-xl border px-4 py-3 text-sm font-medium"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => void continuePractice()}
                className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[var(--accent-foreground)]"
              >
                {question.position === questionCount - 1
                  ? 'Finish'
                  : 'Continue'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">Feedback appears here</p>
            <p className="text-sm leading-6 text-[var(--muted)]">
              After you answer, InterviewGrade evaluates only what you said against
              the rubric configured for this practice.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
