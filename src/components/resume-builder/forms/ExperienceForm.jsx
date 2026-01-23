import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { TextField, Grid, IconButton, Box, Typography, Checkbox, FormControlLabel, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useResumeStore } from '../../../store/resumeStore';

const ExperienceForm = ({ experienceId, index }) => {
    const { resume, updateExperience, removeExperience } = useResumeStore();
    const experience = resume.experience.find(exp => exp.id === experienceId);

    const { control, handleSubmit } = useForm({
        defaultValues: experience
    });

    // Auto-save on blur logic could be added here, currently relies on "Save" button in header or manual triggers
    const handleFieldChange = (field, value) => {
        updateExperience(experienceId, { [field]: value });
    };

    const handleAchievementChange = (achIndex, value) => {
        const newAch = [...experience.achievements];
        newAch[achIndex] = value;
        updateExperience(experienceId, { achievements: newAch });
    };

    const addAchievement = () => {
        updateExperience(experienceId, { achievements: [...experience.achievements, ""] });
    };

    return (
        <Box sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: 'background.default' }}>
            <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="subtitle2" color="primary">Role #{index + 1}</Typography>
                <IconButton size="small" color="error" onClick={() => removeExperience(experienceId)}>
                    <DeleteIcon />
                </IconButton>
            </Box>

            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <TextField
                        fullWidth size="small" label="Company"
                        value={experience.company}
                        onChange={(e) => handleFieldChange('company', e.target.value)}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        fullWidth size="small" label="Job Title"
                        value={experience.position}
                        onChange={(e) => handleFieldChange('position', e.target.value)}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        fullWidth size="small" label="Start Date"
                        value={experience.startDate}
                        onChange={(e) => handleFieldChange('startDate', e.target.value)}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        fullWidth size="small" label="End Date"
                        disabled={experience.current}
                        value={experience.endDate}
                        onChange={(e) => handleFieldChange('endDate', e.target.value)}
                    />
                </Grid>
                <Grid item xs={12}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={experience.current}
                                onChange={(e) => handleFieldChange('current', e.target.checked)}
                            />
                        }
                        label="I currently work here"
                    />
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="caption" fontWeight="bold">Key Achievements</Typography>
                    {experience.achievements.map((ach, i) => (
                        <Box key={i} display="flex" gap={1} mt={1}>
                            <TextField
                                fullWidth size="small" multiline rows={2}
                                placeholder="e.g. Increased sales by 20%..."
                                value={ach}
                                onChange={(e) => handleAchievementChange(i, e.target.value)}
                            />
                        </Box>
                    ))}
                    <Button size="small" sx={{ mt: 1 }} onClick={addAchievement}>+ Add Achievement</Button>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ExperienceForm;