import React, { useState } from 'react';
import { useResumeStore } from '../../../store/resumeStore';
import {
    TextField, Chip, Box, Button, Typography, Grid, Paper, Divider, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

// Categories matching your Backend/Store schema
const skillCategories = [
    { key: 'technicalSkills', label: 'Technical Skills (Hard Skills)' },
    { key: 'toolsAndTechnologies', label: 'Tools & Technologies' },
    { key: 'softSkills', label: 'Soft Skills' }
];

const SkillsForm = () => {
    const { resume, addSkill, removeSkill, addLanguage, removeLanguage, updateLanguage } = useResumeStore();

    // Local state for the text input of each category before adding
    const [inputs, setInputs] = useState({
        technicalSkills: '',
        toolsAndTechnologies: '',
        softSkills: ''
    });

    const handleAdd = (category) => {
        const val = inputs[category]?.trim();
        if (val) {
            addSkill(category, val);
            setInputs({ ...inputs, [category]: '' }); // Clear input
        }
    };

    const handleKeyPress = (e, category) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd(category);
        }
    };

    const handleLanguageChange = (index, field, value) => {
        updateLanguage(index, { [field]: value });
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Skills & Languages</Typography>

            {/* 1. Skill Categories */}
            <Grid container spacing={3}>
                {skillCategories.map(({ key, label }) => (
                    <Grid item xs={12} key={key}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                                {label}
                            </Typography>

                            {/* Input Area */}
                            <Box display="flex" gap={1} mb={2}>
                                <TextField
                                    label="Add skill..."
                                    value={inputs[key]}
                                    onChange={(e) => setInputs({ ...inputs, [key]: e.target.value })}
                                    onKeyPress={(e) => handleKeyPress(e, key)}
                                    size="small"
                                    fullWidth
                                />
                                <Button
                                    onClick={() => handleAdd(key)}
                                    variant="contained"
                                    size="small"
                                    sx={{ minWidth: 'auto' }}
                                >
                                    <AddIcon />
                                </Button>
                            </Box>

                            {/* Chip List (Delete implementation) */}
                            <Box display="flex" flexWrap="wrap" gap={1}>
                                {resume.skills[key]?.length === 0 && (
                                    <Typography variant="caption" color="text.secondary">No skills added.</Typography>
                                )}
                                {resume.skills[key]?.map((skill, index) => (
                                    <Chip
                                        key={`${key}-${index}`}
                                        label={skill}
                                        onDelete={() => removeSkill(key, skill)}
                                        size="small"
                                    />
                                ))}
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* 2. Languages Section */}
            <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle1" fontWeight="bold">Languages</Typography>
                    <Button startIcon={<AddIcon />} onClick={addLanguage} size="small" variant="outlined">
                        Add Language
                    </Button>
                </Box>

                {resume.skills.languages.map((lang, index) => (
                    <Box key={index} display="flex" gap={2} mb={2} alignItems="center">
                        <TextField
                            label="Language"
                            value={lang.name}
                            onChange={(e) => handleLanguageChange(index, 'name', e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label="Proficiency"
                            value={lang.proficiency}
                            onChange={(e) => handleLanguageChange(index, 'proficiency', e.target.value)}
                            size="small"
                            fullWidth
                            placeholder="e.g. Native, B2"
                        />
                        <IconButton color="error" onClick={() => removeLanguage(index)}>
                            <DeleteIcon />
                        </IconButton>
                    </Box>
                ))}
                {resume.skills.languages.length === 0 && (
                    <Typography variant="caption" color="text.secondary">No languages added.</Typography>
                )}
            </Box>
        </Box>
    );
};

export default SkillsForm;