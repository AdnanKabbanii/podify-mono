import {
  AudioFile,
  AutoAwesome,
  Delete,
  Download,
  Forward10,
  Info as InfoIcon,
  LibraryMusic,
  ModelTraining,
  Pause,
  PlayArrow,
  Replay10,
  Save,
  Speed,
  VolumeOff,
  VolumeUp
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  alpha,
  styled,
  useTheme
} from "@mui/material";
import { Theme } from "@mui/material/styles";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";
import {
  BlueAccent,
  GlowingCard,
  PageContainer,
} from "../styles/commonStyles.js";

interface AIVoice {
  id: string;
  name: string;
  color: string;
  model: string;
  accent?: string;
  style?: string;
  previewUrl?: string;
}

interface DialogueLine {
  speakerId: string;
  text: string;
  timestamp: string;
  isActive: boolean;
}
interface EditingState {
  isEditing: boolean;
  editingLineIndex: number | null;
  editingText: string;
  hasUnsavedChanges: boolean;
}

interface AudioState {
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
}
interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
}

interface VoiceConfig {
  [speaker: string]: string;
}

interface UserInfo {
  subscription: {
    tier: string;
    character_count: number;
    character_limit: number;
    status: string;
  };
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AudioVisualizer = styled(Box)(({ theme }: { theme: Theme }) => ({
  width: "100%",
  height: "200px",
  borderRadius: theme.shape.borderRadius,
  background: `linear-gradient(180deg, 
    ${alpha(theme.palette.primary.main, 0.1)} 0%, 
    ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
  overflow: "hidden",
  position: "relative",
}));

const TranscriptLine = styled(motion.div)<{ theme?: Theme; active?: boolean; hasAudio?: boolean }>(
  ({ theme, active, hasAudio }) => ({
    padding: theme?.spacing(2),
    borderRadius: theme?.shape.borderRadius,
    cursor: hasAudio ? "pointer" : "default",
    transition: "all 0.3s ease",
    background: active
      ? alpha(theme?.palette.primary.main || "#1976d2", 0.1)
      : "transparent",
    "&:hover": {
      background: hasAudio 
        ? alpha(theme?.palette.primary.main || "#1976d2", 0.05)
        : "transparent",
    },
  }),
);

export default function PodcastPlayer() {
  const { transcriptId } = useParams();
  // navigate is used in other functions like handleShare, handleSaveChanges, etc.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigate = useNavigate();
  const { token } = useAuth();
  const theme = useTheme();
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const animationRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [podcast, setPodcast] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [dialogueLines, setDialogueLines] = useState<DialogueLine[]>([]);
  const [speedMenuAnchor, setSpeedMenuAnchor] = useState<null | HTMLElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);
  const [audioState, setAudioState] = useState<AudioState>({
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    playbackRate: 1.0,
  });
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editingState, setEditingState] = useState<EditingState>({
    isEditing: false,
    editingLineIndex: null,
    editingText: "",
    hasUnsavedChanges: false,
  });
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [aiLoading, setAiLoading] = useState(false);
  
  // Add states for podcast generation
  const [showGenerationPanel, setShowGenerationPanel] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState<boolean>(false);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({});
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userInfoLoading, setUserInfoLoading] = useState<boolean>(false);
  const [generatedAudioSegments, setGeneratedAudioSegments] = useState<{ speaker: string, url: string, text: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [testMode, setTestMode] = useState<boolean>(true);
  const [selectedModel, setSelectedModel] = useState<string>("eleven_multilingual_v2");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedVoices, setSelectedVoices] = useState<Record<string, string>>({});
  
  // Add state to track generated audio for each dialogue line
  const [lineAudioMap, setLineAudioMap] = useState<Map<number, string>>(new Map());
  const [activeAudioLineIndex, setActiveAudioLineIndex] = useState<number | null>(null);
  
  // Add state for saved media files
  const [savedMediaFiles, setSavedMediaFiles] = useState<Array<{
    id: string;
    podcastId: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    storageKey?: string;
    speakerId?: string;
    segmentText?: string;
    duration?: number;
    url?: string;
    createdAt: string;
    updatedAt: string;
  }>>([]);
  const [isSavingMedia, setIsSavingMedia] = useState<boolean>(false);
  const [showSavedMedia, setShowSavedMedia] = useState<boolean>(false);
  
  // Available ElevenLabs models
  const availableModels = [
    { id: "eleven_monolingual_v1", name: "Monolingual v1" },
    { id: "eleven_multilingual_v1", name: "Multilingual v1" },
    { id: "eleven_multilingual_v2", name: "Multilingual v2 (Recommended)" },
    { id: "eleven_flash_v2_5", name: "Flash v2.5 (50% cheaper)" },
    { id: "eleven_turbo_v2", name: "Turbo v2 (Fastest)" }
  ];
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const initializeAudioContext = () => {
    if (audioRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }
  };

  // Audio visualization
  const drawVisualizer = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!ctx || !analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, theme.palette.primary.main);
        gradient.addColorStop(1, alpha(theme.palette.primary.main, 0.5));

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  }, [theme.palette.primary.main]);

  // Initialize audio context when component mounts
  useEffect(() => {
    // Set initial volume and playback rate
    const audio = audioRef.current;
    if (audio) {
      audio.volume = audioState.volume;
      audio.playbackRate = audioState.playbackRate;
    }

    return () => {
      // Clean up animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      // Clean up audio nodes
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (error) {
          console.error("Error disconnecting source:", error);
        }
      }
      
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect();
        } catch (error) {
          console.error("Error disconnecting analyser:", error);
        }
      }
      
      // Clean up audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (error) {
          console.error("Error closing audio context:", error);
        }
      }
    };
  }, [audioState.volume, audioState.playbackRate]);

  // Update visualization when playing state changes
  useEffect(() => {
    if (isPlaying) {
      // Resume audio context if it was suspended
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      drawVisualizer();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, drawVisualizer]);

  // Audio controls
  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    // Initialize audio context if it doesn't exist yet
    if (!audioContextRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      } catch (error) {
        console.error("Error initializing audio context:", error);
      }
    }

    // Resume audio context if it's suspended (needed for Chrome's autoplay policy)
    if (audioContextRef.current?.state === "suspended") {
      try {
        await audioContextRef.current.resume();
      } catch (err) {
        console.error("Failed to resume audio context:", err);
      }
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    } else {
      // If there's no src set, try to use the first generated audio if available
      if ((!audio.src || audio.src === "") && generatedAudioSegments.length > 0) {
        setActiveAudioLineIndex(0);
        audio.src = generatedAudioSegments[0].url;
        audio.load();
      }
      
      // Only try to play if we have a valid source
      if (audio.src && audio.src !== "") {
        try {
          await audio.play();
          setIsPlaying(true);
          // Start visualization
          drawVisualizer();
        } catch (error) {
          console.error("Error playing audio:", error);
          setError("Failed to play audio. Please try again or generate audio first.");
        }
      } else {
        setError("No audio available. Please generate audio first.");
      }
    }
  };

  // Connect generated audio to main player
  const connectAudioToMainPlayer = async (audioUrl: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Stop any currently playing audio
    audio.pause();
    setIsPlaying(false);
    
    // Set the new audio source
    audio.src = audioUrl;
    
    // Reset audio state
    setAudioState(prev => ({
      ...prev,
      currentTime: 0,
      duration: 0
    }));
    
    // Load and play the audio
    audio.load();
    
    // Wait a short time for the audio to load before playing
    try {
      // Use setTimeout with a promise to give the audio time to load
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await audio.play();
      setIsPlaying(true);
      
      // Start visualization if not already running
      if (!animationRef.current) {
        drawVisualizer();
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setError("Failed to play audio. Please try again.");
    }
  };

  // Fetch podcast data
  useEffect(() => {
    const fetchData = async () => {
      if (!transcriptId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/transcripts/${transcriptId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch transcript");
        }
        
        const data = await response.json();
        setPodcast(data.transcript.podcast);
        
        // If there's a podcast associated with this transcript, fetch it
        if (data.transcript.podcast) {
          const podcastResponse = await fetch(`/api/podcasts/${data.transcript.podcast.id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          
          if (podcastResponse.ok) {
            const podcastData = await podcastResponse.json();
            setPodcast(podcastData.podcast);
            
            // Parse dialogue lines from podcast content
            if (podcastData.podcast.content) {
              const lines = data.transcript.content
                .split("\n\n")
                .filter((line: string) => line.trim() !== "")
                .map((line: string, index: number) => {
                  const [speaker, text] = line.split(": ");
                  return {
                    speakerId: speaker.toLowerCase(),
                    text: text || "",
                    timestamp: `${Math.floor((index * 30) / 60)}:${(index * 30) % 60}`,
                    isActive: index === 0,
                  };
                });
              setDialogueLines(lines);
            }
            
            // Parse voice config if available
            if (podcastData.podcast.voiceConfig) {
              try {
                const config = JSON.parse(podcastData.podcast.voiceConfig);
                setVoiceConfig(config);
              } catch (e) {
                console.error("Error parsing voice config:", e);
              }
            }
            
            // Fetch saved media files for this podcast
            fetchSavedMediaFiles(podcastData.podcast.id);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load transcript data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [transcriptId]);
  
  const fetchSavedMediaFiles = async (podcastId: string) => {
    try {
      const response = await fetch(`/api/podcasts/${podcastId}/media`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedMediaFiles(data.mediaFiles || []);
      }
    } catch (error) {
      console.error("Error fetching saved media files:", error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setAudioState(prev => ({
        ...prev,
        currentTime: audio.currentTime || 0
      }));

      // Update active line based on current time
      const currentTime = audio.currentTime;
      const lineIndex = Math.floor(currentTime / 30);
      if (lineIndex !== activeLineIndex) {
        setActiveLineIndex(lineIndex);
      }
    }
  };

  const handleSeek = (_: Event, newValue: number | number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = newValue as number;
    
    // Make sure we have a valid time value
    if (isNaN(time) || time < 0 || time > (audio.duration || 0)) {
      console.warn("Invalid seek time:", time);
      return;
    }
    
    // Update the current time
    audio.currentTime = time;
    
    // Also update the state to reflect the change immediately in the UI
    setAudioState(prev => ({
      ...prev,
      currentTime: time
    }));
  };

  const handleVolumeChange = (_: Event, newValue: number | number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    const volume = (newValue as number) / 100;
    audio.volume = volume;
    setAudioState((prev) => ({ ...prev, volume }));
    if (volume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleSpeedChange = (speed: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
    setAudioState((prev) => ({ ...prev, playbackRate: speed }));
    setSpeedMenuAnchor(null);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/podcast/${transcriptId}`;
      await navigator.clipboard.writeText(shareUrl);
      // You could add a toast notification here
      setMoreMenuAnchor(null);
    } catch (error) {
      console.error("Error sharing podcast:", error);
    }
  };

  // Update the handleVoiceToggle function to work with Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleVoiceToggle = (voice: AIVoice) => {
    setSelectedVoices(prev => {
      const newSelectedVoices = { ...prev };
      if (newSelectedVoices[voice.id]) {
        delete newSelectedVoices[voice.id];
      } else {
        newSelectedVoices[voice.id] = voice.name;
      }
      return newSelectedVoices;
    });
  };

  // function to handle entering edit mode
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleEnterEditMode = () => {
    setEditingState((prev) => ({
      ...prev,
      isEditing: true,
      hasUnsavedChanges: false,
    }));

    // Pause audio when entering edit mode
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // function to handle exiting edit mode
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleExitEditMode = () => {
    // If there are unsaved changes, confirm before exiting
    if (editingState.hasUnsavedChanges) {
      if (
        !window.confirm(
          "You have unsaved changes. Are you sure you want to exit edit mode?",
        )
      ) {
        return;
      }
    }

    setEditingState({
      isEditing: false,
      editingLineIndex: null,
      editingText: "",
      hasUnsavedChanges: false,
    });
  };
  
  // function to handle text changes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingState({
      ...editingState,
      editingText: e.target.value,
      hasUnsavedChanges: true,
    });
  };

  // function to save the edited line
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSaveLine = () => {
    if (editingState.editingLineIndex === null) return;

    const newLines = [...dialogueLines];
    newLines[editingState.editingLineIndex] = {
      ...newLines[editingState.editingLineIndex],
      text: editingState.editingText,
    };

    setDialogueLines(newLines);
    setEditingState({
      ...editingState,
      editingLineIndex: null,
      editingText: "",
      hasUnsavedChanges: true,
    });
  };

  // function to save all changes to the server
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSaveChanges = async () => {
    try {
      setIsLoading(true);

      // Construct the updated content from dialogue lines
      const updatedContent = dialogueLines
        .map((line) => {
          // Convert speakerId to proper case for display
          const speaker =
            line.speakerId.charAt(0).toUpperCase() + line.speakerId.slice(1);
          return `${speaker}: ${line.text}`;
        })
        .join("\n\n");

      if (transcriptId) {
        const response = await fetch(`/api/podcasts/${transcriptId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: updatedContent,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save changes");
        }

        // Update the podcast state with the new content
        setPodcast((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            content: updatedContent,
          };
        });

        // Exit edit mode
        setEditingState({
          isEditing: false,
          editingLineIndex: null,
          editingText: "",
          hasUnsavedChanges: false,
        });
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      setError("Failed to save changes");
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to handle opening AI assistant
  const handleOpenAiAssistant = () => {
    // Pause audio when opening AI assistant
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    setAiAssistantOpen(true);
  };

  // Add function to handle applying AI suggestion
  const handleApplySuggestion = (suggestion: string) => {
    if (editingState.editingLineIndex !== null) {
      setEditingState({
        ...editingState,
        editingText: suggestion,
        hasUnsavedChanges: true,
      });
    }
  };

  // Add function to handle applying improved full transcript
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleApplyImprovedTranscript = async () => {
    try {
      setIsLoading(true);
      // Implementation would go here
      console.log("Applying improved transcript");
    } catch (error) {
      console.error("Error applying improved transcript:", error);
      setError("Failed to apply improved transcript");
    } finally {
      setIsLoading(false);
    }
  };

  // Add podcast generation functions
  useEffect(() => {
    if (showGenerationPanel) {
      fetchVoices();
      fetchUserInfo();
    }
  }, []);

  // Clean up audio URLs when component unmounts
  useEffect(() => {
    return () => {
      generatedAudioSegments.forEach(segment => {
        if (segment.url) {
          URL.revokeObjectURL(segment.url);
        }
      });
    };
  }, []);

  const fetchVoices = async () => {
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
        
        // Initialize voice config with first voice for each speaker
        if (dialogueLines.length > 0) {
          const speakers = Array.from(new Set(dialogueLines.map(line => line.speakerId)));
          const initialConfig: VoiceConfig = {};
          speakers.forEach(speaker => {
            if (data.voices.length > 0) {
              initialConfig[speaker] = data.voices[0].voice_id;
            }
          });
          setVoiceConfig(initialConfig);
        }
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
      
      // Clear previous line audio map
      setLineAudioMap(new Map());
      
      if (dialogueLines.length === 0) {
        throw new Error('No dialogue segments found in the transcript');
      }
      
      // For test mode, only process the first segment
      const segmentsToProcess = testMode ? [dialogueLines[0]] : dialogueLines;
      const newLineAudioMap = new Map<number, string>();
      
      for (let i = 0; i < segmentsToProcess.length; i++) {
        const line = segmentsToProcess[i];
        const speaker = line.speakerId;
        const text = line.text;
        
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
            
            // Map the audio URL to the dialogue line index
            const lineIndex = dialogueLines.findIndex(
              dl => dl.speakerId === speaker && dl.text === text
            );
            if (lineIndex !== -1) {
              newLineAudioMap.set(lineIndex, audioUrl);
            }
            
            // In test mode, we only generate one segment
            if (testMode) {
              break;
            }
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error generating speech for segment by ${speaker}:`, error);
          setError(`Error generating speech for ${speaker}: ${errorMessage}`);
        }
        
        // In test mode, we only generate one segment
        if (testMode) {
          break;
        }
      }
      
      // Update the line audio map
      setLineAudioMap(newLineAudioMap);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error generating speech:', error);
      setError(`Error generating speech: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Update the playLineAudio function to handle segment playback
  const playLineAudio = (lineIndex: number) => {
    const audioUrl = lineAudioMap.get(lineIndex);
    if (!audioUrl) return;
    
    // Update the active line index before connecting to main player
    setActiveAudioLineIndex(lineIndex);
    
    // Connect to main player
    connectAudioToMainPlayer(audioUrl);
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

  // Update the handleGeneratePodcast function
  const handleGeneratePodcast = () => {
    setShowGenerationPanel(!showGenerationPanel);
  };

  // function to handle editing a specific line
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleEditLine = (index: number) => {
    if (!editingState.isEditing) return;

    setEditingState({
      ...editingState,
      editingLineIndex: index,
      editingText: dialogueLines[index].text,
    });
  };

  // Update the main player UI to show the current audio status
  const renderMainPlayer = () => {
    return (
      <GlowingCard sx={{ mb: 4, overflow: 'hidden' }}>
        {/* Visualizer Section */}
        <Box 
          sx={{ 
            height: "180px", 
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <canvas
            ref={canvasRef}
            width="800"
            height="180"
            style={{ 
              width: "100%", 
              height: "100%",
              position: 'absolute',
              top: 0,
              left: 0
            }}
          />
          {/* Overlay gradient */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(180deg, 
                ${alpha(theme.palette.background.paper, 0)} 0%, 
                ${alpha(theme.palette.background.paper, 0.8)} 90%,
                ${theme.palette.background.paper} 100%
              )`,
              zIndex: 1
            }}
          />
        </Box>

        {/* Player Controls Section */}
        <Box sx={{ p: 3, pt: 1 }}>
          {/* Current Audio Info */}
          {generatedAudioSegments.length > 0 && activeAudioLineIndex !== null && (
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  color: theme.palette.primary.main,
                  mb: 0.5
                }}
              >
                {generatedAudioSegments[activeAudioLineIndex].speaker.charAt(0).toUpperCase() + 
                 generatedAudioSegments[activeAudioLineIndex].speaker.slice(1)}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  maxWidth: '600px', 
                  margin: '0 auto',
                  lineHeight: 1.6
                }}
              >
                {generatedAudioSegments[activeAudioLineIndex].text}
              </Typography>
            </Box>
          )}

          {/* Progress Bar */}
          <Box sx={{ mb: 2 }}>
            <Slider
              value={audioState.currentTime}
              max={audioState.duration || 100}
              onChange={handleSeek}
              aria-labelledby="time-slider"
              sx={{
                color: theme.palette.primary.main,
                height: 4,
                '& .MuiSlider-thumb': {
                  width: 8,
                  height: 8,
                  transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: `0px 0px 0px 8px ${alpha(theme.palette.primary.main, 0.16)}`,
                  },
                  '&.Mui-active': {
                    width: 12,
                    height: 12,
                  },
                },
                '& .MuiSlider-rail': {
                  opacity: 0.28,
                },
              }}
            />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {formatTime(audioState.currentTime)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTime(audioState.duration)}
              </Typography>
            </Stack>
          </Box>

          {/* Main Controls */}
          <Stack 
            direction="row" 
            spacing={2} 
            alignItems="center"
            justifyContent="center"
            sx={{ mb: 3 }}
          >
            <IconButton 
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                }
              }}
              sx={{ 
                color: theme.palette.text.secondary,
                '&:hover': { color: theme.palette.primary.main }
              }}
            >
              <Replay10 />
            </IconButton>
            <IconButton
              onClick={handlePlayPause}
              sx={{ 
                width: 56,
                height: 56,
                color: "white", 
                bgcolor: isPlaying ? "secondary.main" : "primary.main",
                '&:hover': {
                  bgcolor: isPlaying ? "secondary.dark" : "primary.dark",
                },
                transition: 'all 0.3s ease'
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
            <IconButton 
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.min(
                    audioRef.current.duration || 0,
                    audioRef.current.currentTime + 10
                  );
                }
              }}
              sx={{ 
                color: theme.palette.text.secondary,
                '&:hover': { color: theme.palette.primary.main }
              }}
            >
              <Forward10 />
            </IconButton>
          </Stack>

          {/* Secondary Controls */}
          <Stack 
            direction="row" 
            spacing={2} 
            alignItems="center"
            justifyContent="center"
          >
            {/* Volume Control */}
            <Stack 
              direction="row" 
              spacing={1} 
              alignItems="center"
              sx={{ 
                minWidth: 150,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                borderRadius: 2,
                p: 1
              }}
            >
              <IconButton 
                size="small"
                onClick={() => {
                  if (audioRef.current) {
                    setIsMuted(!isMuted);
                    audioRef.current.muted = !isMuted;
                  }
                }}
                sx={{ color: isMuted ? 'text.disabled' : 'primary.main' }}
              >
                {isMuted ? <VolumeOff /> : <VolumeUp />}
              </IconButton>
              <Slider
                size="small"
                value={isMuted ? 0 : audioState.volume * 100}
                onChange={handleVolumeChange}
                aria-labelledby="volume-slider"
                sx={{ 
                  color: isMuted ? 'text.disabled' : 'primary.main',
                  '& .MuiSlider-rail': {
                    opacity: 0.28,
                  }
                }}
              />
            </Stack>

            {/* Playback Speed */}
            <Button
              size="small"
              startIcon={<Speed />}
              onClick={(e) => setSpeedMenuAnchor(e.currentTarget)}
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                }
              }}
            >
              {audioState.playbackRate}x
            </Button>

            {/* Download Button */}
            {generatedAudioSegments.length > 0 && (
              <Button
                size="small"
                startIcon={<Download />}
                onClick={handleDownloadAll}
                sx={{ 
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  }
                }}
              >
                Download All
              </Button>
            )}
            
            {/* Save Button */}
            {generatedAudioSegments.length > 0 && (
              <Button
                size="small"
                startIcon={isSavingMedia ? <CircularProgress size={16} /> : <Save />}
                onClick={saveGeneratedAudio}
                disabled={isSavingMedia}
                sx={{ 
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  }
                }}
              >
                {isSavingMedia ? 'Saving...' : 'Save All'}
              </Button>
            )}
          </Stack>
        </Box>
      </GlowingCard>
    );
  };

  const saveGeneratedAudio = async () => {
    if (!podcast || generatedAudioSegments.length === 0) {
      setError("No audio to save");
      return;
    }
    
    setIsSavingMedia(true);
    
    try {
      // Save each audio segment
      for (let i = 0; i < generatedAudioSegments.length; i++) {
        const segment = generatedAudioSegments[i];
        
        // Fetch the audio data as blob
        const response = await fetch(segment.url);
        const audioBlob = await response.blob();
        
        // Convert blob to base64
        const reader = new FileReader();
        const audioBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(audioBlob);
        });
        
        // Create filename
        const filename = `segment_${i + 1}_${segment.speaker.replace(/\s+/g, '_')}.mp3`;
        
        // Save to server
        await fetch(`/api/podcasts/${podcast.id}/media/blob`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            audioBlob: audioBase64,
            filename,
            fileSize: audioBlob.size,
            mimeType: audioBlob.type || 'audio/mpeg',
            speakerId: segment.speaker,
            segmentText: segment.text,
            duration: audioState.duration || 0
          })
        });
      }
      
      // Refresh saved media files
      await fetchSavedMediaFiles(podcast.id);
      setShowSavedMedia(true);
      
    } catch (error) {
      console.error("Error saving audio:", error);
      setError("Failed to save audio files. Please try again.");
    } finally {
      setIsSavingMedia(false);
    }
  };
  
  const playSavedMedia = (mediaFile: {
    id: string;
    podcastId: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    storageKey?: string;
    speakerId?: string;
    segmentText?: string;
    duration?: number;
    url?: string;
  }) => {
    if (!mediaFile.url) return;
    
    // Update the active line index if possible
    if (mediaFile.speakerId) {
      const lineIndex = dialogueLines.findIndex(
        line => line.speakerId === mediaFile.speakerId && line.text.includes(mediaFile.segmentText || '')
      );
      
      if (lineIndex !== -1) {
        setActiveAudioLineIndex(lineIndex);
      }
    }
    
    // Connect to main player
    connectAudioToMainPlayer(mediaFile.url);
  };
  
  const deleteSavedMedia = async (mediaId: string) => {
    try {
      const response = await fetch(`/api/podcasts/media/${mediaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        // Refresh saved media files
        if (podcast) {
          await fetchSavedMediaFiles(podcast.id);
        }
      }
    } catch (error) {
      console.error("Error deleting media file:", error);
      setError("Failed to delete media file. Please try again.");
    }
  };
  
  // Render saved media files section
  const renderSavedMediaFiles = () => {
    if (savedMediaFiles.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          No saved audio files found.
        </Typography>
      );
    }
    
    return (
      <List sx={{ width: '100%' }}>
        {savedMediaFiles.map((mediaFile) => (
          <ListItem
            key={mediaFile.id}
            secondaryAction={
              <IconButton edge="end" aria-label="delete" onClick={() => deleteSavedMedia(mediaFile.id)}>
                <Delete />
              </IconButton>
            }
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                <AudioFile />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={mediaFile.speakerId || 'Audio Segment'}
              secondary={
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {mediaFile.segmentText || mediaFile.filename}
                </Typography>
              }
            />
            <IconButton color="primary" onClick={() => playSavedMedia(mediaFile)}>
              <PlayArrow />
            </IconButton>
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <PageContainer>
      {/* Hidden audio element for Web Audio API */}
      <audio 
        ref={audioRef} 
        style={{ display: 'none' }} 
        crossOrigin="anonymous"
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (audio) {
            setAudioState(prev => ({
              ...prev,
              currentTime: audio.currentTime || 0
            }));
          }
        }}
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (audio) {
            setAudioState(prev => ({
              ...prev,
              duration: audio.duration || 0
            }));
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          // If we have more segments, play the next one
          if (generatedAudioSegments.length > 0 && activeAudioLineIndex !== null) {
            const nextIndex = activeAudioLineIndex + 1;
            if (nextIndex < generatedAudioSegments.length) {
              setActiveAudioLineIndex(nextIndex);
              connectAudioToMainPlayer(generatedAudioSegments[nextIndex].url);
            }
          }
        }}
      />
      
      <BlueAccent sx={{ top: "5%", right: "5%" }} />
      <BlueAccent sx={{ bottom: "5%", left: "5%" }} />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, py: { xs: 12, md: 16 } }}>
        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "50vh",
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        ) : (
          <>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h4" component="h1" gutterBottom>
                {podcast?.title || "Loading..."}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<LibraryMusic />}
                  onClick={() => setShowSavedMedia(!showSavedMedia)}
                >
                  {showSavedMedia ? "Hide Saved Audio" : "Show Saved Audio"}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AutoAwesome />}
                  onClick={handleGeneratePodcast}
                >
                  {showGenerationPanel ? "Hide Generation Panel" : "Generate Podcast"}
                </Button>
              </Stack>
            </Box>

            {/* Saved Media Files Section */}
            {showSavedMedia && (
              <GlowingCard sx={{ mb: 4 }}>
                <Box sx={{ p: 3 }}>
                  <Typography 
                    variant="h6" 
                    gutterBottom
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      mb: 2
                    }}
                  >
                    <LibraryMusic sx={{ mr: 1 }} />
                    Saved Audio Files
                  </Typography>
                  
                  {renderSavedMediaFiles()}
                </Box>
              </GlowingCard>
            )}

            {/* Generation Panel */}
            {showGenerationPanel && (
              <GlowingCard sx={{ mb: 4 }}>
                <Box sx={{ p: 3 }}>
                  <Typography 
                    variant="h6" 
                    gutterBottom
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      mb: 2
                    }}
                  >
                    <ModelTraining sx={{ mr: 1 }} />
                    Generate Audio
                  </Typography>
                  
                  {renderUserInfo()}
                  
                  <Divider sx={{ 
                    my: 2,
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                    '&::before, &::after': {
                      borderColor: alpha(theme.palette.primary.main, 0.2),
                    }
                  }} />
                  
                  <Typography 
                    variant="subtitle1" 
                    gutterBottom
                    sx={{
                      color: theme.palette.primary.main,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2
                    }}
                  >
                    <VolumeUp sx={{ mr: 1, fontSize: '1rem' }} />
                    Voice Selection
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {dialogueLines
                      .map(line => line.speakerId)
                      .filter((speaker, index, self) => self.indexOf(speaker) === index)
                      .map(speaker => (
                        <Grid item xs={12} sm={6} key={speaker}>
                          <FormControl 
                            fullWidth 
                            size="small"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '10px',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                                },
                                '&.Mui-focused': {
                                  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.3)}`,
                                }
                              },
                              '& .MuiInputLabel-root': {
                                color: theme.palette.text.secondary,
                              },
                              '& .MuiSelect-select': {
                                paddingLeft: '12px',
                              }
                            }}
                          >
                            <InputLabel id={`${speaker}-voice-label`}>
                              {speaker.charAt(0).toUpperCase() + speaker.slice(1)} Voice
                            </InputLabel>
                            <Select
                              labelId={`${speaker}-voice-label`}
                              value={voiceConfig[speaker] || ""}
                              onChange={(e) => handleVoiceChange(speaker, e.target.value)}
                              label={`${speaker.charAt(0).toUpperCase() + speaker.slice(1)} Voice`}
                              disabled={voicesLoading}
                              startAdornment={
                                <Box 
                                  sx={{ 
                                    width: 24, 
                                    height: 24, 
                                    borderRadius: '50%', 
                                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mr: 1
                                  }}
                                >
                                  <Typography 
                                    sx={{ 
                                      fontSize: '0.75rem', 
                                      fontWeight: 'bold',
                                      color: theme.palette.primary.main
                                    }}
                                  >
                                    {speaker.charAt(0).toUpperCase()}
                                  </Typography>
                                </Box>
                              }
                              MenuProps={{
                                PaperProps: {
                                  sx: {
                                    borderRadius: '10px',
                                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                                    mt: 0.5,
                                    maxHeight: 300,
                                    '& .MuiMenuItem-root': {
                                      padding: '8px 16px',
                                      '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                      },
                                      '&.Mui-selected': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.15),
                                        '&:hover': {
                                          backgroundColor: alpha(theme.palette.primary.main, 0.2),
                                        }
                                      }
                                    }
                                  }
                                }
                              }}
                            >
                              {voices.map((voice) => (
                                <MenuItem key={voice.voice_id} value={voice.voice_id}>
                                  {voice.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      ))}
                  </Grid>
                  
                  <Typography 
                    variant="subtitle1" 
                    gutterBottom
                    sx={{
                      color: theme.palette.primary.main,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2
                    }}
                  >
                    <ModelTraining sx={{ mr: 1, fontSize: '1rem' }} />
                    Model Selection
                  </Typography>
                  
                  <FormControl 
                    fullWidth 
                    size="small" 
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                        },
                        '&.Mui-focused': {
                          boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.3)}`,
                        }
                      },
                      '& .MuiInputLabel-root': {
                        color: theme.palette.text.secondary,
                      },
                      '& .MuiSelect-select': {
                        paddingLeft: '12px',
                      }
                    }}
                  >
                    <InputLabel id="model-select-label">Model</InputLabel>
                    <Select
                      labelId="model-select-label"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      label="Model"
                      startAdornment={<ModelTraining sx={{ mr: 1 }} />}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            borderRadius: '10px',
                            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                            mt: 0.5,
                            '& .MuiMenuItem-root': {
                              padding: '8px 16px',
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              },
                              '&.Mui-selected': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.15),
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                                }
                              }
                            }
                          }
                        }
                      }}
                    >
                      {availableModels.map((model) => (
                        <MenuItem 
                          key={model.id} 
                          value={model.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column'
                          }}>
                            <Typography variant="body2">{model.name}</Typography>
                            {model.id === "eleven_multilingual_v2" && (
                              <Chip 
                                label="Recommended" 
                                size="small" 
                                color="primary" 
                                sx={{ 
                                  height: 20, 
                                  fontSize: '0.625rem',
                                  mt: 0.5,
                                  maxWidth: 'fit-content'
                                }} 
                              />
                            )}
                            {model.id === "eleven_turbo_v2" && (
                              <Chip 
                                label="Fastest" 
                                size="small" 
                                color="secondary" 
                                sx={{ 
                                  height: 20, 
                                  fontSize: '0.625rem',
                                  mt: 0.5,
                                  maxWidth: 'fit-content'
                                }} 
                              />
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={testMode}
                        onChange={(e) => setTestMode(e.target.checked)}
                        color="primary"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: theme.palette.primary.main,
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.5),
                          },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                        Test Mode (Generate only first segment)
                        <Tooltip title="Generates only the first segment to test voice settings">
                          <Box component="span" sx={{ display: 'inline-flex', ml: 0.5, color: theme.palette.info.main }}>
                            <InfoIcon fontSize="small" />
                          </Box>
                        </Tooltip>
                      </Typography>
                    }
                    sx={{ mb: 1 }}
                  />
                  
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      variant="contained"
                      onClick={generateSpeech}
                      disabled={isGenerating || Object.keys(voiceConfig).length === 0}
                      startIcon={isGenerating ? <CircularProgress size={20} /> : <ModelTraining />}
                      sx={{
                        borderRadius: '10px',
                        padding: '10px 24px',
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: '0 4px 10px rgba(25, 118, 210, 0.3)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: '0 6px 15px rgba(25, 118, 210, 0.4)',
                          transform: 'translateY(-2px)'
                        },
                        '&:active': {
                          boxShadow: '0 2px 5px rgba(25, 118, 210, 0.4)',
                          transform: 'translateY(0)'
                        },
                        '&.Mui-disabled': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.3),
                          color: alpha('#fff', 0.6)
                        }
                      }}
                    >
                      {isGenerating ? "Generating..." : "Generate Audio"}
                    </Button>
                  </Box>
                  
                  {error && (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        mt: 2,
                        borderRadius: '10px',
                        '& .MuiAlert-icon': {
                          color: theme.palette.error.main
                        }
                      }}
                    >
                      {error}
                    </Alert>
                  )}
                </Box>
              </GlowingCard>
            )}

            {/* Main Player - Now full width */}
            {renderMainPlayer()}

            {/* Generated Audio Segments */}
            {generatedAudioSegments.length > 0 && (
              <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
                <Tooltip title="Show/Hide Generated Audio">
                  <IconButton
                    color="primary"
                    sx={{ 
                      bgcolor: 'background.paper', 
                      boxShadow: 3,
                      '&:hover': { bgcolor: 'background.paper' }
                    }}
                    onClick={() => {
                      if (!isPlaying && audioRef.current && generatedAudioSegments.length > 0) {
                        connectAudioToMainPlayer(generatedAudioSegments[0].url);
                      }
                    }}
                  >
                    <VolumeUp />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {/* Transcript - Now full width */}
            <GlowingCard>
              <Box sx={{ p: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 3 }}
                >
                  <Typography variant="h6">Transcript</Typography>
                  <Stack direction="row" spacing={1}>
                    {!editingState.isEditing ? (
                      <>
                        <Button
                          startIcon={<AutoAwesome />}
                          onClick={handleOpenAiAssistant}
                          size="small"
                        >
                          AI Assistant
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={handleEnterEditMode}
                          size="small"
                        >
                          Edit
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={handleExitEditMode}
                          size="small"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="contained"
                          onClick={handleSaveChanges}
                          size="small"
                          disabled={!editingState.hasUnsavedChanges}
                        >
                          Save Changes
                        </Button>
                      </>
                    )}
                  </Stack>
                </Stack>

                <List sx={{ width: "100%" }}>
                  {dialogueLines.map((line, index) => (
                    <TranscriptLine
                      key={index}
                      active={index === activeLineIndex || index === activeAudioLineIndex}
                      initial={{ opacity: 0, y: 0 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: index * 0.05,
                        duration: 0.3,
                        backgroundColor: { duration: 0.3 }
                      }}
                      hasAudio={lineAudioMap.has(index)}
                      onClick={() => {
                        if (editingState.isEditing) {
                          handleEditLine(index);
                        } else if (lineAudioMap.has(index)) {
                          // Play audio for this line if available
                          playLineAudio(index);
                        }
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                          variant="subtitle1"
                          color="primary"
                          sx={{ fontWeight: "bold", minWidth: "80px" }}
                        >
                          {line.speakerId.charAt(0).toUpperCase() +
                            line.speakerId.slice(1)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {line.timestamp}
                        </Typography>
                        {lineAudioMap.has(index) && (
                          <IconButton 
                            size="small" 
                            color={index === activeAudioLineIndex ? "secondary" : "primary"}
                            onClick={(e) => {
                              e.stopPropagation();
                              playLineAudio(index);
                            }}
                          >
                            {index === activeAudioLineIndex && isPlaying ? <Pause /> : <PlayArrow />}
                          </IconButton>
                        )}
                      </Stack>
                      {editingState.isEditing &&
                      editingState.editingLineIndex === index ? (
                        <TextField
                          fullWidth
                          multiline
                          value={editingState.editingText}
                          onChange={handleTextChange}
                          variant="outlined"
                          size="small"
                          sx={{ mt: 1 }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && e.ctrlKey) {
                              handleSaveLine();
                            }
                          }}
                        />
                      ) : (
                        <Typography
                          variant="body1"
                          sx={{
                            mt: 1,
                            fontStyle:
                              line.speakerId === "system" ? "italic" : "normal",
                            color:
                              line.speakerId === "system"
                                ? "text.secondary"
                                : "text.primary",
                          }}
                        >
                          {line.text}
                        </Typography>
                      )}
                    </TranscriptLine>
                  ))}
                </List>
              </Box>
            </GlowingCard>
          </>
        )}
      </Container>

      {/* AI Assistant Dialog */}
      <Dialog open={aiAssistantOpen} onClose={() => setAiAssistantOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>AI Assistant</DialogTitle>
        <DialogContent>
          {aiLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <DialogContentText paragraph>
                Here are some suggestions to improve your podcast:
              </DialogContentText>
              <TextField
                multiline
                rows={8}
                value={aiSuggestion}
                onChange={(e) => setAiSuggestion(e.target.value)}
                fullWidth
                variant="outlined"
                sx={{ mb: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiAssistantOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => handleApplySuggestion(aiSuggestion)}
            color="primary"
            variant="contained"
            disabled={!aiSuggestion || aiLoading}
          >
            Apply Suggestion
          </Button>
        </DialogActions>
      </Dialog>

      {/* Playback Speed Menu */}
      <Menu
        anchorEl={speedMenuAnchor}
        open={Boolean(speedMenuAnchor)}
        onClose={() => setSpeedMenuAnchor(null)}
      >
        {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((speed) => (
          <MenuItem
            key={speed}
            onClick={() => {
              handleSpeedChange(speed);
              setSpeedMenuAnchor(null);
            }}
            selected={audioState.playbackRate === speed}
          >
            {speed}x
          </MenuItem>
        ))}
      </Menu>
    </PageContainer>
  );
}
