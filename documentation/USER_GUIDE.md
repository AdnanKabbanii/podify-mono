# VeilCast User Guide

Welcome to VeilCast, your solution for transforming text into engaging podcast conversations. This guide will walk you through all the features and functionality of the application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Transcripts](#managing-transcripts)
4. [Generating Podcasts](#generating-podcasts)
5. [Playback and Sharing](#playback-and-sharing)
6. [Account Management](#account-management)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Creating Your Account

1. Navigate to the VeilCast sign-up page
2. Enter your email address and create a secure password
3. Fill in optional profile information (first name, last name)
4. Click "Sign Up" to create your account

### Logging In

1. Visit the VeilCast login page
2. Enter your registered email and password
3. Click "Sign In" to access your dashboard

### First-Time Setup

Upon first login, you'll be prompted to:
1. Choose your default theme (dark/light)
2. Select default voice preferences
3. Set processing preferences

## Dashboard Overview

The Dashboard is your command center for managing all your content.

### Dashboard Layout

![Dashboard Layout](https://placeholder-for-dashboard-screenshot.com)

1. **Navigation Bar**: Access different sections of the application
2. **Statistics Section**: View usage metrics and account limits
3. **Recent Transcripts**: Quick access to your latest uploads
4. **Recent Podcasts**: Recently generated audio content
5. **Quick Actions**: Buttons for common tasks

### Understanding the Interface

- **Tabs**: Switch between Transcripts and Podcasts views
- **Search Bar**: Find specific content in your library
- **Sort Options**: Organize content by date, name, or status
- **Filter Options**: Filter content by processing status

## Managing Transcripts

### Uploading a Transcript

1. From the Dashboard, click the "Upload" button
2. Select a text file from your device or drag and drop into the upload area
3. The system will automatically process your file and display upload progress
4. Once complete, your transcript will appear in your Transcripts list

### Supported File Formats

VeilCast supports the following text formats:
- Plain Text (.txt)
- Rich Text Format (.rtf)
- Microsoft Word (.docx)
- PDF (.pdf) - text content only

### Transcript Management

For each transcript, you can:

- **View**: Read the full text content
- **Edit**: Make changes to the transcript before processing
- **Delete**: Remove the transcript from your library
- **Download**: Save a copy of the transcript to your device
- **Process**: Convert the transcript into a podcast

### Text Formatting Guidelines

For optimal results, format your text as follows:

- Use speaker labels followed by colons (e.g., "Host: Welcome to our show")
- Separate paragraphs with line breaks
- Use standard punctuation marks
- Keep speaker segments reasonably sized (1-3 sentences per turn)

Example of well-formatted text:
```
Host: Welcome to today's episode where we'll be discussing artificial intelligence.

Guest: Thank you for having me. I'm excited to share my thoughts on this topic.

Host: Let's start with the basics. What exactly is artificial intelligence?
```

## Generating Podcasts

### Starting the Generation Process

1. Select a transcript from your list
2. Click "Generate Podcast" button
3. You'll be taken to the podcast generation interface

### Voice Selection

1. The system will automatically identify speakers in your transcript
2. For each speaker, select a voice from the dropdown menu
3. You can preview each voice by clicking the "Play" button
4. Adjust voice settings if needed (speed, pitch, etc.)

### Podcast Settings

Configure your podcast generation with these options:

- **Podcast Title**: Enter a name for your podcast
- **Voice Model**: Choose between standard or enhanced voice quality
- **Processing Mode**: Select between quality (slower) or speed (faster)
- **Test Mode**: Generate a small sample before processing the entire transcript

### Generation Process

1. Click "Generate Podcast" to begin processing
2. The system will show a progress bar indicating completion percentage
3. For longer transcripts, you'll see progress by text chunk
4. Wait for the generation to complete (processing time depends on text length)

### Handling Large Transcripts

For very large transcripts:
1. The system will automatically divide the text into chunks
2. You'll see progress updates for each chunk
3. You can pause and resume generation if needed
4. Completed chunks will be saved even if you leave the page

## Playback and Sharing

### Using the Podcast Player

![Podcast Player](https://placeholder-for-player-screenshot.com)

1. Click on a generated podcast to open the player
2. Use standard controls (play, pause, skip)
3. Adjust volume as needed
4. View the synchronized transcript while listening

### Player Features

- **Synchronized Text**: The text highlights as the audio plays
- **Speed Control**: Adjust playback speed (0.5x to 2x)
- **Segment Navigation**: Jump to specific speakers or segments
- **Full-Screen Mode**: Expand the player for better visibility

### Downloading Your Podcast

1. Open the podcast in the player
2. Click the "Download" button
3. Choose from available formats:
   - MP3 (standard quality)
   - WAV (high quality)
   - M4A (for Apple devices)
4. The file will download to your device

### Sharing Options

1. From the podcast player, click "Share"
2. Choose from sharing options:
   - Generate a shareable link
   - Share via email
   - Download for manual sharing
3. Configure privacy settings:
   - Public (anyone with the link can access)
   - Private (requires authentication)

## Account Management

### Profile Settings

To update your profile:
1. Click your avatar in the top right corner
2. Select "Account Settings"
3. Update your information:
   - Profile details
   - Email address
   - Password

### Subscription Management

1. Navigate to "Subscription" in your account settings
2. View your current plan and usage:
   - Character count used
   - Character limit
   - Plan renewal date
3. Upgrade your plan if needed

### Voice Settings

1. Go to "Voice Settings" in your account
2. Set default voices for future projects
3. Configure preferred voice models and settings

## Troubleshooting

### Common Issues

#### Upload Problems
- Ensure your file is under the maximum size limit (50MB)
- Check that your file format is supported
- Try converting to plain text if other formats fail

#### Generation Failures
- Text may contain unsupported characters
- Very long text segments may cause processing issues
- API limits might be reached (check your character usage)

#### Playback Issues
- Ensure your browser is up to date
- Check your internet connection
- Try downloading the audio for offline playback

### Getting Help

If you encounter problems:
1. Check the FAQ section in the Help Center
2. Use the "Send Feedback" button to report issues
3. Contact support through the "Help" menu

### Error Messages Explained

| Error Code | Meaning | Solution |
|------------|---------|----------|
| E001 | File too large | Split your file into smaller segments |
| E002 | Processing error | Try regenerating or contact support |
| E003 | API limit reached | Upgrade your subscription or wait until reset |
| E004 | Authentication error | Log out and log back in |

## Advanced Features

### AI Editing Assistant

The AI Editing Assistant helps you improve your transcript:

1. Open a transcript and click "AI Edit"
2. Choose editing options:
   - Improve flow and readability
   - Format for better speaker identification
   - Fix grammar and punctuation
3. Review and approve suggested changes

### Batch Processing

For multiple transcripts:
1. Select multiple items using checkboxes
2. Click "Batch Actions"
3. Choose "Generate Podcasts"
4. Configure shared settings for all selected items

### Custom Voice Styles

To create consistent voice styling:
1. Go to "Voice Settings"
2. Create a new voice preset
3. Configure voice parameters
4. Save and apply to future generations

## Keyboard Shortcuts

| Action | Shortcut (Windows/Linux) | Shortcut (Mac) |
|--------|--------------------------|----------------|
| Upload | Ctrl+U | ⌘+U |
| Play/Pause | Space | Space |
| Skip Forward | Right Arrow | Right Arrow |
| Skip Backward | Left Arrow | Left Arrow |
| Volume Up | Up Arrow | Up Arrow |
| Volume Down | Down Arrow | Down Arrow |
| Save | Ctrl+S | ⌘+S |
| Download | Ctrl+D | ⌘+D |

---

Thank you for using VeilCast! We hope this guide helps you create amazing podcast content from your text transcripts.