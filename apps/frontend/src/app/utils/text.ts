export function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function getWordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function getCharCount(text: string): number {
  return text.length;
}



export function isValidText(text: string): boolean {
  return text.trim().length > 0;
} 