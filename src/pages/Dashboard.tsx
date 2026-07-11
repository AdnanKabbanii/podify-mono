import {
    Analytics,
    Close,
    CloudUpload,
    Delete,
    Download,
    Edit,
    Folder,
    History,
    LibraryMusic,
    MoreVert,
    PlayArrow,
    Share
} from "@mui/icons-material";
import {
    Alert,
    Box,
    Button,
    Card,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemSecondaryAction,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import { styled } from "@mui/material/styles";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";
import { processTranscript } from "../services/openai.js";
import {
    BlueAccent,
    GlowingCard,
    PageContainer,
} from "../styles/commonStyles.js";
import {
    downloadTextAsFile,
    estimateProcessingTime,
    estimateTokenCount,
    formatFileSize,
    isFileTooLarge,
    readFileAsText,
} from "../utils/fileUtils.js";

const StatsCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  background: "rgba(25, 118, 210, 0.05)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(144, 202, 249, 0.2)",
  borderRadius: "16px",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
  },
}));

interface Transcript {
  id: string;
  name: string;
  status: "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
  date: string;
  duration?: string;
  size?: string;
  voiceStyles?: string[];
  lastModified?: string;
  content?: string;
}

interface ProcessingDialogProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  fileSize?: string;
  estimatedTime?: string;
  progress?: number;
  currentChunk?: number;
  totalChunks?: number;
}

interface SharingOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (options: { public: boolean; allowComments: boolean }) => void;
}

interface AnalyticsDialogProps {
  open: boolean;
  onClose: () => void;
  transcripts: Transcript[];
}

interface RenameDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
  currentName: string;
}

function ProcessingDialog({
  open,
  onClose,
  fileName,
  fileSize,
  estimatedTime,
  progress,
  currentChunk,
  totalChunks,
}: ProcessingDialogProps) {
  const safeProgress = progress !== undefined ? progress : 0;
  const safeCurrentChunk = currentChunk || 1;
  const safeTotalChunks = totalChunks || 1;
  const formattedProgress = Math.min(Math.round(safeProgress), 99);
  const progressValue = Math.min(safeProgress, 99);

  const chunkProgressValue = safeTotalChunks > 1 
    ? Math.min(
        Math.round(
          (((safeProgress || 0) % (100 / safeTotalChunks)) /
            (100 / safeTotalChunks)) *
            100,
        ),
        99,
      )
    : formattedProgress;
  
  // For debugging
  console.log('ProcessingDialog render:', {
    fileName,
    progress: safeProgress,
    currentChunk: safeCurrentChunk,
    totalChunks: safeTotalChunks,
    formattedProgress,
    chunkProgressValue
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "background.paper",
          backgroundImage: "none",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Typography variant="h6" component="div">
          Processing Transcript
        </Typography>
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Your file is being processed in the background. You can continue using
          the app.
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 0.5 }}>
            File: {fileName}
          </Typography>
          {fileSize && (
            <Typography variant="body2" color="text.secondary">
              Size: {fileSize}
            </Typography>
          )}
          {estimatedTime && (
            <Typography variant="body2" color="text.secondary">
              Estimated time: {estimatedTime}
            </Typography>
          )}
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              mb: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Overall Progress:</span>
            <Box
              sx={{
                bgcolor: "rgba(25, 118, 210, 0.2)",
                px: 1.5,
                py: 0.5,
                borderRadius: "12px",
                border: "1px solid rgba(25, 118, 210, 0.3)",
                fontWeight: "bold",
              }}
            >
              {formattedProgress}%
            </Box>
          </Typography>

          <Box sx={{ position: "relative", mb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progressValue}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: "rgba(255, 255, 255, 0.1)",
                "& .MuiLinearProgress-bar": {
                  transition: "transform 0.3s linear",
                  background:
                    "linear-gradient(90deg, #2196F3 0%, #64B5F6 100%)",
                  borderRadius: 5,
                },
              }}
            />

            {/* Add chunk markers */}
            {safeTotalChunks > 1 && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "100%",
                  pointerEvents: "none",
                }}
              >
                {Array.from({ length: safeTotalChunks - 1 }).map((_, index) => (
                  <Box
                    key={index}
                    sx={{
                      position: "absolute",
                      left: `${((index + 1) / safeTotalChunks) * 100}%`,
                      height: "100%",
                      width: 1,
                      bgcolor: "rgba(255, 255, 255, 0.5)",
                      zIndex: 1,
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {safeTotalChunks > 1 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "primary.main",
                  fontWeight: "medium",
                }}
              >
                <span>Processing chunks:</span>
                <span>
                  {safeCurrentChunk} of {safeTotalChunks}
                </span>
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
                {Array.from({ length: safeTotalChunks }).map((_, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      ...(index + 1 < safeCurrentChunk
                        ? {
                            bgcolor: "primary.main",
                            color: "white",
                          }
                        : index + 1 === safeCurrentChunk
                          ? {
                              bgcolor: "rgba(25, 118, 210, 0.2)",
                              border: "1px solid primary.main",
                              color: "primary.main",
                            }
                          : {
                              bgcolor: "rgba(255, 255, 255, 0.1)",
                              color: "text.secondary",
                            }),
                    }}
                  >
                    {index + 1}
                  </Box>
                ))}
              </Box>

              {safeTotalChunks > 1 && (
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Current chunk progress:</span>
                    <span>
                      {chunkProgressValue}%
                    </span>
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={chunkProgressValue}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      mt: 0.5,
                      bgcolor: "rgba(255, 255, 255, 0.1)",
                      "& .MuiLinearProgress-bar": {
                        background:
                          "linear-gradient(90deg, #64B5F6 0%, #90CAF9 100%)",
                        borderRadius: 3,
                      },
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: "rgba(0, 0, 0, 0.2)",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            <Box
              component="span"
              sx={{ fontWeight: "bold", color: "primary.main" }}
            >
              What's happening:
            </Box>{" "}
            Your transcript is being processed into a podcast-style conversation
            using AI.
            {safeTotalChunks > 1 && (
              <> Large files are processed in chunks to respect API limits.</>
            )}
            <br />
            <br />
            The podcast will be available in your library when processing is
            complete.
          </Typography>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          color="primary"
          variant="contained"
          startIcon={<Close fontSize="small" />}
        >
          Continue in Background
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const QuickStats = ({ transcripts }: { transcripts: Transcript[] }) => {
  const totalPodcasts = transcripts.filter(
    (t) => t.status === "PROCESSED",
  ).length;
  const processing = transcripts.filter(
    (t) => t.status === "PROCESSING",
  ).length;

  const totalStorageBytes = transcripts.reduce((total, t) => {
    const sizeMatch = t.size?.match(/^([\d.]+)/);
    if (!sizeMatch) return total;

    const sizeValue = parseFloat(sizeMatch[1]);
    if (t.size?.includes("KB")) return total + sizeValue * 1024;
    if (t.size?.includes("MB")) return total + sizeValue * 1024 * 1024;
    if (t.size?.includes("GB")) return total + sizeValue * 1024 * 1024 * 1024;
    return total + sizeValue;
  }, 0);

  const storageUsed = formatFileSize(totalStorageBytes);

  let totalMinutes = 0;
  transcripts.forEach((t) => {
    if (t.duration) {
      const [minutes, seconds] = t.duration.split(":").map(Number);
      if (!isNaN(minutes) && !isNaN(seconds)) {
        totalMinutes += minutes + seconds / 60;
      }
    }
  });

  const totalDuration =
    totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)} hrs ${Math.round(totalMinutes % 60)} min`
      : `${Math.round(totalMinutes)} min`;

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {[
        {
          title: "Total Podcasts",
          value: totalPodcasts.toString(),
          icon: <LibraryMusic />,
          color: "#4CAF50",
        },
        {
          title: "Processing",
          value: processing.toString(),
          icon: <History />,
          color: "#2196F3",
        },
        {
          title: "Storage Used",
          value: storageUsed,
          icon: <Folder />,
          color: "#FF9800",
        },
        {
          title: "Total Duration",
          value: totalDuration,
          icon: <Analytics />,
          color: "#9C27B0",
        },
      ].map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <StatsCard>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ color: stat.color }}>{stat.icon}</Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </Box>
            </Stack>
          </StatsCard>
        </Grid>
      ))}
    </Grid>
  );
};

const SharingOptionsDialog: React.FC<SharingOptionsDialogProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const [isPublic, setIsPublic] = useState(false);
  const [allowComments, setAllowComments] = useState(false);

  const handleSave = () => {
    onSave({ public: isPublic, allowComments });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Sharing Options</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <List>
            <ListItem>
              <ListItemText
                primary="Make Public"
                secondary="Allow anyone with the link to view this podcast"
              />
              <Switch
                edge="end"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Allow Comments"
                secondary="Let viewers leave comments on your podcast"
              />
              <Switch
                edge="end"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                disabled={!isPublic}
              />
            </ListItem>
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const AnalyticsDialog: React.FC<AnalyticsDialogProps> = ({
  open,
  onClose,
  transcripts,
}) => {
  // Calculate some basic analytics
  const totalPodcasts = transcripts.length;
  const completedPodcasts = transcripts.filter(
    (t) => t.status === "PROCESSED"
  ).length;
  const completionRate = totalPodcasts
    ? Math.round((completedPodcasts / totalPodcasts) * 100)
    : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Analytics
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Podcast Statistics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  textAlign: "center",
                  bgcolor: "rgba(25, 118, 210, 0.05)",
                  border: "1px solid rgba(144, 202, 249, 0.2)",
                  borderRadius: 2,
                }}
              >
                <Typography variant="h4">{totalPodcasts}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Podcasts
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  textAlign: "center",
                  bgcolor: "rgba(25, 118, 210, 0.05)",
                  border: "1px solid rgba(144, 202, 249, 0.2)",
                  borderRadius: 2,
                }}
              >
                <Typography variant="h4">{completedPodcasts}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed Podcasts
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  textAlign: "center",
                  bgcolor: "rgba(25, 118, 210, 0.05)",
                  border: "1px solid rgba(144, 202, 249, 0.2)",
                  borderRadius: 2,
                }}
              >
                <Typography variant="h4">{completionRate}%</Typography>
                <Typography variant="body2" color="text.secondary">
                  Completion Rate
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Recent Activity
          </Typography>
          <List>
            {transcripts
              .slice(0, 5)
              .sort(
                (a, b) =>
                  new Date(b.lastModified || "").getTime() -
                  new Date(a.lastModified || "").getTime()
              )
              .map((transcript) => (
                <ListItem key={transcript.id}>
                  <ListItemText
                    primary={transcript.name}
                    secondary={`${transcript.status} • ${
                      transcript.lastModified || "Unknown"
                    }`}
                  />
                </ListItem>
              ))}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const RenameDialog: React.FC<RenameDialogProps> = ({
  open,
  onClose,
  onSave,
  currentName,
}) => {
  const [newName, setNewName] = useState(currentName);

  useEffect(() => {
    setNewName(currentName);
  }, [currentName]);

  const handleSave = () => {
    onSave(newName);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rename Podcast</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="New Name"
          type="text"
          fullWidth
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          variant="outlined"
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={!newName.trim() || newName === currentName}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [error, setError] = useState<string>("");
  const [currentTab, setCurrentTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showProcessingDialog, setShowProcessingDialog] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<
    Map<
      string,
      {
        progress: number;
        currentChunk: number;
        totalChunks: number;
        fileSize: string;
        estimatedTime: string;
        status: "processing" | "completed" | "failed";
        progressIncrement?: number;
        lastChunkUpdateTime?: number;
        lastProgressUpdate?: number;
      }
    >
  >(new Map());
  const [sharingOptionsOpen, setSharingOptionsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [processingFileName, setProcessingFileName] = useState<string>("");
  const [processingDialogState, setProcessingDialogState] = useState<{
    progress: number;
    currentChunk: number;
    totalChunks: number;
    fileSize: string;
    estimatedTime: string;
  }>({
    progress: 0,
    currentChunk: 1,
    totalChunks: 1,
    fileSize: "",
    estimatedTime: "",
  });
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedTranscriptName, setSelectedTranscriptName] = useState("");

  // Fetch transcripts when component mounts
  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/transcripts", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch transcripts");
        }

        const data = await response.json();

        const formattedTranscripts = data.transcripts.map(
          (transcript: Record<string, unknown>) => ({
            id: transcript.id as string,
            name: transcript.filename as string,
            status: transcript.status as
              | "UPLOADED"
              | "PROCESSING"
              | "PROCESSED"
              | "FAILED",
            date: new Date(transcript.createdAt as string)
              .toISOString()
              .split("T")[0],
            duration: transcript.duration
              ? `${Math.floor(Number(transcript.duration) / 60)}:${Number(transcript.duration) % 60}`
              : undefined,
            size: formatFileSize(Number(transcript.fileSize)),
            lastModified: formatTimeAgo(
              new Date(transcript.updatedAt as string),
            ),
          }),
        );

        setTranscripts(formattedTranscripts);
      } catch (error) {
        console.error("Error fetching transcripts:", error);
        setErrorMessage("Failed to load transcripts. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranscripts();
  }, [token]);

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file || !token) {
      return;
    }
    
    let progressInterval: NodeJS.Timeout;

    if (isFileTooLarge(file)) {
      setError(
        "File is too large. Maximum size is 50MB. Please upload a smaller file."
      );
      return;
    }

    try {
      const fileSize = formatFileSize(file.size);
      setProcessingFileName(file.name);
      setProcessingDialogState({
        progress: 0,
        currentChunk: 1,
        totalChunks: 1,
        fileSize,
        estimatedTime: "",
      });

      const text = await readFileAsText(file);

      const tokenCount = estimateTokenCount(text);
      const processingTime = estimateProcessingTime(tokenCount);

      // Use improved chunking with context overlap between chunks
      // 25000 tokens per chunk with 1000 token overlap between chunks
      const estimatedChunks = Math.ceil(tokenCount / 24000); // Account for overlap
      setProcessingDialogState((prev) => ({
        ...prev,
        totalChunks: estimatedChunks > 1 ? estimatedChunks : 1,
        estimatedTime: processingTime,
      }));
      setProcessingFiles((prev) => {
        const newMap = new Map(prev);
        newMap.set(file.name, {
          progress: 0,
          currentChunk: 1,
          totalChunks: estimatedChunks > 1 ? estimatedChunks : 1,
          fileSize,
          estimatedTime: processingTime,
          status: "processing",
          progressIncrement: 0.2,
        });
        return newMap;
      });

      const createTranscriptResponse = await fetch("/api/transcripts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: file.name,
          content: text,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      if (!createTranscriptResponse.ok) {
        throw new Error("Failed to create transcript record");
      }

      const transcriptData = await createTranscriptResponse.json();
      const transcriptId = transcriptData.transcript.id;
      setTranscripts((prev) => [
        {
          id: transcriptId,
          name: file.name,
          status: "PROCESSING",
          date: new Date().toISOString().split("T")[0],
          size: fileSize,
          lastModified: "Just now",
        },
        ...prev,
      ]);
      setCurrentTab(1);
      const chunkProgressHandler = (event: Event) => {
        const customEvent = event as CustomEvent<{
          currentChunk: number;
          totalChunks: number;
        }>;
        const { currentChunk, totalChunks } = customEvent.detail;

        console.log(
          `Chunk progress event: chunk ${currentChunk}/${totalChunks}`,
        );

        if (file) {
          const chunkSize = 100 / totalChunks;
          const completedChunksProgress = (currentChunk - 1) * chunkSize;
          setProcessingFiles((prev) => {
            const newMap = new Map(prev);
            const fileData = newMap.get(file.name);

            if (fileData) {
              newMap.set(file.name, {
                ...fileData,
                currentChunk,
                totalChunks,
                progress: completedChunksProgress,
                progressIncrement: chunkSize / 50,
                lastChunkUpdateTime: Date.now(),
              });
            }

            return newMap;
          });

          if (showProcessingDialog && processingFileName === file.name) {
            setProcessingDialogState((prev) => ({
              ...prev,
              currentChunk,
              totalChunks,
              progress: completedChunksProgress,
            }));
          }

          console.log(
            `Processing chunk ${currentChunk}/${totalChunks} for ${file.name}, progress: ${completedChunksProgress.toFixed(1)}%`,
          );
        }
      };
      progressInterval = setInterval(() => {
        if (file) {
          setProcessingFiles((prev) => {
            const newMap = new Map(prev);
            const fileData = newMap.get(file.name);

            if (fileData && fileData.status === "processing") {
              const chunkSize = 100 / fileData.totalChunks;
              const baseProgress = (fileData.currentChunk - 1) * chunkSize;
              const now = Date.now();
              const timeElapsed = now - (fileData.lastChunkUpdateTime || now);
              const estimatedChunkTime = 30000;
              const estimatedProgress = Math.min(
                timeElapsed / estimatedChunkTime,
                0.95,
              );
              const currentChunkProgress = chunkSize * estimatedProgress;
              const newProgress = baseProgress + currentChunkProgress;
              console.log(
                `Updating progress for ${file.name}: ${newProgress.toFixed(1)}% (time elapsed: ${(timeElapsed / 1000).toFixed(1)}s)`,
              );
              newMap.set(file.name, {
                ...fileData,
                progress: newProgress,
                lastProgressUpdate: now,
              });

              // Always update the dialog if it's showing this file
              if (showProcessingDialog && processingFileName === file.name) {
                setProcessingDialogState((prev) => ({
                  ...prev,
                  progress: newProgress,
                }));
              }
            }

            return newMap;
          });
        }
      }, 500);

      // Process the transcript
      window.addEventListener("chunkProgress", chunkProgressHandler);
      const processedContent = await processTranscript(text);
      window.removeEventListener("chunkProgress", chunkProgressHandler);

      // Clear the progress interval as we're now setting progress to 100%
      clearInterval(progressInterval);

      // Update the processing status to indicate completion
      setProcessingFiles((prev) => {
        const newMap = new Map(prev);
        const fileData = newMap.get(file.name);

        if (fileData) {
          newMap.set(file.name, {
            ...fileData,
            status: "completed",
            progress: 100, // Set progress to 100% when processing is complete
          });
        }

        return newMap;
      });

      // If the processing dialog is open for this file, update the dialog state
      if (showProcessingDialog && processingFileName === file.name) {
        setProcessingDialogState((prev) => ({
          ...prev,
          progress: 100,
        }));
      }

      try {
        // Update the transcript record with processed content and set status to 'PROCESSED'
        const updateResponse = await fetch(`/api/transcripts/${transcriptId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: "PROCESSED",
            content: processedContent,
          }),
        });

        if (!updateResponse.ok) {
          console.error(
            "Failed to update transcript:",
            await updateResponse.text(),
          );
        }

        // Create a podcast record for the processed transcript
        const podcastResponse = await fetch("/api/podcasts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: file.name.replace(/\.[^/.]+$/, ""),
            content: processedContent,
            transcriptId: transcriptId,
            voiceConfig: null,
          }),
        });

        if (!podcastResponse.ok) {
          console.error(
            "Failed to create podcast:",
            await podcastResponse.text(),
          );
        } else {
          console.log("Podcast created successfully");
        }
      } catch (apiError) {
        console.error("API error:", apiError);
      }

      // Remove the file from processing files map
      setProcessingFiles((prev) => {
        const newMap = new Map(prev);
        newMap.delete(file.name);
        return newMap;
      });

      // Update the transcript in the list to PROCESSED status
      setTranscripts((prev) =>
        prev.map((t) =>
          t.id === transcriptId
            ? { ...t, status: "PROCESSED", content: processedContent }
            : t,
        ),
      );

      try {
        // Refresh the transcript list
        const response = await fetch("/api/transcripts", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const formattedTranscripts = data.transcripts.map(
            (transcript: Record<string, unknown>) => ({
              id: transcript.id as string,
              name: transcript.filename as string,
              status: transcript.status as
                | "UPLOADED"
                | "PROCESSING"
                | "PROCESSED"
                | "FAILED",
              date: new Date(transcript.createdAt as string)
                .toISOString()
                .split("T")[0],
              duration: transcript.duration
                ? `${Math.floor(Number(transcript.duration) / 60)}:${Number(transcript.duration) % 60}`
                : undefined,
              size: formatFileSize(Number(transcript.fileSize)),
              lastModified: formatTimeAgo(
                new Date(transcript.updatedAt as string),
              ),
              content: transcript.content as string,
            }),
          );

          setTranscripts(formattedTranscripts);
        }
      } catch (fetchError) {
        console.error("Error fetching transcripts:", fetchError);
      }

      // If the processing dialog is open for this file, close it
      if (showProcessingDialog && processingFileName === file.name) {
        setShowProcessingDialog(false);
      }
    } catch (err) {
      console.error("Processing error:", err);
      setError(
        err instanceof Error
          ? `Failed to process transcript: ${err.message}`
          : "Failed to process transcript. Please try again.",
      );

      // Remove the file from processing files map
      setProcessingFiles((prev) => {
        const newMap = new Map(prev);
        const fileData = newMap.get(file.name);
        if (fileData) {
          newMap.set(file.name, {
            ...fileData,
            status: "failed",
            progress: 0,
          });
        } else {
          newMap.delete(file.name);
        }
        return newMap;
      });

      // If the processing dialog is open for this file, close it
      if (showProcessingDialog && processingFileName === file.name) {
        setShowProcessingDialog(false);
      }
    } finally {
      // Clear the interval if it exists
      let progressInterval;
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    }
  };

  const handlePlayPodcast = (transcriptId: string) => {
    navigate(`/podcast/${transcriptId}`);
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    transcriptId: string,
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedTranscript(transcriptId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTranscript(null);
  };

  const handleDelete = async (transcriptId: string) => {
    try {
      const response = await fetch(`/api/transcripts/${transcriptId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete transcript");
      }

      // Remove the transcript from the state
      setTranscripts((prev) => prev.filter((t) => t.id !== transcriptId));
      handleMenuClose();
    } catch (error) {
      console.error("Error deleting transcript:", error);
      setErrorMessage("Failed to delete transcript. Please try again.");
    }
  };

  const handleDownloadTranscript = async (transcriptId: string) => {
    try {
      const response = await fetch(`/api/transcripts/${transcriptId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch transcript");
      }

      const data = await response.json();
      const transcript = data.transcript;

      if (transcript.content) {
        const filename =
          transcript.status === "PROCESSED"
            ? `processed_${transcript.filename || "transcript"}.txt`
            : `${transcript.filename || "transcript"}.txt`;

        downloadTextAsFile(transcript.content, filename);
      } else {
        setErrorMessage("Transcript content not available for download");
      }
    } catch (error) {
      console.error("Error downloading transcript:", error);
      setErrorMessage("Failed to download transcript. Please try again.");
    }
  };

  const filteredTranscripts = useMemo(() => {
    if (currentTab === 0) return transcripts; // All transcripts
    if (currentTab === 1)
      return transcripts.filter((t) => t.status === "PROCESSING"); // Processing
    if (currentTab === 2)
      return transcripts.filter((t) => t.status === "PROCESSED"); // Completed
    return transcripts;
  }, [transcripts, currentTab]);

  const handleViewProcessingProgress = (transcript: Transcript) => {
    // Get the latest processing information for this transcript
    const processingInfo = processingFiles.get(transcript.name);
    
    if (processingInfo) {
      // Update the processing dialog state with the current values from processingFiles
      setProcessingDialogState({
        progress: processingInfo.progress,
        currentChunk: processingInfo.currentChunk,
        totalChunks: processingInfo.totalChunks,
        fileSize: processingInfo.fileSize,
        estimatedTime: processingInfo.estimatedTime,
      });
      
      // Set the processing file name to ensure the dialog knows which file to display
      setProcessingFileName(transcript.name);
      
      // Show the processing dialog
      setShowProcessingDialog(true);
      
      console.log(`Showing processing dialog for ${transcript.name}:`, processingInfo);
    } else {
      console.warn(`No processing information found for ${transcript.name}`);
    }
  };

  const handleCloseProcessingDialog = () => {
    setShowProcessingDialog(false);
  };

  // Add an effect to update the processing dialog in real-time when it's open
  useEffect(() => {
    // Only run this effect if the processing dialog is open
    if (showProcessingDialog && processingFileName) {
      // Get the latest processing information for the file being shown
      const processingInfo = processingFiles.get(processingFileName);
      
      if (processingInfo) {
        // Update the processing dialog state with the current values
        setProcessingDialogState({
          progress: processingInfo.progress,
          currentChunk: processingInfo.currentChunk,
          totalChunks: processingInfo.totalChunks,
          fileSize: processingInfo.fileSize,
          estimatedTime: processingInfo.estimatedTime,
        });
        
        console.log(`Updated processing dialog for ${processingFileName}:`, processingInfo);
      }
    }
  }, [showProcessingDialog, processingFileName, processingFiles]);

  // Add handleRename function
  const handleRename = async (newName: string) => {
    if (!selectedTranscript || !token) return;

    try {
      const response = await fetch(`/api/transcripts/${selectedTranscript}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename transcript");
      }

      // Update the transcript name in the state
      setTranscripts((prev) =>
        prev.map((t) =>
          t.id === selectedTranscript ? { ...t, name: newName } : t
        )
      );

      handleMenuClose();
    } catch (error) {
      console.error("Error renaming transcript:", error);
      setErrorMessage("Failed to rename transcript. Please try again.");
    }
  };

  // Add handleShare function
  const handleShare = async () => {
    if (!selectedTranscript || !token) return;

    try {
      // First try to get the transcript details
      const response = await fetch(`/api/transcripts/${selectedTranscript}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to get transcript details");
      }
      
      // Create a temporary share URL (this should be replaced with actual share endpoint)
      const shareUrl = `${window.location.origin}/shared/transcript/${selectedTranscript}`;
      
      // Copy the link to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setErrorMessage("Share link copied to clipboard! (Note: Sharing feature is coming soon)");

      handleMenuClose();
    } catch (error) {
      console.error("Error sharing transcript:", error);
      setErrorMessage("Sharing feature is coming soon. Please try again later.");
    }
  };

  // Modify the Menu items to use the new functions
  const handleMenuItemClick = (action: string) => {
    if (action === "rename") {
      const transcript = transcripts.find((t) => t.id === selectedTranscript);
      if (transcript) {
        setSelectedTranscriptName(transcript.name);
        setRenameDialogOpen(true);
      }
    } else if (action === "share") {
      handleShare();
    }
  };

  return (
    <PageContainer>
      <BlueAccent sx={{ top: "5%", right: "5%" }} />
      <BlueAccent sx={{ bottom: "5%", left: "5%" }} />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, mt: 12 }}>
        <Typography
          variant="h4"
          sx={{
            mb: 4,
            background: "linear-gradient(45deg, #90CAF9 30%, #64B5F6 90%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Dashboard
        </Typography>

        {/* Display error messages */}
        {errorMessage && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            onClose={() => setErrorMessage(null)}
          >
            {errorMessage}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <QuickStats transcripts={transcripts} />

        <Grid container spacing={4}>
          {/* Upload Section - Now full width */}
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 4,
                borderRadius: 2,
                background:
                  "linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(25, 118, 210, 0.1) 100%)",
                border: "1px solid rgba(144, 202, 249, 0.2)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Background accent */}
              <Box
                sx={{
                  position: "absolute",
                  top: -100,
                  right: -100,
                  width: 300,
                  height: 300,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(25, 118, 210, 0.1) 0%, transparent 70%)",
                  zIndex: 0,
                }}
              />
              
              <Box sx={{ position: "relative", zIndex: 1 }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={7}>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        mb: 2,
                        fontWeight: 600,
                        color: "primary.main",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <CloudUpload sx={{ mr: 1 }} /> Upload Transcript
                    </Typography>

                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                      Upload a text file to convert it into a podcast-style
                      conversation. Files are processed in the background, so you can
                      continue using the app.
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Supported formats: <b>.txt</b>, <b>.md</b>, <b>.rtf</b>, <b>.doc</b>, <b>.docx</b>
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        gap: 2,
                        mt: 3,
                      }}
                    >
                      <Button
                        component="label"
                        variant="contained"
                        startIcon={<CloudUpload />}
                        sx={{ 
                          flexGrow: 1,
                          py: 1.5,
                          px: 3,
                          borderRadius: "10px",
                          boxShadow: "0 4px 10px rgba(25, 118, 210, 0.3)",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            boxShadow: "0 6px 15px rgba(25, 118, 210, 0.4)",
                            transform: "translateY(-2px)"
                          },
                        }}
                      >
                        Upload File
                        <input
                          type="file"
                          hidden
                          accept=".txt,.md,.rtf,.doc,.docx"
                          onChange={(e) => {
                            if (e.target.files) {
                              handleFileUpload(e.target.files[0]);
                            }
                          }}
                        />
                      </Button>

                      {processingFiles.size > 0 && (
                        <Button
                          variant="outlined"
                          color="primary"
                          onClick={() => setCurrentTab(1)}
                          startIcon={<CircularProgress size={16} />}
                          sx={{ 
                            borderRadius: "10px",
                            py: 1.5,
                          }}
                        >
                          {processingFiles.size} File
                          {processingFiles.size > 1 ? "s" : ""} Processing
                        </Button>
                      )}
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100%",
                      }}
                    >
                      <Box
                        component="img"
                        src="/upload-illustration.svg"
                        alt="Upload illustration"
                        sx={{
                          maxWidth: "100%",
                          maxHeight: 200,
                          opacity: 0.9,
                          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
                        }}
                        onError={(e) => {
                          // If image fails to load, show a fallback icon
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const icon = document.createElement('div');
                            icon.innerHTML = `<svg width="150" height="150" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.35 10.04ZM19 18H6C3.79 18 2 16.21 2 14C2 11.95 3.53 10.24 5.56 10.03L6.63 9.92L7.13 8.97C8.08 7.14 9.94 6 12 6C14.62 6 16.88 7.86 17.39 10.43L17.69 11.93L19.22 12.04C20.78 12.14 22 13.45 22 15C22 16.65 20.65 18 19 18ZM8 13H10.55V16H13.45V13H16L12 9L8 13Z" fill="#1976D2"/>
                            </svg>`;
                            parent.appendChild(icon);
                          }
                        }}
                      />
                    </Box>
                  </Grid>
                </Grid>

                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mt: 2,
                      borderRadius: "10px",
                    }}
                  >
                    {error}
                  </Alert>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Transcripts List - Now full width */}
          <Grid item xs={12}>
            <GlowingCard>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: 1, 
                borderColor: "divider", 
                mb: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 2, sm: 0 }
              }}>
                <Tabs
                  value={currentTab}
                  onChange={(_, newValue) => setCurrentTab(newValue)}
                >
                  <Tab label="All Transcripts" />
                  <Tab label="Processing" />
                  <Tab label="Completed" />
                </Tabs>
                
                {/* Settings options moved from Quick Settings */}
                <Stack 
                  direction="row" 
                  spacing={1}
                  sx={{ 
                    pb: { xs: 1, sm: 0 },
                    flexWrap: { xs: 'wrap', md: 'nowrap' },
                    justifyContent: { xs: 'center', sm: 'flex-end' }
                  }}
                >
                  <Tooltip title="Sharing Options">
                    <Button
                      startIcon={<Share />}
                      variant="outlined"
                      size="small"
                      onClick={() => setSharingOptionsOpen(true)}
                      sx={{ 
                        borderRadius: '20px',
                        textTransform: 'none'
                      }}
                    >
                      Sharing
                    </Button>
                  </Tooltip>
                  <Tooltip title="View Analytics">
                    <Button
                      startIcon={<Analytics />}
                      variant="outlined"
                      size="small"
                      onClick={() => setAnalyticsOpen(true)}
                      sx={{ 
                        borderRadius: '20px',
                        textTransform: 'none'
                      }}
                    >
                      Analytics
                    </Button>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Show loading indicator when fetching transcripts */}
              {isLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : filteredTranscripts.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">
                    {currentTab === 0
                      ? "No transcripts found. Upload your first transcript to get started."
                      : currentTab === 1
                        ? "No transcripts currently processing."
                        : "No completed transcripts yet."}
                  </Typography>
                </Box>
              ) : (
                <List>
                  {filteredTranscripts.map((transcript, index) => (
                    <React.Fragment key={transcript.id}>
                      {index > 0 && (
                        <Divider
                          sx={{ borderColor: "rgba(144, 202, 249, 0.2)" }}
                        />
                      )}
                      <ListItem
                        onClick={
                          transcript.status === "PROCESSING"
                            ? () => handleViewProcessingProgress(transcript)
                            : transcript.status === "PROCESSED"
                              ? () => handlePlayPodcast(transcript.id)
                              : undefined
                        }
                        sx={{
                          cursor:
                            transcript.status === "PROCESSING" ||
                            transcript.status === "PROCESSED"
                              ? "pointer"
                              : "default",
                          "&:hover": {
                            bgcolor:
                              transcript.status === "PROCESSING" ||
                              transcript.status === "PROCESSED"
                                ? "rgba(144, 202, 249, 0.1)"
                                : "transparent",
                          },
                          position: "relative",
                          overflow: "hidden",
                          pb: transcript.status === "PROCESSING" ? 2 : 1,
                        }}
                      >
                        <ListItemIcon>
                          {transcript.status === "PROCESSING" ? (
                            <CircularProgress size={24} color="primary" />
                          ) : (
                            <LibraryMusic sx={{ color: "primary.main" }} />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography component="div" sx={{ color: "text.primary" }}>
                              {transcript.name}
                            </Typography>
                          }
                          secondary={
                            <Typography component="div" variant="body2" color="text.secondary">
                              <Stack
                                direction="row"
                                spacing={2}
                              >
                                <Typography component="span" variant="body2">
                                  {transcript.date}
                                </Typography>
                                <Typography component="span" variant="body2">
                                  {transcript.duration}
                                </Typography>
                                <Typography component="span" variant="body2">
                                  {transcript.size}
                                </Typography>
                              </Stack>
                            </Typography>
                          }
                        />

                        {/* Add a progress bar for processing files */}
                        {transcript.status === "PROCESSING" && (
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: 4,
                            }}
                          >
                            {processingFiles.has(transcript.name) ? (
                              <Box
                                sx={{
                                  position: "relative",
                                  width: "100%",
                                  height: "100%",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering the parent click
                                  handleViewProcessingProgress(transcript);
                                }}
                              >
                                <LinearProgress
                                  variant="determinate"
                                  value={processingFiles.get(transcript.name)!.progress}
                                  sx={{
                                    height: "100%",
                                    borderRadius: 0,
                                  }}
                                />
                                
                                {/* Add chunk markers */}
                                {processingFiles.get(transcript.name)!
                                  .totalChunks > 1 && (
                                  <>
                                    {Array.from({
                                      length:
                                        processingFiles.get(transcript.name)!
                                          .totalChunks - 1,
                                    }).map((_, index) => (
                                      <Box
                                        key={index}
                                        sx={{
                                          position: "absolute",
                                          left: `${((index + 1) / processingFiles.get(transcript.name)!.totalChunks) * 100}%`,
                                          top: 0,
                                          height: "100%",
                                          width: 1,
                                          bgcolor: "rgba(255, 255, 255, 0.5)",
                                          zIndex: 1,
                                        }}
                                      />
                                    ))}
                                  </>
                                )}
                              </Box>
                            ) : (
                              <LinearProgress
                                variant="indeterminate"
                                sx={{
                                  height: "100%",
                                  borderRadius: 0,
                                }}
                              />
                            )}
                          </Box>
                        )}

                        <ListItemSecondaryAction>
                          <Stack direction="row" spacing={1}>
                            {transcript.status === "PROCESSED" && (
                              <>
                                <Tooltip title="Play">
                                  <IconButton
                                    edge="end"
                                    onClick={() =>
                                      handlePlayPodcast(transcript.id)
                                    }
                                    sx={{ color: "primary.main" }}
                                  >
                                    <PlayArrow />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}

                            <Tooltip title="Download">
                              <IconButton
                                edge="end"
                                onClick={() =>
                                  handleDownloadTranscript(transcript.id)
                                }
                                sx={{ color: "primary.main" }}
                              >
                                <Download />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="More">
                              <IconButton
                                onClick={(e) =>
                                  handleMenuOpen(e, transcript.id)
                                }
                                sx={{ color: "primary.main" }}
                              >
                                <MoreVert />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </GlowingCard>
          </Grid>
        </Grid>

        <ProcessingDialog
          open={showProcessingDialog}
          onClose={handleCloseProcessingDialog}
          fileName={processingFileName}
          fileSize={processingDialogState.fileSize}
          estimatedTime={processingDialogState.estimatedTime}
          progress={processingDialogState.progress}
          currentChunk={processingDialogState.currentChunk}
          totalChunks={processingDialogState.totalChunks}
        />

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => handleMenuItemClick("share")}>
            <ListItemIcon>
              <Share fontSize="small" />
            </ListItemIcon>
            <ListItemText>Share</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleMenuItemClick("rename")}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Rename</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() =>
              selectedTranscript && handleDelete(selectedTranscript)
            }
          >
            <ListItemIcon>
              <Delete fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>

        {/* Add the new dialogs */}
        <SharingOptionsDialog
          open={sharingOptionsOpen}
          onClose={() => setSharingOptionsOpen(false)}
          onSave={(options) => {
            console.log("Sharing options updated:", options);
          }}
        />

        <AnalyticsDialog
          open={analyticsOpen}
          onClose={() => setAnalyticsOpen(false)}
          transcripts={transcripts}
        />

        {/* Add RenameDialog */}
        <RenameDialog
          open={renameDialogOpen}
          onClose={() => setRenameDialogOpen(false)}
          onSave={handleRename}
          currentName={selectedTranscriptName}
        />
      </Container>
    </PageContainer>
  );
}
