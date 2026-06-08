// Pure helper: extract mentioned user ids from tiptap-rendered HTML.
// A mention is a <span class="mention" data-id="<userId>">…</span>.
export function extractMentionIds(html: string): string[] {
  const ids = new Set<string>();
  const tags = html.match(/<span\b[^>]*>/g) ?? [];
  for (const tag of tags) {
    if (!/mention/.test(tag)) continue;
    const m = tag.match(/data-id="([^"]+)"/);
    if (m) ids.add(m[1]);
  }
  return [...ids];
}
