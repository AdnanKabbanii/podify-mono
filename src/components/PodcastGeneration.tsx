import { CloudUpload, Download, MicNone, ModelTraining, Pause, PlayArrow, VolumeUp } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, FormControl, FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Paper, Select, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { useEffect, useRef, useState } from 'react';

interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
}

interface VoiceConfig {
  [speaker: string]: string; // Maps speaker to voice ID
}

interface UserInfo {
  subscription: {
    tier: string;
    character_count: number;
    character_limit: number;
    status: string;
  };
}

export default function PodcastGeneration() {
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState<boolean>(false);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({});
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userInfoLoading, setUserInfoLoading] = useState<boolean>(false);
  const [generatedAudioSegments, setGeneratedAudioSegments] = useState<{ speaker: string, url: string, text: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testMode, setTestMode] = useState<boolean>(true);
  const [selectedModel, setSelectedModel] = useState<string>("eleven_multilingual_v2");
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const availableModels = [
    { id: "eleven_monolingual_v1", name: "Monolingual v1" },
    { id: "eleven_multilingual_v1", name: "Multilingual v1" },
    { id: "eleven_multilingual_v2", name: "Multilingual v2 (Recommended)" },
    { id: "eleven_turbo_v2", name: "Turbo v2 (Fastest)" }
  ];

  useEffect(() => {
    fetchData();
    fetchUserInfo();
  }, []);

  useEffect(() => {
    return () => {
      generatedAudioSegments.forEach(segment => {
        if (segment.url) {
          URL.revokeObjectURL(segment.url);
        }
      });
    };
  }, [generatedAudioSegments]);

  const fetchData = async () => {
    try {
      setVoicesLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/voices', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.voices) {
        console.log('Fetched voices:', data.voices);
        setVoices(data.voices);
      } else {
        console.error('Voices not available in response:', data);
        setVoices([]);
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
      setError('Failed to fetch voices. Please try again later.');
    } finally {
      setVoicesLoading(false);
    }
  };

  const fetchUserInfo = async () => {
    try {
      setUserInfoLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/elevenlabs/user-info', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.userInfo) {
        console.log('User info fetched:', data.userInfo);
        setUserInfo(data.userInfo);
      } else {
        console.error('User info not available in response:', data);
        // Set default user info
        setUserInfo({
          subscription: {
            tier: "free",
            character_count: 0,
            character_limit: 10000,
            status: "error"
          }
        });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      // Set default user info on error
      setUserInfo({
        subscription: {
          tier: "free",
          character_count: 0,
          character_limit: 10000,
          status: "error"
        }
      });
    } finally {
      setUserInfoLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      
      // Read the file content
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setTranscript(content);
        
        // Extract speakers from the transcript
        const speakerMatches = content.match(/\*\*(.*?)\*\*/g);
        if (speakerMatches) {
          const uniqueSpeakers = Array.from(new Set(
            speakerMatches.map(match => match.replace(/\*\*/g, ''))
          ));
          setSpeakers(uniqueSpeakers);
          
          // Initialize voice config with first voice for each speaker
          const initialConfig: VoiceConfig = {};
          uniqueSpeakers.forEach(speaker => {
            if (voices.length > 0) {
              initialConfig[speaker] = voices[0].voice_id;
            }
          });
          setVoiceConfig(initialConfig);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleVoiceChange = (speaker: string, voiceId: string) => {
    setVoiceConfig(prev => ({
      ...prev,
      [speaker]: voiceId
    }));
  };

  // Split text into chunks based on character limit
  const splitTextIntoChunks = (text: string): string[] => {
    // For testing, limit to 100 characters
    const safeLimit = testMode ? 100 : Math.floor((userInfo?.subscription?.character_limit || 4000) * 0.9);
    
    if (text.length <= safeLimit) {
      return [text];
    }

    // For test mode, just return the first 100 characters
    if (testMode) {
      return [text.substring(0, 100)];
    }

    const chunks: string[] = [];
    let currentChunk = "";
    
    // Split by sentences to avoid cutting in the middle of a sentence
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= safeLimit) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        // If a single sentence is longer than the limit, we need to split it
        if (sentence.length > safeLimit) {
          // Split the sentence into smaller chunks
          let remainingSentence = sentence;
          while (remainingSentence.length > 0) {
            const chunk = remainingSentence.substring(0, safeLimit);
            chunks.push(chunk);
            remainingSentence = remainingSentence.substring(safeLimit);
          }
        } else {
          currentChunk = sentence;
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  };

  const extractDialogueSegments = () => {
    if (!transcript) return [];
    
    const segments: { speaker: string, text: string }[] = [];
    const lines = transcript.split('\n');
    
    let currentSpeaker = '';
    let currentText = '';
    
    for (const line of lines) {
      const speakerMatch = line.match(/\*\*(.*?)\*\*/);
      
      if (speakerMatch) {
        // If we have a previous speaker and text, add it to segments
        if (currentSpeaker && currentText.trim()) {
          segments.push({
            speaker: currentSpeaker,
            text: currentText.trim()
          });
        }
        
        // Start new segment
        currentSpeaker = speakerMatch[1];
        currentText = line.replace(/\*\*.*?\*\*/, '').trim();
      } else if (line.trim() && currentSpeaker) {
        // Continue current segment
        currentText += ' ' + line.trim();
      }
    }
    
    // Add the last segment
    if (currentSpeaker && currentText.trim()) {
      segments.push({
        speaker: currentSpeaker,
        text: currentText.trim()
      });
    }
    
    return segments;
  };

  const generateSpeech = async () => {
    try {
      setError(null);
      setIsGenerating(true);
      
      // Clean up previous audio URLs
      generatedAudioSegments.forEach(segment => {
        if (segment.url) {
          URL.revokeObjectURL(segment.url);
        }
      });
      setGeneratedAudioSegments([]);
      
      const dialogueSegments = extractDialogueSegments();
      
      if (dialogueSegments.length === 0) {
        throw new Error('No dialogue segments found in the transcript');
      }
      
      // For test mode, only process the first segment
      const segmentsToProcess = testMode ? [dialogueSegments[0]] : dialogueSegments;
      
      for (const segment of segmentsToProcess) {
        const { speaker, text } = segment;
        
        if (!voiceConfig[speaker]) {
          console.warn(`No voice selected for ${speaker}, skipping`);
          continue;
        }
        
        try {
          console.log(`Generating speech for segment by ${speaker}`);
          
          // Split text into smaller chunks if needed
          const textChunks = splitTextIntoChunks(text);
          console.log(`Split text into ${textChunks.length} chunks`);
          
          // For test mode, only process the first chunk
          const chunksToProcess = testMode ? [textChunks[0]] : textChunks;
          
          for (const chunkText of chunksToProcess) {
            const response = await fetch('/api/tts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                text: chunkText,
                voiceId: voiceConfig[speaker],
                modelId: selectedModel
              })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              console.error('TTS API error:', errorData);
              throw new Error(errorData.message || 'Error from ElevenLabs API');
            }
            
            // Get the audio as ArrayBuffer
            const audioArrayBuffer = await response.arrayBuffer();
            
            // Convert to blob
            const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/mpeg' });
            
            // Create URL for the blob
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Add to generated segments
            setGeneratedAudioSegments(prev => [
              ...prev,
              { speaker, url: audioUrl, text: chunkText }
            ]);
            
            // In test mode, we only generate one segment
            if (testMode) {
              break;
            }
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Error generating speech for segment by ${speaker}:`, error);
          setError(`Error generating speech for ${speaker}: ${errorMessage}`);
        }
        // In test mode, we only generate one segment
        if (testMode) {
          break;
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error generating speech:', error);
      setError(`Error generating speech: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayAudio = (index: number) => {
    // Stop currently playing audio if any
    if (currentPlayingIndex !== null && audioRefs.current[currentPlayingIndex]) {
      audioRefs.current[currentPlayingIndex]?.pause();
    }
    
    // Play the selected audio
    if (audioRefs.current[index]) {
      audioRefs.current[index]?.play();
      setCurrentPlayingIndex(index);
      
      // Highlight the text being played
      setHighlightedText(generatedAudioSegments[index].text);
      
      // When audio ends, reset the current playing index
      audioRefs.current[index]?.addEventListener('ended', () => {
        setCurrentPlayingIndex(null);
        setHighlightedText(null);
      });
    }
  };

  const handleDownload = (index: number) => {
    const segment = generatedAudioSegments[index];
    if (!segment.url) return;
    
    const a = document.createElement('a');
    a.href = segment.url;
    a.download = `${segment.speaker.replace(/\s+/g, '_')}_segment_${index + 1}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = () => {
    generatedAudioSegments.forEach((segment, index) => {
      setTimeout(() => {
        handleDownload(index);
      }, index * 500); // Stagger downloads to avoid browser issues
    });
  };

  const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
  });

  const renderUserInfo = () => {
    if (userInfoLoading) {
      return <CircularProgress size={20} />;
    }
    
    if (!userInfo) {
      return <Typography color="error">User info not available</Typography>;
    }
    
    return (
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="subtitle2">
          ElevenLabs Account: <Chip 
            label={userInfo.subscription.tier.toUpperCase()} 
            color={userInfo.subscription.tier === 'free' ? 'default' : 'primary'} 
            size="small" 
          />
        </Typography>
        <Typography variant="body2">
          Character limit: {userInfo.subscription.character_limit.toLocaleString()}
        </Typography>
        <Typography variant="body2">
          Characters used: {userInfo.subscription.character_count.toLocaleString()}
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Podcast Generation
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              1. Upload Transcript
            </Typography>
            
            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUpload />}
              sx={{ mb: 2 }}
            >
              Upload Transcript
              <VisuallyHiddenInput type="file" accept=".txt,.md" onChange={handleFileChange} />
            </Button>
            
            {file && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                Uploaded: {file.name}
              </Typography>
            )}
            
            {transcript && (
              <TextField
                label="Transcript Preview"
                multiline
                rows={6}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                fullWidth
                variant="outlined"
                sx={{ mb: 2 }}
              />
            )}
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              2. Account Information
            </Typography>
            
            {renderUserInfo()}
            
            <FormControlLabel
              control={
                <Switch 
                  checked={testMode} 
                  onChange={(e) => setTestMode(e.target.checked)} 
                />
              }
              label="Test Mode (100 char limit, 1 segment only)"
            />
            
            <Typography variant="h6" sx={{ mt: 3 }}>
              3. Select Model
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
              <InputLabel>TTS Model</InputLabel>
              <Select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                label="TTS Model"
                startAdornment={<ModelTraining sx={{ mr: 1 }} />}
              >
                {availableModels.map(model => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {speakers.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            4. Assign Voices to Speakers
          </Typography>
          
          <Grid container spacing={2}>
            {speakers.map((speaker) => (
              <Grid item xs={12} sm={6} md={4} key={speaker}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      <MicNone sx={{ verticalAlign: 'middle', mr: 1 }} />
                      {speaker}
                    </Typography>
                    
                    <FormControl fullWidth size="small">
                      <InputLabel>Voice</InputLabel>
                      <Select
                        value={voiceConfig[speaker] || ''}
                        onChange={(e) => handleVoiceChange(speaker, e.target.value)}
                        label="Voice"
                        disabled={voicesLoading}
                      >
                        {voices.map((voice) => (
                          <MenuItem key={voice.voice_id} value={voice.voice_id}>
                            {voice.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </CardContent>
                  
                  {voiceConfig[speaker] && voices.find(v => v.voice_id === voiceConfig[speaker])?.preview_url && (
                    <CardActions>
                      <Button 
                        size="small" 
                        startIcon={<PlayArrow />}
                        onClick={() => {
                          const audio = new Audio(voices.find(v => v.voice_id === voiceConfig[speaker])?.preview_url);
                          audio.play();
                        }}
                      >
                        Preview Voice
                      </Button>
                    </CardActions>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={generateSpeech}
              disabled={isGenerating || Object.keys(voiceConfig).length === 0}
              startIcon={isGenerating ? <CircularProgress size={20} /> : <VolumeUp />}
            >
              {isGenerating ? 'Generating...' : 'Generate Audio'}
            </Button>
          </Box>
        </Paper>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {generatedAudioSegments.length > 0 && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            5. Generated Audio Segments
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleDownloadAll}
              sx={{ mr: 1 }}
            >
              Download All
            </Button>
          </Box>
          
          {generatedAudioSegments.map((segment, index) => (
            <Card key={index} variant="outlined" sx={{ mb: 2, position: 'relative' }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  <Chip 
                    label={segment.speaker} 
                    color="primary" 
                    size="small" 
                    sx={{ mr: 1 }} 
                  />
                </Typography>
                
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mb: 2,
                    backgroundColor: highlightedText === segment.text ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
                    padding: 1,
                    borderRadius: 1,
                    transition: 'background-color 0.3s'
                  }}
                >
                  {segment.text}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton 
                    color={currentPlayingIndex === index ? "secondary" : "primary"}
                    onClick={() => handlePlayAudio(index)}
                  >
                    {currentPlayingIndex === index ? <Pause /> : <PlayArrow />}
                  </IconButton>
                  
                  <audio 
                    ref={(el: HTMLAudioElement | null) => {
                      audioRefs.current[index] = el;
                    }}
                    src={segment.url} 
                    onTimeUpdate={() => {
                    }}
                  />
                  
                  <Tooltip title="Download">
                    <IconButton onClick={() => handleDownload(index)}>
                      <Download />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Paper>
      )}
    </Box>
  );
} 