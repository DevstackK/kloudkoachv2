import React, { useState, useRef } from 'react';
import {
    Grid, Box, Paper, Typography, Tabs, Tab, Button, Divider
} from '@mui/material';
import PersonalInfoForm from './forms/PersonalInfoForm';
import SummaryForm from './forms/SummaryForm';
import ExperienceForm from './forms/ExperienceForm';
import EducationForm from './forms/EducationForm';
import SkillsForm from './forms/SkillsForm';
import ResumePreview from './ResumePreview';
import ExportButtons from './ExportButtons';
import { useResumeStore } from '../../store/resumeStore';
import AddIcon from '@mui/icons-material/Add';

const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
};

const ResumeEditor = () => {
    const [tabValue, setTabValue] = useState(0);
    const { resume, addExperience, addEducation } = useResumeStore();

    // Create the Ref here
    const componentRef = useRef();

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    return (
        <Grid container spacing={3}>
            {/* LEFT PANEL: Editor Forms */}
            <Grid item xs={12} md={6}>
                {/* 1. Basic Info & Summary */}
                <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                    <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                        1. Personal Details
                    </Typography>
                    <PersonalInfoForm />

                    <Divider sx={{ my: 3 }} />

                    <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                        2. Professional Summary
                    </Typography>
                    <SummaryForm />
                </Paper>

                {/* 2. Detailed Sections (Tabs) */}
                <Paper elevation={2} sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
                            <Tab label="Experience" />
                            <Tab label="Education" />
                            <Tab label="Skills" />
                        </Tabs>
                    </Box>

                    <Box sx={{ p: 3 }}>
                        {/* EXPERIENCE TAB */}
                        <TabPanel value={tabValue} index={0}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="subtitle1" fontWeight="bold">Work History</Typography>
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={addExperience}
                                    variant="outlined"
                                    size="small"
                                >
                                    Add Job
                                </Button>
                            </Box>
                            {resume.experience.map((exp, index) => (
                                <ExperienceForm key={exp.id} experienceId={exp.id} index={index} />
                            ))}
                        </TabPanel>

                        {/* EDUCATION TAB */}
                        <TabPanel value={tabValue} index={1}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="subtitle1" fontWeight="bold">Education</Typography>
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={addEducation}
                                    variant="outlined"
                                    size="small"
                                >
                                    Add School
                                </Button>
                            </Box>
                            {resume.education.map((edu, index) => (
                                <EducationForm key={edu.id} educationId={edu.id} index={index} />
                            ))}
                        </TabPanel>

                        {/* SKILLS TAB */}
                        <TabPanel value={tabValue} index={2}>
                            <SkillsForm />
                        </TabPanel>
                    </Box>
                </Paper>
            </Grid>

            {/* RIGHT PANEL: Live Preview & Export */}
            <Grid item xs={12} md={6}>
                <Box sx={{ position: 'sticky', top: 20 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight="bold">Live Preview</Typography>
                        {/* Pass Ref to Buttons */}
                        <ExportButtons contentRef={componentRef} />
                    </Box>

                    <Paper
                        elevation={4}
                        sx={{
                            p: 0, // Let the inner component handle padding for consistent print
                            minHeight: '800px',
                            bgcolor: 'white',
                            color: 'black',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Pass Ref to Preview */}
                        <ResumePreview ref={componentRef} />
                    </Paper>
                </Box>
            </Grid>
        </Grid>
    );
};

export default ResumeEditor;