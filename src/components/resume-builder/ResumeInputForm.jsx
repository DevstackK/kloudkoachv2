import React, { useState } from 'react';
import {
    Box, TextField, Button, Typography, Paper, Grid,
    CircularProgress, Alert, Stepper, Step, StepLabel
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

const steps = ['Basic Info', 'Experience', 'Education', 'Skills & Extras'];

const ResumeInputForm = ({ onSubmit, isGenerating }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState({
        basics: '',
        experience: '',
        education: '',
        skills: ''
    });

    const handleChange = (field) => (e) => {
        setFormData({ ...formData, [field]: e.target.value });
    };

    const handleNext = () => {
        if (activeStep < steps.length - 1) {
            setActiveStep((prev) => prev + 1);
        } else {
            // Combine all text for the AI
            const fullText = `
        BASIC INFO:
        ${formData.basics}

        EXPERIENCE:
        ${formData.experience}

        EDUCATION:
        ${formData.education}

        SKILLS & EXTRAS:
        ${formData.skills}
      `;
            onSubmit(fullText);
        }
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <>
                        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                            Who are you?
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Provide your Full Name, Target Job Title, Email, Phone, Location, and LinkedIn URL.
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={6}
                            placeholder={`John Doe\nSenior Full Stack Developer\njohn@example.com\n+1 555 0199\nNew York, USA\nlinkedin.com/in/johndoe`}
                            value={formData.basics}
                            onChange={handleChange('basics')}
                            variant="outlined"
                        />
                    </>
                );
            case 1:
                return (
                    <>
                        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                            Work History
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            List your roles. Include Company, Title, Dates, and key accomplishments (quantified if possible).
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={8}
                            placeholder={`TechCorp Solutions | Senior Developer | Jan 2020 - Present\n- Led a team of 5 developers to migrate legacy app to React, improving load time by 40%.\n- Designed REST APIs using .NET Core.\n\nStartUp Inc | Web Developer | June 2018 - Dec 2019\n- Developed 10+ responsive websites.`}
                            value={formData.experience}
                            onChange={handleChange('experience')}
                            variant="outlined"
                        />
                    </>
                );
            case 2:
                return (
                    <>
                        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                            Education
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Institution, Degree, Major, Graduation Date, and GPA (optional).
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={6}
                            placeholder={`University of Technology\nBachelor of Science in Computer Science\nGraduated: May 2018\nGPA: 3.8`}
                            value={formData.education}
                            onChange={handleChange('education')}
                            variant="outlined"
                        />
                    </>
                );
            case 3:
                return (
                    <>
                        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                            Skills, Projects & Certifications
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            List your technical skills, languages, projects, or certifications. Just list them; AI will categorize them.
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={8}
                            placeholder={`Skills: Python, React, AWS, Docker, Agile\n\nLanguages: English (Native), Spanish (Intermediate)\n\nCertifications: AWS Certified Solutions Architect (2023)`}
                            value={formData.skills}
                            onChange={handleChange('skills')}
                            variant="outlined"
                        />
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3, maxWidth: 800, mx: 'auto', mt: 4 }}>
            <Box textAlign="center" mb={4}>
                <AutoFixHighIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                    AI Resume Builder
                </Typography>
                <Typography color="text.secondary">
                    Describe your background, and our AI will build a professional resume for you.
                </Typography>
            </Box>

            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            <Box minHeight={300}>
                {renderStepContent(activeStep)}
            </Box>

            <Box display="flex" justifyContent="space-between" mt={4}>
                <Button
                    disabled={activeStep === 0 || isGenerating}
                    onClick={handleBack}
                    variant="outlined"
                >
                    Back
                </Button>
                <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={isGenerating}
                    startIcon={isGenerating && <CircularProgress size={20} color="inherit" />}
                >
                    {activeStep === steps.length - 1 ? (isGenerating ? 'Generating...' : 'Generate Resume') : 'Next'}
                </Button>
            </Box>
        </Paper>
    );
};

export default ResumeInputForm;