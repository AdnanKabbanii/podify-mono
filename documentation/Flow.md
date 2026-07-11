# VeilCast: Complete Flow Documentation

## 1. User Registration and Authentication

### Signup Process
1. User enters their information in the `SignUp.tsx` component
2. Frontend validates the form data and sends a POST request to `/api/auth/register`
3. The server creates a new user in the database using Prisma ORM with SQLite
4. User credentials (email, hashed password) are stored in the `User` table
5. A JWT token is generated and returned to the client

### Authentication State Management
- The `AuthContext.tsx` manages authentication state throughout the application
- JWT token is stored in localStorage for persistent sessions
- The context provides `login`, `signup`, and `logout` functions to components
- Protected routes use the `ProtectedRoute.tsx` component to verify authentication

## 2. Transcript Upload and Management

### Transcript Upload
1. After logging in, users can upload transcript files from the Dashboard
2. Files are read client-side using the `readFileAsText` function in `fileUtils.ts`
3. The text content is sent to the server via a POST request to `/api/transcripts`
4. The server stores the transcript in the `Transcript` table with metadata (filename, fileSize, mimeType)

### Transcript Storage
- Transcript text content is stored directly in the database in the `content` field of the `Transcript` table
- The database schema shows that transcripts are linked to users via the `userId` field
- Metadata like filename, fileSize, and mimeType are stored alongside the content

### Transcript Processing
- Transcripts can be processed to convert them into conversational format
- The `processTranscript` function in `openai.ts` handles this conversion
- For large transcripts, the text is chunked using the `chunkText` function to stay within API limits
- Each chunk is processed by OpenAI to convert monologue text into dialogue format
- The processed transcript is stored back in the database

## 3. Podcast Generation

### Voice Selection
- In the `PodcastGeneration.tsx` component, users can select voices for different speakers
- Available voices are fetched from the ElevenLabs API via `/api/voices` endpoint
- Users can assign specific voices to each speaker detected in the transcript
- Voice assignments are stored in a `voiceConfig` object that maps speakers to voice IDs

### Text Segmentation
- The transcript is split into dialogue segments using the `extractDialogueSegments` function
- Each segment contains the speaker and their text
- For long segments, text is further chunked to stay within API limits using `splitTextIntoChunks`

### Voice Generation
- The `generateSpeech` function sends each text segment to the server
- The server calls the ElevenLabs API via the `/api/tts` endpoint in `server.js`
- The API converts text to speech using the specified voice ID
- Audio is returned as binary data (arraybuffer)

## 4. Audio File Storage and Management

### Temporary Audio Storage
- During generation, audio files are temporarily stored in the `temp_audio` directory
- Each file has a unique UUID filename (e.g., `123e4567-e89b-12d3-a456-426614174000.mp3`)
- After sending the audio to the client, these temporary files are deleted

### Persistent Audio Storage
- Completed podcast audio segments are stored in the `media/podcasts/{podcastId}` directory
- Each podcast has its own directory named with its unique ID
- Audio segments are named with a pattern like `segment_{index}_{speaker}.mp3`
- The file paths are stored in the database in the `PodcastMedia` table

### Database References
- The `Podcast` table stores metadata about the podcast (title, duration, content)
- The `PodcastMedia` table stores references to the audio files with metadata:
  - `filename`: The name of the audio file
  - `fileSize`: Size of the file in bytes
  - `mimeType`: Usually "audio/mpeg"
  - `storageKey`: Path to the file (optional, for cloud storage)
  - `duration`: Length of the audio in seconds
  - `speakerId`: ID of the speaker in the dialogue
  - `segmentText`: The text segment this audio corresponds to

### Client-Side Audio Handling
- Generated audio segments are sent to the client and stored in memory
- URLs are created using `URL.createObjectURL` for playback
- These URLs are revoked when the component unmounts to prevent memory leaks
- Users can play individual segments or download them

## 5. User Experience Flow

### Dashboard → Transcript Upload → Processing
- User uploads or creates a transcript from the Dashboard
- The transcript is stored in the database
- User can process the transcript to convert it to dialogue format

### Podcast Generation → Voice Selection → Audio Generation
- User selects voices for each speaker in the dialogue
- The system generates audio for each segment
- Progress is tracked and displayed to the user

### Playback and Download
- User can play the generated podcast segments
- Audio can be downloaded as individual segments or as a complete podcast
- The podcast is stored for future access

## Storage Summary

### Text Data Storage
- User data: SQLite database (User table)
- Transcripts: SQLite database (Transcript table)
- Processed dialogue: SQLite database (Podcast table)

### Audio File Storage
- Temporary generation files: `temp_audio/` directory (deleted after use)
- Persistent podcast files: `media/podcasts/{podcastId}/` directories
- File references: SQLite database (PodcastMedia table)

### Authentication Data
- JWT tokens: Client-side localStorage
- Hashed passwords: SQLite database (User table)

## API Integration

### OpenAI API
- Used for converting monologue text to dialogue format
- Processes text in chunks to stay within token limits
- Returns structured dialogue with speaker labels

### ElevenLabs API
- Used for text-to-speech conversion
- Provides multiple voice options for different speakers
- Converts text segments to audio files
- Has usage limits based on subscription tier

## Technical Implementation Details

### Server-Side
- Express.js handles API requests
- Prisma ORM manages database operations
- Multer handles file uploads
- JWT provides authentication
- File system operations manage audio storage

### Client-Side
- React with TypeScript for UI components
- Material UI for styling
- React Context API for state management
- React Router for navigation
- Fetch API for server communication