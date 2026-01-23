import React from 'react';
import { useResumeStore } from '../../../store/resumeStore';
import { TextField, Grid } from '@mui/material';

const PersonalInfoForm = () => {
    const { resume, updatePersonal } = useResumeStore();

    // Generic handler for all text fields in this section
    const handleChange = (field) => (e) => {
        updatePersonal({ [field]: e.target.value });
    };

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <TextField
                    label="Full Name"
                    value={resume.personal.name}
                    onChange={handleChange('name')}
                    fullWidth
                    size="small"
                />
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField
                    label="Email"
                    value={resume.personal.email}
                    onChange={handleChange('email')}
                    fullWidth
                    size="small"
                />
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField
                    label="Phone"
                    value={resume.personal.phone}
                    onChange={handleChange('phone')}
                    fullWidth
                    size="small"
                />
            </Grid>
            <Grid item xs={12}>
                <TextField
                    label="Location (City, Country)"
                    value={resume.personal.location}
                    onChange={handleChange('location')}
                    fullWidth
                    size="small"
                />
            </Grid>
            <Grid item xs={12}>
                <TextField
                    label="LinkedIn URL"
                    value={resume.personal.linkedin}
                    onChange={handleChange('linkedin')}
                    fullWidth
                    size="small"
                />
            </Grid>
            <Grid item xs={12}>
                <TextField
                    label="Portfolio / Website"
                    value={resume.personal.website}
                    onChange={handleChange('website')}
                    fullWidth
                    size="small"
                />
            </Grid>
        </Grid>
    );
};

export default PersonalInfoForm;