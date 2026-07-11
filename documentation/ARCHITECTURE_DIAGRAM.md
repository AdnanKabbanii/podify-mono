# VeilCast - Architecture Diagram

## System Architecture Diagram

```
+-----------------------------------------------------+
|                                                     |
|                CLIENT (BROWSER)                     |
|                                                     |
+-------------------+--------------------+------------+
                    |
                    | HTTP/HTTPS
                    |
                    |
+-------------------v------------------------------+--+
|                                                     |
|                 EXPRESS.JS SERVER                   |
|                                                     |
|  +-----------------+         +-----------------+    |
|  |                 |         |                 |    |
|  |  API ENDPOINTS  |         |   MIDDLEWARE    |    |
|  |                 |         |                 |    |
|  +---------+-------+         +---------+-------+    |
|            |                           |            |
|  +---------v-----------+     +---------v-------+    |
|  |                     |     |                 |    |
|  |  BUSINESS LOGIC     |     |    SECURITY     |    |
|  |                     |     |                 |    |
|  +---------------------+     +-----------------+    |
|                                                     |
+-----+-----------------------------------+-----+-----+
      |                                   |     |
      |                                   |     |
+-----v-----+                      +-----v-----v-----+
|           |                      |                 |
|  PRISMA   |                      |   ELEVENLABS    |
|    ORM    |                      |      API        |
|           |                      |                 |
+-----+-----+                      +-----------------+
      |
      |
+-----v-----+                      +-----------------+
|           |                      |                 |
|  SQLITE   |                      |   FILE SYSTEM   |
| DATABASE  |                      |   STORAGE       |
|           |                      |                 |
+-----------+                      +-----------------+
```

## Database Schema Diagram

```
+-----------------+       +------------------+
|      User       |       |   UserSettings   |
|-----------------|       |------------------|
| id              |<----->| id               |
| email           |       | userId           |
| passwordHash    |       | defaultVoices    |
| firstName       |       | theme            |
| lastName        |       | maxChunkSize     |
| createdAt       |       | updatedAt        |
| updatedAt       |       |                  |
+-----------------+       +------------------+
        |
        |
        v
+------------------+
|    Transcript    |
|------------------|       +------------------+
| id               |       |     Podcast      |
| userId           |       |------------------|
| filename         |<----->| id               |
| fileSize         |       | userId           |
| mimeType         |       | transcriptId     |
| storageKey       |       | title            |
| content          |       | duration         |
| status           |       | storageKey       |
| tokenCount       |       | fileSize         |
| chunkCount       |       | content          |
| createdAt        |       | voiceConfig      |
| updatedAt        |       | createdAt        |
+------------------+       | updatedAt        |
                           +--------+--------+
                                    |
                                    |
                                    v
                           +------------------+
                           |  PodcastMedia    |
                           |------------------|
                           | id               |
                           | podcastId        |
                           | filename         |
                           | fileSize         |
                           | mimeType         |
                           | storageKey       |
                           | duration         |
                           | speakerId        |
                           | segmentText      |
                           | createdAt        |
                           | updatedAt        |
                           +------------------+
```

## API Architecture

```
+-----------------------------------------------------+
|                                                     |
|                     API ROUTES                      |
|                                                     |
+---------------------+--------------------+----------+
            |                   |                |
            v                   v                v
+---------------------+  +----------------+  +----------+
|                     |  |                |  |          |
|  AUTH ENDPOINTS     |  |  TRANSCRIPTS   |  | PODCASTS |
|                     |  |                |  |          |
+---------------------+  +----------------+  +----------+
| /api/auth/register  |  | /api/transcripts |  | /api/podcasts     |
| /api/auth/login     |  | GET, POST        |  | GET, POST         |
| /api/auth/me        |  | /:id             |  | /:id              |
| /api/auth/me/settings  | /:id/process     |  | /:id (PUT, DELETE)|
+---------------------+  +----------------+  +----------+
                                               |
                                               v
                                         +------------+
                                         |            |
                                         |   VOICES   |
                                         |            |
                                         +------------+
                                         | /api/voices|
                                         |            |
                                         +------------+
```

## Audio Processing Flow

```
+------------------+       +------------------+       +------------------+
|                  |       |                  |       |                  |
| TEXT TRANSCRIPT  +------>| TEXT CHUNKING    +------>| SPEAKER          |
|                  |       |                  |       | IDENTIFICATION   |
+------------------+       +------------------+       +------------------+
                                                               |
                                                               v
+------------------+       +------------------+       +------------------+
|                  |       |                  |       |                  |
| AUDIO SEGMENT    |<------+ TEXT-TO-SPEECH   |<------+ VOICE            |
| STORAGE          |       | CONVERSION       |       | ASSIGNMENT       |
+------------------+       +------------------+       +------------------+
        |
        v
+------------------+       +------------------+
|                  |       |                  |
| PODCAST          +------>| AUDIO PLAYBACK   |
| ASSEMBLY         |       |                  |
+------------------+       +------------------+
```

## Deployment Architecture

```
+------------------+       +------------------+       +------------------+
|                  |       |                  |       |                  |
|    DEVELOPMENT   +------>|    BUILD         +------>|  PRODUCTION      |
|    ENVIRONMENT   |       |    PROCESS       |       |  ENVIRONMENT     |
+------------------+       +------------------+       +------------------+
| Local Server     |       | TypeScript       |       | Node.js Server   |
| Vite Dev Server  |       | Compilation      |       | Express API      |
| Hot Reloading    |       | Asset            |       | SQLite Database  |
| ESLint           |       | Optimization     |       | Static Assets    |
| TypeScript Check |       | Bundling         |       | Media Files      |
+------------------+       +------------------+       +------------------+
