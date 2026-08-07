import { NextResponse } from 'next/server';
import { z } from 'zod';

import { openai } from '@/lib/ai/openai';
import { serverEnv } from '@/lib/env/server';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { getSessionPlayerState } from '@/modules/session/repository';

export const runtime = 'nodejs';
export const maxDuration = 30;

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid speech request.' }, { status: 400 });
  }

  const state = await getSessionPlayerState(parsed.data.sessionId);
  if (!state) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  const question = state.questions.find(
    (candidate) => candidate.id === parsed.data.questionId,
  );

  if (!question) {
    return NextResponse.json(
      { error: 'Question does not belong to this session.' },
      { status: 400 },
    );
  }

  const rateLimit = await consumeRateLimit({
    scope: `tts:${parsed.data.sessionId}`,
    limit: 40,
    windowSeconds: 60 * 60,
    userId: state.session.participantUserId,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Question audio limit reached. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  try {
    const speech = await openai.audio.speech.create({
      model: serverEnv.OPENAI_TTS_MODEL,
      voice: serverEnv.OPENAI_TTS_VOICE,
      input: question.prompt,
      response_format: 'mp3',
    });

    const audio = await speech.arrayBuffer();

    return new Response(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Text-to-speech failed', error);
    return NextResponse.json(
      { error: 'Question audio is temporarily unavailable.' },
      { status: 502 },
    );
  }
}
