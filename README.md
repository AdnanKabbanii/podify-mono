Podify

Built it to solve a simple problem: long articles and written content are hard to consume on the go, but they often have great ideas buried inside them.
Podify takes large articles, blog posts, and text transcripts and turns them into human sounding podcast style conversations. Instead of reading a 10,000 word piece, you upload the text, the app rewrites it into natural dialogue between speakers, assigns voices, and generates audio you can listen to like a real podcast.

It helps writers, educators, and anyone with long form content repurpose their work into something more entertaining and easier to follow. You get multiple speakers, back and forth conversation, and audio output without recording yourself or hiring voice actors.

This project is open source. You can use it, change it, and share it freely under the MIT License. See LICENSE for details.

What it does

- User sign up and login
- Upload and manage large text files and transcripts
- Split and process long articles into conversational dialogue using OpenAI
- Assign different voices to speakers
- Generate natural speech audio using ElevenLabs
- Play, save, and download podcast audio

Requirements

- Node.js 18 or newer
- pnpm
- OpenAI API key
- ElevenLabs API key

Setup

1. Clone the repo

git clone https://github.com/AdnanKabbanii/podify-mono.git
cd Podify

2. Install dependencies

pnpm install

3. Create a .env file in the project root

VITE_OPENAI_API_KEY=your_openai_key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key
DATABASE_URL="file:./dev.db"
JWT_SECRET=your_secret_key
PORT=3000

4. Set up the database

pnpm exec prisma migrate dev

Running the app

Start the backend (terminal 1):

pnpm run simple-server

Start the frontend (terminal 2):

pnpm run dev

Open http://localhost:5173 in your browser. The API runs on http://localhost:3000.

Production build

pnpm run build
pnpm start

Project structure

- src/pages and src/components: React frontend
- src/api, src/services, src/middleware: TypeScript API modules
- server.js: main Express backend
- prisma: database schema and migrations

Project history: Originally developed as a private personal project and released publicly in July 2026 after removing private configuration and sensitive data. The public repository uses a cleaned, squashed history.

License

MIT License. Copyright (c) 2026 Adnan Kabbani.

You are free to use this software for personal or commercial projects. No warranty is provided.

Author

Adnan Kabbani
