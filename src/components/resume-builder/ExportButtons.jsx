import React, { useState } from 'react';
import { Button, CircularProgress, Alert, Snackbar } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import { useResumeStore } from '../../store/resumeStore';
import { useAuth } from '../../context/AuthContext';
import { resumeService } from '../../services/api';
import { useReactToPrint } from 'react-to-print';

const ExportButtons = ({ contentRef }) => {
    const { resume } = useResumeStore();
    const { updateUserResume, refreshUsage } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Helper: Convert Structured Data -> Plain Text for "RawText" field
    const generatePlainText = (data) => {
        let text = "";

        if (data.personal.name) text += `${data.personal.name.toUpperCase()}\n`;
        const contactParts = [
            data.personal.email,
            data.personal.phone,
            data.personal.location,
            data.personal.linkedin,
            data.personal.website
        ].filter(Boolean);
        if (contactParts.length) text += `${contactParts.join(' | ')}\n\n`;

        if (data.summary) {
            text += `PROFESSIONAL SUMMARY\n${data.summary}\n\n`;
        }

        if (data.experience?.length > 0) {
            text += "PROFESSIONAL EXPERIENCE\n";
            data.experience.forEach(exp => {
                text += `${exp.position} | ${exp.company} | ${exp.location || ''}\n`;
                text += `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}\n`;
                if (exp.achievements?.length) {
                    exp.achievements.forEach(ach => {
                        if (ach) text += `• ${ach}\n`;
                    });
                }
                text += "\n";
            });
        }

        if (data.education?.length > 0) {
            text += "EDUCATION\n";
            data.education.forEach(edu => {
                text += `${edu.institution}\n`;
                text += `${edu.degree} in ${edu.fieldOfStudy}\n`;
                text += `${edu.startDate} - ${edu.endDate}\n`;
                if (edu.gpa) text += `GPA: ${edu.gpa}\n`;
                text += "\n";
            });
        }

        if (data.skills) {
            text += "SKILLS\n";
            if (data.skills.technicalSkills?.length)
                text += `Technical: ${data.skills.technicalSkills.join(', ')}\n`;
            if (data.skills.toolsAndTechnologies?.length)
                text += `Tools: ${data.skills.toolsAndTechnologies.join(', ')}\n`;
            if (data.skills.softSkills?.length)
                text += `Soft Skills: ${data.skills.softSkills.join(', ')}\n`;
            if (data.skills.languages?.length)
                text += `Languages: ${data.skills.languages.map(l => `${l.name} (${l.proficiency})`).join(', ')}\n`;
            text += "\n";
        }

        if (data.certifications?.length > 0) {
            text += "CERTIFICATIONS\n";
            data.certifications.forEach(cert => {
                text += `• ${cert.name} - ${cert.issuer} (${cert.date})\n`;
            });
            text += "\n";
        }

        if (data.projects?.length > 0) {
            text += "PROJECTS\n";
            data.projects.forEach(proj => {
                text += `${proj.name}\n`;
                text += `${proj.description}\n`;
                if (proj.technologies?.length) text += `Tech: ${proj.technologies.join(', ')}\n`;
                text += "\n";
            });
        }

        return text;
    };

    const handleSaveToCloud = async () => {
        setLoading(true);
        try {
            const plainText = generatePlainText(resume);
            const payload = {
                rawText: plainText,
                structuredData: resume,
                fileName: `${resume.personal.name || 'My'}_Resume_Builder.json`,
                fileType: 'application/json'
            };

            await resumeService.saveResume(payload);

            updateUserResume(plainText, JSON.stringify(payload.structuredData));

            setMessage('Resume saved to cloud successfully!');
            await refreshUsage();
        } catch (error) {
            console.error(error);
            setMessage('Failed to save resume.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = useReactToPrint({
        contentRef: contentRef, // Use contentRef instead of content
        documentTitle: `${resume.personal.name || 'Resume'}_CV`,
        onAfterPrint: () => setMessage("PDF generated successfully!"),
        removeAfterPrint: true
    });

    return (
        <>
            <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                    variant="outlined"
                    startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                    onClick={handleSaveToCloud}
                    disabled={loading}
                >
                    Save to Cloud
                </Button>
                <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handlePrint}
                >
                    Download PDF
                </Button>
            </div>

            <Snackbar
                open={!!message}
                autoHideDuration={4000}
                onClose={() => setMessage('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={message.includes('Failed') ? 'error' : 'success'}>
                    {message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default ExportButtons;