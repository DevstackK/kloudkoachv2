import React, { forwardRef } from 'react';
import { useResumeStore } from '../../store/resumeStore';
import { Box, Typography, Divider, Link } from '@mui/material';

const ResumePreview = forwardRef((props, ref) => {
    const { resume } = useResumeStore();

    if (!resume) return null;

    return (
        <Box
            ref={ref}
            id="resume-preview-content"
            sx={{
                fontFamily: resume.settings?.font || 'Arial',
                color: '#000',
                lineHeight: 1.5,
                bgcolor: 'white',
                p: 5,
                minHeight: '11in',
                "@media print": {
                    margin: 0,
                    boxShadow: "none",
                    border: "none",
                    padding: "0.5in" // Ensure print margins
                }
            }}
        >
            {/* --- HEADER --- */}
            <Box textAlign="center" mb={2}>
                <Typography variant="h4" fontWeight="bold" textTransform="uppercase" sx={{ mb: 1 }}>
                    {resume.personal.name || "Your Name"}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                    <Typography variant="body2">{resume.personal.email}</Typography>
                    {resume.personal.phone && <Typography variant="body2">| {resume.personal.phone}</Typography>}
                    {resume.personal.location && <Typography variant="body2">| {resume.personal.location}</Typography>}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {resume.personal.linkedin && (
                        <Link href={resume.personal.linkedin} target="_blank" variant="body2" underline="hover">
                            LinkedIn
                        </Link>
                    )}
                    {resume.personal.website && (
                        <Link href={resume.personal.website} target="_blank" variant="body2" underline="hover">
                            Portfolio / Website
                        </Link>
                    )}
                </Box>
            </Box>

            <Divider sx={{ borderColor: '#000', mb: 2 }} />

            {/* --- PROFESSIONAL SUMMARY --- */}
            {resume.summary && (
                <Box mb={2}>
                    <Typography variant="h6" fontWeight="bold" textTransform="uppercase" sx={{ fontSize: '1rem', mb: 0.5, borderBottom: '1px solid #ccc' }}>
                        Professional Summary
                    </Typography>
                    <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                        {resume.summary}
                    </Typography>
                </Box>
            )}

            {/* --- SKILLS & LANGUAGES --- */}
            {(resume.skills.technicalSkills?.length > 0 || resume.skills.languages?.length > 0 || resume.skills.toolsAndTechnologies?.length > 0 || resume.skills.softSkills?.length > 0) && (
                <Box mb={2}>
                    <Typography variant="h6" fontWeight="bold" textTransform="uppercase" sx={{ fontSize: '1rem', mb: 0.5, borderBottom: '1px solid #ccc' }}>
                        Skills & Languages
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {resume.skills.technicalSkills?.length > 0 && (
                            <li>
                                <Typography variant="body2">
                                    <strong>Technical:</strong> {resume.skills.technicalSkills.join(', ')}
                                </Typography>
                            </li>
                        )}
                        {resume.skills.toolsAndTechnologies?.length > 0 && (
                            <li>
                                <Typography variant="body2">
                                    <strong>Tools:</strong> {resume.skills.toolsAndTechnologies.join(', ')}
                                </Typography>
                            </li>
                        )}
                        {resume.skills.softSkills?.length > 0 && (
                            <li>
                                <Typography variant="body2">
                                    <strong>Soft Skills:</strong> {resume.skills.softSkills.join(', ')}
                                </Typography>
                            </li>
                        )}
                        {resume.skills.languages?.length > 0 && (
                            <li>
                                <Typography variant="body2">
                                    <strong>Languages:</strong> {resume.skills.languages.map(l =>
                                        `${l.name}${l.proficiency ? ` (${l.proficiency})` : ''}`
                                    ).join(', ')}
                                </Typography>
                            </li>
                        )}
                    </Box>
                </Box>
            )}

            {/* --- EXPERIENCE --- */}
            {resume.experience?.length > 0 && (
                <Box mb={2}>
                    <Typography variant="h6" fontWeight="bold" textTransform="uppercase" sx={{ fontSize: '1rem', mb: 1, borderBottom: '1px solid #ccc' }}>
                        Professional Experience
                    </Typography>
                    {resume.experience.map(exp => (
                        <Box key={exp.id} mb={2}>
                            <Box display="flex" justifyContent="space-between" alignItems="baseline">
                                <Typography fontWeight="bold" variant="body1">
                                    {exp.company}
                                </Typography>
                                <Typography variant="body2" fontStyle="italic">
                                    {exp.location}
                                </Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={0.5}>
                                <Typography variant="body2" fontWeight="bold" fontStyle="italic">
                                    {exp.position}
                                </Typography>
                                <Typography variant="body2">
                                    {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                                </Typography>
                            </Box>

                            <Box component="ul" sx={{ mt: 0, pl: 2, m: 0 }}>
                                {exp.achievements?.filter(a => a).map((ach, i) => (
                                    <li key={i} style={{ marginBottom: '2px' }}>
                                        <Typography variant="body2">{ach}</Typography>
                                    </li>
                                ))}
                            </Box>
                        </Box>
                    ))}
                </Box>
            )}

            {/* --- EDUCATION --- */}
            {resume.education?.length > 0 && (
                <Box mb={2}>
                    <Typography variant="h6" fontWeight="bold" textTransform="uppercase" sx={{ fontSize: '1rem', mb: 1, borderBottom: '1px solid #ccc' }}>
                        Education
                    </Typography>
                    {resume.education.map(edu => (
                        <Box key={edu.id} mb={1}>
                            <Box display="flex" justifyContent="space-between">
                                <Typography fontWeight="bold" variant="body2" fontSize="0.95rem">
                                    {edu.institution}
                                </Typography>
                                <Typography variant="body2">
                                    {edu.startDate} – {edu.endDate}
                                </Typography>
                            </Box>
                            <Typography variant="body2">
                                {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                                {edu.gpa ? ` (GPA: ${edu.gpa})` : ''}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}

            {/* --- CERTIFICATIONS --- */}
            {resume.certifications?.length > 0 && (
                <Box mb={2}>
                    <Typography variant="h6" fontWeight="bold" textTransform="uppercase" sx={{ fontSize: '1rem', mb: 1, borderBottom: '1px solid #ccc' }}>
                        Certifications
                    </Typography>
                    <Box component="ul" sx={{ mt: 0, pl: 2, m: 0 }}>
                        {resume.certifications.map(cert => (
                            <li key={cert.id} style={{ marginBottom: '2px' }}>
                                <Typography variant="body2">
                                    <strong>{cert.name}</strong> – {cert.issuer} {cert.date ? `(${cert.date})` : ''}
                                </Typography>
                            </li>
                        ))}
                    </Box>
                </Box>
            )}

            {/* --- PROJECTS --- */}
            {resume.projects?.length > 0 && (
                <Box mb={2}>
                    <Typography variant="h6" fontWeight="bold" textTransform="uppercase" sx={{ fontSize: '1rem', mb: 1, borderBottom: '1px solid #ccc' }}>
                        Projects
                    </Typography>
                    {resume.projects.map(proj => (
                        <Box key={proj.id} mb={1}>
                            <Typography fontWeight="bold" variant="body2">{proj.name}</Typography>
                            <Typography variant="body2">{proj.description}</Typography>
                            {proj.technologies?.length > 0 && (
                                <Typography variant="caption" fontStyle="italic">
                                    Tech: {proj.technologies.join(', ')}
                                </Typography>
                            )}
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
});

export default ResumePreview;