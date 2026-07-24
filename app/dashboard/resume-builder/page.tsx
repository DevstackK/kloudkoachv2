"use client";

import * as React from "react";
import { extractTextFromFile } from "@/lib/extractText";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Divider,
  Tooltip,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useAuth } from "@/lib/AuthProvider";

type ResumeRow = {
  id: string;
  fileName: string;
  isActive: boolean;
  createdAt: string;
  rawText: string;
};

export default function ResumeBuilderPage() {
  const { checkAccess } = useAuth();

  const [resumes, setResumes] = React.useState<ResumeRow[]>([]);
  const [isListLoading, setIsListLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [statusMsg, setStatusMsg] = React.useState("");

  const activeResume = resumes.find((r) => r.isActive);

  const fetchResumes = React.useCallback(async () => {
    setIsListLoading(true);
    try {
      const res = await fetch("/api/resume", { credentials: "include" });
      const json = await res.json();
      if (json.success) setResumes(json.data);
    } catch {
      // non-fatal
    } finally {
      setIsListLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleActivate = async (id: string) => {
    setIsUploading(true);
    try {
      const res = await fetch(`/api/resume/${id}/activate`, { method: "PATCH", credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setStatusMsg("Resume activated.");
        await fetchResumes();
      } else {
        setError("Failed to activate resume.");
      }
    } catch {
      setError("Failed to activate resume.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this resume permanently?")) return;
    setIsUploading(true);
    try {
      const res = await fetch(`/api/resume/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setStatusMsg("Resume deleted.");
        await fetchResumes();
      } else {
        setError("Failed to delete resume.");
      }
    } catch {
      setError("Failed to delete resume.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) {
      setError("Only PDF and DOCX files are allowed.");
      return;
    }

    if (!checkAccess("RESUME_BUILDER")) {
      setError("Resume limit reached for your plan. Upgrade or delete an old resume to continue.");
      return;
    }

    setIsUploading(true);
    setError("");
    setStatusMsg("");

    try {
      const fileText = await extractTextFromFile(file);

      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rawText: fileText, fileName: file.name, fileType: file.type }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Upload failed");
      }

      setStatusMsg("Resume uploaded and parsed with Kloud Koach AI.");
      await fetchResumes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6, flex: 1 }}>
      <Paper elevation={0} sx={{ p: 3, borderRadius: "20px", border: "1px solid", borderColor: "divider" }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              AI Resume Builder
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Upload a resume and Kloud Koach AI extracts structured data automatically.
            </Typography>
          </Box>
          <Tooltip title="Refresh list">
            <span>
              <IconButton onClick={fetchResumes} disabled={isListLoading} size="small">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {statusMsg && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setStatusMsg("")}>
            {statusMsg}
          </Alert>
        )}

        <Box
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(76, 175, 80, 0.1)" : "#e8f5e9"),
            border: "1px solid",
            borderColor: "success.main",
          }}
        >
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <CheckCircleIcon color="success" />
            <Typography variant="subtitle1" fontWeight="bold">
              Active Resume
            </Typography>
          </Box>
          {activeResume ? (
            <>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                {activeResume.fileName}
              </Typography>
              <Box sx={{ maxHeight: 150, overflowY: "auto", fontSize: "0.8rem", color: "text.secondary", bgcolor: "background.paper", p: 1, borderRadius: 1 }}>
                {activeResume.rawText.slice(0, 1000)}...
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No active resume selected.
            </Typography>
          )}
        </Box>

        <Button variant="contained" component="label" fullWidth startIcon={isUploading ? <CircularProgress size={18} color="inherit" /> : <UploadFileIcon />} disabled={isUploading} sx={{ mb: 3, py: 1.5, borderRadius: "12px" }}>
          {isUploading ? "Processing..." : "Upload New Resume"}
          <input type="file" hidden accept=".pdf,.docx" onChange={handleFileChange} />
        </Button>

        <Divider sx={{ mb: 2 }}>
          <Chip label="Resume History" size="small" />
        </Divider>

        {isListLoading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : resumes.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            No resumes found.
          </Typography>
        ) : (
          <List dense>
            {resumes.map((resume) => (
              <ListItem
                key={resume.id}
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, mb: 1, bgcolor: resume.isActive ? "action.selected" : "background.paper" }}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleDelete(resume.id)} color="error" disabled={isUploading}>
                    <DeleteForeverIcon />
                  </IconButton>
                }
              >
                <ListItemIcon onClick={() => !resume.isActive && handleActivate(resume.id)} sx={{ cursor: resume.isActive ? "default" : "pointer" }}>
                  {resume.isActive ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <Tooltip title="Click to activate">
                      <RadioButtonUncheckedIcon color="action" />
                    </Tooltip>
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={resume.isActive ? 700 : 400}>
                      {resume.fileName}
                    </Typography>
                  }
                  secondary={new Date(resume.createdAt).toLocaleDateString()}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
}
