import { useState, useEffect } from "react";
import * as mammoth from "mammoth";
import pdfToText from "react-pdftotext";
import LZString from "lz-string";
import {
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionIcon from "@mui/icons-material/Description";
import { useAuth } from "../../context/AuthContext";
import { useExamSetup } from "../../context/ExamSetupContext";
import api from "../../services/api"; // âś… IMPORT API SERVICE

const CourseMaterialManager = ({ onCourseMaterialChange }) => {
  const { user } = useAuth();
  const [materialFile, setMaterialFile] = useState(null);
  const [materialText, setMaterialText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { formData, setFormData } = useExamSetup();
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.courseMaterialText) {
      try {
        setMaterialText(user.courseMaterialText);
        setMaterialFile({ name: "Existing Course Material" });
      } catch (err) {
        console.error("Error loading course material:", err);
        setError("Error loading existing course material");
      }
    }
  }, [user]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (
      ![
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(file.type)
    ) {
      setError("Only PDF and DOCX files are allowed");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      let fileText = "";
      const buffer = await file.arrayBuffer();

      if (file.type === "application/pdf") {
        fileText = await pdfToText(file);
      } else {
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        fileText = result.value;
      }

      const compressedText = LZString.compressToUTF16(fileText);

      // âś… FIX: Use api.put instead of fetch
      await api.put('/coursematerial', { CourseMaterialText: compressedText });

      setMaterialFile(file);
      setMaterialText(fileText);
      setFormData(prev => ({
        ...prev,
        courseMaterial: fileText
      }));
      onCourseMaterialChange?.(fileText);
    } catch (err) {
      console.error(err);
      setError("Error processing file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMaterial = async () => {
    setIsRemoving(true);
    setError("");
    try {
      // âś… FIX: Use api.put instead of fetch
      await api.put('/coursematerial', { CourseMaterialText: "" });

      setMaterialFile(null);
      setMaterialText("");
      setFormData(prev => ({
        ...prev,
        courseMaterial: ""
      }));
      onCourseMaterialChange?.("");
    } catch (err) {
      console.error(err);
      setError("Error removing course material");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, width: "100%", height: "100%", margin: "auto", display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Course Material
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadFileIcon />}
          disabled={isLoading || isRemoving}
        >
          Upload Material
          <input type="file" hidden accept=".pdf,.docx" onChange={handleFileChange} />
        </Button>
        {(isLoading || isRemoving) && <CircularProgress size={24} />}
      </Box>

      <Box sx={{ minHeight: '2rem', mt: 1 }}>
        {materialFile && !error && (
          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
            {materialFile.name}
          </Typography>
        )}
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
      </Box>

      {materialText && (
        <>
          <Box
            component="pre"
            sx={{
              flexGrow: 1,
              minHeight: 0,
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              lineHeight: 1.6,
              fontWeight: 550,
              whiteSpace: "pre-wrap",
              wordBreak: 'break-word',
              color: "text.primary",
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "grey.900" : "grey.100",
              boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
              overflowY: "auto",
            }}
          >
            {materialText}
          </Box>
          <Button
            variant="outlined"
            color="error"
            onClick={handleRemoveMaterial}
            startIcon={<DeleteOutlineIcon />}
            sx={{ mt: 2, mb: 1, flexShrink: 0 }}
          >
            Remove Material
          </Button>
        </>
      )}

      {!materialText && !isLoading && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          sx={{ flexGrow: 1, color: "text.secondary", my: 2, border: '2px dashed', borderColor: 'divider', borderRadius: 2 }}
        >
          <DescriptionIcon sx={{ fontSize: { xs: 40, sm: 60 }, mb: 1 }} />
          <Typography sx={{ textAlign: 'center' }}>
            Upload course material to see a preview
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CourseMaterialManager;