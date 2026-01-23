import React from 'react';
import { TextField, Grid, IconButton, Box, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useResumeStore } from '../../../store/resumeStore';

const EducationForm = ({ educationId, index }) => {
    const { resume, updateEducation, removeEducation } = useResumeStore();
    const education = resume.education.find(edu => edu.id === educationId);

    const handleChange = (field, value) => {
        updateEducation(educationId, { [field]: value });
    };

    return (
        <Box sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'background.default' }}>
            <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="subtitle2" color="primary">School #{index + 1}</Typography>
                <IconButton size="small" color="error" onClick={() => removeEducation(educationId)}>
                    <DeleteIcon />
                </IconButton>
            </Box>

            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <TextField
                        fullWidth size="small" label="Institution Name"
                        value={education.institution}
                        onChange={(e) => handleChange('institution', e.target.value)}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        fullWidth size="small" label="Degree"
                        value={education.degree}
                        onChange={(e) => handleChange('degree', e.target.value)}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        fullWidth size="small" label="Field of Study"
                        value={education.fieldOfStudy || education.field} // Handle both namings
                        onChange={(e) => handleChange('fieldOfStudy', e.target.value)}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        fullWidth size="small" label="Graduation Year"
                        value={education.endYear || education.endDate}
                        onChange={(e) => handleChange('endYear', e.target.value)}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        fullWidth size="small" label="GPA (Optional)"
                        value={education.gpa}
                        onChange={(e) => handleChange('gpa', e.target.value)}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default EducationForm;