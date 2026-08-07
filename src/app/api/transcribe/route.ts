import { NextResponse } from 'next/server';
import { z } from 'zod';

import { openai } from '@/lib/ai/openai';
import { getSessionPlayerState } from '@/modules/session/repository';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const sessionIdSchema = z.string().uuid();

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const sessionId = sessionIdSchema.safeParse(formData.get('sessionId'));

  if (!(file instanceof File) || !sessionId.success) {
    return NextResponse.json({ error: 'Invalid audio upload.' }, { status: 400 });
  }

  if (file.size === 0 || file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: 'Audio file is empty or too large.' },
      { status: 400 },
    );
  }

  if (!file.type.startsWith('audio/') && file.type !== 'video/webm') {
    return NextResponse.json({ error: 'Unsupported audio type.' }, { status: 415 });
  }

  const session = await getSessionPlayerState(sessionId.data);
  if (!session || session.session.status !== 'in_progress') {
    return NextResponse.json({ error: 'Session is not active.' }, { status: 404 });
  }

  try {
    const transcript = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'text',
    });

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Transcription failed', error);
    return NextResponse.json({ error: 'Transcription failed.' }, { status: 502 });
  }
}
