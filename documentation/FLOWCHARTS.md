# VeilCast - System Flowcharts

This document contains flowchart diagrams illustrating the key processes and workflows in the VeilCast application.

## Table of Contents
1. [Overall System Architecture](#overall-system-architecture)
2. [User Authentication Flow](#user-authentication-flow)
3. [Transcript Upload and Processing Flow](#transcript-upload-and-processing-flow)
4. [Podcast Generation Flow](#podcast-generation-flow)
5. [Audio Playback and Download Flow](#audio-playback-and-download-flow)

## Overall System Architecture

```mermaid
flowchart TB
    subgraph Client ["Client (React SPA)"]
        UI[User Interface]
        AuthContextFE[Auth Context]
        Router[React Router]
        LocalStorage[Local Storage]
    end
    
    subgraph Server ["Server (Express.js)"]
        API[API Endpoints]
        AuthMiddleware[Auth Middleware]
        FileProcessing[File Processing]
        TTS[Text-to-Speech Service]
    end
    
    subgraph ExternalServices ["External Services"]
        ElevenLabsAPI[ElevenLabs API]
    end
    
    subgraph Database ["Database (SQLite/Prisma)"]
        Users[Users]
        Transcripts[Transcripts]
        Podcasts[Podcasts]
        PodcastMedia[Podcast Media]
    end
    
    subgraph FileSystem ["File System"]
        MediaFiles[Media Files]
        TempFiles[Temporary Files]
    end
    
    UI --> Router
    Router --> AuthContextFE
    AuthContextFE --> LocalStorage
    
    UI --> API
    API --> AuthMiddleware
    AuthMiddleware --> FileProcessing
    FileProcessing --> TTS
    
    TTS --> ElevenLabsAPI
    ElevenLabsAPI --> TTS
    
    API --> Users
    API --> Transcripts
    API --> Podcasts
    API --> PodcastMedia
    
    FileProcessing --> TempFiles
    TTS --> MediaFiles
    API --> MediaFiles
```

## User Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Client UI
    participant API as Auth API
    participant DB as Database
    
    User->>UI: Enter credentials
    UI->>API: POST /api/auth/login
    API->>DB: Validate credentials
    
    alt Invalid Credentials
        DB-->>API: Authentication failed
        API-->>UI: 401 Unauthorized
        UI-->>User: Show error message
    else Valid Credentials
        DB-->>API: User record
        API->>API: Generate JWT
        API-->>UI: Return JWT token
        UI->>UI: Store token in localStorage
        UI->>UI: Update auth context
        UI-->>User: Redirect to Dashboard
    end
    
    Note over User,UI: For Protected Routes
    User->>UI: Access protected route
    UI->>UI: Check for valid token
    
    alt No Token or Expired
        UI-->>User: Redirect to login
    else Valid Token
        UI->>API: Request with JWT header
        API->>API: Verify JWT
        API-->>UI: Return protected data
        UI-->>User: Show protected content
    end
```

## Transcript Upload and Processing Flow

```mermaid
flowchart TB
    Start([Start]) --> SelectFile[User Selects File]
    SelectFile --> ValidateFile{File Valid?}
    
    ValidateFile -- No --> ShowError[Show Error Message]
    ShowError --> SelectFile
    
    ValidateFile -- Yes --> UploadFile[Upload File to Server]
    UploadFile --> UploadProgress[Show Upload Progress]
    
    UploadProgress --> ProcessFile[Server Processes File]
    ProcessFile --> ExtractMetadata[Extract File Metadata]
    ExtractMetadata --> SaveToDB[Save to Database]
    
    SaveToDB --> AnalyzeContent[Analyze Content]
    AnalyzeContent --> IdentifySpeakers[Identify Speakers]
    IdentifySpeakers --> EstimateTokens[Estimate Token Count]
    
    EstimateTokens --> SaveAnalysis[Save Analysis Results]
    SaveAnalysis --> NotifyClient[Notify Client of Completion]
    
    NotifyClient --> ShowTranscript[Show Transcript in UI]
    ShowTranscript --> End([End])
```

## Podcast Generation Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Client UI
    participant API as Server API
    participant ElevenLabs as ElevenLabs API
    participant DB as Database
    participant FS as File System
    
    User->>UI: Select transcript
    UI->>API: GET /api/transcripts/:id
    API->>DB: Fetch transcript
    DB-->>API: Transcript data
    API-->>UI: Return transcript
    
    User->>UI: Assign voices to speakers
    User->>UI: Configure settings
    User->>UI: Start generation
    
    UI->>API: POST /api/transcripts/:id/process
    API->>DB: Update status to PROCESSING
    
    loop For each text segment
        API->>API: Process text segment
        API->>ElevenLabs: Send text with voice config
        ElevenLabs-->>API: Return audio data
        API->>FS: Save audio segment
        API->>DB: Update progress
        API-->>UI: Send progress update
        UI-->>User: Display progress
    end
    
    API->>DB: Update status to PROCESSED
    API->>DB: Create podcast record
    API->>DB: Link audio segments
    
    API-->>UI: Generation complete
    UI-->>User: Show completion message
    UI->>UI: Offer playback option
```

## Audio Playback and Download Flow

```mermaid
flowchart TB
    Start([Start]) --> OpenPodcast[User Opens Podcast]
    OpenPodcast --> LoadMetadata[Load Podcast Metadata]
    LoadMetadata --> FetchSegments[Fetch Audio Segments]
    
    FetchSegments --> PreparePlayer[Prepare Audio Player]
    PreparePlayer --> UserAction{User Action}
    
    UserAction -- Play --> PlayAudio[Play Audio]
    PlayAudio --> SyncText[Sync with Transcript]
    SyncText --> UserAction
    
    UserAction -- Pause --> PauseAudio[Pause Audio]
    PauseAudio --> UserAction
    
    UserAction -- Skip --> SkipSegment[Skip to Segment]
    SkipSegment --> UpdatePosition[Update Player Position]
    UpdatePosition --> UserAction
    
    UserAction -- Download --> PromptFormat[Prompt for Format]
    PromptFormat --> Format{Format Selection}
    
    Format -- MP3 --> DownloadMP3[Download as MP3]
    Format -- WAV --> DownloadWAV[Download as WAV]
    Format -- M4A --> DownloadM4A[Download as M4A]
    
    DownloadMP3 --> SaveToDevice[Save to User's Device]
    DownloadWAV --> SaveToDevice
    DownloadM4A --> SaveToDevice
    
    SaveToDevice --> End([End])
```

## Data Flow Diagram

```mermaid
flowchart LR
    User((User))
    
    subgraph Frontend
        UI[User Interface]
        Auth[Auth Context]
        Forms[Form Components]
        Player[Audio Player]
    end
    
    subgraph Backend
        API[API Layer]
        Processing[Text Processing]
        TTS[Text-to-Speech Service]
        FileHandler[File Handler]
    end
    
    subgraph Storage
        DB[(Database)]
        Files[(File System)]
    end
    
    subgraph External
        ElevenLabs[ElevenLabs API]
    end
    
    User -->|Interacts| UI
    UI -->|Auth Requests| Auth
    UI -->|Form Data| Forms
    UI -->|Playback Controls| Player
    
    Forms -->|Submit Data| API
    Auth -->|Auth Headers| API
    Player -->|Request Media| API
    
    API -->|Store User Data| DB
    API -->|Retrieve Data| DB
    API -->|Text Content| Processing
    
    Processing -->|Processed Text| TTS
    TTS -->|Audio Request| ElevenLabs
    ElevenLabs -->|Audio Data| TTS
    
    TTS -->|Audio Files| FileHandler
    FileHandler -->|Save Files| Files
    FileHandler -->|File Metadata| DB
    
    API -->|Retrieve Media| Files
    API -->|Serve Media| Player
```

## State Transition Diagram - Transcript Processing

```mermaid
stateDiagram-v2
    [*] --> UPLOADED : User uploads file
    
    UPLOADED --> PROCESSING : Start generation
    PROCESSING --> PROCESSED : Generation complete
    PROCESSING --> FAILED : Error occurs
    
    FAILED --> PROCESSING : Retry generation
    PROCESSED --> [*]
    
    note right of UPLOADED
        Initial state after file upload
        Metadata extracted
        Awaiting user action
    end note
    
    note right of PROCESSING
        Progress tracking
        Chunking for large files
        Voice assignment applied
    end note
    
    note right of PROCESSED
        Audio segments available
        Podcast record created
        Ready for playback
    end note
    
    note right of FAILED
        Error details logged
        User notified
        Can be retried
    end note
```

## Component Interaction Diagram

```mermaid
flowchart TB
    subgraph UI_Layer["UI Layer"]
        App[App Component]
        Auth[Auth Components]
        Dashboard[Dashboard]
        Upload[Upload Component]
        Generation[Generation Component]
        Player[Player Component]
    end
    
    subgraph Service_Layer["Service Layer"]
        AuthService[Auth Service]
        TranscriptService[Transcript Service]
        PodcastService[Podcast Service]
        VoiceService[Voice Service]
    end
    
    subgraph API_Layer["API Layer"]
        AuthAPI[Auth API]
        TranscriptAPI[Transcript API]
        PodcastAPI[Podcast API]
        VoiceAPI[Voice API]
    end
    
    App --> Auth
    App --> Dashboard
    
    Dashboard --> Upload
    Dashboard --> Generation
    Dashboard --> Player
    
    Auth --> AuthService
    Upload --> TranscriptService
    Generation --> TranscriptService
    Generation --> VoiceService
    Generation --> PodcastService
    Player --> PodcastService
    
    AuthService --> AuthAPI
    TranscriptService --> TranscriptAPI
    PodcastService --> PodcastAPI
    VoiceService --> VoiceAPI
    
    AuthAPI --> TranscriptAPI
    TranscriptAPI --> PodcastAPI
```

These diagrams visually represent the main flows and processes in the VeilCast application. They can be rendered in any Markdown viewer that supports Mermaid diagrams, or you can use an online Mermaid renderer to convert them to images if needed. 