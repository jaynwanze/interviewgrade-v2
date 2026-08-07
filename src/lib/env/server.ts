import { z } from 'zod';

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_EVALUATION_MODEL: z.string().min(1).default('gpt-5.6-luna'),
  OPENAI_GENERATION_MODEL: z.string().min(1).default('gpt-5.6-luna'),
  OPENAI_TRANSCRIPTION_MODEL: z
    .string()
    .min(1)
    .default('gpt-4o-mini-transcribe'),
  OPENAI_TTS_MODEL: z.string().min(1).default('tts-1'),
  OPENAI_TTS_VOICE: z
    .enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
    .default('alloy'),
});

export const serverEnv = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_EVALUATION_MODEL: process.env.OPENAI_EVALUATION_MODEL,
  OPENAI_GENERATION_MODEL: process.env.OPENAI_GENERATION_MODEL,
  OPENAI_TRANSCRIPTION_MODEL: process.env.OPENAI_TRANSCRIPTION_MODEL,
  OPENAI_TTS_MODEL: process.env.OPENAI_TTS_MODEL,
  OPENAI_TTS_VOICE: process.env.OPENAI_TTS_VOICE,
});
