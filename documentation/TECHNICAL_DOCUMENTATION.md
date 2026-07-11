# VeilCast - Technical Documentation

This document provides in-depth technical information about the VeilCast application, including architectural decisions, implementation details, and development processes.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Frontend Implementation](#frontend-implementation)
3. [Backend Implementation](#backend-implementation)
4. [Database Design](#database-design)
5. [External API Integration](#external-api-integration)
6. [Authentication and Security](#authentication-and-security)
7. [Performance Considerations](#performance-considerations)
8. [Development Workflow](#development-workflow)
9. [Testing Strategy](#testing-strategy)
10. [Deployment](#deployment)
11. [Known Limitations and Future Work](#known-limitations-and-future-work)

## System Architecture

### Architecture Overview

VeilCast follows a client-server architecture with a clear separation of concerns:

- **Client**: React-based single-page application (SPA)
- **Server**: Node.js/Express.js RESTful API
- **Database**: SQLite database managed through Prisma ORM
- **External Services**: ElevenLabs API for text-to-speech conversion

This architecture enables:
- Separation of presentation and business logic
- Independent scaling of frontend and backend
- Clear API boundaries for future extensions

### Component Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────┐
│                 │     │                  │     │               │
│   React SPA     │────▶│   Express API    │────▶│  SQLite DB    │
│                 │     │                  │     │               │
└─────────────────┘     └──────────────────┘     └───────────────┘
        │                        │                       
        │                        │                       
        │                        ▼                       
        │              ┌──────────────────┐                       
        │              │                  │                       
        └─────────────▶│  ElevenLabs API  │                       
                       │                  │                       
                       └──────────────────┘                       
```

### System Flow

1. User uploads a text transcript through the React frontend
2. Backend processes and stores the transcript in SQLite DB
3. User selects voices for different speakers in the transcript
4. Backend sends text segments to ElevenLabs API for voice conversion
5. Audio segments are stored on the server filesystem
6. Frontend retrieves and plays the audio files

## Frontend Implementation

### Framework and Libraries

- **React 19**: Core UI framework with functional components and hooks
- **TypeScript**: Static type checking and improved developer experience
- **React Router 7**: Client-side routing 
- **Material UI 6**: Component library with customized theming
- **Framer Motion**: Animation library for smooth transitions

### Frontend Architecture

The frontend follows a component-based architecture with:

- **Pages**: Top-level components that correspond to routes
- **Components**: Reusable UI elements
- **Contexts**: State management using React Context API
- **Services**: API communication logic
- **Utils**: Helper functions and utilities

### Key Components

#### Authentication Components
- `SignIn.tsx` and `SignUp.tsx`: Handle user authentication
- `ProtectedRoute.tsx`: Higher-order component for route protection
- `AuthContext.tsx`: Authentication state management

#### Core Features
- `Dashboard.tsx`: Main interface for transcript management
- `PodcastGeneration.tsx`: Complex component for voice assignment and generation
- `PodcastPlayer`: Audio playback functionality

#### Styling Approach

VeilCast uses a combination of:
- Material UI styled components
- CSS-in-JS with emotion
- Custom theme with dark mode 
- Responsive design principles

### State Management

- React Context API for global state (authentication, user preferences)
- Local component state for UI-specific concerns
- URL parameters for shareable state

## Backend Implementation

### Server Framework

- **Express.js**: Web server framework
- **Node.js**: JavaScript runtime
- **Modules**: ES Modules for better code organization

### API Design

The backend follows RESTful API principles:

- Resource-based routes (/api/transcripts, /api/podcasts)
- HTTP verbs for operations (GET, POST, PUT, DELETE)
- JWT authentication middleware
- JSON response format

### File Processing

Text transcript processing involves:

1. **File Upload**: Using multer middleware for multipart form handling
2. **Text Extraction**: Reading and parsing text content
3. **Speaker Identification**: Analyzing text to identify dialogue speakers
4. **Chunking**: Breaking large texts into manageable segments

### Audio Generation

The audio generation process:

1. **Text Segmentation**: Breaking text into speaker segments
2. **API Integration**: Sending text to ElevenLabs API
3. **Response Handling**: Processing and storing audio responses
4. **File Management**: Organizing audio files by podcast and segment

## Database Design

### ORM Layer

Prisma ORM provides:
- Type-safe database queries
- Migration management
- Schema definition
- Database normalization

### Schema Models

The database schema includes the following key models:

#### User Model
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  firstName     String?
  lastName      String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // User settings
  settings      UserSettings?
  
  // User's content
  transcripts   Transcript[]
  podcasts      Podcast[]
}
```

#### Transcript Model
```prisma
model Transcript {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // File metadata
  filename      String
  fileSize      Int
  mimeType      String
  storageKey    String?
  content       String?
  
  // Processing metadata
  status        TranscriptStatus @default(UPLOADED)
  tokenCount    Int?
  chunkCount    Int?
  
  // Generated podcast (if any)
  podcast       Podcast?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

#### Podcast and PodcastMedia Models
These models store the generated podcast information and individual audio segments.

### Data Relationships

- One-to-many relationship between User and Transcripts
- One-to-many relationship between User and Podcasts
- One-to-one relationship between Transcript and Podcast
- One-to-many relationship between Podcast and PodcastMedia

## External API Integration

### ElevenLabs API

VeilCast integrates with the ElevenLabs API for text-to-speech conversion:

- **Authentication**: API key-based authentication
- **Voice Selection**: Access to premium voice models
- **Request Format**: JSON payloads with text and voice configuration
- **Response Handling**: Binary audio data processing

### Implementation Details

- Error handling and retry logic
- Rate limiting compliance
- Response caching where appropriate
- Character count tracking

### Environment Variables

API keys and configuration are stored in environment variables:
- `VITE_ELEVENLABS_API_KEY`: ElevenLabs API key

## Authentication and Security

### JWT Authentication

JSON Web Tokens (JWT) are used for authentication:

- **Token Generation**: Upon successful login
- **Token Storage**: Client-side in localStorage
- **Token Verification**: Server-side middleware
- **Token Expiration**: Configurable expiry time

### Password Security

- Passwords are hashed using bcrypt
- Salt rounds are configurable
- No plaintext passwords are stored

### API Security

- CORS configuration for allowed origins
- Input validation and sanitization
- Content Security Policy headers
- Protection against common web vulnerabilities

## Performance Considerations

### Frontend Optimizations

- Lazy loading of components
- Code splitting by route
- Memoization of expensive calculations
- Image optimization
- Efficient state management

### Backend Optimizations

- Text chunking for large files
- Streaming responses where appropriate
- Database query optimization
- File system operations optimization
- Connection pooling

### Media Handling Optimizations

- Audio file caching
- Progress tracking for long operations
- Efficient binary data handling

## Development Workflow

### Project Setup

1. Environment configuration
2. Database initialization
3. External API access setup
4. Local development server configuration

### Development Tools

- **Vite**: Fast build tool and dev server
- **ESLint**: Code quality enforcement
- **TypeScript**: Type checking
- **Prettier**: Code formatting
- **Nodemon**: Automatic server restart

### Build Process

The build process includes:
- TypeScript compilation
- Asset optimization
- Bundling and minification
- Environment-specific configuration

## Testing Strategy

### Testing Approach

- Component-level unit tests
- Integration tests for API endpoints
- End-to-end tests for critical flows
- Manual testing for audio quality

### Testing Tools

- React Testing Library for component tests
- Jest for unit testing
- Playwright or Cypress for E2E tests

## Deployment

### Deployment Options

- Traditional hosting with Node.js server
- Container-based deployment (Docker)
- Serverless deployment for specific functions

### Environment Considerations

- Production vs. development environments
- Database migration strategy
- Secret management
- CI/CD integration

## Known Limitations and Future Work

### Current Limitations

- Limited support for very large transcripts
- Character quota based on ElevenLabs API limits
- Audio quality dependent on external API
- Limited language support

### Future Enhancements

#### Technical Improvements
- Migrate to cloud storage for media files
- Implement caching layer for API responses
- Add WebSocket support for real-time updates
- Support for more audio formats and export options

#### Feature Enhancements
- Advanced text editing tools
- Custom voice training options
- Collaboration features
- Analytics and insights dashboard
- Mobile application development

## Conclusion

VeilCast demonstrates the integration of modern web technologies with AI services to create a unique application for content creators. The architecture provides a solid foundation for future enhancements while delivering a responsive and intuitive user experience. 