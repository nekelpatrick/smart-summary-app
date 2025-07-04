export function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function getWordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function getCharCount(text: string): number {
  return text.length;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

export function isValidText(text: string): boolean {
  return text.trim().length > 0;
} 