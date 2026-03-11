import { useState, useEffect } from "react";
import * as mammoth from "mammoth";
import pdfToText from "react-pdftotext";
import {
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Divider,
  ListItemIcon,
  Tooltip
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import DescriptionIcon from "@mui/icons-material/Description";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useAuth } from "../../context/AuthContext";
import ProgressOverlay from "./ProgressOverlay";
import api from "../../services/api"; 

const CVManager = ({ onCVChange }) => {
  const { user, updateUserResume, checkAccess, refreshUsage } = useAuth();
  
  // State
  const [resumeList, setResumeList] = useState([]);
  const [activeResumeText, setActiveResumeText] = useState("");
  const [activeResumeName, setActiveResumeName] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  // Progress overlay state
  const [showProgress, setShowProgress] = useState(false);
  const [progressTitle, setProgressTitle] = useState("");
  const [progressMessage, setProgressMessage] = useState("");
  const [progressValue, setProgressValue] = useState(0);

  // Initial Load
  useEffect(() => {
    fetchResumeList();
    if (user?.resumeRawText) {
      setActiveResumeText(user.resumeRawText);
      // Try to find name in list later, or default
      setActiveResumeName("Active Resume");
    }
  }, [user]);

  // --- API CALLS ---
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isLoading) {
        // Standard way to trigger browser warning
        e.preventDefault();
        e.returnValue = ''; 
        return '';
      }
    };
    if (isLoading) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isLoading]);

  const fetchResumeList = async () => {
    setIsListLoading(true);
    try {
      const response = await api.get('/resume/all');
      if (response.data.success) {
        setResumeList(response.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch resumes", err);
    } finally {
      setIsListLoading(false);
    }
  };

  const handleActivate = async (resumeId) => {
    setIsLoading(true);
    try {
      const response = await api.put(`/resume/${resumeId}/activate`);
      if (response.data.success) {
        const contentResponse = await api.get('/resume');
        if (contentResponse.data.success) {
           const { rawText, structuredData, fileName } = contentResponse.data.data;
           
           // Update Context
           updateUserResume(rawText, JSON.stringify(structuredData));
           setActiveResumeText(rawText);
           setActiveResumeName(fileName);
           onCVChange?.(rawText);
        }
        
        setStatusMsg("Resume activated successfully!");
        fetchResumeList(); // Refresh list to update UI badges
      }
    } catch (err) {
      setError("Failed to activate resume");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHardDelete = async (resumeId, isActive) => {
    if(!window.confirm("Are you sure? This will permanently delete this resume.")) return;

    setIsLoading(true);
    try {
      await api.delete(`/resume/${resumeId}`);
      
      // If we deleted the active one, clear context
      if (isActive) {
        updateUserResume("", "{}");
        setActiveResumeText("");
        setActiveResumeName("");
        onCVChange?.("");
      }

      setStatusMsg("Resume deleted permanently.");
      fetchResumeList();
      // Deleting might free up usage depending on logic, let's refresh
      await refreshUsage(); 
    } catch (err) {
      setError("Failed to delete resume");
    } finally {
      setIsLoading(false);
    }
  };

  // --- UPLOAD LOGIC ---

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) {
      setError("Only PDF and DOCX files are allowed");
      return;
    }

    if (!checkAccess('RESUME_UPLOAD')) {
        setError("Resume limit exceeded. Please upgrade your plan or delete an old resume.");
        return;
    }

    e.target.value = ''; // Reset input
    setIsLoading(true);
    setError("");
    setStatusMsg("");
    
    // Setup Progress
    setProgressTitle("Uploading Resume\n(This process may take 2-4 minutes)");
    setProgressMessage("Starting...");
    setProgressValue(0);
    setShowProgress(true);

    try {
      // 1. Text Extraction
      setProgressMessage("Reading file...");
      setProgressValue(10);
      const buffer = await file.arrayBuffer();
      let fileText = "";
      
      if (file.type === "application/pdf") {
        fileText = await pdfToText(file);
      } else {
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        fileText = result.value;
      }

      // 2. AI Processing
      setProgressMessage("AI Analysis in progress...");
      setProgressValue(40);
      
      const structuredData = await extractStructuredResumeData(fileText);

      // 3. Save to Backend
      setProgressMessage("Saving to database...");
      setProgressValue(80);
      
      await api.post('/resume', {
        rawText: fileText,
        structuredData: structuredData,
        fileName: file.name,
        fileType: file.type,
      });

      // 4. Update Context & UI
      updateUserResume(fileText, JSON.stringify(structuredData));
      setActiveResumeText(fileText);
      setActiveResumeName(file.name);
      onCVChange?.(fileText);
      
      await refreshUsage();
      fetchResumeList(); // Refresh list to show new upload

      setProgressValue(100);
      setTimeout(() => {
        setShowProgress(false);
        setStatusMsg("Resume uploaded successfully!");
      }, 800);

    } catch (err) {
      console.error(err);
      setError(err.message || "Upload failed");
      setShowProgress(false);
    } finally {
      setIsLoading(false);
    }
  };

  const extractStructuredResumeData = async (rawText) => {
      const response = await fetch("https://n8n.srv1151683.hstgr.cloud/webhook/resume-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume_text: rawText })
      });
      if(!response.ok) throw new Error("AI analysis failed");
      const json = await response.json();
      return json[0]?.output || json;
  };

  return (
    <>
      <Paper elevation={3} sx={{ p: 3, width: "100%", height: "100%", display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} flexShrink={0}>
          <Box>
            <Box display="flex" alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Resume Management
              </Typography>
              <Typography variant="h6" component="span" color="error" sx={{ ml: 0.5 }}>
                *
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Required to start session
            </Typography>
          </Box>
          
          <Tooltip title="Refresh List">
            <span>
              <IconButton onClick={fetchResumeList} disabled={isListLoading} size="small">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* ALERTS */}
        <Box flexShrink={0}>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
            {statusMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setStatusMsg("")}>{statusMsg}</Alert>}
        </Box>

        {/* ACTIVE RESUME PREVIEW - Adjusted Height */}
        <Box 
          flexShrink={0}
          sx={{ 
            p: 2, 
            mb: 3, 
            borderRadius: 2, 
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.1)' : '#e8f5e9',
            border: '1px solid',
            borderColor: 'success.main'
          }}
        >
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <CheckCircleIcon color="success" />
            <Typography variant="subtitle1" fontWeight="bold">Active Resume</Typography>
          </Box>
          
          {activeResumeText ? (
            <>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                {activeResumeName || "Current File"}
              </Typography>
              <Box 
                sx={{ 
                  maxHeight: '150px', /* Reduced from 300px to give more room to list */
                  overflowY: 'auto', 
                  fontSize: '0.8rem', 
                  color: 'text.secondary',
                  bgcolor: 'background.paper',
                  p: 1,
                  borderRadius: 1
                }}
              >
                {activeResumeText}...
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">No active resume selected.</Typography>
          )}
        </Box>

        {/* UPLOAD BUTTON */}
        <Box flexShrink={0}>
            <Button
              variant="contained"
              component="label"
              fullWidth
              startIcon={<UploadFileIcon />}
              disabled={isLoading}
              sx={{ mb: 3, py: 1.5 }}
            >
              Upload New Resume
              <input type="file" hidden accept=".pdf,.docx" onChange={handleFileChange} />
            </Button>
        </Box>

        <Divider sx={{ mb: 2, flexShrink: 0 }}>
            <Chip label="Resume History" size="small" />
        </Divider>

        {/* RESUME LIST - Now fills remaining space */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
          {isListLoading ? (
            <Box display="flex" justifyContent="center" p={2}><CircularProgress size={24}/></Box>
          ) : resumeList.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>No resumes found.</Typography>
          ) : (
            <List dense>
              {resumeList.map((resume) => (
                <ListItem
                  key={resume.resumeId}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    mb: 1,
                    bgcolor: resume.isActive ? 'action.selected' : 'background.paper'
                  }}
                  secondaryAction={
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      onClick={() => handleHardDelete(resume.resumeId, resume.isActive)}
                      color="error"
                      disabled={isLoading}
                    >
                      <DeleteForeverIcon />
                    </IconButton>
                  }
                >
                  <ListItemIcon onClick={() => !resume.isActive && handleActivate(resume.resumeId)} sx={{ cursor: 'pointer' }}>
                    {resume.isActive ? (
                        <CheckCircleIcon color="success" /> 
                    ) : (
                        <Tooltip title="Click to Activate">
                            <span>
                                <RadioButtonUncheckedIcon color="action" />
                            </span>
                        </Tooltip>
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                        <Typography variant="body2" fontWeight={resume.isActive ? 700 : 400}>
                            {resume.fileName || `Resume #${resume.resumeId}`}
                        </Typography>
                    }
                    secondary={new Date(resume.createdDate).toLocaleDateString()}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

      </Paper>

      <ProgressOverlay
        open={showProgress}
        title={progressTitle}
        message={progressMessage}
        progress={progressValue}
      />
    </>
  );
};

export default CVManager;