import React from 'react';
import { TextField, Box } from '@mui/material';
import { useResumeStore } from '../../../store/resumeStore';

const SummaryForm = () => {
    const { resume, updateSummary } = useResumeStore();

    return (
        <Box>
            <TextField
                label="Professional Summary"
                value={resume.summary}
                onChange={(e) => updateSummary(e.target.value)}
                multiline
                rows={4}
                fullWidth
                helperText="Highlight your key skills, experience, and career goals (3-4 sentences recommended)."
            />
        </Box>
    );
};

export default SummaryForm;