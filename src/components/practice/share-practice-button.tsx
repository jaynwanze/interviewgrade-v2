'use client';

import { useState } from 'react';

export function SharePracticeButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/p/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="rounded-lg border px-4 py-2 text-sm font-medium"
    >
      {copied ? 'Copied ✓' : 'Copy share link'}
    </button>
  );
}
