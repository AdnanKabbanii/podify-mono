export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

export function downloadTextAsFile(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function estimateTokenCount(text: string): number {
  const whitespaceCount = (text.match(/\s/g) || []).length;
  const numberCount = (text.match(/\d+/g) || []).join("").length;
  const specialCharCount = (text.match(/[^\w\s]/g) || []).length;
  const wordCount = (text.match(/\w+/g) || []).length;
  const charCount = text.length - whitespaceCount;

  const estimatedTokens = Math.ceil(
    wordCount * 1.3 + specialCharCount * 0.8 + numberCount * 0.6 + whitespaceCount * 0.5,
  );

  const simpleEstimate = Math.ceil(charCount / 4);

  return Math.max(estimatedTokens, simpleEstimate);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function isFileTooLarge(file: File, maxSizeMB: number = 50): boolean {
  return file.size > maxSizeMB * 1024 * 1024;
}

export function estimateProcessingTime(tokenCount: number): string {
  const seconds = Math.ceil(tokenCount / 1000);

  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    return `${Math.ceil(seconds / 60)} minutes`;
  } else {
    return `${Math.ceil(seconds / 3600)} hours and ${Math.ceil((seconds % 3600) / 60)} minutes`;
  }
}

export async function blobToBuffer(blob: Blob): Promise<Buffer> {
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function arrayBufferToBlob(buffer: ArrayBuffer, mimeType: string = "audio/mpeg"): Blob {
  return new Blob([buffer], { type: mimeType });
}

export async function saveBlobToFile(
  blob: Blob,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  filePath: string,
): Promise<void> {
  await blobToBuffer(blob);
}

export function createAudioFilename(podcastId: string, speakerId: string, index: number): string {
  return `podcast_${podcastId}_${speakerId.replace(/\s+/g, "_")}_segment_${index}.mp3`;
}

export function getPodcastMediaPath(podcastId: string): string {
  return `media/podcasts/${podcastId}`;
}

export function getPodcastMediaFilePath(podcastId: string, filename: string): string {
  return `${getPodcastMediaPath(podcastId)}/${filename}`;
}
