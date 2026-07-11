import React, { createContext, ReactNode, useContext, useState } from 'react';
import { executeAction, handleUserQuery } from '../services/agent.js';
import { useAuth } from './AuthContext.js';

// Define types
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

interface AgentAction {
  id: string;
  description: string;
  type: string;
  params: Record<string, unknown>;
}

// Define the ActionResult interface
interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

interface AgentContextType {
  messages: Message[];
  isLoading: boolean;
  suggestedActions: AgentAction[];
  sendMessage: (text: string) => Promise<void>;
  performAction: (action: AgentAction) => Promise<ActionResult>;
  clearMessages: () => void;
  isAgentOpen: boolean;
  toggleAgent: () => void;
}

// Create context
const AgentContext = createContext<AgentContextType | undefined>(undefined);

// Provider component
export const AgentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<AgentAction[]>([]);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const { token } = useAuth();

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Create and add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setSuggestedActions([]);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await handleUserQuery(text, token ?? undefined);

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        sender: 'agent',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, agentMessage]);

      // Set suggested actions if available
      if (response.suggestedActions && response.suggestedActions.length > 0) {
        const actions = response.suggestedActions.map((action, index) => ({
          id: `action-${index}`,
          description: action.description || `Option ${index + 1}`,
          type: action.type,
          params: action.params
        }));
        setSuggestedActions(actions);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again later.',
        sender: 'agent',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const performAction = async (action: AgentAction) => {
    setIsLoading(true);
    
    try {
      if (!action || !action.type) {
        throw new Error('Invalid action: missing type');
      }
      if (action.type === 'navigate') {
        // If params is missing, initialize it
        if (!action.params) {
          action.params = {};
        }
        
        if (!action.params.path && action.description) {
          // Simple mapping of common descriptions to paths
          const pathMap: Record<string, string> = {
            'dashboard': '/dashboard',
            'home': '/',
            'sign in': '/signin',
            'login': '/signin',
            'sign up': '/signup',
            'register': '/signup',
            'podcast': '/podcast',
            'generate': '/podcast/generate',
          };
          
          // Try to find a matching path
          const lowerDesc = action.description.toLowerCase();
          for (const [key, path] of Object.entries(pathMap)) {
            if (lowerDesc.includes(key)) {
              action.params.path = path;
              break;
            }
          }
          
          // Default to dashboard if no match found
          if (!action.params.path) {
            action.params.path = '/dashboard';
          }
        }
      }
      
      // Check if token is available
      if (!token) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          text: 'You need to be logged in to perform this action.',
          sender: 'agent',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
        setSuggestedActions([]);
        
        return {
          success: false,
          message: 'Authentication required'
        };
      }
      
      const result = await executeAction({
        type: action.type,
        params: action.params
      }, token);
      
      const resultMessage: Message = {
        id: Date.now().toString(),
        text: result.message,
        sender: 'agent',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, resultMessage]);
      setSuggestedActions([]);
      
      return result;
    } catch (error: unknown) {
      console.error('Error executing action:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'Sorry, I encountered an error while performing that action.',
        sender: 'agent',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setSuggestedActions([]);
      
      // Return a default error result instead of throwing
      return {
        success: false,
        message: 'An error occurred while performing the action'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setSuggestedActions([]);
  };

  const toggleAgent = () => {
    if (!isAgentOpen && messages.length === 0) {
      setMessages([
        {
          id: '0',
          text: 'Hello! I\'m your VeilCast Assistant. How can I help you today?',
          sender: 'agent',
          timestamp: new Date()
        }
      ]);
    }
    
    setIsAgentOpen(!isAgentOpen);
  };

  const value = {
    messages,
    isLoading,
    suggestedActions,
    sendMessage,
    performAction,
    clearMessages,
    isAgentOpen,
    toggleAgent
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
};

export const useAgent = (): AgentContextType => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
};

export default AgentContext; 