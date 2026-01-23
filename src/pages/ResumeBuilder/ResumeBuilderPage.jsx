import React, { useState } from 'react';
import { Box, Container, Button, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid'; // Import UUID to generate IDs for list items
import ResumeInputForm from '../../components/resume-builder/ResumeInputForm';
import ResumeEditor from '../../components/resume-builder/ResumeEditor';
import { resumeService } from '../../services/api';
import { useResumeStore } from '../../store/resumeStore';

const ResumeBuilderPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('input'); // 'input' | 'editor'
    const [error, setError] = useState('');
    const { setResumeData, setParsing, isParsing } = useResumeStore();

    const handleGenerate = async (rawText) => {
        setParsing(true);
        setError('');

        try {
            const response = await resumeService.parseResume(rawText);
            if (response.data.success) {
                const parsedData = response.data.data;

                // --- CRITICAL FIX: MAP BACKEND RESPONSE TO FRONTEND STORE FORMAT ---
                const mappedData = {
                    personal: {
                        name: parsedData.fullName || '',
                        email: parsedData.contact?.email || '',
                        phone: parsedData.contact?.phone || '',
                        location: parsedData.contact?.address || '',
                        linkedin: parsedData.contact?.linkedIn || '',
                        website: parsedData.contact?.website || ''
                    },
                    summary: parsedData.summary || '',

                    // Fix 1: Map 'workExperience' -> 'experience' AND generate IDs
                    experience: parsedData.workExperience?.map(exp => ({
                        id: uuidv4(), // Generate ID for React keys
                        company: exp.company || '',
                        position: exp.position || '',
                        location: exp.location || '',
                        startDate: exp.startDate || '',
                        endDate: exp.endDate || '',
                        current: exp.endDate?.toLowerCase() === 'present',
                        achievements: exp.achievements || [],
                        technologies: exp.responsibilities || [] // Map responsibilities or tech here if needed
                    })) || [],

                    // Fix 2: Generate IDs for Education
                    education: parsedData.education?.map(edu => ({
                        id: uuidv4(),
                        institution: edu.institution || '',
                        degree: edu.degree || '',
                        fieldOfStudy: edu.fieldOfStudy || '',
                        location: edu.location || '',
                        startDate: edu.startYear || '', // Backend sends 'startYear'
                        endDate: edu.endYear || '',     // Backend sends 'endYear'
                        gpa: '',
                        honors: []
                    })) || [],

                    // Fix 3: Handle Language Mapping (languageName -> name)
                    skills: {
                        technicalSkills: parsedData.skills?.technicalSkills || [],
                        softSkills: parsedData.skills?.softSkills || [],
                        toolsAndTechnologies: parsedData.skills?.toolsAndTechnologies || [],
                        languages: parsedData.skills?.languages?.map(l => ({
                            name: l.languageName, // Map 'languageName' to 'name'
                            proficiency: l.proficiency
                        })) || []
                    },

                    // Fix 4: Generate IDs for Certifications
                    certifications: parsedData.certifications?.map(cert => ({
                        id: uuidv4(),
                        name: cert.name || '',
                        issuer: cert.issuer || '',
                        date: cert.dateObtained || '', // Map 'dateObtained' -> 'date'
                        url: ''
                    })) || [],

                    projects: parsedData.projects?.map(proj => ({
                        id: uuidv4(),
                        name: proj.name || '',
                        description: proj.description || '',
                        technologies: proj.technologiesUsed || []
                    })) || [],

                    settings: {
                        format: 'chronological',
                        targetKeywords: [],
                        length: 'one-page',
                        font: 'Calibri',
                        fontSize: 11
                    }
                };

                setResumeData(mappedData);
                setStep('editor');
            } else {
                setError(response.data.error || "Failed to generate resume.");
            }
        } catch (err) {
            console.error(err);
            setError("An error occurred while generating the resume.");
        } finally {
            setParsing(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 3 }}>
            <Container maxWidth="xl">
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => step === 'editor' ? setStep('input') : navigate('/dashboard')}
                    sx={{ mb: 2 }}
                >
                    {step === 'editor' ? 'Back to Input' : 'Back to Dashboard'}
                </Button>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {step === 'input' ? (
                    <ResumeInputForm onSubmit={handleGenerate} isGenerating={isParsing} />
                ) : (
                    <ResumeEditor />
                )}
            </Container>
        </Box>
    );
};

export default ResumeBuilderPage;