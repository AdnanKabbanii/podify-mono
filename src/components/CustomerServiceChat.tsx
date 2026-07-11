import { Chat as ChatIcon, Close as CloseIcon, Person as PersonIcon, Send as SendIcon, SupportAgent as SupportAgentIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Fade,
  IconButton,
  List,
  ListItem,
  Paper,
  TextField,
  Typography,
  Zoom,
  alpha,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { keyframes } from '@mui/system';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgent } from '../contexts/AgentContext.js';
import { useAuth } from '../contexts/AuthContext.js';

interface AgentAction {
  id: string;
  description: string;
  type: string;
  params: Record<string, unknown>;
}

const blink = keyframes`
  0% { opacity: 0.2; }
  20% { opacity: 1; }
  100% { opacity: 0.2; }
`;

const TypingIndicator = () => {
  const theme = useTheme();
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 0.5,
        padding: 1,
        width: 'fit-content',
        borderRadius: '16px',
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        boxShadow: 1
      }}
    >
      {[0, 1, 2].map((dot) => (
        <Box
          key={dot}
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: theme.palette.primary.main,
            animation: `${blink} 1.4s infinite ease-in-out both`,
            animationDelay: `${dot * 0.2}s`
          }}
        />
      ))}
    </Box>
  );
};

const CustomerServiceChat: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAuthenticated } = useAuth();
  
  const { 
    messages, 
    isLoading, 
    suggestedActions, 
    sendMessage, 
    performAction,
    isAgentOpen,
    toggleAgent
  } = useAgent();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const loginRelatedTerms = ['account', 'login', 'sign in', 'register', 'profile'];
    const isLoginRelated = loginRelatedTerms.some(term => 
      inputValue.toLowerCase().includes(term)
    );
    
    if (!isAuthenticated && isLoginRelated) {
      await sendMessage(inputValue);
      setInputValue('');
      
      const loginAction: AgentAction = {
        id: 'login-action',
        description: 'Sign in to your account',
        type: 'navigate',
        params: { path: '/signin' }
      };
      
      setTimeout(() => {
        handleActionClick(loginAction);
      }, 500);
      
      return;
    }
    
    await sendMessage(inputValue);
    setInputValue('');
  };

  const handleActionClick = async (action: AgentAction) => {
    try {
      if (!action || !action.type) {
        console.error('Invalid action:', action);
        return;
      }
      if (action.type === 'navigate') {
        if (!action.params) {
          action.params = {};
        }
        
        if (!action.params.path && action.description) {
          const pathMap: Record<string, string> = {
            'dashboard': '/dashboard',
            'home': '/',
            'sign in': '/signin',
            'login': '/signin',
            'sign up': '/signup',
            'register': '/signup',
            'podcast': '/podcast',
            'generate': '/podcast/generate',
          };
          
          const lowerDesc = action.description.toLowerCase();
          for (const [key, path] of Object.entries(pathMap)) {
            if (lowerDesc.includes(key)) {
              action.params.path = path;
              break;
            }
          }
          if (!action.params.path) {
            action.params.path = '/dashboard';
          }
        }
      }
      
      const result = await performAction(action);
      
      if (action.type === 'navigate' && result.success) {
        if (result.data && typeof result.data.path === 'string') {
          navigate(result.data.path);
        } else {
          console.warn('Navigation result missing path:', result);
        }
      }
    } catch (error) {
      console.error('Error executing action:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessages = () => {
    return messages.map((message, index) => (
      <Zoom 
        key={message.id} 
        in={true} 
        style={{ 
          transitionDelay: `${50 * (index % 5)}ms`,
          transformOrigin: message.sender === 'user' ? 'right' : 'left'
        }}
      >
        <ListItem
          sx={{
            justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
            padding: 1
          }}
        >
          {message.sender === 'agent' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                marginRight: 1,
                color: theme.palette.primary.main
              }}
            >
              <SupportAgentIcon fontSize="small" />
            </Box>
          )}
          
          <Paper
            elevation={1}
            sx={{
              padding: 2,
              maxWidth: '75%',
              backgroundColor: message.sender === 'user' 
                ? alpha(theme.palette.secondary.main, 0.15)
                : alpha(theme.palette.primary.main, 0.15),
              color: message.sender === 'user' 
                ? theme.palette.text.primary
                : theme.palette.text.primary,
              borderRadius: message.sender === 'user' 
                ? '20px 20px 5px 20px' 
                : '20px 20px 20px 5px',
              boxShadow: 2,
              transition: 'all 0.3s ease',
              borderLeft: message.sender === 'agent' ? `3px solid ${theme.palette.primary.main}` : 'none',
              borderRight: message.sender === 'user' ? `3px solid ${theme.palette.secondary.main}` : 'none',
              '&:hover': {
                boxShadow: 3,
                transform: 'scale(1.01)',
                backgroundColor: message.sender === 'user' 
                  ? alpha(theme.palette.secondary.main, 0.2)
                  : alpha(theme.palette.primary.main, 0.2),
              }
            }}
          >
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{message.text}</Typography>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Paper>
          
          {message.sender === 'user' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: alpha(theme.palette.secondary.main, 0.2),
                marginLeft: 1,
                color: theme.palette.secondary.main
              }}
            >
              <PersonIcon fontSize="small" />
            </Box>
          )}
        </ListItem>
      </Zoom>
    ));
  };

  const renderActionButtons = () => {
    if (suggestedActions.length === 0) return null;

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2, mb: 2, justifyContent: 'center' }}>
        {suggestedActions.map((action, index) => (
          <Fade 
            key={action.id} 
            in={true} 
            style={{ transitionDelay: `${100 * (index % 5)}ms` }}
          >
            <Chip
              label={action.description}
              onClick={() => handleActionClick(action)}
              color="primary"
              variant="outlined"
              clickable
              sx={{ 
                margin: 0.5, 
                borderRadius: '16px',
                padding: '8px 4px',
                transition: 'all 0.2s ease',
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  color: theme.palette.primary.contrastText,
                  transform: 'translateY(-2px)',
                  boxShadow: 2
                }
              }}
            />
          </Fade>
        ))}
      </Box>
    );
  };

  const chatContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: isMobile ? '100%' : '400px',
        backgroundColor: theme.palette.background.default
      }}
    >
      <Box
        sx={{
          p: 2,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.text.primary,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SupportAgentIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>VeilCast Assistant</Typography>
        </Box>
        <IconButton onClick={toggleAgent} color="inherit" size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      
      <List
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          padding: 2,
          backgroundColor: theme.palette.background.default,
          backgroundImage: `radial-gradient(${alpha(theme.palette.primary.main, 0.05)} 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      >
        {renderMessages()}
        
        {isLoading && (
          <ListItem sx={{ justifyContent: 'flex-start', padding: 1 }}>
            <TypingIndicator />
          </ListItem>
        )}
        
        {renderActionButtons()}
        <div ref={messagesEndRef} />
      </List>
      
      <Divider sx={{ opacity: 0.1 }} />
      
      <Box
        sx={{
          p: 2,
          backgroundColor: alpha(theme.palette.background.paper, 0.5),
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0px -2px 10px rgba(0,0,0,0.1)'
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          size="small"
          multiline
          maxRows={3}
          sx={{ 
            mr: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px',
              backgroundColor: alpha(theme.palette.background.paper, 0.5),
              transition: 'all 0.3s ease',
              '&:hover, &.Mui-focused': {
                boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.25)}`
              },
              '& fieldset': {
                borderColor: alpha(theme.palette.primary.main, 0.2),
              },
              '&:hover fieldset': {
                borderColor: alpha(theme.palette.primary.main, 0.5),
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
              }
            }
          }}
        />
        <Button
          variant="contained"
          color="primary"
          endIcon={<SendIcon />}
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
          sx={{
            borderRadius: '20px',
            minWidth: '100px',
            transition: 'all 0.2s ease',
            background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${alpha(theme.palette.primary.light, 0.9)} 90%)`,
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`
            },
            opacity: inputValue.trim() ? 1 : 0.7
          }}
        >
          Send
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Chat toggle button */}
      <Zoom in={true}>
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={toggleAgent}
            sx={{
              borderRadius: '50%',
              minWidth: '60px',
              height: '60px',
              boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              transition: 'all 0.3s ease',
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
              '&:hover': {
                transform: 'scale(1.1)',
                boxShadow: `0 6px 30px ${alpha(theme.palette.primary.main, 0.6)}`
              }
            }}
          >
            <ChatIcon />
          </Button>
        </Box>
      </Zoom>

      {/* Chat drawer */}
      <Drawer
        anchor={isMobile ? 'bottom' : 'right'}
        open={isAgentOpen}
        onClose={toggleAgent}
        PaperProps={{
          sx: {
            height: isMobile ? '80%' : '100%',
            width: isMobile ? '100%' : '400px',
            borderRadius: isMobile ? '16px 16px 0 0' : 0,
            overflow: 'hidden',
            backgroundColor: theme.palette.background.default,
            backgroundImage: 'none'
          }
        }}
        transitionDuration={300}
        SlideProps={{
          appear: true,
          direction: isMobile ? 'up' : 'left',
          timeout: {
            enter: 400,
            exit: 300
          },
          easing: {
            enter: 'cubic-bezier(0.4, 0, 0.2, 1)',
            exit: 'cubic-bezier(0.4, 0, 0.2, 1)'
          }
        }}
      >
        {chatContent}
      </Drawer>
    </>
  );
};

export default CustomerServiceChat;
