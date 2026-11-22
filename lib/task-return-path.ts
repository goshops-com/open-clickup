/** Only canonical, same-app task paths are eligible as post-login destinations. */
export function taskReturnPath(value: string | null): string | null {
  if (!value) return null;
  const match = /^\/l\/([A-Za-z0-9_-]+)\?task=([A-Za-z0-9_-]+)$/.exec(value);
  return match ? `/l/${match[1]}?task=${match[2]}` : null;
}
