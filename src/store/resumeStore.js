import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// Default initial state
const initialResumeData = {
    personal: {
        name: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        website: ''
    },
    summary: '',
    experience: [],
    education: [],
    skills: {
        technicalSkills: [], // Was 'programming' in sample
        softSkills: [],     // New
        toolsAndTechnologies: [], // Was 'tools'
        languages: []
    },
    certifications: [],
    projects: [],
    settings: {
        format: 'chronological',
        targetKeywords: [],
        length: 'one-page',
        font: 'Calibri',
        fontSize: 11
    }
};

export const useResumeStore = create((set, get) => ({
    resume: initialResumeData,
    currentTemplate: 'ats-chronological',
    isParsing: false,

    // --- ACTIONS ---

    // Bulk Set (Used after AI Parsing)
    setResumeData: (data) => set({ resume: data }),

    setParsing: (isLoading) => set({ isParsing: isLoading }),

    // Personal Info
    updatePersonal: (personal) =>
        set((state) => ({
            resume: {
                ...state.resume,
                personal: { ...state.resume.personal, ...personal }
            }
        })),

    updateSummary: (summary) =>
        set((state) => ({
            resume: { ...state.resume, summary }
        })),

    // Experience
    addExperience: () =>
        set((state) => ({
            resume: {
                ...state.resume,
                experience: [
                    ...state.resume.experience,
                    {
                        id: uuidv4(),
                        company: '',
                        position: '',
                        location: '',
                        startDate: '',
                        endDate: '',
                        current: false,
                        achievements: [''],
                        technologies: []
                    }
                ]
            }
        })),

    removeExperience: (id) =>
        set((state) => ({
            resume: {
                ...state.resume,
                experience: state.resume.experience.filter((exp) => exp.id !== id)
            }
        })),

    updateExperience: (id, updates) =>
        set((state) => ({
            resume: {
                ...state.resume,
                experience: state.resume.experience.map((exp) =>
                    exp.id === id ? { ...exp, ...updates } : exp
                )
            }
        })),

    // Education
    addEducation: () =>
        set((state) => ({
            resume: {
                ...state.resume,
                education: [
                    ...state.resume.education,
                    {
                        id: uuidv4(),
                        institution: '',
                        degree: '',
                        fieldOfStudy: '',
                        location: '',
                        startDate: '',
                        endDate: '',
                        gpa: '',
                        honors: []
                    }
                ]
            }
        })),

    removeEducation: (id) =>
        set((state) => ({
            resume: {
                ...state.resume,
                education: state.resume.education.filter((edu) => edu.id !== id)
            }
        })),

    updateEducation: (id, updates) =>
        set((state) => ({
            resume: {
                ...state.resume,
                education: state.resume.education.map((edu) =>
                    edu.id === id ? { ...edu, ...updates } : edu
                )
            }
        })),

    // Skills (Using specific categories)
    addSkill: (category, skill) =>
        set((state) => ({
            resume: {
                ...state.resume,
                skills: {
                    ...state.resume.skills,
                    [category]: [...(state.resume.skills[category] || []), skill]
                }
            }
        })),

    removeSkill: (category, skill) =>
        set((state) => ({
            resume: {
                ...state.resume,
                skills: {
                    ...state.resume.skills,
                    [category]: state.resume.skills[category].filter((s) => s !== skill)
                }
            }
        })),

    // Languages
    addLanguage: () =>
        set((state) => ({
            resume: {
                ...state.resume,
                skills: {
                    ...state.resume.skills,
                    languages: [
                        ...state.resume.skills.languages,
                        { name: '', proficiency: 'Intermediate' }
                    ]
                }
            }
        })),

    removeLanguage: (index) =>
        set((state) => {
            const newLanguages = [...state.resume.skills.languages];
            newLanguages.splice(index, 1);
            return {
                resume: {
                    ...state.resume,
                    skills: { ...state.resume.skills, languages: newLanguages }
                }
            };
        }),

    updateLanguage: (index, updates) =>
        set((state) => {
            const newLanguages = [...state.resume.skills.languages];
            newLanguages[index] = { ...newLanguages[index], ...updates };
            return {
                resume: {
                    ...state.resume,
                    skills: { ...state.resume.skills, languages: newLanguages }
                }
            };
        }),

    // Certifications
    addCertification: (certification) =>
        set((state) => ({
            resume: {
                ...state.resume,
                certifications: [
                    ...(state.resume.certifications || []),
                    {
                        id: uuidv4(),
                        name: certification?.name || '',
                        issuer: certification?.issuer || '',
                        date: certification?.date || '',
                        url: certification?.url || ''
                    }
                ]
            }
        })),

    removeCertification: (id) =>
        set((state) => ({
            resume: {
                ...state.resume,
                certifications: (state.resume.certifications || []).filter((cert) => cert.id !== id)
            }
        })),

    updateCertification: (id, updates) =>
        set((state) => ({
            resume: {
                ...state.resume,
                certifications: (state.resume.certifications || []).map((cert) =>
                    cert.id === id ? { ...cert, ...updates } : cert
                )
            }
        })),

    // Template
    setTemplate: (template) => set({ currentTemplate: template }),

    // Helper: Reset to initial
    resetResume: () => set({ resume: initialResumeData })
}));