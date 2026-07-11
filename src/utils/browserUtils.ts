/// <reference lib="dom" />

export function logToLocalStorage(
  operation: string,
  request: unknown,
  response?: unknown,
  error?: unknown
): void {
  try {
    const logs = JSON.parse(localStorage.getItem('openai_api_logs') || '[]');
    logs.push({
      timestamp: new Date().toISOString(),
      operation,
      request,
      response: response || null,
      error: error ? String(error) : null
    });
    
    if (logs.length > 50) {
      logs.shift();
    }
    
    localStorage.setItem('openai_api_logs', JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to log to localStorage:', e);
  }
}

export function dispatchChunkProgressEvent(
  currentChunk: number,
  totalChunks: number
): void {
  try {
    const event = new CustomEvent("chunkProgress", {
      detail: { currentChunk, totalChunks },
    });
    window.dispatchEvent(event);
  } catch (e) {
    console.error('Failed to dispatch chunk progress event:', e);
  }
} 