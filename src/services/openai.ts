import OpenAI from "openai";
import { dispatchChunkProgressEvent, logToLocalStorage } from "../utils/browserUtils.js";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const SYSTEM_PROMPT = `You are an AI assistant specialized in transforming text transcripts/articles into engaging podcast conversations. Your task is to:

1. Analyze the input transcript
2. Convert monologues into natural dialogues between 2-3 speakers
3. Maintain the original content and meaning while making it more conversational
4. Add natural transitions and brief interactions between speakers
5. Keep the tone professional but engaging
6. Format the output as a clean transcript with clear speaker labels as host and guest names

Example format:
Host: [conversational text]
Anna(any random name): [response or new point]
Host: [follow-up question or transition]
`;

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function chunkText(text: string, maxChunkTokens: number = 25000, overlapTokens: number = 1000): string[] {
  const chunks: string[] = [];
  const estimatedTokens = estimateTokenCount(text);
  if (estimatedTokens <= maxChunkTokens) {
    return [text];
  }
  const effectiveMaxChunkTokens = maxChunkTokens - overlapTokens;
  
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = "";
  let currentChunkTokens = 0;
  let previousChunkEnd = ""; // Store the end of the previous chunk for overlap
  
  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokenCount(paragraph);
    
    if (paragraphTokens > effectiveMaxChunkTokens) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokenCount(sentence);
        
        if (currentChunkTokens + sentenceTokens > effectiveMaxChunkTokens) {
          if (currentChunk) {
            chunks.push(currentChunk);

            const words = currentChunk.split(/\s+/);
            previousChunkEnd = words.slice(Math.max(0, words.length - 30)).join(" ");
          }
          
          if (sentenceTokens > effectiveMaxChunkTokens) {
            const words = sentence.split(" ");
            let part = previousChunkEnd;
            let partTokens = estimateTokenCount(previousChunkEnd);
            
            for (const word of words) {
              const wordTokens = estimateTokenCount(word + " ");
              
              if (partTokens + wordTokens > effectiveMaxChunkTokens) {
                chunks.push(part);

                const partWords = part.split(/\s+/);
                previousChunkEnd = partWords.slice(Math.max(0, partWords.length - 30)).join(" ");
                
                part = previousChunkEnd + word + " ";
                partTokens = estimateTokenCount(part);
              } else {
                part += word + " ";
                partTokens += wordTokens;
              }
            }
            
            if (part) {
              currentChunk = part;
              currentChunkTokens = partTokens;
            } else {
              currentChunk = "";
              currentChunkTokens = 0;
            }
          } else {
            currentChunk = previousChunkEnd + sentence;
            currentChunkTokens = estimateTokenCount(currentChunk);
          }
        } else {
          if (currentChunk) {
            currentChunk += " " + sentence;
          } else {
            currentChunk = previousChunkEnd + sentence;
          }
          currentChunkTokens += sentenceTokens;
        }
      }
    } else if (currentChunkTokens + paragraphTokens > effectiveMaxChunkTokens) {
      chunks.push(currentChunk);
      const words = currentChunk.split(/\s+/);
      previousChunkEnd = words.slice(Math.max(0, words.length - 30)).join(" ");
      
      currentChunk = previousChunkEnd + paragraph;
      currentChunkTokens = estimateTokenCount(currentChunk);
    } else {
      if (currentChunk) {
        currentChunk += "\n\n" + paragraph;
      } else {
        currentChunk = previousChunkEnd + paragraph;
      }
      currentChunkTokens += paragraphTokens;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
function logApiCall(operation: string, request: unknown, response?: unknown, error?: unknown) {
  console.group(`OpenAI API Call: ${operation}`);
  console.log('Request:', JSON.stringify(request, null, 2));
  if (response) {
    console.log('Response:', JSON.stringify(response, null, 2));
  }
  if (error) {
    console.error('Error:', error);
  }
  console.groupEnd();
  try {
    logToLocalStorage(operation, request, response, error);
  } catch (e) {
    console.error('Error logging to localStorage:', e);
  }
}

async function processChunk(
  chunk: string,
  isFirstChunk: boolean,
  isLastChunk: boolean,
  chunkIndex: number,
  totalChunks: number,
  customPrompt?: string
): Promise<string> {
  let contextPrompt = customPrompt || SYSTEM_PROMPT;

  if (!isFirstChunk) {
    contextPrompt += `\n\nThis is chunk ${chunkIndex} of ${totalChunks} from a longer transcript. Maintain consistency with speaker voices and conversation flow. Don't introduce new speakers unless necessary.`;
  }

  if (!isLastChunk) {
    contextPrompt += `\n\nThis is not the end of the transcript. End your response in a way that can smoothly continue in the next part.`;
  }

  const maxRetries = 3;
  let retryCount = 0;
  let delay = 1000;

  const requestPayload = {
    model: "gpt-4o-2024-11-20",
    messages: [
      { role: "system" as const, content: contextPrompt },
      { role: "user" as const, content: chunk },
    ],
    temperature: 0.7,
    max_tokens: 16000,
  };

  while (retryCount <= maxRetries) {
    try {
      logApiCall(`processChunk ${chunkIndex}/${totalChunks}`, requestPayload);
      
      const completion = await openai.chat.completions.create(requestPayload);
      
      logApiCall(`processChunk ${chunkIndex}/${totalChunks}`, requestPayload, completion);
      
      return completion.choices[0].message.content || "";
    } catch (error: unknown) {
      logApiCall(`processChunk ${chunkIndex}/${totalChunks}`, requestPayload, null, error);
      
      retryCount++;
      if (retryCount > maxRetries) {
        console.error(
          `Failed to process chunk ${chunkIndex} after ${maxRetries} retries:`,
          error,
        );
        throw error;
      }
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 429
      ) {
        console.warn(
          `Rate limit hit for chunk ${chunkIndex}, retrying after ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw error;
      }
    }
  }

  throw new Error(
    `Failed to process chunk ${chunkIndex} after ${maxRetries} retries`,
  );
}

function dispatchChunkProgress(currentChunk: number, totalChunks: number) {
  try {
    dispatchChunkProgressEvent(currentChunk, totalChunks);
  } catch (e) {
    console.error('Error dispatching chunk progress event:', e);
  }
}

export async function processTranscript(text: string): Promise<string> {
  try {
    const chunks = chunkText(text, 25000, 1000);
    const processedChunks: string[] = [];
    let conversationContext = "";

    for (let i = 0; i < chunks.length; i++) {
      const isFirstChunk = i === 0;
      const isLastChunk = i === chunks.length - 1;
      dispatchChunkProgress(i + 1, chunks.length);
      console.log(`Processing chunk ${i + 1} of ${chunks.length}...`);
      
      let speakerContext = "";
      if (!isFirstChunk && processedChunks.length > 0) {
        const allPreviousContent = processedChunks.join("\n\n");
        const speakerMatches = allPreviousContent.match(/([A-Za-z0-9_]+):\s[^:]+/g);
        
        if (speakerMatches && speakerMatches.length > 0) {
          const speakers = new Set(speakerMatches.map(match => match.split(':')[0]));
          const lastExchanges = speakerMatches.slice(-5);
          
          speakerContext = "Previous conversation context and speakers:\n" + 
                          `Active speakers: ${Array.from(speakers).join(', ')}\n\n` +
                          "Recent exchanges:\n" +
                          lastExchanges.join("\n") + "\n\n";
        }
        
        conversationContext = `This is part ${i + 1} of a ${chunks.length}-part conversation.\n` +
                            `Previous parts established: ${summarizeContext(allPreviousContent)}\n\n`;
      }

      let enhancedPrompt = SYSTEM_PROMPT;
      if (speakerContext || conversationContext) {
        enhancedPrompt += `\n\n${conversationContext}${speakerContext}` +
                         "Please maintain consistency with these speakers and conversation style.\n" +
                         "Ensure smooth transitions between chunks and natural conversation flow.";
      }

      const processedChunk = await processChunk(
        chunks[i],
        isFirstChunk,
        isLastChunk,
        i + 1,
        chunks.length,
        enhancedPrompt
      );

      processedChunks.push(processedChunk);
      
      if (!isLastChunk) {
        const chunkSummary = summarizeContext(processedChunk);
        conversationContext = `Previous chunks established: ${chunkSummary}\n`;
      }
    }
    
    return processedChunks.join("\n\n");
  } catch (error) {
    console.error("Error processing transcript:", error);
    throw new Error(
      "Failed to process transcript: " +
        (error instanceof Error ? error.message : String(error))
    );
  }
}

function summarizeContext(text: string): string {
  const topics = new Set<string>();
  const speakers = new Set<string>();

  const speakerMatches = text.match(/([A-Za-z0-9_]+):/g);
  if (speakerMatches) {
    speakerMatches.forEach(match => speakers.add(match.replace(':', '')));
  }
  
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    const keyPoints = sentences
      .slice(-3)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 150);
    
    keyPoints.forEach(point => topics.add(point));
  }
  
  return `Speakers (${Array.from(speakers).join(', ')}) discussed: ${Array.from(topics).slice(0, 2).join('. ')}`;
}

export async function getEditingSuggestions(
  text: string,
  prompt?: string,
): Promise<string> {
  const systemPrompt = `You are an AI assistant specialized in improving podcast transcripts. Your task is to analyze the provided transcript and suggest improvements for better flow, clarity, and engagement. Focus on:

1. Natural conversation flow
2. Removing filler words and repetitions
3. Improving transitions between speakers
4. Enhancing clarity while maintaining the original meaning
5. Making the content more engaging for listeners

Provide specific, actionable suggestions that the user can implement.`;

  const requestPayload = {
    model: "gpt-4o-2024-11-20",
    messages: [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      {
        role: "user" as const,
        content: prompt
          ? `${prompt}\n\nHere's the transcript:\n\n${text}`
          : `Please analyze this podcast transcript and suggest improvements:\n\n${text}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  };

  try {
    logApiCall('getEditingSuggestions', requestPayload);
    
    const completion = await openai.chat.completions.create(requestPayload);
    
    logApiCall('getEditingSuggestions', requestPayload, completion);
    
    return completion.choices[0].message.content || "";
  } catch (error) {
    logApiCall('getEditingSuggestions', requestPayload, null, error);
    console.error("Error getting editing suggestions:", error);
    throw new Error(
      "Failed to get editing suggestions: " +
        (error instanceof Error ? error.message : String(error)),
    );
  }
}

export async function improveTranscriptFlow(content: string): Promise<string> {
  const systemPrompt = `You are an AI assistant specialized in improving podcast transcripts. Your task is to enhance the provided transcript by:

1. Improving the flow between speakers
2. Adding natural transitions
3. Removing repetitive phrases and filler words
4. Maintaining the original content and meaning
5. Preserving the speaker labels and conversation structure

Make the transcript more polished and professional while keeping its authentic conversational style.`;

  const requestPayload = {
    model: "gpt-4o-2024-11-20",
    messages: [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      {
        role: "user" as const,
        content: `Please improve the flow of this podcast transcript while maintaining its content and meaning:\n\n${content}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 16000,
  };

  try {
    logApiCall('improveTranscriptFlow', requestPayload);
    
    const completion = await openai.chat.completions.create(requestPayload);
    
    logApiCall('improveTranscriptFlow', requestPayload, completion);
    
    return completion.choices[0].message.content || "";
  } catch (error) {
    logApiCall('improveTranscriptFlow', requestPayload, null, error);
    console.error("Error improving transcript flow:", error);
    throw new Error(
      "Failed to improve transcript flow: " +
        (error instanceof Error ? error.message : String(error)),
    );
  }
}
