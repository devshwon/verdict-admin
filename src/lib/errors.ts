export function errorMessage(e: unknown): string {
  if (e == null) return '알 수 없는 오류';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  if (typeof e === 'object') {
    const obj = e as Record<string, unknown>;
    for (const key of ['message', 'error_description', 'msg', 'hint', 'details']) {
      const v = obj[key];
      if (typeof v === 'string' && v.length > 0) return v;
    }
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}
