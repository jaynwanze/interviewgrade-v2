'use client';

import { useState } from 'react';

export function EmbedPracticeButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const src = `${window.location.origin}/embed/${slug}`;
    const snippet = `<iframe src="${src}" title="InterviewGrade practice" allow="microphone" style="width:100%;min-height:720px;border:0;border-radius:16px;" loading="lazy"></iframe>`;

    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="rounded-lg border px-4 py-2 text-sm font-medium"
    >
      {copied ? 'Embed copied ✓' : 'Copy embed code'}
    </button>
  );
}
