import {
  AutoAwesome,
  Close,
  ContentPaste,
  Lightbulb,
  Psychology,
  Refresh,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import {
  getEditingSuggestions,
  improveTranscriptFlow,
} from "../services/openai.js";

const GlowingCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  background: "rgba(25, 118, 210, 0.05)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(144, 202, 249, 0.2)",
  borderRadius: "16px",
  transition: "all 0.3s ease",
  "&:hover": {
    boxShadow: "0 0 15px rgba(144, 202, 249, 0.3)",
  },
}));

interface AIEditingAssistantProps {
  open: boolean;
  onClose: () => void;
  currentText: string;
  onApplySuggestion: (text: string) => void;
  fullTranscript?: string;
  onApplyFullTranscript?: (text: string) => void;
}

export default function AIEditingAssistant({
  open,
  onClose,
  currentText,
  onApplySuggestion,
  fullTranscript,
  onApplyFullTranscript,
}: AIEditingAssistantProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [improvedTranscript, setImprovedTranscript] = useState<string | null>(
    null,
  );
  const [isImprovingTranscript, setIsImprovingTranscript] = useState(false);
  const [activeTab, setActiveTab] = useState<"line" | "full">("line");

  const handleGetSuggestions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getEditingSuggestions(
        currentText,
        customPrompt || undefined,
      );

      // Parse the bulleted list into an array of suggestions
      const parsedSuggestions = result
        .split("\n")
        .filter(
          (line) => line.trim().startsWith("•") || line.trim().startsWith("*"),
        )
        .map((line) => line.replace(/^[•*]\s*/, "").trim());

      setSuggestions(parsedSuggestions);
      setIsLoading(false);
    } catch (error) {
      console.error("Error getting suggestions:", error);
      setError("Failed to get suggestions. Please try again.");
      setIsLoading(false);
    }
  };

  const handleApplySuggestion = (suggestion: string) => {
    onApplySuggestion(suggestion);
  };

  const handleImproveFullTranscript = async () => {
    if (!fullTranscript || !onApplyFullTranscript) return;

    try {
      setIsImprovingTranscript(true);
      setError(null);

      const result = await improveTranscriptFlow(fullTranscript);
      setImprovedTranscript(result);
      setIsImprovingTranscript(false);
    } catch (error) {
      console.error("Error improving transcript:", error);
      setError("Failed to improve transcript. Please try again.");
      setIsImprovingTranscript(false);
    }
  };

  const handleApplyImprovedTranscript = () => {
    if (improvedTranscript && onApplyFullTranscript) {
      onApplyFullTranscript(improvedTranscript);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: "rgba(18, 18, 18, 0.95)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
          border: "1px solid rgba(144, 202, 249, 0.2)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Psychology sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6">AI Editing Assistant</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Button
              variant={activeTab === "line" ? "contained" : "outlined"}
              onClick={() => setActiveTab("line")}
              startIcon={<Lightbulb />}
            >
              Line Suggestions
            </Button>
            {fullTranscript && onApplyFullTranscript && (
              <Button
                variant={activeTab === "full" ? "contained" : "outlined"}
                onClick={() => setActiveTab("full")}
                startIcon={<AutoAwesome />}
              >
                Full Transcript Improvement
              </Button>
            )}
          </Stack>

          {activeTab === "line" ? (
            <>
              <GlowingCard sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ mb: 1, fontWeight: "bold" }}
                >
                  Current Text:
                </Typography>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: "rgba(0, 0, 0, 0.2)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <Typography variant="body1">{currentText}</Typography>
                </Paper>
              </GlowingCard>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Custom Prompt (Optional):
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="E.g., Make this more conversational, or Add more technical details"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "8px",
                      bgcolor: "rgba(0, 0, 0, 0.2)",
                    },
                  }}
                />
              </Box>

              <Button
                variant="contained"
                color="primary"
                onClick={handleGetSuggestions}
                disabled={isLoading}
                startIcon={
                  isLoading ? <CircularProgress size={20} /> : <Refresh />
                }
                sx={{ mb: 3 }}
              >
                {isLoading ? "Getting Suggestions..." : "Get AI Suggestions"}
              </Button>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {suggestions.length > 0 && (
                <GlowingCard>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 2, fontWeight: "bold" }}
                  >
                    AI Suggestions:
                  </Typography>
                  <List>
                    {suggestions.map((suggestion, index) => (
                      <ListItem
                        key={index}
                        secondaryAction={
                          <Tooltip title="Use this suggestion">
                            <IconButton
                              edge="end"
                              onClick={() => handleApplySuggestion(suggestion)}
                              color="primary"
                            >
                              <ContentPaste />
                            </IconButton>
                          </Tooltip>
                        }
                        sx={{
                          mb: 1,
                          bgcolor: "rgba(0, 0, 0, 0.2)",
                          borderRadius: "8px",
                          "&:hover": {
                            bgcolor: "rgba(25, 118, 210, 0.1)",
                          },
                        }}
                      >
                        <ListItemIcon>
                          <Lightbulb color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={suggestion} />
                      </ListItem>
                    ))}
                  </List>
                </GlowingCard>
              )}
            </>
          ) : (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                The AI can analyze your entire transcript and suggest
                improvements to the flow, coherence, and natural sound of the
                conversation while maintaining the original meaning.
              </Typography>

              <Button
                variant="contained"
                color="primary"
                onClick={handleImproveFullTranscript}
                disabled={isImprovingTranscript}
                startIcon={
                  isImprovingTranscript ? (
                    <CircularProgress size={20} />
                  ) : (
                    <AutoAwesome />
                  )
                }
                sx={{ mb: 3 }}
              >
                {isImprovingTranscript
                  ? "Improving Transcript..."
                  : "Improve Full Transcript"}
              </Button>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {improvedTranscript && (
                <GlowingCard>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 2, fontWeight: "bold" }}
                  >
                    Improved Transcript:
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: "rgba(0, 0, 0, 0.2)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      maxHeight: "300px",
                      overflow: "auto",
                    }}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                      {improvedTranscript}
                    </Typography>
                  </Paper>

                  <Box
                    sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleApplyImprovedTranscript}
                    >
                      Apply Improved Transcript
                    </Button>
                  </Box>
                </GlowingCard>
              )}
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
