# VeilCast Customer Service Agent

This document provides an overview of the VeilCast Customer Service Agent feature, which enables users to get assistance with using the application through an AI-powered chat interface.

## Overview

The VeilCast Customer Service Agent is an AI-powered assistant that can:

1. Answer user questions about VeilCast's features and functionality
2. Guide users through the application's workflows
3. Help troubleshoot common issues
4. Perform actions on behalf of users when they need assistance

The agent is accessible through a chat interface that appears as a floating button in the bottom-right corner of the application. Users can click this button to open the chat interface and start interacting with the agent.

## Technical Implementation

The Customer Service Agent is implemented using the following components:

### Frontend Components

1. **CustomerServiceChat.tsx**: The main component that renders the chat interface, including the chat window, message list, input field, and action buttons.

2. **AgentContext.tsx**: A React context that manages the state of the agent, including messages, loading state, and suggested actions.

### Backend Services

1. **agent.ts**: A service that handles user queries and executes actions on behalf of users. It communicates with the OpenAI API to generate responses and with the VeilCast API to perform actions.

2. **Server API Endpoints**:
   - `/api/agent/query`: Handles user queries and returns responses with suggested actions
   - `/api/agent/action`: Executes actions on behalf of users

## Agent Capabilities

### Answering Questions

The agent can answer questions about:

- VeilCast's features and functionality
- How to use the application
- Troubleshooting common issues
- Account management
- Transcript management
- Podcast generation and playback

### Performing Actions

The agent can perform the following actions on behalf of users:

1. **Navigation**: Guide users to different parts of the application
2. **Upload**: Help users upload transcripts
3. **Process**: Assist with converting transcripts to podcasts
4. **Download**: Generate download links for podcasts
5. **Delete**: Help users delete transcripts or podcasts

## Implementation Details

### Agent System Prompt

The agent uses a system prompt that defines its role and capabilities. This prompt includes information about VeilCast's features, the agent's responsibilities, and guidelines for interacting with users.

### Documentation Context

The agent has access to a documentation context that includes information about:

- VeilCast's features
- Application workflows
- Supported file formats
- Troubleshooting tips

### Action Execution

When the agent suggests an action, it provides:

1. A description of the action
2. The type of action (navigate, upload, process, download, delete)
3. Parameters required for the action

Users can click on suggested actions to execute them. The agent then performs the action and provides feedback on the result.

## Deployment

The Customer Service Agent is deployed as part of the VeilCast application. It requires the following environment variables:

- `VITE_OPENAI_API_KEY`: An API key for OpenAI's services

## Future Enhancements

Planned enhancements for the Customer Service Agent include:

1. **Enhanced Action Capabilities**: Expanding the range of actions the agent can perform
2. **Personalized Assistance**: Tailoring responses based on user history and preferences
3. **Proactive Assistance**: Offering help when users appear to be struggling
4. **Multi-language Support**: Supporting multiple languages for international users
5. **Voice Interaction**: Adding voice input and output capabilities

## Usage Guidelines

When interacting with the Customer Service Agent, users should:

1. Ask clear, specific questions
2. Provide context when needed
3. Follow the agent's suggestions for actions
4. Provide feedback if the agent's responses are not helpful

## Conclusion

The VeilCast Customer Service Agent provides a powerful tool for assisting users with the application. By combining AI-powered responses with the ability to perform actions, it offers a comprehensive support solution that enhances the user experience. 