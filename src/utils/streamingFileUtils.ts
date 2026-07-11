export async function* readFileInChunks(file: File, chunkSize: number = 1024 * 1024): AsyncGenerator<string> {
  let offset = 0;
  const fileReader = new FileReader();
  const decoder = new TextDecoder();
  
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    const buffer = await readChunkAsArrayBuffer(chunk, fileReader);
    yield decoder.decode(buffer, { stream: true });
    offset += chunkSize;
  }
}


function readChunkAsArrayBuffer(chunk: Blob, fileReader: FileReader): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    fileReader.onload = () => resolve(fileReader.result as ArrayBuffer);
    fileReader.onerror = reject;
    fileReader.readAsArrayBuffer(chunk);
  });
}


export async function processLargeFile<T>(
  file: File, 
  processor: (text: string, chunkIndex: number, totalChunks: number) => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  estimatedChunks: number = 1
): Promise<T[]> {
  const results: T[] = [];
  const chunks: string[] = [];

  for await (const chunk of readFileInChunks(file)) {
    chunks.push(chunk);
  }

  for (let i = 0; i < chunks.length; i++) {
    dispatchChunkProgress(i + 1, chunks.length);

    const result = await processor(chunks[i], i + 1, chunks.length);
    results.push(result);
  }
  
  return results;
}

function dispatchChunkProgress(currentChunk: number, totalChunks: number): void {
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    const event = new CustomEvent("chunkProgress", {
      detail: { currentChunk, totalChunks },
    });
    window.dispatchEvent(event);
  }
} 