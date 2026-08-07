import OpenAI from 'openai';

import { serverEnv } from '@/lib/env/server';

export const openai = new OpenAI({
  apiKey: serverEnv.OPENAI_API_KEY,
});
