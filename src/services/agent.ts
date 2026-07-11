import OpenAI from "openai";
import { logToLocalStorage } from "../utils/browserUtils.js";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const AGENT_SYSTEM_PROMPT = `You are VeilCast Assistant, a helpful customer service agent for the VeilCast application.
VeilCast is a web application that transforms text transcripts into engaging podcast conversations using AI.

Your responsibilities:
1. Answer user questions about VeilCast's features, functionality, and workflows
2. Guide users through the application's interface and processes
3. Help troubleshoot common issues
4. Perform actions on behalf of users when they need assistance

When users ask questions, provide clear, concise answers based on VeilCast's documentation.
When users need help with specific tasks, offer to perform those tasks for them if they're having difficulty.

Key features of VeilCast:
- User authentication and account management
- Text transcript management (upload, edit, delete)
- AI-powered conversion of text to conversational dialogue
- Voice customization for different speakers
- Podcast generation and playback
- Download and sharing options

Available pages in the application:
- Landing Page (/): The main landing page with information about VeilCast
- Sign In (/signin): Where users can log in to their accounts
- Sign Up (/signup): Where new users can create an account
- Dashboard (/dashboard): The main dashboard where users can view and manage their transcripts and podcasts
- Podcast Generation (/podcast/generate/:id): Where users can generate a podcast from a transcript
- Podcast Player (/podcast/:transcriptId): Where users can play and manage their generated podcasts

When suggesting navigation actions, always include a path parameter that matches one of the available pages.

Always maintain a helpful, professional tone and prioritize user satisfaction and be very concise.`;

// Agent reference data
const DOCUMENTATION_CONTEXT = {
  features: [
    "User Authentication and Account Management: Secure user registration and login system with JWT authentication",
    "Text Transcript Management: Upload, store, and manage text transcripts",
    "Intelligent Text Processing: Convert standard text into conversational dialogue format using AI",
    "Voice Customization: Choose from multiple AI voices for different speakers in the conversation",
    "Real-time Audio Generation: Process text into audio segments with progress tracking",
    "Podcast Player: Built-in audio player for listening to generated podcasts",
    "Download and Share: Options to download generated podcasts and share them"
  ],
  workflows: [
    "Registration and Login: New users register with email and password, returning users authenticate with stored credentials",
    "Dashboard Interface: Users view their uploaded transcripts and generated podcasts",
    "Transcript Upload: Users upload text files through a drag-and-drop interface",
    "Podcast Generation: Users select a transcript for conversion, assign voices to speakers, and generate audio",
    "Podcast Playback: Built-in player allows listening to generated content"
  ],
  fileFormats: [
    "Plain Text (.txt)",
    "Rich Text Format (.rtf)",
    "Microsoft Word (.docx)",
    "PDF (.pdf) - text content only"
  ],
  troubleshooting: [
    "File upload issues: Check file format and size",
    "Processing errors: Ensure text is properly formatted",
    "Audio quality issues: Check voice settings",
    "Playback problems: Try downloading the file and playing in external player"
  ],
  pages: [
    { name: "Landing Page", path: "/", description: "The main landing page with information about VeilCast" },
    { name: "Sign In", path: "/signin", description: "Where users can log in to their accounts" },
    { name: "Sign Up", path: "/signup", description: "Where new users can create an account" },
    { name: "Dashboard", path: "/dashboard", description: "The main dashboard where users can view and manage their transcripts and podcasts" },
    { name: "Podcast Generation", path: "/podcast/generate/:id", description: "Where users can generate a podcast from a transcript" },
    { name: "Podcast Player", path: "/podcast/:transcriptId", description: "Where users can play and manage their generated podcasts" }
  ],
  navigation: {
    "Go to dashboard": { type: "navigate", path: "/dashboard" },
    "Sign in": { type: "navigate", path: "/signin" },
    "Create account": { type: "navigate", path: "/signup" },
    "Generate podcast": { type: "navigate", path: "/podcast/generate" },
    "Listen to podcast": { type: "navigate", path: "/podcast" }
  }
};

interface AgentAction {
  type: string;
  params: Record<string, unknown>;
  description?: string;
}

const PAGE_PATHS: Record<string, string> = {
  'login': '/signin',
  'signin': '/signin',
  'sign in': '/signin',
  'signup': '/signup',
  'sign up': '/signup',
  'register': '/signup',
  'create account': '/signup',

  'home': '/',
  'landing': '/',
  'dashboard': '/dashboard',
  'main dashboard': '/dashboard',
  'transcript management': '/dashboard',
  'transcripts': '/dashboard',
  'podcasts': '/dashboard',

  'podcast generation': '/podcast/generate',
  'generate podcast': '/podcast/generate',
  'podcast player': '/podcast',
  'play podcast': '/podcast',
  'upload transcript': '/dashboard',
  'upload': '/dashboard',
};

function findPathForDescription(description: string): string {
  if (!description) return '/dashboard';

  const lowerDescription = description.toLowerCase();

  if (lowerDescription in PAGE_PATHS) {
    return PAGE_PATHS[lowerDescription];
  }

  for (const [key, path] of Object.entries(PAGE_PATHS)) {
    if (lowerDescription.includes(key)) {
      return path;
    }
  }

  if (lowerDescription.includes('dashboard') || lowerDescription.includes('main page')) {
    return '/dashboard';
  }
  
  if (lowerDescription.includes('podcast') && lowerDescription.includes('generat')) {
    return '/podcast/generate';
  }
  
  if (lowerDescription.includes('podcast') && (lowerDescription.includes('play') || lowerDescription.includes('listen'))) {
    return '/podcast';
  }
  
  if (lowerDescription.includes('sign') || lowerDescription.includes('log in')) {
    return '/signin';
  }

  return '/dashboard';
}

export async function handleUserQuery(
  query: string,
  userToken?: string
): Promise<{ response: string; suggestedActions?: AgentAction[] }> {
  logToLocalStorage("Agent Query", { query });

  try {
    const authRequiredTerms = ['my account', 'my transcripts', 'my podcasts', 'upload', 'delete'];
    const isAuthRequired = authRequiredTerms.some(term => 
      query.toLowerCase().includes(term)
    );
    
    if (isAuthRequired && !userToken) {
      return {
        response: "It looks like you're asking about account-specific features. You'll need to sign in to access those features.",
        suggestedActions: [
          {
            type: "navigate",
            description: "Sign in to your account",
            params: { path: "/signin" }
          },
          {
            type: "navigate",
            description: "Create an account",
            params: { path: "/signup" }
          }
        ]
      };
    }

    if (userToken) {
      try {
        throw new Error("Skipping server-side processing");
        
      } catch (error: unknown) {
        console.warn("Server-side agent processing failed, falling back to client-side:", error);
      }
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: AGENT_SYSTEM_PROMPT },
          { 
            role: "user", 
            content: `User query: "${query}"
            
            Documentation context:
            ${JSON.stringify(DOCUMENTATION_CONTEXT, null, 2)}
            
            Respond to the user's query and suggest actions if appropriate.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        tools: [
          {
            type: "function",
            function: {
              name: "suggestActions",
              description: "Suggest actions that the agent can perform on behalf of the user",
              parameters: {
                type: "object",
                properties: {
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: ["navigate", "upload", "process", "download", "delete", "edit"],
                          description: "The type of action to perform"
                        },
                        description: {
                          type: "string",
                          description: "A description of the action to be shown to the user"
                        },
                        params: {
                          type: "object",
                          description: "Parameters required for the action"
                        }
                      },
                      required: ["type", "description", "params"]
                    }
                  }
                },
                required: ["actions"]
              }
            }
          }
        ]
      });

      const responseMessage = completion.choices[0].message;
      let suggestedActions: AgentAction[] | undefined;

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];
        if (toolCall.function.name === "suggestActions") {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            suggestedActions = args.actions;
            
            // Validate each action
            if (Array.isArray(suggestedActions)) {
              suggestedActions = suggestedActions.map(action => {
                if (!action || !action.type) {
                  console.warn("Invalid action: missing type", action);
                  return null;
                }
                
                if (action.type === "navigate") {
                  if (!action.params) {
                    action.params = {};
                  }

                  if (!action.params.path && action.description) {
                    action.params.path = findPathForDescription(action.description);
                    console.log(`Determined path for "${action.description}": ${action.params.path}`);
                  } else if (!action.params.path) {
                    action.params.path = '/dashboard';
                  }
                }
                
                return action;
              }).filter(Boolean) as AgentAction[];
            }
          } catch (error) {
            console.error("Error parsing tool call arguments:", error);
            suggestedActions = undefined;
          }
        }
      }

      return {
        response: responseMessage.content || "I'm sorry, I couldn't generate a response.",
        suggestedActions
      };
    } catch (error: unknown) {
      console.error("Error calling OpenAI API:", error);
      logToLocalStorage("Agent Error", { error });
      return {
        response: "I'm sorry, I encountered an error while processing your request. Please try again later.",
        suggestedActions: []
      };
    }
  } catch (error: unknown) {
    console.error("Error in agent service:", error);
    logToLocalStorage("Agent Error", { error });
    return {
      response: "I'm sorry, I encountered an error while processing your request. Please try again later."
    };
  }
}

export async function executeAction(
  action: AgentAction,
  userToken: string
): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> {
  try {
    logToLocalStorage("Agent Action", { action });

    // Validate action
    if (!action || !action.type) {
      return {
        success: false,
        message: "Invalid action: missing type"
      };
    }

    if (userToken) {
      try {
        throw new Error("Skipping server-side processing");
      } catch (error: unknown) {
        console.warn("Server-side action execution failed, falling back to client-side:", error);
      }
    }

    switch (action.type) {
      case "navigate": {

        if (!action.params) {
          action.params = {};
        }
        if (!action.params.path && action.description) {
          action.params.path = findPathForDescription(action.description);
          console.log(`Determined path from description: ${action.params.path}`);
        }

        if (!action.params.path) {
          console.error("Navigation action missing path:", action);
          action.params.path = '/dashboard';
        }
        
        const path = typeof action.params.path === 'string' ? action.params.path : '/dashboard';
        
        return {
          success: true,
          message: `Navigating to ${path}`,
          data: { path }
        };
      }

      case "upload": {
        if (!action.params.file) {
          return {
            success: false,
            message: "No file provided for upload"
          };
        }
        return {
          success: true,
          message: "Transcript uploaded successfully",
          data: { transcriptId: "mock-transcript-id" }
        };
      }

      case "process": {
        if (!action.params.transcriptId) {
          return {
            success: false,
            message: "No transcript ID provided for processing"
          };
        }
        return {
          success: true,
          message: "Podcast processing initiated",
          data: { podcastId: "mock-podcast-id" }
        };
      }

      case "download":
        return {
          success: true,
          message: "Download link generated",
          data: { downloadUrl: action.params.url }
        };

      case "delete":
        return {
          success: true,
          message: `${action.params.itemType} deleted successfully`,
          data: { itemId: action.params.itemId }
        };

      default:
        return {
          success: false,
          message: `Unknown action type: ${action.type}`
        };
    }
  } catch (error: unknown) {
    console.error("Error executing agent action:", error);
    logToLocalStorage("Agent Action Error", { error, action });
    return {
      success: false,
      message: "An error occurred while executing the action"
    };
  }
}
