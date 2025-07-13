// AI CV Screening Tool - JavaScript Functions with Feedback System
// functions.js

// =============================================================================
// CONFIGURATION & GLOBAL VARIABLES
// =============================================================================

// API configuration - Secure backend calls
const API_BASE_URL = window.location.origin;
const API_ENDPOINTS = {
  analyze: '/api/analyze',
  health: '/health',
  candidates: '/api/candidates',
  jobs: '/api/jobs',
  applications: '/api/applications',
  feedback: '/api/feedback',
  migration: '/api/migration'
};

// Global variables
let currentStep = 1;
let jobRequirements = {};
let uploadedFiles = [];
let analysisResults = [];
let useRealAI = false;
let rateLimitInfo = { remaining: 10, resetTime: null };

// Phase 3: Industry Configuration
let currentProjectConfig = {};
let showSetupWizard = false;

// Industry-specific templates from PRD Phase 3.2
const industryTemplates = {
    technology: {
        name: "Technology & Software",
        focus_areas: ["Technical skills", "Problem-solving", "Learning agility"],
        scoring_weights: { skills: 35, experience: 25, projects: 20, growth: 20 },
        red_flags: ["Outdated tech stack", "No portfolio/GitHub", "Job hopping >6 months"],
        positive_indicators: ["Open source contributions", "Side projects", "Continuous learning"],
        compliance_requirements: [],
        prompt_additions: `
            TECH-SPECIFIC ANALYSIS:
            - Evaluate technical depth vs breadth
            - Look for evidence of problem-solving and innovation
            - Consider technology stack evolution and adaptability
            - Weight practical experience over theoretical knowledge
        `
    },
    healthcare: {
        name: "Healthcare & Medical",
        focus_areas: ["Certifications", "Clinical experience", "Patient care", "Compliance"],
        scoring_weights: { certifications: 40, experience: 30, compliance: 20, skills: 10 },
        red_flags: ["Expired licenses", "Gaps in practice", "Compliance violations"],
        positive_indicators: ["Current certifications", "Continuing education", "Patient outcomes"],
        compliance_requirements: ["Medical license", "HIPAA training", "CPR certification"],
        prompt_additions: `
            HEALTHCARE-SPECIFIC ANALYSIS:
            - Verify all certifications are current and relevant
            - Look for evidence of continuing medical education
            - Assess patient care quality indicators
            - Check for any compliance or safety concerns
        `
    },
    finance: {
        name: "Finance & Banking",
        focus_areas: ["Regulatory knowledge", "Risk management", "Analytics", "Client relations"],
        scoring_weights: { compliance: 35, experience: 30, analytics: 20, communication: 15 },
        red_flags: ["Regulatory violations", "Poor risk assessment", "Lack of certifications"],
        positive_indicators: ["CFA/FRM certifications", "Regulatory experience", "Quantitative skills"],
        compliance_requirements: ["Series 7", "Series 66", "CFA", "FRM"],
        prompt_additions: `
            FINANCE-SPECIFIC ANALYSIS:
            - Prioritize regulatory compliance and certifications
            - Evaluate risk management experience and approach
            - Assess quantitative and analytical capabilities
            - Consider client relationship management skills
        `
    },
    sales: {
        name: "Sales & Business Development",
        focus_areas: ["Track record", "Relationship building", "Industry knowledge", "Results orientation"],
        scoring_weights: { results: 40, relationships: 25, industry: 20, skills: 15 },
        red_flags: ["Poor performance history", "High churn", "Lack of metrics"],
        positive_indicators: ["Quota achievement", "Long-term relationships", "Industry expertise"],
        compliance_requirements: [],
        prompt_additions: `
            SALES-SPECIFIC ANALYSIS:
            - Focus heavily on quantifiable results and track record
            - Evaluate relationship building and networking abilities
            - Assess industry knowledge and market understanding
            - Look for evidence of consultative selling approach
        `
    },
    marketing: {
        name: "Marketing & Creative",
        focus_areas: ["Campaign results", "Creative portfolio", "Data analysis", "Brand understanding"],
        scoring_weights: { results: 30, creativity: 25, analytics: 25, strategy: 20 },
        red_flags: ["No portfolio", "Poor campaign metrics", "Outdated tactics"],
        positive_indicators: ["Strong portfolio", "Data-driven results", "Brand success stories"],
        compliance_requirements: [],
        prompt_additions: `
            MARKETING-SPECIFIC ANALYSIS:
            - Evaluate creative portfolio and campaign results
            - Assess data analysis and measurement capabilities
            - Consider brand strategy and positioning experience
            - Look for evidence of omnichannel marketing experience
        `
    },
    legal: {
        name: "Legal & Professional Services",
        focus_areas: ["Legal expertise", "Case experience", "Client service", "Specialization"],
        scoring_weights: { expertise: 35, experience: 30, client_service: 20, specialization: 15 },
        red_flags: ["Bar violations", "Malpractice claims", "Poor client feedback"],
        positive_indicators: ["Bar admission", "Specialized expertise", "Client testimonials"],
        compliance_requirements: ["Bar admission", "Continuing legal education", "Professional liability insurance"],
        prompt_additions: `
            LEGAL-SPECIFIC ANALYSIS:
            - Verify bar admission and good standing
            - Evaluate specialized legal expertise and case experience
            - Assess client service and relationship management
            - Consider continuing education and professional development
        `
    }
};

// Feedback system globals
let feedbackDatabase = [];
let recruiterProfile = null;

// Analytics tracking for enhanced dashboard
let analyticsData = {
    conversionFunnel: {
        applied: 0,
        screened: 0,
        invited: 0,
        interviewed: 0,
        offered: 0,
        hired: 0
    },
    timeToHire: [], // Array of {candidateId, startDate, hireDate, days}
    sourceEffectiveness: {}, // Track which sources work best
    dailyActivity: {}, // Track daily recruitment activity
    lastUpdated: new Date().toISOString()
};

// Recruiter Profile Schema from PRD Phase 2.3
const defaultRecruiterProfile = {
    recruiter_id: null,
    created_date: null,
    preference_weights: {
        skills_importance: 1.0,        // Baseline multiplier for skills matching
        experience_weight: 1.0,        // Weight for years of experience
        industry_strictness: 1.0,      // How strict about industry match
        growth_potential_value: 1.0    // Value placed on learning ability vs current skills
    },
    correction_patterns: {
        tends_to_prefer_overqualified: false,      // Consistently rates overqualified candidates higher
        strict_on_industry_match: false,          // Rarely accepts cross-industry candidates
        values_potential_over_experience: false,   // Prefers growth potential over experience
        favors_specific_skills: [],               // Skills that user consistently values
        penalizes_experience_gaps: false          // Harsh on employment gaps
    },
    learning_stats: {
        total_corrections: 0,
        total_feedback_provided: 0,
        accuracy_improvement: 0,        // Percentage improvement in AI accuracy
        last_learning_update: null,
        avg_score_adjustment: 0,        // Average amount user adjusts scores
        most_corrected_categories: []   // Top 3 feedback categories
    },
    category_preferences: {
        // Tracks how often each category is selected for corrections
        'skills-mismatch': 0,
        'experience-level': 0,
        'industry-background': 0,
        'overqualified': 0,
        'underqualified': 0,
        'cultural-fit': 0,
        'location-remote': 0,
        'salary-expectations': 0,
        'growth-potential': 0
    }
};

// Detailed feedback categories from PRD Phase 2.2
const feedbackCategories = {
    'skills-mismatch': {
        label: 'Skills Mismatch',
        description: 'Required skills missing/over-emphasized',
        suggestions: ['Focus on core technical requirements', 'Weight practical vs theoretical skills']
    },
    'experience-level': {
        label: 'Experience Level',
        description: 'Too junior/senior for role requirements',
        suggestions: ['Consider years of relevant experience', 'Look at progression in similar roles']
    },
    'industry-background': {
        label: 'Industry Background',
        description: 'Different industry experience needed',
        suggestions: ['Industry-specific knowledge required', 'Transferable skills vs domain expertise']
    },
    'overqualified': {
        label: 'Overqualified',
        description: 'Candidate exceeds role requirements significantly',
        suggestions: ['May seek higher compensation', 'Risk of quick departure', 'Could be flight risk']
    },
    'underqualified': {
        label: 'Underqualified',
        description: 'Candidate lacks fundamental requirements',
        suggestions: ['Missing core competencies', 'Would require extensive training']
    },
    'cultural-fit': {
        label: 'Cultural Fit',
        description: 'Team/company culture considerations',
        suggestions: ['Work style alignment', 'Team dynamics', 'Company values match']
    },
    'location-remote': {
        label: 'Location/Remote',
        description: 'Geographic or work arrangement issues',
        suggestions: ['Remote work compatibility', 'Time zone considerations', 'Relocation willingness']
    },
    'salary-expectations': {
        label: 'Salary Expectations',
        description: 'Compensation misalignment',
        suggestions: ['Budget constraints', 'Market rate differences', 'Total compensation package']
    },
    'growth-potential': {
        label: 'Growth Potential',
        description: 'Learning ability vs current skill set',
        suggestions: ['Learning agility', 'Adaptability', 'Future potential vs current ability']
    }
};

// =============================================================================
// PHASE 3: INDUSTRY CONFIGURATION SYSTEM
// =============================================================================

// Industry-specific prompt templates from PRD Phase 3.2
const industryTemplates = {
    technology: {
        name: "Technology & Software",
        focus_areas: ["Technical skills", "Problem-solving", "Learning agility"],
        scoring_weights: { skills: 35, experience: 25, projects: 20, growth: 20 },
        red_flags: ["Outdated tech stack", "No portfolio/GitHub", "Job hopping >6 months"],
        positive_indicators: ["Open source contributions", "Side projects", "Continuous learning"],
        compliance_requirements: [],
        prompt_additions: `
            TECH-SPECIFIC ANALYSIS:
            - Evaluate technical depth vs breadth
            - Look for evidence of problem-solving and innovation
            - Consider technology stack evolution and adaptability
            - Weight practical experience over theoretical knowledge
        `
    },
    healthcare: {
        name: "Healthcare & Medical",
        focus_areas: ["Certifications", "Clinical experience", "Patient care", "Compliance"],
        scoring_weights: { certifications: 40, experience: 30, compliance: 20, skills: 10 },
        red_flags: ["Expired licenses", "Gaps in practice", "Compliance violations"],
        positive_indicators: ["Current certifications", "Continuing education", "Patient outcomes"],
        compliance_requirements: ["Medical license", "HIPAA training", "CPR certification"],
        prompt_additions: `
            HEALTHCARE-SPECIFIC ANALYSIS:
            - Verify all certifications are current and relevant
            - Look for evidence of continuing medical education
            - Assess patient care quality indicators
            - Check for any compliance or safety concerns
        `
    },
    finance: {
        name: "Finance & Banking",
        focus_areas: ["Financial analysis", "Risk management", "Regulatory knowledge", "Quantitative skills"],
        scoring_weights: { certifications: 30, experience: 35, analysis: 25, compliance: 10 },
        red_flags: ["Regulatory violations", "Risk management gaps", "Outdated financial knowledge"],
        positive_indicators: ["CFA/FRM/CPA", "Financial modeling", "Risk assessment experience"],
        compliance_requirements: ["Series licenses", "Background checks", "Regulatory training"],
        prompt_additions: `
            FINANCE-SPECIFIC ANALYSIS:
            - Evaluate quantitative and analytical capabilities
            - Check for relevant financial certifications
            - Assess risk management experience
            - Consider regulatory compliance background
        `
    },
    sales: {
        name: "Sales & Business Development",
        focus_areas: ["Track record", "Relationship building", "Communication", "Results orientation"],
        scoring_weights: { results: 40, experience: 25, communication: 20, growth: 15 },
        red_flags: ["No quantifiable results", "High turnover", "Poor communication skills"],
        positive_indicators: ["Quota achievement", "Client retention", "Territory growth"],
        compliance_requirements: [],
        prompt_additions: `
            SALES-SPECIFIC ANALYSIS:
            - Focus heavily on quantifiable sales results and achievements
            - Evaluate relationship-building and communication skills
            - Look for evidence of consistent performance
            - Consider adaptability to different sales environments
        `
    },
    marketing: {
        name: "Marketing & Creative",
        focus_areas: ["Campaign performance", "Digital marketing", "Creativity", "Analytics"],
        scoring_weights: { results: 30, creativity: 25, digital: 25, analytics: 20 },
        red_flags: ["No campaign metrics", "Outdated digital knowledge", "Lack of creativity"],
        positive_indicators: ["Campaign ROI", "Digital platform expertise", "Creative portfolio"],
        compliance_requirements: [],
        prompt_additions: `
            MARKETING-SPECIFIC ANALYSIS:
            - Evaluate both creative and analytical capabilities
            - Look for measurable campaign performance and ROI
            - Assess digital marketing platform expertise
            - Consider brand building and audience engagement experience
        `
    },
    legal: {
        name: "Legal & Professional Services",
        focus_areas: ["Legal expertise", "Practice area experience", "Client management", "Ethical standards"],
        scoring_weights: { expertise: 35, experience: 30, clients: 20, ethics: 15 },
        red_flags: ["Disciplinary actions", "Malpractice issues", "Poor client feedback"],
        positive_indicators: ["Bar admission", "Specialized expertise", "Client testimonials"],
        compliance_requirements: ["Bar admission", "Malpractice insurance", "Ethics training"],
        prompt_additions: `
            LEGAL-SPECIFIC ANALYSIS:
            - Verify bar admission and good standing
            - Evaluate depth of practice area expertise
            - Assess client relationship management skills
            - Check for ethical standards and professionalism
        `
    }
};

// Multi-step setup wizard configuration
let currentWizardStep = 0;
let projectConfiguration = {
    industry: null,
    role_config: {
        seniority_level: null,
        role_type: null,
        team_size: null,
        department: null
    },
    requirements: {
        must_have_skills: [],
        nice_to_have_skills: [],
        deal_breakers: [],
        experience_range: { min: 0, max: 20 },
        education_requirements: null
    },
    scoring_preferences: {
        skills_vs_experience: 50,
        industry_importance: 50,
        growth_vs_current: 50,
        cultural_fit_level: 50
    },
    context: {
        company_stage: null,
        remote_policy: null,
        salary_range: null,
        timeline_urgency: null
    }
};

// =============================================================================
// PHASE 4: CV DATABASE & TALENT PIPELINE SYSTEM
// =============================================================================

// Candidate database globals
let candidateDatabase = [];
let talentPipeline = [];

// Candidate status management from PRD Phase 4.3
const candidateStatuses = {
    available: "Available for new opportunities",
    contacted: "Initial contact made",
    interested: "Expressed interest in role",
    interviewing: "In interview process",
    offered: "Offer extended",
    hired: "Successfully hired",
    declined: "Declined opportunity", 
    not_interested: "Not interested at this time",
    not_suitable: "Not suitable for current needs"
};

// Database schema implementation from PRD Phase 4.1
function createCandidateRecord(analysisData, extractedData = null, consentGiven = false) {
    return {
        candidate_id: generateCandidateId(),
        profile: {
            name: analysisData.name || 'Unknown Candidate',
            email: extractedData?.contactInfo?.email || '',
            phone: extractedData?.contactInfo?.phone || '',
            linkedin: '',
            location: ''
        },
        professional_data: {
            experience_years: extractedData?.experienceYears || parseInt(analysisData.experience) || 0,
            current_role: `${analysisData.experience} Professional`,
            industry_background: projectConfiguration.industry ? [industryTemplates[projectConfiguration.industry].name] : [],
            seniority_level: projectConfiguration.role_config?.seniority_level || 'unknown',
            skills: extractedData?.skills || analysisData.skills?.split(', ') || [],
            certifications: [],
            education: extractedData?.education || 'Not specified'
        },
        analysis_history: [{
            job_id: generateJobId(),
            job_title: jobRequirements.title || 'Unknown Role',
            ai_score: analysisData.score,
            user_feedback: analysisData.user_feedback?.type || null,
            corrected_score: analysisData.user_feedback?.corrected_score || null,
            analysis_date: new Date().toISOString(),
            industry: projectConfiguration.industry || 'general',
            feedback_categories: analysisData.user_feedback?.categories || []
        }],
        consent: {
            storage_agreed: consentGiven,
            contact_permission: consentGiven,
            data_retention_days: consentGiven ? 365 : 30,
            consent_date: new Date().toISOString()
        },
        metadata: {
            upload_date: new Date().toISOString(),
            last_contacted: null,
            status: 'available',
            tags: generateCandidateTags(analysisData),
            source: 'cv_screening_tool'
        },
        pipeline_status: 'available',
        notes: []
    };
}

function generateCandidateId() {
    return 'candidate-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function generateJobId() {
    return 'job-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

function generateCandidateTags(analysisData) {
    const tags = [];
    
    if (analysisData.score >= 90) tags.push('high-potential');
    if (analysisData.score >= 80) tags.push('strong-candidate');
    
    // Add industry-specific tags
    if (projectConfiguration.industry) {
        const industry = industryTemplates[projectConfiguration.industry];
        const candidateSkills = (analysisData.skills || '').toLowerCase();
        
        industry.positive_indicators.forEach(indicator => {
            if (candidateSkills.includes(indicator.toLowerCase())) {
                tags.push(indicator.replace(/\s+/g, '-').toLowerCase());
            }
        });
    }
    
    // Add experience level tags
    const experience = parseInt(analysisData.experience) || 0;
    if (experience >= 10) tags.push('senior-level');
    else if (experience >= 5) tags.push('mid-level');
    else tags.push('junior-level');
    
    return tags;
}

// =============================================================================
// SAMPLE DATA FOR DEMO MODE
// =============================================================================

const sampleJobDescription = `Senior Marketing Manager - B2B SaaS Company

We're looking for an experienced marketing manager to drive growth for our B2B SaaS platform.

Requirements:
- 5+ years marketing experience in B2B SaaS
- HubSpot and marketing automation expertise
- Google Analytics and data-driven decision making
- Experience with lead generation and nurturing
- Bachelor's degree in Marketing or related field
- Strong written and verbal communication skills

Preferred:
- Experience with ABM strategies
- SQL knowledge for data analysis
- Previous startup experience`;

const sampleCvs = [
    {
        name: "Sarah Johnson",
        score: 94,
        experience: "7 years",
        skills: "HubSpot, Google Analytics, Marketing Automation",
        highlights: ["HubSpot certified", "B2B SaaS experience", "Led 3 successful product launches"],
        concerns: ["No SQL experience mentioned"]
    },
    {
        name: "Michael Chen",
        score: 87,
        experience: "6 years",
        skills: "Marketing Automation, Lead Generation, Analytics",
        highlights: ["Marketing automation expert", "Grew MQLs by 150%", "Startup experience"],
        concerns: ["Limited HubSpot experience"]
    },
    {
        name: "Emily Rodriguez",
        score: 82,
        experience: "5 years",
        skills: "Google Analytics, Content Marketing, ABM",
        highlights: ["Account-based marketing specialist", "Data-driven approach", "Strong communication skills"],
        concerns: ["No HubSpot certification", "Limited automation experience"]
    }
];
// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeFeedbackSystem();
    initializeSetupWizard();
    checkAPIStatus();
});

function initializeEventListeners() {
    // Step 1: Job Description
    document.getElementById('sampleJobBtn').addEventListener('click', loadSampleJob);
    document.getElementById('extractReqBtn').addEventListener('click', extractRequirements);
    
    // Step 2: File Upload
    document.getElementById('fileUploadArea').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', handleFileSelection);
    document.getElementById('sampleCvsBtn').addEventListener('click', loadSampleCvs);
    document.getElementById('processCvsBtn').addEventListener('click', processCvs);
    
    // Step 4: Results
    document.getElementById('tryAgainBtn').addEventListener('click', resetTool);
    document.getElementById('downloadReportBtn').addEventListener('click', downloadReport);
    
    // File upload drag and drop
    const uploadArea = document.getElementById('fileUploadArea');
    uploadArea.addEventListener('dragenter', handleDragEnter);
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('dragleave', handleDragLeave);
}

// =============================================================================
// FEEDBACK SYSTEM IMPLEMENTATION
// =============================================================================

function initializeFeedbackSystem() {
    // Load existing feedback from localStorage
    const stored = localStorage.getItem('cv_feedback_database');
    if (stored) {
        feedbackDatabase = JSON.parse(stored);
    }
    
    // Initialize or load recruiter profile
    initializeRecruiterProfile();
    
    // Initialize candidate database
    initializeCandidateDatabase();
    
    // Initialize analytics data
    loadAnalyticsData();
    
    console.log('📊 Feedback system initialized:', feedbackDatabase.length, 'feedback records');
    console.log('📈 Analytics data loaded:', analyticsData.conversionFunnel);
    console.log('👤 Recruiter profile loaded:', recruiterProfile.learning_stats.total_corrections, 'total corrections');
    console.log('📁 Candidate database loaded:', candidateDatabase.length, 'candidates');
}

function initializeCandidateDatabase() {
    // Load existing candidate database from localStorage
    const storedCandidates = localStorage.getItem('candidate_database');
    if (storedCandidates) {
        candidateDatabase = JSON.parse(storedCandidates);
    }
    
    // Load talent pipeline
    const storedPipeline = localStorage.getItem('talent_pipeline');
    if (storedPipeline) {
        talentPipeline = JSON.parse(storedPipeline);
    }
    
    // Clean up expired candidates (if consent expired)
    cleanupExpiredCandidates();
}

function cleanupExpiredCandidates() {
    const now = new Date();
    candidateDatabase = candidateDatabase.filter(candidate => {
        const consentDate = new Date(candidate.consent.consent_date);
        const expiryDate = new Date(consentDate.getTime() + (candidate.consent.data_retention_days * 24 * 60 * 60 * 1000));
        
        if (now > expiryDate && !candidate.consent.storage_agreed) {
            console.log('🗑️ Removing expired candidate:', candidate.profile.name);
            return false;
        }
        return true;
    });
    
    saveCandidateDatabase();
}

function saveCandidateDatabase() {
    localStorage.setItem('candidate_database', JSON.stringify(candidateDatabase));
    localStorage.setItem('talent_pipeline', JSON.stringify(talentPipeline));
}

// Analytics data management
function loadAnalyticsData() {
    const saved = localStorage.getItem('analyticsData');
    if (saved) {
        analyticsData = { ...analyticsData, ...JSON.parse(saved) };
    }
}

function saveAnalyticsData() {
    analyticsData.lastUpdated = new Date().toISOString();
    localStorage.setItem('analyticsData', JSON.stringify(analyticsData));
}

// Track candidate status changes for funnel analytics
function trackStatusChange(candidateId, fromStatus, toStatus, metadata = {}) {
    const statusMap = {
        'applied': 'applied',
        'screened': 'screened', 
        'invite_first': 'invited',
        'first_scheduled': 'invited',
        'first_completed': 'interviewed',
        'invite_second': 'interviewed',
        'final_scheduled': 'interviewed',
        'offered': 'offered',
        'hired': 'hired'
    };
    
    const funnelStage = statusMap[toStatus];
    if (funnelStage) {
        analyticsData.conversionFunnel[funnelStage]++;
        
        // Track time to hire
        if (toStatus === 'hired' && metadata.startDate) {
            const hireDate = new Date();
            const startDate = new Date(metadata.startDate);
            const days = Math.ceil((hireDate - startDate) / (1000 * 60 * 60 * 24));
            
            analyticsData.timeToHire.push({
                candidateId,
                startDate: startDate.toISOString(),
                hireDate: hireDate.toISOString(),
                days,
                source: metadata.source || 'direct'
            });
        }
        
        // Track daily activity
        const today = new Date().toISOString().split('T')[0];
        if (!analyticsData.dailyActivity[today]) {
            analyticsData.dailyActivity[today] = { candidates: 0, interviews: 0, hires: 0 };
        }
        
        if (funnelStage === 'screened') analyticsData.dailyActivity[today].candidates++;
        if (funnelStage === 'interviewed') analyticsData.dailyActivity[today].interviews++;
        if (funnelStage === 'hired') analyticsData.dailyActivity[today].hires++;
        
        saveAnalyticsData();
    }
}

// Calculate conversion rates
function calculateConversionRates() {
    const funnel = analyticsData.conversionFunnel;
    const total = funnel.applied || 1; // Avoid division by zero
    
    return {
        screeningRate: ((funnel.screened / total) * 100).toFixed(1),
        interviewRate: ((funnel.invited / total) * 100).toFixed(1),
        offerRate: ((funnel.offered / total) * 100).toFixed(1),
        hireRate: ((funnel.hired / total) * 100).toFixed(1),
        interviewToOffer: funnel.invited > 0 ? ((funnel.offered / funnel.invited) * 100).toFixed(1) : '0.0',
        offerToHire: funnel.offered > 0 ? ((funnel.hired / funnel.offered) * 100).toFixed(1) : '0.0'
    };
}

// Calculate average time to hire
function calculateAverageTimeToHire() {
    if (analyticsData.timeToHire.length === 0) return { average: 0, min: 0, max: 0 };
    
    const times = analyticsData.timeToHire.map(h => h.days);
    const average = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return { average, min, max, total: times.length };
}

// Export analytics data to CSV
function exportAnalyticsData() {
    const conversionRates = calculateConversionRates();
    const timeToHire = calculateAverageTimeToHire();
    const funnel = analyticsData.conversionFunnel;
    
    // Prepare data for CSV export
    const summaryData = [
        ['Metric', 'Value'],
        ['Total Applied', funnel.applied],
        ['Total Screened', funnel.screened],
        ['Total Invited', funnel.invited],
        ['Total Interviewed', funnel.interviewed],
        ['Total Offered', funnel.offered],
        ['Total Hired', funnel.hired],
        ['Screening Rate', conversionRates.screeningRate + '%'],
        ['Interview Rate', conversionRates.interviewRate + '%'],
        ['Offer Rate', conversionRates.offerRate + '%'],
        ['Hire Rate', conversionRates.hireRate + '%'],
        ['Interview to Offer Rate', conversionRates.interviewToOffer + '%'],
        ['Offer to Hire Rate', conversionRates.offerToHire + '%'],
        ['Average Time to Hire', timeToHire.average + ' days'],
        ['Fastest Hire', timeToHire.min + ' days'],
        ['Longest Hire', timeToHire.max + ' days'],
        ['Total Hires Tracked', timeToHire.total]
    ];
    
    // Convert to CSV
    const csvContent = summaryData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `recruitment_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('Analytics data exported successfully!');
}

// Export detailed time-to-hire data
function exportTimeToHireData() {
    if (analyticsData.timeToHire.length === 0) {
        showError('No time-to-hire data available to export.');
        return;
    }
    
    const headers = ['Candidate ID', 'Start Date', 'Hire Date', 'Days to Hire', 'Source'];
    const data = [headers, ...analyticsData.timeToHire.map(hire => [
        hire.candidateId,
        hire.startDate.split('T')[0],
        hire.hireDate.split('T')[0],
        hire.days,
        hire.source
    ])];
    
    const csvContent = data.map(row => 
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `time_to_hire_details_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('Time-to-hire data exported successfully!');
}

// Export conversion funnel data as CSV
function exportConversionFunnelData() {
    const rates = calculateConversionRates();
    const funnel = analyticsData.conversionFunnel;
    
    const headers = ['Funnel Stage', 'Total Count', 'Conversion Rate', 'Previous Stage Conversion'];
    const data = [
        headers,
        ['Applied', funnel.applied, '100.0%', '-'],
        ['Screened', funnel.screened, rates.screeningRate + '%', rates.screeningRate + '%'],
        ['Interview Invited', funnel.invited, rates.interviewRate + '%', rates.interviewToOffer + '%'],
        ['Interviewed', funnel.interviewed, ((funnel.interviewed / funnel.applied) * 100).toFixed(1) + '%', ((funnel.interviewed / funnel.invited) * 100).toFixed(1) + '%'],
        ['Offer Extended', funnel.offered, rates.offerRate + '%', rates.interviewToOffer + '%'],
        ['Hired', funnel.hired, rates.hireRate + '%', rates.offerToHire + '%']
    ];
    
    const csvContent = data.map(row => 
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `conversion_funnel_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('Conversion funnel data exported successfully!');
}

// Export daily activity data as CSV
function exportDailyActivityData() {
    if (Object.keys(analyticsData.dailyActivity).length === 0) {
        showError('No daily activity data available to export.');
        return;
    }
    
    const headers = ['Date', 'Candidates Screened', 'Interviews Conducted', 'Hires Made', 'Total Activity'];
    const data = [headers, ...Object.entries(analyticsData.dailyActivity).map(([date, activity]) => [
        date,
        activity.candidates,
        activity.interviews,
        activity.hires,
        activity.candidates + activity.interviews + activity.hires
    ])];
    
    const csvContent = data.map(row => 
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `daily_activity_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('Daily activity data exported successfully!');
}

function initializeRecruiterProfile() {
    const storedProfile = localStorage.getItem('recruiter_profile');
    
    if (storedProfile) {
        recruiterProfile = JSON.parse(storedProfile);
        // Ensure all new fields exist (for profile schema updates)
        recruiterProfile = { ...defaultRecruiterProfile, ...recruiterProfile };
    } else {
        // Create new profile
        recruiterProfile = {
            ...defaultRecruiterProfile,
            recruiter_id: generateRecruiterId(),
            created_date: new Date().toISOString()
        };
        saveRecruiterProfile();
    }
}

function generateRecruiterId() {
    return 'recruiter-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function saveRecruiterProfile() {
    localStorage.setItem('recruiter_profile', JSON.stringify(recruiterProfile));
}

function addScoreCorrectionInterface(candidateElement, candidateData, context = 'analysis') {
    // Don't add if already exists
    if (candidateElement.querySelector('.score-correction')) {
        return;
    }
    
    const aiScore = candidateData.score;
    const candidateId = candidateData.name.replace(/\s+/g, '-').toLowerCase();
    
    const scoreCorrectionContainer = document.createElement('div');
    scoreCorrectionContainer.className = 'score-correction';
    scoreCorrectionContainer.innerHTML = `
        <div class="score-comparison">
            <div class="ai-score">AI Score: ${aiScore}%</div>
            <div class="user-score">
                Your Score: <span id="userScore-${candidateId}">${aiScore}%</span>
                <span class="score-difference" id="scoreDiff-${candidateId}"></span>
            </div>
        </div>
        <div class="score-slider-container">
            <label class="score-slider-label">Adjust the score to match your assessment (0-100):</label>
            <input type="range" 
                   min="0" 
                   max="100" 
                   value="${aiScore}" 
                   class="score-slider" 
                   id="slider-${candidateId}"
                   oninput="updateScoreDisplay('${candidateId}', ${aiScore}, this.value)">
        </div>
        <button class="apply-correction" 
                id="applyBtn-${candidateId}" 
                onclick="showDetailedFeedback('${candidateData.name}', ${aiScore}, '${context}')"
                disabled>
            Apply Score Correction
        </button>
        <div class="detailed-feedback" id="detailedFeedback-${candidateId}">
            <div class="feedback-title">
                🎯 Why was this score incorrect?
            </div>
            <div class="feedback-categories">
                <div class="feedback-categories-title">Select all reasons that apply:</div>
                <div class="feedback-category-grid" id="categoryGrid-${candidateId}">
                    ${Object.entries(feedbackCategories).map(([key, category]) => `
                        <div class="feedback-category" onclick="toggleFeedbackCategory('${candidateId}', '${key}')">
                            <input type="checkbox" id="category-${candidateId}-${key}">
                            <label class="feedback-category-label" for="category-${candidateId}-${key}">
                                <strong>${category.label}</strong><br>
                                <small>${category.description}</small>
                            </label>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="feedback-suggestions" id="suggestions-${candidateId}" style="display: none;">
                <div class="feedback-suggestions-title">💡 Consider these factors:</div>
                <div id="suggestionsList-${candidateId}"></div>
            </div>
            <div class="feedback-textarea-container">
                <label class="feedback-textarea-label">Additional insights (optional):</label>
                <textarea class="feedback-textarea" 
                          id="feedbackText-${candidateId}"
                          placeholder="Share specific details about your assessment..."
                          maxlength="500"
                          oninput="updateCharCount('${candidateId}')"></textarea>
                <div class="feedback-char-count" id="charCount-${candidateId}">0 / 500</div>
            </div>
            <div class="feedback-actions">
                <button class="feedback-cancel-btn" onclick="cancelDetailedFeedback('${candidateId}')">
                    Cancel
                </button>
                <button class="feedback-submit-btn" 
                        id="submitFeedback-${candidateId}"
                        onclick="submitDetailedFeedback('${candidateData.name}', ${aiScore}, '${context}')"
                        disabled>
                    Submit Feedback
                </button>
            </div>
        </div>
    `;
    
    // Add to candidate card (append at bottom)
    candidateElement.appendChild(scoreCorrectionContainer);
}

function updateScoreDisplay(candidateId, originalScore, newScore) {
    const userScoreElement = document.getElementById(`userScore-${candidateId}`);
    const scoreDiffElement = document.getElementById(`scoreDiff-${candidateId}`);
    const applyButton = document.getElementById(`applyBtn-${candidateId}`);
    const scoreCorrectionContainer = document.querySelector(`#slider-${candidateId}`).closest('.score-correction');
    
    // Update display
    userScoreElement.textContent = `${newScore}%`;
    
    // Calculate and display difference
    const difference = newScore - originalScore;
    const absDifference = Math.abs(difference);
    
    if (absDifference === 0) {
        scoreDiffElement.textContent = '';
        scoreDiffElement.className = 'score-difference';
        applyButton.disabled = true;
        scoreCorrectionContainer.classList.remove('active');
    } else {
        const sign = difference > 0 ? '+' : '';
        scoreDiffElement.textContent = `${sign}${difference}`;
        scoreDiffElement.className = `score-difference ${difference > 0 ? 'positive' : 'negative'}`;
        
        // Enable apply button only if difference is ≥10 points
        if (absDifference >= 10) {
            applyButton.disabled = false;
            applyButton.textContent = 'Apply Score Correction';
            scoreCorrectionContainer.classList.add('active');
        } else {
            applyButton.disabled = true;
            applyButton.textContent = `Need ±10 point difference (currently ${sign}${difference})`;
            scoreCorrectionContainer.classList.remove('active');
        }
    }
    
    // Update user score color based on value
    const scoreValue = parseInt(newScore);
    if (scoreValue >= 90) {
        userScoreElement.style.color = '#059669';
    } else if (scoreValue >= 80) {
        userScoreElement.style.color = '#d97706';
    } else {
        userScoreElement.style.color = '#dc2626';
    }
}

function showDetailedFeedback(candidateName, originalScore, context) {
    const candidateId = candidateName.replace(/\s+/g, '-').toLowerCase();
    const detailedFeedback = document.getElementById(`detailedFeedback-${candidateId}`);
    const scoreCorrectionContainer = detailedFeedback.closest('.score-correction');
    
    // Show the detailed feedback form
    detailedFeedback.classList.add('show');
    scoreCorrectionContainer.classList.add('active');
    
    // Scroll to the feedback form
    detailedFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function toggleFeedbackCategory(candidateId, categoryKey) {
    const checkbox = document.getElementById(`category-${candidateId}-${categoryKey}`);
    const categoryElement = checkbox.closest('.feedback-category');
    
    // Toggle checkbox and visual state
    checkbox.checked = !checkbox.checked;
    if (checkbox.checked) {
        categoryElement.classList.add('selected');
    } else {
        categoryElement.classList.remove('selected');
    }
    
    // Update suggestions and submit button state
    updateFeedbackSuggestions(candidateId);
    updateSubmitButtonState(candidateId);
}

function updateFeedbackSuggestions(candidateId) {
    const selectedCategories = getSelectedCategories(candidateId);
    const suggestionsContainer = document.getElementById(`suggestions-${candidateId}`);
    const suggestionsList = document.getElementById(`suggestionsList-${candidateId}`);
    
    if (selectedCategories.length > 0) {
        // Collect all suggestions from selected categories
        const allSuggestions = selectedCategories.flatMap(categoryKey => 
            feedbackCategories[categoryKey].suggestions
        );
        
        // Remove duplicates and create suggestion list
        const uniqueSuggestions = [...new Set(allSuggestions)];
        suggestionsList.innerHTML = uniqueSuggestions.map(suggestion => 
            `• ${suggestion}`
        ).join('<br>');
        
        suggestionsContainer.style.display = 'block';
    } else {
        suggestionsContainer.style.display = 'none';
    }
}

function updateCharCount(candidateId) {
    const textarea = document.getElementById(`feedbackText-${candidateId}`);
    const charCount = document.getElementById(`charCount-${candidateId}`);
    const currentLength = textarea.value.length;
    
    charCount.textContent = `${currentLength} / 500`;
    
    // Color coding for character count
    if (currentLength > 450) {
        charCount.className = 'feedback-char-count error';
    } else if (currentLength > 400) {
        charCount.className = 'feedback-char-count warning';
    } else {
        charCount.className = 'feedback-char-count';
    }
    
    updateSubmitButtonState(candidateId);
}

function updateSubmitButtonState(candidateId) {
    const selectedCategories = getSelectedCategories(candidateId);
    const submitButton = document.getElementById(`submitFeedback-${candidateId}`);
    
    // Enable submit button if at least one category is selected
    submitButton.disabled = selectedCategories.length === 0;
}

function getSelectedCategories(candidateId) {
    const checkboxes = document.querySelectorAll(`#categoryGrid-${candidateId} input[type="checkbox"]:checked`);
    return Array.from(checkboxes).map(checkbox => 
        checkbox.id.replace(`category-${candidateId}-`, '')
    );
}

function cancelDetailedFeedback(candidateId) {
    const detailedFeedback = document.getElementById(`detailedFeedback-${candidateId}`);
    const scoreCorrectionContainer = detailedFeedback.closest('.score-correction');
    
    // Reset form
    resetDetailedFeedbackForm(candidateId);
    
    // Hide the detailed feedback form
    detailedFeedback.classList.remove('show');
    scoreCorrectionContainer.classList.remove('active');
}

function resetDetailedFeedbackForm(candidateId) {
    // Uncheck all categories
    const checkboxes = document.querySelectorAll(`#categoryGrid-${candidateId} input[type="checkbox"]`);
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('.feedback-category').classList.remove('selected');
    });
    
    // Clear textarea
    const textarea = document.getElementById(`feedbackText-${candidateId}`);
    textarea.value = '';
    
    // Reset character count
    updateCharCount(candidateId);
    
    // Hide suggestions
    document.getElementById(`suggestions-${candidateId}`).style.display = 'none';
}

function submitDetailedFeedback(candidateName, originalScore, context) {
    const candidateId = candidateName.replace(/\s+/g, '-').toLowerCase();
    const slider = document.getElementById(`slider-${candidateId}`);
    const correctedScore = parseInt(slider.value);
    const selectedCategories = getSelectedCategories(candidateId);
    const feedbackText = document.getElementById(`feedbackText-${candidateId}`).value.trim();
    
    // Validate
    if (selectedCategories.length === 0) {
        showError('Please select at least one reason for the score correction.');
        return;
    }
    
    // Apply the score correction with detailed feedback
    applyScoreCorrection(candidateName, originalScore, context, {
        categories: selectedCategories,
        feedback_text: feedbackText,
        suggestions_shown: getShownSuggestions(candidateId)
    });
}

function getShownSuggestions(candidateId) {
    const suggestionsContainer = document.getElementById(`suggestions-${candidateId}`);
    return suggestionsContainer.style.display !== 'none' ? 
        document.getElementById(`suggestionsList-${candidateId}`).textContent : '';
}

function applyScoreCorrection(candidateName, originalScore, context, detailedFeedback = null) {
    // Find the candidate data
    const candidate = analysisResults.find(c => c.name === candidateName);
    if (!candidate) {
        console.error('Candidate not found:', candidateName);
        return;
    }
    
    const candidateId = candidateName.replace(/\s+/g, '-').toLowerCase();
    const slider = document.getElementById(`slider-${candidateId}`);
    const correctedScore = parseInt(slider.value);
    const scoreDifference = correctedScore - originalScore;
    
    // Validate minimum difference requirement
    if (Math.abs(scoreDifference) < 10) {
        showError('Score correction requires a minimum difference of ±10 points.');
        return;
    }
    
    // Create feedback record with score correction and detailed feedback
    const feedbackRecord = {
        feedback_id: generateFeedbackId(),
        candidate_name: candidateName,
        candidate_id: candidate.cv_id || candidateId,
        feedback_type: 'score_correction_detailed',
        ai_score: originalScore,
        corrected_score: correctedScore,
        score_difference: scoreDifference,
        context: context,
        job_title: jobRequirements.title || 'Unknown Role',
        job_industry: jobRequirements.industry || 'Unknown Industry',
        timestamp: new Date().toISOString(),
        session_id: getSessionId(),
        // Detailed feedback data
        feedback_categories: detailedFeedback?.categories || [],
        feedback_text: detailedFeedback?.feedback_text || '',
        suggestions_shown: detailedFeedback?.suggestions_shown || '',
        category_labels: detailedFeedback?.categories?.map(cat => feedbackCategories[cat]?.label) || []
    };
    
    // Store in memory and localStorage
    feedbackDatabase.push(feedbackRecord);
    localStorage.setItem('cv_feedback_database', JSON.stringify(feedbackDatabase));
    
    // Update candidate record with feedback
    candidate.user_feedback = {
        type: detailedFeedback ? 'score_correction_detailed' : 'score_correction',
        original_score: originalScore,
        corrected_score: correctedScore,
        score_difference: scoreDifference,
        timestamp: feedbackRecord.timestamp,
        feedback_id: feedbackRecord.feedback_id,
        categories: detailedFeedback?.categories || [],
        feedback_text: detailedFeedback?.feedback_text || ''
    };
    
    // Update UI to show correction was applied
    showScoreCorrectionConfirmation(candidateName, originalScore, correctedScore, detailedFeedback);
    
    // Log for debugging
    console.log('📊 Score correction applied:', feedbackRecord);
    
    // Update learning algorithm with new feedback
    updateLearningAlgorithm(feedbackRecord);
    
    // Show success notification
    const direction = scoreDifference > 0 ? 'increased' : 'decreased';
    const categoriesText = detailedFeedback?.categories?.length > 0 ? 
        ` (${detailedFeedback.categories.length} reasons provided)` : '';
    showSuccess(`Score ${direction} by ${Math.abs(scoreDifference)} points${categoriesText}. This helps train our AI!`);
}

// =============================================================================
// LEARNING ALGORITHM - Phase 2.3 Implementation
// =============================================================================

function updateLearningAlgorithm(feedbackRecord) {
    if (!recruiterProfile) {
        console.error('Recruiter profile not initialized');
        return;
    }
    
    // Update basic learning stats
    recruiterProfile.learning_stats.total_corrections++;
    recruiterProfile.learning_stats.last_learning_update = new Date().toISOString();
    
    // Track score adjustment patterns
    if (feedbackRecord.score_difference) {
        const currentAvg = recruiterProfile.learning_stats.avg_score_adjustment;
        const totalCorrections = recruiterProfile.learning_stats.total_corrections;
        recruiterProfile.learning_stats.avg_score_adjustment = 
            ((currentAvg * (totalCorrections - 1)) + Math.abs(feedbackRecord.score_difference)) / totalCorrections;
    }
    
    // Update category preferences
    if (feedbackRecord.feedback_categories) {
        feedbackRecord.feedback_categories.forEach(category => {
            if (recruiterProfile.category_preferences[category] !== undefined) {
                recruiterProfile.category_preferences[category]++;
            }
        });
        
        // Update most corrected categories
        updateMostCorrectedCategories();
    }
    
    // Analyze correction patterns
    analyzeCorrectionPatterns(feedbackRecord);
    
    // Update preference weights based on patterns
    updatePreferenceWeights();
    
    // Calculate accuracy improvement
    calculateAccuracyImprovement();
    
    // Save updated profile
    saveRecruiterProfile();
    
    console.log('🧠 Learning algorithm updated:', {
        total_corrections: recruiterProfile.learning_stats.total_corrections,
        preference_weights: recruiterProfile.preference_weights,
        correction_patterns: recruiterProfile.correction_patterns
    });
}

function updateMostCorrectedCategories() {
    // Get top 3 most corrected categories
    const categoryEntries = Object.entries(recruiterProfile.category_preferences);
    const sortedCategories = categoryEntries
        .filter(([_, count]) => count > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([category, count]) => ({
            category,
            label: feedbackCategories[category]?.label || category,
            count
        }));
    
    recruiterProfile.learning_stats.most_corrected_categories = sortedCategories;
}

function analyzeCorrectionPatterns(feedbackRecord) {
    const patterns = recruiterProfile.correction_patterns;
    const totalCorrections = recruiterProfile.learning_stats.total_corrections;
    
    // Pattern: Tends to prefer overqualified candidates
    if (feedbackRecord.feedback_categories?.includes('overqualified') && feedbackRecord.score_difference > 0) {
        patterns.tends_to_prefer_overqualified = true;
    }
    
    // Pattern: Strict on industry match
    if (feedbackRecord.feedback_categories?.includes('industry-background')) {
        const industryCorrections = recruiterProfile.category_preferences['industry-background'];
        patterns.strict_on_industry_match = (industryCorrections / totalCorrections) > 0.3;
    }
    
    // Pattern: Values potential over experience
    if (feedbackRecord.feedback_categories?.includes('growth-potential') && feedbackRecord.score_difference > 0) {
        patterns.values_potential_over_experience = true;
    } else if (feedbackRecord.feedback_categories?.includes('experience-level') && feedbackRecord.score_difference < 0) {
        patterns.values_potential_over_experience = false;
    }
    
    // Pattern: Penalizes experience gaps (inferred from underqualified corrections)
    if (feedbackRecord.feedback_categories?.includes('underqualified')) {
        const underqualifiedCorrections = recruiterProfile.category_preferences['underqualified'];
        patterns.penalizes_experience_gaps = (underqualifiedCorrections / totalCorrections) > 0.2;
    }
    
    // Track favored skills (extract from feedback text)
    if (feedbackRecord.feedback_text) {
        const skillsFromText = extractSkillsFromFeedback(feedbackRecord.feedback_text);
        skillsFromText.forEach(skill => {
            if (!patterns.favors_specific_skills.includes(skill)) {
                patterns.favors_specific_skills.push(skill);
            }
        });
        // Keep only top 10 most mentioned skills
        patterns.favors_specific_skills = patterns.favors_specific_skills.slice(0, 10);
    }
}

function extractSkillsFromFeedback(text) {
    // Simple skill extraction - in production, this would be more sophisticated
    const commonSkills = [
        'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS', 'Docker',
        'HubSpot', 'Salesforce', 'Google Analytics', 'Marketing Automation',
        'Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication'
    ];
    
    const lowerText = text.toLowerCase();
    return commonSkills.filter(skill => lowerText.includes(skill.toLowerCase()));
}

function updatePreferenceWeights() {
    const patterns = recruiterProfile.correction_patterns;
    const weights = recruiterProfile.preference_weights;
    const categoryPrefs = recruiterProfile.category_preferences;
    const totalCorrections = recruiterProfile.learning_stats.total_corrections;
    
    // Adjust skills importance based on skills-mismatch corrections
    const skillsMismatchRate = categoryPrefs['skills-mismatch'] / totalCorrections;
    if (skillsMismatchRate > 0.3) {
        weights.skills_importance = Math.min(1.5, weights.skills_importance + 0.1);
    }
    
    // Adjust experience weight based on experience-level corrections
    const experienceRate = categoryPrefs['experience-level'] / totalCorrections;
    if (experienceRate > 0.2) {
        weights.experience_weight = patterns.values_potential_over_experience ? 0.8 : 1.2;
    }
    
    // Adjust industry strictness
    if (patterns.strict_on_industry_match) {
        weights.industry_strictness = Math.min(1.5, weights.industry_strictness + 0.1);
    }
    
    // Adjust growth potential value
    if (patterns.values_potential_over_experience) {
        weights.growth_potential_value = Math.min(1.4, weights.growth_potential_value + 0.1);
    }
}

function calculateAccuracyImprovement() {
    // Simple accuracy calculation based on correction frequency
    // In production, this would track actual prediction accuracy over time
    const totalCorrections = recruiterProfile.learning_stats.total_corrections;
    
    if (totalCorrections >= 5) {
        // Simulate improvement based on learning
        const baseImprovement = Math.min(25, totalCorrections * 2);
        const recentPattern = getRecentCorrectionTrend();
        recruiterProfile.learning_stats.accuracy_improvement = baseImprovement + recentPattern;
    }
}

function getRecentCorrectionTrend() {
    // Analyze recent feedback to determine if corrections are decreasing (improvement)
    const recentFeedback = feedbackDatabase
        .filter(f => f.feedback_type === 'score_correction_detailed')
        .slice(-10);
    
    if (recentFeedback.length < 5) return 0;
    
    const avgRecentAdjustment = recentFeedback
        .reduce((sum, f) => sum + Math.abs(f.score_difference || 0), 0) / recentFeedback.length;
    
    const overallAvg = recruiterProfile.learning_stats.avg_score_adjustment;
    
    // If recent adjustments are smaller, AI is improving
    return avgRecentAdjustment < overallAvg ? 5 : -2;
}

function applyLearningToScoring(candidateData, baseScore) {
    if (!recruiterProfile || recruiterProfile.learning_stats.total_corrections < 3) {
        return baseScore; // Not enough data to apply learning
    }
    
    let adjustedScore = baseScore;
    const weights = recruiterProfile.preference_weights;
    const patterns = recruiterProfile.correction_patterns;
    
    // Apply preference weights
    if (candidateData.skills) {
        // Boost score if candidate has favored skills
        const candidateSkills = candidateData.skills.toLowerCase();
        const favoredSkillsFound = patterns.favors_specific_skills.filter(skill => 
            candidateSkills.includes(skill.toLowerCase())
        );
        
        if (favoredSkillsFound.length > 0) {
            adjustedScore *= (1 + (favoredSkillsFound.length * 0.05)); // 5% boost per favored skill
        }
        
        // Apply skills importance weight
        if (weights.skills_importance !== 1.0) {
            const skillsBonus = (adjustedScore - baseScore) * weights.skills_importance;
            adjustedScore = baseScore + skillsBonus;
        }
    }
    
    // Apply experience weight adjustments
    if (candidateData.experience && weights.experience_weight !== 1.0) {
        const experienceYears = parseInt(candidateData.experience) || 0;
        if (experienceYears > 5 && !patterns.values_potential_over_experience) {
            adjustedScore *= weights.experience_weight;
        }
    }
    
    // Apply pattern-based adjustments
    if (patterns.tends_to_prefer_overqualified && candidateData.score > 85) {
        adjustedScore *= 1.1; // 10% boost for high-scoring candidates
    }
    
    // Ensure score stays within bounds
    adjustedScore = Math.max(0, Math.min(100, adjustedScore));
    
    return Math.round(adjustedScore);
}

function getPersonalizedPromptModifications() {
    if (!recruiterProfile || recruiterProfile.learning_stats.total_corrections < 5) {
        return '';
    }
    
    const patterns = recruiterProfile.correction_patterns;
    const weights = recruiterProfile.preference_weights;
    let modifications = '\n\nPersonalized Scoring Adjustments:\n';
    
    if (weights.skills_importance > 1.1) {
        modifications += '- Place extra emphasis on technical skills matching\n';
    }
    
    if (patterns.values_potential_over_experience) {
        modifications += '- Value learning potential and adaptability over years of experience\n';
    }
    
    if (patterns.strict_on_industry_match) {
        modifications += '- Prioritize industry-specific experience and knowledge\n';
    }
    
    if (patterns.favors_specific_skills.length > 0) {
        modifications += `- Give bonus consideration for these skills: ${patterns.favors_specific_skills.slice(0, 3).join(', ')}\n`;
    }
    
    if (patterns.tends_to_prefer_overqualified) {
        modifications += '- Consider overqualified candidates favorably\n';
    }
    
    return modifications;
}

// =============================================================================
// RECRUITER PROFILE DASHBOARD
// =============================================================================

function showRecruiterDashboard() {
    if (!recruiterProfile) {
        showError('Recruiter profile not initialized');
        return;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
        align-items: center; justify-content: center; padding: 20px;
    `;
    
    const stats = recruiterProfile.learning_stats;
    const patterns = recruiterProfile.correction_patterns;
    const weights = recruiterProfile.preference_weights;
    
    // Get analytics data
    const conversionRates = calculateConversionRates();
    const timeToHire = calculateAverageTimeToHire();
    const funnel = analyticsData.conversionFunnel;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 1200px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="margin: 0; color: #1f2937;">📊 Recruitment Analytics Dashboard</h2>
                <div style="display: flex; gap: 10px;">
                    <button onclick="exportAnalyticsData()" 
                            style="background: #10b981; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 14px;">
                        📊 Export Data
                    </button>
                    <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                            style="background: #f3f4f6; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                        ✕ Close
                    </button>
                </div>
            </div>
            
            <!-- Conversion Funnel Metrics -->
            <div style="margin-bottom: 30px;">
                <h3 style="color: #374151; margin-bottom: 15px;">🎯 Conversion Funnel</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div style="background: #f8faff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #667eea;">${funnel.applied}</div>
                        <div style="color: #4b5563; font-size: 0.9rem;">Applied</div>
                    </div>
                    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #3b82f6;">${funnel.screened}</div>
                        <div style="color: #4b5563; font-size: 0.9rem;">Screened</div>
                        <div style="color: #6b7280; font-size: 0.8rem;">${conversionRates.screeningRate}% of applied</div>
                    </div>
                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #f59e0b;">${funnel.invited}</div>
                        <div style="color: #4b5563; font-size: 0.9rem;">Invited</div>
                        <div style="color: #6b7280; font-size: 0.8rem;">${conversionRates.interviewRate}% of applied</div>
                    </div>
                    <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #10b981;">${funnel.interviewed}</div>
                        <div style="color: #4b5563; font-size: 0.9rem;">Interviewed</div>
                        <div style="color: #6b7280; font-size: 0.8rem;">${conversionRates.interviewToOffer}% to offer</div>
                    </div>
                    <div style="background: #fdf2f8; padding: 15px; border-radius: 8px; border-left: 4px solid #ec4899;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #ec4899;">${funnel.offered}</div>
                        <div style="color: #4b5563; font-size: 0.9rem;">Offered</div>
                        <div style="color: #6b7280; font-size: 0.8rem;">${conversionRates.offerRate}% of applied</div>
                    </div>
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #059669;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #059669;">${funnel.hired}</div>
                        <div style="color: #4b5563; font-size: 0.9rem;">Hired</div>
                        <div style="color: #6b7280; font-size: 0.8rem;">${conversionRates.hireRate}% of applied</div>
                    </div>
                </div>
            </div>
            
            <!-- Time to Hire Metrics -->
            <div style="margin-bottom: 30px;">
                <h3 style="color: #374151; margin-bottom: 15px;">⏱️ Time to Hire</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #1d4ed8;">${timeToHire.average}</div>
                        <div style="color: #1e40af; font-size: 0.9rem;">Average Days</div>
                    </div>
                    <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #059669;">${timeToHire.min}</div>
                        <div style="color: #065f46; font-size: 0.9rem;">Fastest Hire</div>
                    </div>
                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #d97706;">${timeToHire.max}</div>
                        <div style="color: #92400e; font-size: 0.9rem;">Longest Hire</div>
                    </div>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; border-left: 4px solid #6b7280;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #374151;">${timeToHire.total}</div>
                        <div style="color: #4b5563; font-size: 0.9rem;">Total Hires</div>
                    </div>
                </div>
            </div>
            
            <!-- AI Learning Stats -->
            <div style="margin-bottom: 30px;">
                <h3 style="color: #374151; margin-bottom: 15px;">🧠 AI Learning Performance</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #059669;">${stats.total_corrections}</div>
                        <div style="color: #065f46; font-size: 0.9rem;">Score Corrections</div>
                    </div>
                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #d97706;">+${stats.accuracy_improvement}%</div>
                        <div style="color: #92400e; font-size: 0.9rem;">AI Accuracy Improvement</div>
                    </div>
                    <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #1d4ed8;">${stats.avg_score_adjustment.toFixed(1)}</div>
                        <div style="color: #1e40af; font-size: 0.9rem;">Avg Score Adjustment</div>
                    </div>
                    <div style="background: #fdf2f8; padding: 15px; border-radius: 8px; border-left: 4px solid #ec4899;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #ec4899;">${stats.total_feedback_provided}</div>
                        <div style="color: #be185d; font-size: 0.9rem;">Total Feedback Given</div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #374151; margin-bottom: 15px;">📊 Your Preferences</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                    <div style="background: #f9fafb; padding: 12px; border-radius: 6px;">
                        <strong>Skills Importance:</strong> ${(weights.skills_importance * 100).toFixed(0)}%
                        <div style="background: #e5e7eb; height: 6px; border-radius: 3px; margin-top: 5px;">
                            <div style="background: #3b82f6; height: 100%; width: ${Math.min(100, weights.skills_importance * 67)}%; border-radius: 3px;"></div>
                        </div>
                    </div>
                    <div style="background: #f9fafb; padding: 12px; border-radius: 6px;">
                        <strong>Experience Weight:</strong> ${(weights.experience_weight * 100).toFixed(0)}%
                        <div style="background: #e5e7eb; height: 6px; border-radius: 3px; margin-top: 5px;">
                            <div style="background: #10b981; height: 100%; width: ${Math.min(100, weights.experience_weight * 67)}%; border-radius: 3px;"></div>
                        </div>
                    </div>
                    <div style="background: #f9fafb; padding: 12px; border-radius: 6px;">
                        <strong>Industry Strictness:</strong> ${(weights.industry_strictness * 100).toFixed(0)}%
                        <div style="background: #e5e7eb; height: 6px; border-radius: 3px; margin-top: 5px;">
                            <div style="background: #f59e0b; height: 100%; width: ${Math.min(100, weights.industry_strictness * 67)}%; border-radius: 3px;"></div>
                        </div>
                    </div>
                    <div style="background: #f9fafb; padding: 12px; border-radius: 6px;">
                        <strong>Growth Potential:</strong> ${(weights.growth_potential_value * 100).toFixed(0)}%
                        <div style="background: #e5e7eb; height: 6px; border-radius: 3px; margin-top: 5px;">
                            <div style="background: #8b5cf6; height: 100%; width: ${Math.min(100, weights.growth_potential_value * 67)}%; border-radius: 3px;"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #374151; margin-bottom: 15px;">🎯 Top Correction Reasons</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${stats.most_corrected_categories.map(cat => `
                        <div style="background: #e0e7ff; padding: 8px 12px; border-radius: 16px; font-size: 0.85rem; color: #3730a3;">
                            ${cat.label} (${cat.count})
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #374151; margin-bottom: 15px;">🔍 Detected Patterns</h3>
                <div style="display: grid; gap: 8px;">
                    ${Object.entries(patterns).map(([key, value]) => {
                        if (typeof value === 'boolean' && value) {
                            const labels = {
                                tends_to_prefer_overqualified: '📈 Prefers overqualified candidates',
                                strict_on_industry_match: '🎯 Strict on industry matching',
                                values_potential_over_experience: '🌱 Values growth potential over experience',
                                penalizes_experience_gaps: '⚠️ Concerned about experience gaps'
                            };
                            return `<div style="background: #dcfce7; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; color: #166534;">
                                ✓ ${labels[key] || key}
                            </div>`;
                        }
                        return '';
                    }).join('')}
                    ${patterns.favors_specific_skills.length > 0 ? `
                        <div style="background: #dcfce7; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; color: #166534;">
                            ✓ Favors skills: ${patterns.favors_specific_skills.slice(0, 3).join(', ')}
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border: 1px solid #bae6fd;">
                <h4 style="margin: 0 0 10px 0; color: #0c4a6e;">💡 How This Helps</h4>
                <ul style="margin: 0; padding-left: 20px; color: #0369a1; font-size: 0.9rem;">
                    <li>AI learns your preferences and adjusts future scores accordingly</li>
                    <li>Personalized prompts improve matching accuracy over time</li>
                    <li>Pattern detection helps identify your unique recruiting style</li>
                    <li>Continue providing feedback to enhance AI performance</li>
                </ul>
            </div>
            
            <div style="margin-top: 20px;">
                <h3 style="color: #374151; margin-bottom: 15px;">📊 Export Options</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                    <button onclick="exportConversionFunnelData()" 
                            style="background: #3b82f6; color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                        📈 Conversion Funnel CSV
                    </button>
                    <button onclick="exportTimeToHireData()" 
                            style="background: #059669; color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                        ⏱️ Time-to-Hire CSV
                    </button>
                    <button onclick="exportDailyActivityData()" 
                            style="background: #7c3aed; color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                        📅 Daily Activity CSV
                    </button>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="resetLearningData()" 
                        style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; margin-right: 10px; cursor: pointer;">
                    🔄 Reset Learning Data
                </button>
                <button onclick="exportLearningData()" 
                        style="background: #059669; color: white; border: none; padding: 8px 16px; border-radius: 6px; margin-right: 10px; cursor: pointer;">
                    📊 Export Learning Data
                </button>
                <button onclick="exportAnalyticsData()" 
                        style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                    📈 Export Analytics
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function resetLearningData() {
    if (confirm('Are you sure you want to reset all learning data? This cannot be undone.')) {
        // Reset recruiter profile to defaults
        recruiterProfile = {
            ...defaultRecruiterProfile,
            recruiter_id: recruiterProfile.recruiter_id,
            created_date: recruiterProfile.created_date
        };
        
        // Clear feedback database
        feedbackDatabase = [];
        
        // Save changes
        saveRecruiterProfile();
        localStorage.setItem('cv_feedback_database', JSON.stringify(feedbackDatabase));
        
        showSuccess('Learning data reset successfully!');
        
        // Close modal
        document.querySelector('div[style*="position: fixed"]')?.remove();
    }
}

function exportLearningData() {
    const exportData = {
        recruiter_profile: recruiterProfile,
        feedback_database: feedbackDatabase,
        export_date: new Date().toISOString(),
        total_records: feedbackDatabase.length
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_Learning_Data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Learning data exported successfully!');
}

// =============================================================================
// PHASE 4: DATABASE SEARCH & CONSENT MANAGEMENT
// =============================================================================

function showConsentDialog() {
    if (candidateDatabase.length < 10) { // Only show if building a meaningful database
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
            align-items: center; justify-content: center; padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 30px; max-width: 500px; width: 100%;">
                <h3 style="margin: 0 0 15px 0; color: #1f2937;">🔒 Build Your Talent Database</h3>
                <p style="color: #6b7280; margin-bottom: 20px;">
                    Would you like to save these candidates to your talent database for future opportunities? 
                    This helps build a searchable talent pipeline.
                </p>
                
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
                    <h4 style="margin: 0 0 10px 0; color: #374151; font-size: 0.9rem;">✓ Your data will be:</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 0.85rem;">
                        <li>Stored securely in your browser only</li>
                        <li>Used to match candidates to future roles</li>
                        <li>Removable at any time</li>
                        <li>Kept for 1 year with full consent</li>
                    </ul>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="handleConsentResponse(false)" 
                            style="background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                        Not Now
                    </button>
                    <button onclick="handleConsentResponse(true)" 
                            style="background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                        Save to Database
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
}

function handleConsentResponse(consentGiven) {
    // Close modal
    document.querySelector('div[style*="position: fixed"]')?.remove();
    
    if (consentGiven) {
        // Save all candidates to database
        analysisResults.forEach(result => {
            addCandidateToDatabase(result, null, true);
        });
        
        showSuccess(`${analysisResults.length} candidates saved to talent database!`);
        console.log('📁 Candidates added to database with consent');
    } else {
        // Save with limited consent (30 days)
        analysisResults.forEach(result => {
            addCandidateToDatabase(result, null, false);
        });
        
        showSuccess('Analysis complete. Candidates saved temporarily.');
    }
    
    // Update results display to show database options
    addDatabaseActionsToResults();
}

function addCandidateToDatabase(analysisData, extractedData = null, consentGiven = false) {
    // Check if candidate already exists
    const existingCandidate = candidateDatabase.find(c => 
        c.profile.name === analysisData.name
    );
    
    if (existingCandidate) {
        // Update existing candidate with new analysis
        existingCandidate.analysis_history.push({
            job_id: generateJobId(),
            job_title: jobRequirements.title || 'Unknown Role',
            ai_score: analysisData.score,
            user_feedback: analysisData.user_feedback?.type || null,
            corrected_score: analysisData.user_feedback?.corrected_score || null,
            analysis_date: new Date().toISOString(),
            industry: projectConfiguration.industry || 'general',
            feedback_categories: analysisData.user_feedback?.categories || []
        });
        
        // Update consent if upgrading
        if (consentGiven && !existingCandidate.consent.storage_agreed) {
            existingCandidate.consent.storage_agreed = true;
            existingCandidate.consent.data_retention_days = 365;
            existingCandidate.consent.consent_date = new Date().toISOString();
        }
        
        console.log('📝 Updated existing candidate:', existingCandidate.profile.name);
    } else {
        // Create new candidate record
        const candidateRecord = createCandidateRecord(analysisData, extractedData, consentGiven);
        candidateDatabase.push(candidateRecord);
        console.log('➕ Added new candidate:', candidateRecord.profile.name);
    }
    
    saveCandidateDatabase();
}

function addDatabaseActionsToResults() {
    const resultsHeader = document.querySelector('.results-header');
    if (resultsHeader && !resultsHeader.querySelector('.database-actions')) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'database-actions';
        actionsDiv.style.cssText = 'margin-top: 15px; text-align: center;';
        
        actionsDiv.innerHTML = `
            <button onclick="showTalentDatabase()" 
                    style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; margin: 0 5px; cursor: pointer;">
                🔍 Search Talent Database (${candidateDatabase.length} candidates)
            </button>
            <button onclick="showPipelineManager()" 
                    style="background: #8b5cf6; color: white; border: none; padding: 8px 16px; border-radius: 6px; margin: 0 5px; cursor: pointer;">
                📋 Manage Pipeline
            </button>
        `;
        
        resultsHeader.appendChild(actionsDiv);
    }
}

// =============================================================================
// DATABASE SEARCH INTERFACE
// =============================================================================

function showTalentDatabase() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
        align-items: center; justify-content: center; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 1000px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1f2937;">🔍 Talent Database Search</h2>
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                        style="background: #f3f4f6; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                    ✕ Close
                </button>
            </div>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <input type="text" id="searchInput" placeholder="Search skills, experience, or keywords..." 
                               style="width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px;"
                               oninput="performDatabaseSearch()">
                    </div>
                    <button onclick="performDatabaseSearch()" 
                            style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                        Search
                    </button>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                    <div>
                        <label style="display: block; font-size: 0.85rem; color: #374151; margin-bottom: 5px;">Experience:</label>
                        <select id="experienceFilter" onchange="performDatabaseSearch()" 
                                style="width: 100%; padding: 6px; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 0.85rem;">
                            <option value="">Any Experience</option>
                            <option value="0-2">0-2 years</option>
                            <option value="3-5">3-5 years</option>
                            <option value="6-10">6-10 years</option>
                            <option value="10+">10+ years</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.85rem; color: #374151; margin-bottom: 5px;">Industry:</label>
                        <select id="industryFilter" onchange="performDatabaseSearch()" 
                                style="width: 100%; padding: 6px; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 0.85rem;">
                            <option value="">All Industries</option>
                            ${Object.values(industryTemplates).map(industry => 
                                `<option value="${industry.name}">${industry.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.85rem; color: #374151; margin-bottom: 5px;">Status:</label>
                        <select id="statusFilter" onchange="performDatabaseSearch()" 
                                style="width: 100%; padding: 6px; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 0.85rem;">
                            <option value="">All Candidates</option>
                            <option value="available">Available</option>
                            <option value="contacted">Contacted</option>
                            <option value="interviewing">Interviewing</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div id="searchResults">
                ${renderCandidateSearchResults(candidateDatabase)}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-focus search input
    setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
}

function performDatabaseSearch() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const experienceFilter = document.getElementById('experienceFilter')?.value || '';
    const industryFilter = document.getElementById('industryFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    let filteredCandidates = candidateDatabase.filter(candidate => {
        // Text search across multiple fields
        const searchableText = [
            candidate.profile.name,
            candidate.professional_data.skills.join(' '),
            candidate.professional_data.current_role,
            candidate.professional_data.education,
            candidate.metadata.tags.join(' ')
        ].join(' ').toLowerCase();
        
        const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
        
        // Experience filter
        const experience = candidate.professional_data.experience_years;
        let matchesExperience = true;
        if (experienceFilter === '0-2') matchesExperience = experience <= 2;
        else if (experienceFilter === '3-5') matchesExperience = experience >= 3 && experience <= 5;
        else if (experienceFilter === '6-10') matchesExperience = experience >= 6 && experience <= 10;
        else if (experienceFilter === '10+') matchesExperience = experience >= 10;
        
        // Industry filter
        const matchesIndustry = !industryFilter || 
            candidate.professional_data.industry_background.includes(industryFilter);
        
        // Status filter
        const matchesStatus = !statusFilter || candidate.pipeline_status === statusFilter;
        
        return matchesSearch && matchesExperience && matchesIndustry && matchesStatus;
    });
    
    // Sort by relevance (highest scoring first, then most recent)
    filteredCandidates.sort((a, b) => {
        const aScore = Math.max(...a.analysis_history.map(h => h.ai_score || 0));
        const bScore = Math.max(...b.analysis_history.map(h => h.ai_score || 0));
        if (aScore !== bScore) return bScore - aScore;
        
        return new Date(b.metadata.upload_date) - new Date(a.metadata.upload_date);
    });
    
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = renderCandidateSearchResults(filteredCandidates);
    }
}

function renderCandidateSearchResults(candidates) {
    if (candidates.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <div style="font-size: 3rem; margin-bottom: 10px;">🔍</div>
                <h3 style="margin: 0 0 10px 0;">No candidates found</h3>
                <p style="margin: 0;">Try adjusting your search criteria or add more candidates to your database.</p>
            </div>
        `;
    }
    
    return `
        <div style="margin-bottom: 15px; color: #6b7280; font-size: 0.9rem;">
            Found ${candidates.length} candidate${candidates.length !== 1 ? 's' : ''}
        </div>
        <div style="display: grid; gap: 15px;">
            ${candidates.map(candidate => renderCandidateCard(candidate)).join('')}
        </div>
    `;
}

function renderCandidateCard(candidate) {
    const latestAnalysis = candidate.analysis_history[candidate.analysis_history.length - 1];
    const skillTags = candidate.professional_data.skills.slice(0, 4).map(skill => 
        `<span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 8px; font-size: 0.75rem;">${skill}</span>`
    ).join(' ');
    
    const statusColor = {
        available: '#059669',
        contacted: '#d97706', 
        interested: '#8b5cf6',
        interviewing: '#3b82f6',
        offered: '#f59e0b',
        hired: '#10b981',
        declined: '#ef4444',
        not_interested: '#6b7280',
        not_suitable: '#6b7280'
    };
    
    return `
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; transition: all 0.2s ease;"
             onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" 
             onmouseout="this.style.boxShadow='none'">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div>
                    <h4 style="margin: 0 0 5px 0; color: #1f2937; font-size: 1.1rem;">${candidate.profile.name}</h4>
                    <div style="color: #6b7280; font-size: 0.9rem;">${candidate.professional_data.current_role}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: ${latestAnalysis.ai_score >= 80 ? '#059669' : '#d97706'};">
                        ${latestAnalysis.ai_score}%
                    </div>
                    <div style="font-size: 0.8rem; color: ${statusColor[candidate.pipeline_status]}; font-weight: 500;">
                        ${candidateStatuses[candidate.pipeline_status]}
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong style="font-size: 0.85rem; color: #374151;">Experience:</strong> 
                <span style="color: #6b7280; font-size: 0.85rem;">${candidate.professional_data.experience_years} years</span>
            </div>
            
            <div style="margin-bottom: 15px;">
                <strong style="font-size: 0.85rem; color: #374151;">Skills:</strong><br>
                <div style="margin-top: 5px;">${skillTags}</div>
            </div>
            
            <div style="display: flex; justify-content: between; align-items: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 0.8rem; color: #9ca3af;">
                    Added ${new Date(candidate.metadata.upload_date).toLocaleDateString()}
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="viewCandidateProfile('${candidate.candidate_id}')" 
                            style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">
                        View Profile
                    </button>
                    <button onclick="updateCandidateStatus('${candidate.candidate_id}')" 
                            style="background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">
                        Update Status
                    </button>
                </div>
            </div>
        </div>
    `;
}

// =============================================================================
// TALENT PIPELINE MANAGEMENT
// =============================================================================

function showPipelineManager() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
        align-items: center; justify-content: center; padding: 20px;
    `;
    
    const pipelineStats = calculatePipelineStats();
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 1200px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1f2937;">📋 Talent Pipeline Manager</h2>
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                        style="background: #f3f4f6; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                    ✕ Close
                </button>
            </div>
            
            <!-- Pipeline Stats -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px;">
                ${Object.entries(pipelineStats).map(([status, count]) => `
                    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #374151;">${count}</div>
                        <div style="font-size: 0.8rem; color: #6b7280; text-transform: capitalize;">${status.replace('_', ' ')}</div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Pipeline Kanban Board -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                ${Object.entries(candidateStatuses).map(([status, description]) => `
                    <div style="background: #f9fafb; border-radius: 8px; padding: 15px; border: 1px solid #e5e7eb;">
                        <h4 style="margin: 0 0 15px 0; color: #374151; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">
                            ${description} (${pipelineStats[status] || 0})
                        </h4>
                        <div style="space-y: 10px;">
                            ${renderPipelineColumn(status)}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function calculatePipelineStats() {
    const stats = {};
    Object.keys(candidateStatuses).forEach(status => {
        stats[status] = candidateDatabase.filter(c => c.pipeline_status === status).length;
    });
    return stats;
}

function renderPipelineColumn(status) {
    const candidates = candidateDatabase.filter(c => c.pipeline_status === status);
    
    if (candidates.length === 0) {
        return `<div style="color: #9ca3af; font-size: 0.8rem; text-align: center; padding: 20px;">No candidates</div>`;
    }
    
    return candidates.map(candidate => {
        const latestAnalysis = candidate.analysis_history[candidate.analysis_history.length - 1];
        return `
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 10px; cursor: pointer;"
                 onclick="viewCandidateProfile('${candidate.candidate_id}')">
                <div style="font-weight: 500; color: #1f2937; margin-bottom: 5px;">${candidate.profile.name}</div>
                <div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 8px;">${candidate.professional_data.current_role}</div>
                <div style="display: flex; justify-content: between; align-items: center;">
                    <div style="font-size: 0.75rem; color: #9ca3af;">
                        ${new Date(candidate.metadata.upload_date).toLocaleDateString()}
                    </div>
                    <div style="font-weight: bold; color: ${latestAnalysis.ai_score >= 80 ? '#059669' : '#d97706'};">
                        ${latestAnalysis.ai_score}%
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function viewCandidateProfile(candidateId) {
    const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
    if (!candidate) {
        showError('Candidate not found');
        return;
    }
    
    // Close any existing modals
    document.querySelectorAll('div[style*="position: fixed"]').forEach(modal => modal.remove());
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
        align-items: center; justify-content: center; padding: 20px;
    `;
    
    const skillTags = candidate.professional_data.skills.map(skill => 
        `<span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; margin: 2px;">${skill}</span>`
    ).join('');
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="margin: 0; color: #1f2937;">${candidate.profile.name}</h2>
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                        style="background: #f3f4f6; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                    ✕ Close
                </button>
            </div>
            
            <!-- Contact Info -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #374151;">Contact Information</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div><strong>Email:</strong> ${candidate.profile.email || 'Not provided'}</div>
                    <div><strong>Phone:</strong> ${candidate.profile.phone || 'Not provided'}</div>
                    <div><strong>Location:</strong> ${candidate.profile.location || 'Not specified'}</div>
                </div>
            </div>
            
            <!-- Professional Data -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #374151;">Professional Profile</h3>
                <div style="margin-bottom: 15px;">
                    <strong>Current Role:</strong> ${candidate.professional_data.current_role}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Experience:</strong> ${candidate.professional_data.experience_years} years
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Education:</strong> ${candidate.professional_data.education}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Industry Background:</strong> ${candidate.professional_data.industry_background.join(', ') || 'Not specified'}
                </div>
                <div>
                    <strong>Skills:</strong><br>
                    <div style="margin-top: 8px;">${skillTags}</div>
                </div>
            </div>
            
            <!-- Analysis History -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #374151;">Analysis History</h3>
                <div style="space-y: 10px;">
                    ${candidate.analysis_history.map(analysis => `
                        <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                <strong style="color: #1f2937;">${analysis.job_title}</strong>
                                <span style="font-size: 1.2rem; font-weight: bold; color: ${analysis.ai_score >= 80 ? '#059669' : '#d97706'};">
                                    ${analysis.ai_score}%
                                </span>
                            </div>
                            <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 5px;">
                                ${new Date(analysis.analysis_date).toLocaleDateString()} • ${analysis.industry}
                            </div>
                            ${analysis.user_feedback ? `
                                <div style="font-size: 0.8rem; color: #059669;">
                                    User Feedback: ${analysis.user_feedback} 
                                    ${analysis.corrected_score ? `(Score adjusted to ${analysis.corrected_score}%)` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Status Update -->
            <div style="display: flex; gap: 15px; justify-content: center;">
                <select id="statusSelect-${candidateId}" style="padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; min-width: 200px;">
                    ${Object.entries(candidateStatuses).map(([status, description]) => `
                        <option value="${status}" ${candidate.pipeline_status === status ? 'selected' : ''}>${description}</option>
                    `).join('')}
                </select>
                <button onclick="updateCandidateStatusFromProfile('${candidateId}')" 
                        style="background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    Update Status
                </button>
                <button onclick="deleteCandidateFromDatabase('${candidateId}')" 
                        style="background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    Remove from Database
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function updateCandidateStatus(candidateId) {
    const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
    if (!candidate) return;
    
    const newStatus = prompt('Select new status:\n\n' + 
        Object.entries(candidateStatuses).map(([key, desc], index) => 
            `${index + 1}. ${desc}`
        ).join('\n') + 
        '\n\nEnter number (1-' + Object.keys(candidateStatuses).length + '):'
    );
    
    const statusIndex = parseInt(newStatus) - 1;
    const statusKeys = Object.keys(candidateStatuses);
    
    if (statusIndex >= 0 && statusIndex < statusKeys.length) {
        const selectedStatus = statusKeys[statusIndex];
        candidate.pipeline_status = selectedStatus;
        candidate.metadata.last_contacted = new Date().toISOString();
        
        saveCandidateDatabase();
        showSuccess(`Status updated to: ${candidateStatuses[selectedStatus]}`);
        
        // Refresh any open search results
        if (document.getElementById('searchResults')) {
            performDatabaseSearch();
        }
    }
}

function updateCandidateStatusFromProfile(candidateId) {
    const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
    if (!candidate) return;
    
    const select = document.getElementById(`statusSelect-${candidateId}`);
    const newStatus = select.value;
    const oldStatus = candidate.pipeline_status;
    
    candidate.pipeline_status = newStatus;
    candidate.metadata.last_contacted = new Date().toISOString();
    
    // Track analytics for status change
    trackStatusChange(candidateId, oldStatus, newStatus, {
        timestamp: new Date().toISOString(),
        candidateName: candidate.profile.name,
        source: 'profile-view'
    });
    
    saveCandidateDatabase();
    showSuccess(`Status updated to: ${candidateStatuses[newStatus]}`);
    
    // Close modal and refresh
    document.querySelector('div[style*="position: fixed"]')?.remove();
}

function deleteCandidateFromDatabase(candidateId) {
    if (confirm('Are you sure you want to remove this candidate from the database? This action cannot be undone.')) {
        candidateDatabase = candidateDatabase.filter(c => c.candidate_id !== candidateId);
        saveCandidateDatabase();
        showSuccess('Candidate removed from database');
        
        // Close modal
        document.querySelector('div[style*="position: fixed"]')?.remove();
    }
}

// =============================================================================
// PHASE 3: SETUP WIZARD IMPLEMENTATION
// =============================================================================

function initializeSetupWizard() {
    // Show setup wizard by default
    document.getElementById('setupWizard').classList.add('active');
    populateIndustryGrid();
    currentWizardStep = 0;
    updateWizardNavigation();
}

function populateIndustryGrid() {
    const industryGrid = document.getElementById('industryGrid');
    
    const industryCards = Object.entries(industryTemplates).map(([key, industry]) => `
        <div class="industry-card" onclick="selectIndustry('${key}')" id="industry-${key}">
            <div class="industry-title">${industry.name}</div>
            <div class="industry-description">Focus areas for ${industry.name.toLowerCase()} roles</div>
            <div class="industry-focus">
                ${industry.focus_areas.map(area => `<span class="focus-tag">${area}</span>`).join('')}
            </div>
        </div>
    `).join('');
    
    industryGrid.innerHTML = industryCards;
}

function selectIndustry(industryKey) {
    // Clear previous selections
    document.querySelectorAll('.industry-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select new industry
    document.getElementById(`industry-${industryKey}`).classList.add('selected');
    projectConfiguration.industry = industryKey;
    
    // Enable next button
    document.getElementById('wizardNextBtn').disabled = false;
    
    console.log('Industry selected:', industryKey, industryTemplates[industryKey].name);
}

function nextWizardStep() {
    if (currentWizardStep < 4) {
        // Complete current step
        completeWizardStep(currentWizardStep);
        
        // Move to next step
        currentWizardStep++;
        showWizardStep(currentWizardStep);
        updateWizardNavigation();
        
        // Generate step content if needed
        if (currentWizardStep === 1) {
            generateRoleConfigStep();
        } else if (currentWizardStep === 2) {
            generateRequirementsStep();
        } else if (currentWizardStep === 3) {
            generatePreferencesStep();
        } else if (currentWizardStep === 4) {
            generateContextStep();
        }
    } else {
        // Finish wizard
        finishWizard();
    }
}

function previousWizardStep() {
    if (currentWizardStep > 0) {
        currentWizardStep--;
        showWizardStep(currentWizardStep);
        updateWizardNavigation();
    }
}

function showWizardStep(stepNumber) {
    // Hide all wizard steps
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show current step (create if doesn't exist)
    let stepElement = document.getElementById(`wizard-step-${stepNumber}`);
    if (!stepElement && stepNumber > 0) {
        stepElement = createWizardStep(stepNumber);
    }
    
    if (stepElement) {
        stepElement.classList.add('active');
    }
}

function createWizardStep(stepNumber) {
    const wizardContainer = document.getElementById('setupWizard');
    const navigationElement = wizardContainer.querySelector('.wizard-navigation');
    
    const stepElement = document.createElement('div');
    stepElement.className = 'wizard-step';
    stepElement.id = `wizard-step-${stepNumber}`;
    
    // Insert before navigation
    wizardContainer.insertBefore(stepElement, navigationElement);
    
    return stepElement;
}

function completeWizardStep(stepNumber) {
    const progressStep = document.getElementById(`progress-${stepNumber}`);
    const connector = document.getElementById(`connector-${stepNumber}`);
    
    if (progressStep) {
        progressStep.classList.remove('active');
        progressStep.classList.add('completed');
    }
    
    if (connector) {
        connector.classList.add('completed');
    }
}

function updateWizardNavigation() {
    const prevBtn = document.getElementById('wizardPrevBtn');
    const nextBtn = document.getElementById('wizardNextBtn');
    
    // Update previous button
    prevBtn.disabled = currentWizardStep === 0;
    
    // Update next button text and state
    if (currentWizardStep === 4) {
        nextBtn.textContent = 'Complete Setup →';
    } else {
        nextBtn.textContent = 'Next →';
    }
    
    // Update progress indicators
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        step.classList.remove('active');
        if (index === currentWizardStep) {
            step.classList.add('active');
        }
    });
    
    // Enable next button based on step completion
    updateNextButtonState();
}

function updateNextButtonState() {
    const nextBtn = document.getElementById('wizardNextBtn');
    let canProceed = false;
    
    switch (currentWizardStep) {
        case 0: // Industry selection
            canProceed = projectConfiguration.industry !== null;
            break;
        case 1: // Role configuration
            canProceed = projectConfiguration.role_config.seniority_level !== null;
            break;
        case 2: // Requirements
            canProceed = projectConfiguration.requirements.must_have_skills.length > 0;
            break;
        case 3: // Preferences
            canProceed = true; // Preferences have defaults
            break;
        case 4: // Context
            canProceed = true; // Context is optional
            break;
    }
    
    nextBtn.disabled = !canProceed;
}

function generateRoleConfigStep() {
    const stepElement = document.getElementById('wizard-step-1');
    if (!stepElement) return;
    
    stepElement.innerHTML = `
        <div class="step-content">
            <h3 style="margin-bottom: 20px; color: #1f2937;">Role Configuration</h3>
            <p style="color: #6b7280; margin-bottom: 30px;">Define the specific role details to customize evaluation criteria.</p>
            
            <div class="config-section">
                <label class="config-label">Seniority Level</label>
                <div class="config-options">
                    <div class="config-option" onclick="selectConfig('seniority_level', 'junior')">Junior (0-2 years)</div>
                    <div class="config-option" onclick="selectConfig('seniority_level', 'mid')">Mid-level (3-5 years)</div>
                    <div class="config-option" onclick="selectConfig('seniority_level', 'senior')">Senior (6+ years)</div>
                    <div class="config-option" onclick="selectConfig('seniority_level', 'executive')">Executive/Leadership</div>
                </div>
            </div>
            
            <div class="config-section">
                <label class="config-label">Role Type</label>
                <div class="config-options">
                    <div class="config-option" onclick="selectConfig('role_type', 'ic')">Individual Contributor</div>
                    <div class="config-option" onclick="selectConfig('role_type', 'manager')">People Manager</div>
                    <div class="config-option" onclick="selectConfig('role_type', 'specialist')">Technical Specialist</div>
                    <div class="config-option" onclick="selectConfig('role_type', 'leadership')">Senior Leadership</div>
                </div>
            </div>
            
            <div class="config-section" id="teamSizeSection" style="display: none;">
                <label class="config-label">Team Size (if applicable)</label>
                <div class="config-options">
                    <div class="config-option" onclick="selectConfig('team_size', 'small')">1-5 people</div>
                    <div class="config-option" onclick="selectConfig('team_size', 'medium')">6-15 people</div>
                    <div class="config-option" onclick="selectConfig('team_size', 'large')">16+ people</div>
                </div>
            </div>
        </div>
    `;
}

function generateRequirementsStep() {
    const stepElement = document.getElementById('wizard-step-2');
    if (!stepElement) return;
    
    stepElement.innerHTML = `
        <div class="step-content">
            <h3 style="margin-bottom: 20px; color: #1f2937;">Requirements & Skills</h3>
            <p style="color: #6b7280; margin-bottom: 30px;">Define the essential and preferred qualifications for this role.</p>
            
            <div class="config-section">
                <label class="config-label">Must-Have Skills (max 5)</label>
                <div class="skill-input-container">
                    <div class="skill-tags" id="mustHaveSkills"></div>
                    <input type="text" class="skill-input" placeholder="Type a skill and press Enter" 
                           onkeypress="addSkill(event, 'must_have_skills')" maxlength="50">
                </div>
            </div>
            
            <div class="config-section">
                <label class="config-label">Nice-to-Have Skills (max 5)</label>
                <div class="skill-input-container">
                    <div class="skill-tags" id="niceToHaveSkills"></div>
                    <input type="text" class="skill-input" placeholder="Type a skill and press Enter" 
                           onkeypress="addSkill(event, 'nice_to_have_skills')" maxlength="50">
                </div>
            </div>
            
            <div class="config-section">
                <label class="config-label">Experience Range</label>
                <div class="slider-container">
                    <div class="slider-label">
                        <span>Minimum: <span id="minExpValue">0</span> years</span>
                        <span>Maximum: <span id="maxExpValue">20</span> years</span>
                    </div>
                    <input type="range" class="slider" min="0" max="20" value="0" 
                           oninput="updateExperienceRange('min', this.value)" style="margin-bottom: 10px;">
                    <input type="range" class="slider" min="0" max="20" value="20" 
                           oninput="updateExperienceRange('max', this.value)">
                </div>
            </div>
            
            <div class="config-section">
                <label class="config-label">Education Requirements</label>
                <div class="config-options">
                    <div class="config-option" onclick="selectConfig('education_requirements', 'any')">Any Level</div>
                    <div class="config-option" onclick="selectConfig('education_requirements', 'bachelors')">Bachelor's Degree</div>
                    <div class="config-option" onclick="selectConfig('education_requirements', 'masters')">Master's Degree</div>
                    <div class="config-option" onclick="selectConfig('education_requirements', 'phd')">PhD/Doctorate</div>
                </div>
            </div>
        </div>
    `;
}

function selectConfig(configType, value) {
    // Update configuration
    if (configType.includes('_')) {
        const parts = configType.split('_');
        if (parts.length === 2 && projectConfiguration.role_config[configType]) {
            projectConfiguration.role_config[configType] = value;
        } else if (projectConfiguration.requirements[configType]) {
            projectConfiguration.requirements[configType] = value;
        }
    }
    
    // Update UI
    const parentSection = event.target.closest('.config-section');
    parentSection.querySelectorAll('.config-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    // Show team size section if manager/leadership selected
    if (configType === 'role_type' && (value === 'manager' || value === 'leadership')) {
        document.getElementById('teamSizeSection').style.display = 'block';
    }
    
    updateNextButtonState();
    console.log('Config updated:', configType, value);
}

function addSkill(event, skillType) {
    if (event.key === 'Enter') {
        const input = event.target;
        const skill = input.value.trim();
        
        if (skill && projectConfiguration.requirements[skillType].length < 5) {
            projectConfiguration.requirements[skillType].push(skill);
            input.value = '';
            updateSkillsDisplay(skillType);
            updateNextButtonState();
        }
    }
}

function updateSkillsDisplay(skillType) {
    const containerId = skillType === 'must_have_skills' ? 'mustHaveSkills' : 'niceToHaveSkills';
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    container.innerHTML = projectConfiguration.requirements[skillType].map((skill, index) => `
        <div class="skill-tag">
            ${skill}
            <span class="remove" onclick="removeSkill('${skillType}', ${index})">×</span>
        </div>
    `).join('');
}

function removeSkill(skillType, index) {
    projectConfiguration.requirements[skillType].splice(index, 1);
    updateSkillsDisplay(skillType);
    updateNextButtonState();
}

function updateExperienceRange(type, value) {
    document.getElementById(`${type}ExpValue`).textContent = value;
    projectConfiguration.requirements.experience_range[type] = parseInt(value);
}

function skipWizard() {
    // Hide wizard and show regular job description step
    document.getElementById('setupWizard').classList.remove('active');
    document.getElementById('step1').style.display = 'block';
    showSuccess('Setup wizard skipped. Using default configuration.');
}

function finishWizard() {
    // Generate final configuration and proceed
    generateJobDescriptionFromConfig();
    
    // Hide wizard and show CV upload step
    document.getElementById('setupWizard').classList.remove('active');
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    document.getElementById('step2').classList.add('active');
    
    showSuccess('Project configured successfully! Ready to upload CVs.');
    console.log('Final configuration:', projectConfiguration);
}

function generateJobDescriptionFromConfig() {
    const industry = industryTemplates[projectConfiguration.industry];
    const config = projectConfiguration;
    
    // Generate a structured job description based on configuration
    jobRequirements = {
        title: `${config.role_config.seniority_level} ${industry.name} Role`,
        industry: industry.name,
        skills: config.requirements.must_have_skills,
        experience: config.requirements.experience_range.min,
        education: config.requirements.education_requirements,
        keywords: [...config.requirements.must_have_skills, ...config.requirements.nice_to_have_skills],
        configuration: config
    };
    
    // Update job description field if visible
    const jobDescField = document.getElementById('jobDescription');
    if (jobDescField) {
        jobDescField.value = generateJobDescriptionText();
    }
}

function generateJobDescriptionText() {
    const config = projectConfiguration;
    const industry = industryTemplates[config.industry];
    
    return `${config.role_config.seniority_level} Level Role - ${industry.name}

Industry: ${industry.name}
Seniority: ${config.role_config.seniority_level}
Role Type: ${config.role_config.role_type}

Required Skills:
${config.requirements.must_have_skills.map(skill => `- ${skill}`).join('\n')}

Preferred Skills:
${config.requirements.nice_to_have_skills.map(skill => `- ${skill}`).join('\n')}

Experience: ${config.requirements.experience_range.min}-${config.requirements.experience_range.max} years
Education: ${config.requirements.education_requirements || 'Any level'}

This role focuses on: ${industry.focus_areas.join(', ')}`;
}

function generatePreferencesStep() {
    const stepElement = document.getElementById('wizard-step-3');
    if (!stepElement) return;
    
    stepElement.innerHTML = `
        <div class="step-content">
            <h3 style="margin-bottom: 20px; color: #1f2937;">Scoring Preferences</h3>
            <p style="color: #6b7280; margin-bottom: 30px;">Adjust how different factors are weighted in the evaluation.</p>
            
            <div class="slider-container">
                <div class="slider-label">
                    <span>Skills vs Experience</span>
                    <span>Skills Focus ← → Experience Focus</span>
                </div>
                <input type="range" class="slider" min="0" max="100" value="50" 
                       oninput="updatePreference('skills_vs_experience', this.value)">
            </div>
            
            <div class="slider-container">
                <div class="slider-label">
                    <span>Industry Background Importance</span>
                    <span>Flexible ← → Industry Specific</span>
                </div>
                <input type="range" class="slider" min="0" max="100" value="50" 
                       oninput="updatePreference('industry_importance', this.value)">
            </div>
            
            <div class="slider-container">
                <div class="slider-label">
                    <span>Growth Potential vs Current Ability</span>
                    <span>Current Skills ← → Growth Potential</span>
                </div>
                <input type="range" class="slider" min="0" max="100" value="50" 
                       oninput="updatePreference('growth_vs_current', this.value)">
            </div>
            
            <div class="slider-container">
                <div class="slider-label">
                    <span>Cultural Fit Consideration</span>
                    <span>Skills Only ← → Include Culture</span>
                </div>
                <input type="range" class="slider" min="0" max="100" value="50" 
                       oninput="updatePreference('cultural_fit_level', this.value)">
            </div>
        </div>
    `;
}

function generateContextStep() {
    const stepElement = document.getElementById('wizard-step-4');
    if (!stepElement) return;
    
    stepElement.innerHTML = `
        <div class="step-content">
            <h3 style="margin-bottom: 20px; color: #1f2937;">Company Context</h3>
            <p style="color: #6b7280; margin-bottom: 30px;">Provide additional context to fine-tune the evaluation.</p>
            
            <div class="config-section">
                <label class="config-label">Company Stage</label>
                <div class="config-options">
                    <div class="config-option" onclick="selectContextConfig('company_stage', 'startup')">Startup (0-50 employees)</div>
                    <div class="config-option" onclick="selectContextConfig('company_stage', 'growth')">Growth (51-500 employees)</div>
                    <div class="config-option" onclick="selectContextConfig('company_stage', 'enterprise')">Enterprise (500+ employees)</div>
                </div>
            </div>
            
            <div class="config-section">
                <label class="config-label">Remote Work Policy</label>
                <div class="config-options">
                    <div class="config-option" onclick="selectContextConfig('remote_policy', 'remote')">Fully Remote</div>
                    <div class="config-option" onclick="selectContextConfig('remote_policy', 'hybrid')">Hybrid</div>
                    <div class="config-option" onclick="selectContextConfig('remote_policy', 'onsite')">On-site Required</div>
                </div>
            </div>
            
            <div class="config-section">
                <label class="config-label">Timeline Urgency</label>
                <div class="config-options">
                    <div class="config-option" onclick="selectContextConfig('timeline_urgency', 'urgent')">Urgent (ASAP)</div>
                    <div class="config-option" onclick="selectContextConfig('timeline_urgency', 'normal')">Normal (1-2 months)</div>
                    <div class="config-option" onclick="selectContextConfig('timeline_urgency', 'flexible')">Flexible (3+ months)</div>
                </div>
            </div>
        </div>
    `;
}

function updatePreference(preferenceType, value) {
    projectConfiguration.scoring_preferences[preferenceType] = parseInt(value);
}

function selectContextConfig(configType, value) {
    projectConfiguration.context[configType] = value;
    
    // Update UI
    const parentSection = event.target.closest('.config-section');
    parentSection.querySelectorAll('.config-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    console.log('Context updated:', configType, value);
}

// =============================================================================
// DYNAMIC PROMPT GENERATION - Phase 3.3
// =============================================================================

function generateIndustrySpecificPrompt(basePrompt, candidateData) {
    if (!projectConfiguration.industry) {
        return basePrompt + getPersonalizedPromptModifications();
    }
    
    const industry = industryTemplates[projectConfiguration.industry];
    const config = projectConfiguration;
    
    let enhancedPrompt = basePrompt;
    
    // Add industry-specific analysis instructions
    enhancedPrompt += industry.prompt_additions;
    
    // Add configuration-specific instructions
    enhancedPrompt += `\n\nCONFIGURATION-SPECIFIC ANALYSIS:`;
    
    // Role-specific adjustments
    if (config.role_config.seniority_level === 'junior') {
        enhancedPrompt += `\n- Focus on learning potential and foundational skills rather than extensive experience`;
    } else if (config.role_config.seniority_level === 'senior') {
        enhancedPrompt += `\n- Emphasize leadership experience, strategic thinking, and deep expertise`;
    }
    
    if (config.role_config.role_type === 'manager') {
        enhancedPrompt += `\n- Evaluate people management, team building, and leadership capabilities`;
    }
    
    // Scoring preference adjustments
    const prefs = config.scoring_preferences;
    if (prefs.skills_vs_experience > 70) {
        enhancedPrompt += `\n- Prioritize technical skills and competencies over years of experience`;
    } else if (prefs.skills_vs_experience < 30) {
        enhancedPrompt += `\n- Weight experience and track record more heavily than specific technical skills`;
    }
    
    if (prefs.industry_importance > 70) {
        enhancedPrompt += `\n- Require strong industry-specific knowledge and experience`;
    }
    
    if (prefs.growth_vs_current > 70) {
        enhancedPrompt += `\n- Value learning agility and growth potential over current skill set`;
    }
    
    // Industry-specific scoring weights
    enhancedPrompt += `\n\nSCORING WEIGHTS FOR ${industry.name.toUpperCase()}:`;
    Object.entries(industry.scoring_weights).forEach(([factor, weight]) => {
        enhancedPrompt += `\n- ${factor}: ${weight}%`;
    });
    
    // Red flags and positive indicators
    enhancedPrompt += `\n\nRED FLAGS TO WATCH FOR:`;
    industry.red_flags.forEach(flag => {
        enhancedPrompt += `\n- ${flag}`;
    });
    
    enhancedPrompt += `\n\nPOSITIVE INDICATORS:`;
    industry.positive_indicators.forEach(indicator => {
        enhancedPrompt += `\n- ${indicator}`;
    });
    
    // Required skills emphasis
    if (config.requirements.must_have_skills.length > 0) {
        enhancedPrompt += `\n\nCRITICAL REQUIRED SKILLS (must have most of these):`;
        config.requirements.must_have_skills.forEach(skill => {
            enhancedPrompt += `\n- ${skill}`;
        });
    }
    
    // Company context adjustments
    if (config.context.company_stage === 'startup') {
        enhancedPrompt += `\n\nSTARTUP CONTEXT: Value adaptability, scrappiness, and ability to wear multiple hats`;
    } else if (config.context.company_stage === 'enterprise') {
        enhancedPrompt += `\n\nENTERPRISE CONTEXT: Focus on process orientation, scalability experience, and large organization navigation`;
    }
    
    // Add personalized learning modifications
    enhancedPrompt += getPersonalizedPromptModifications();
    
    return enhancedPrompt;
}

function applyIndustrySpecificScoring(candidateData, baseScore) {
    if (!projectConfiguration.industry) {
        return applyLearningToScoring(candidateData, baseScore);
    }
    
    const industry = industryTemplates[projectConfiguration.industry];
    const config = projectConfiguration;
    let adjustedScore = baseScore;
    
    // Apply industry-specific adjustments
    const candidateSkills = candidateData.skills ? candidateData.skills.toLowerCase() : '';
    
    // Check for industry red flags
    const hasRedFlags = industry.red_flags.some(flag => 
        candidateSkills.includes(flag.toLowerCase()) || 
        candidateData.name.toLowerCase().includes(flag.toLowerCase())
    );
    
    if (hasRedFlags) {
        adjustedScore *= 0.8; // 20% penalty for red flags
    }
    
    // Boost for positive indicators
    const positiveIndicators = industry.positive_indicators.filter(indicator =>
        candidateSkills.includes(indicator.toLowerCase())
    );
    
    if (positiveIndicators.length > 0) {
        adjustedScore *= (1 + (positiveIndicators.length * 0.1)); // 10% boost per positive indicator
    }
    
    // Apply must-have skills penalty
    const mustHaveSkills = config.requirements.must_have_skills;
    const matchedSkills = mustHaveSkills.filter(skill => 
        candidateSkills.includes(skill.toLowerCase())
    );
    
    const skillMatchRatio = matchedSkills.length / mustHaveSkills.length;
    if (skillMatchRatio < 0.5) {
        adjustedScore *= 0.7; // 30% penalty for missing critical skills
    }
    
    // Apply learning algorithm adjustments
    adjustedScore = applyLearningToScoring(candidateData, adjustedScore);
    
    // Ensure score stays within bounds
    return Math.max(0, Math.min(100, Math.round(adjustedScore)));
}

// =============================================================================
// PDF TEXT EXTRACTION - Phase 3.5
// =============================================================================

async function extractTextFromPDF(file) {
    try {
        // For now, simulate PDF text extraction
        // In production, this would use PDF.js library
        const mockExtraction = {
            rawText: `${file.name} - Candidate Profile
            
Professional Summary:
Experienced professional with background in relevant technologies and methodologies.
Strong track record of delivering results in fast-paced environments.

Work Experience:
- Senior position at Technology Company (2018-2023)
- Mid-level role at Previous Company (2015-2018)
- Junior position at First Company (2013-2015)

Skills:
JavaScript, React, Node.js, Python, SQL, Project Management, Team Leadership, Problem Solving

Education:
Bachelor's Degree in Computer Science
Various certifications and continuous learning`,
            
            experienceYears: Math.floor(Math.random() * 8) + 3,
            skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
            education: "Bachelor's Degree",
            contactInfo: {
                email: 'candidate@example.com',
                phone: '+1234567890'
            }
        };
        
        return mockExtraction;
        
    } catch (error) {
        console.error('PDF extraction failed:', error);
        return {
            rawText: 'Failed to extract text from PDF',
            experienceYears: 0,
            skills: [],
            education: 'Unknown',
            contactInfo: {}
        };
    }
}

// Real PDF.js implementation would look like this:
/*
async function extractTextFromPDFReal(file) {
    try {
        // Load PDF.js library
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }
        
        return {
            rawText: fullText,
            experienceYears: calculateExperience(fullText),
            skills: extractSkillsFromText(fullText),
            education: extractEducation(fullText),
            contactInfo: extractContactInfo(fullText)
        };
        
    } catch (error) {
        console.error('PDF extraction failed:', error);
        throw error;
    }
}

function calculateExperience(text) {
    // Extract years of experience from text
    const experienceRegex = /(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/gi;
    const matches = text.match(experienceRegex);
    
    if (matches && matches.length > 0) {
        const numbers = matches[0].match(/\d+/);
        return numbers ? parseInt(numbers[0]) : 0;
    }
    
    // Alternative: count job positions and estimate
    const jobPattern = /(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}/g;
    const jobMatches = text.match(jobPattern);
    
    if (jobMatches && jobMatches.length > 0) {
        return Math.min(jobMatches.length * 2, 15); // Estimate 2 years per job, max 15
    }
    
    return 0;
}

function extractSkillsFromText(text) {
    const skillDatabase = [
        'JavaScript', 'Python', 'Java', 'C++', 'React', 'Angular', 'Vue.js',
        'Node.js', 'Express', 'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Azure',
        'Docker', 'Kubernetes', 'Git', 'HTML', 'CSS', 'TypeScript',
        'Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication'
    ];
    
    const foundSkills = skillDatabase.filter(skill =>
        text.toLowerCase().includes(skill.toLowerCase())
    );
    
    return foundSkills;
}
*/

function submitFeedback(candidateName, feedbackType, context) {
    // Find the candidate data
    const candidate = analysisResults.find(c => c.name === candidateName);
    if (!candidate) {
        console.error('Candidate not found:', candidateName);
        return;
    }
    
    // Create feedback record
    const feedbackRecord = {
        feedback_id: generateFeedbackId(),
        candidate_name: candidateName,
        candidate_id: candidate.cv_id || candidateName.replace(/\s+/g, '-').toLowerCase(),
        feedback_type: feedbackType, // 'good' or 'poor'
        ai_score: candidate.score,
        context: context, // 'analysis' or 'search'
        job_title: jobRequirements.title || 'Unknown Role',
        job_industry: jobRequirements.industry || 'Unknown Industry',
        timestamp: new Date().toISOString(),
        session_id: getSessionId()
    };
    
    // Store in memory and localStorage
    feedbackDatabase.push(feedbackRecord);
    localStorage.setItem('cv_feedback_database', JSON.stringify(feedbackDatabase));
    
    // Update candidate record with feedback
    candidate.user_feedback = {
        type: feedbackType,
        timestamp: feedbackRecord.timestamp,
        feedback_id: feedbackRecord.feedback_id
    };
    
    // Update UI to show feedback was captured
    showFeedbackConfirmation(candidateName, feedbackType);
    
    // Log for debugging
    console.log('📊 Feedback submitted:', feedbackRecord);
    
    // Show success notification
    showSuccess(`Thanks! Your feedback helps us improve matching accuracy.`);
}

function showScoreCorrectionConfirmation(candidateName, originalScore, correctedScore, detailedFeedback = null) {
    const candidateCards = document.querySelectorAll('.candidate-card');
    
    candidateCards.forEach(card => {
        const nameElement = card.querySelector('.candidate-name');
        if (nameElement && nameElement.textContent === candidateName) {
            // Replace score correction interface with confirmation
            const scoreCorrectionSection = card.querySelector('.score-correction');
            
            if (scoreCorrectionSection) {
                const scoreDifference = correctedScore - originalScore;
                const direction = scoreDifference > 0 ? 'increased' : 'decreased';
                const arrow = scoreDifference > 0 ? '↗️' : '↘️';
                
                let confirmationHTML = `
                    <div class="feedback-confirmation">
                        <span class="feedback-icon">${arrow}</span>
                        <span class="feedback-message">
                            Score ${direction} from ${originalScore}% to ${correctedScore}%
                `;
                
                // Add detailed feedback summary if provided
                if (detailedFeedback && detailedFeedback.categories.length > 0) {
                    const categoryLabels = detailedFeedback.categories.map(cat => 
                        feedbackCategories[cat]?.label
                    ).filter(Boolean);
                    
                    confirmationHTML += `
                        <br><small><strong>Reasons:</strong> ${categoryLabels.join(', ')}</small>
                    `;
                    
                    if (detailedFeedback.feedback_text) {
                        confirmationHTML += `
                            <br><small><strong>Notes:</strong> "${detailedFeedback.feedback_text.substring(0, 100)}${detailedFeedback.feedback_text.length > 100 ? '...' : ''}"</small>
                        `;
                    }
                }
                
                confirmationHTML += `
                            <br><small>Your detailed feedback helps train our AI!</small>
                        </span>
                    </div>
                `;
                
                scoreCorrectionSection.innerHTML = confirmationHTML;
                scoreCorrectionSection.classList.add('feedback-submitted');
            }
        }
    });
}

function showFeedbackConfirmation(candidateName, feedbackType) {
    // Find all feedback button containers for this candidate
    const candidateCards = document.querySelectorAll('.candidate-card');
    
    candidateCards.forEach(card => {
        const nameElement = card.querySelector('.candidate-name');
        if (nameElement && nameElement.textContent === candidateName) {
            // Replace feedback buttons with confirmation
            const feedbackSections = card.querySelectorAll('.feedback-buttons, .mini-feedback');
            
            feedbackSections.forEach(section => {
                const isMiniFeedback = section.classList.contains('mini-feedback');
                
                section.innerHTML = isMiniFeedback ? 
                    `<span class="feedback-thanks">✓</span>` :
                    `<div class="feedback-confirmation">
                        <span class="feedback-icon">${feedbackType === 'good' ? '👍' : '👎'}</span>
                        <span class="feedback-message">Thanks for your feedback!</span>
                    </div>`;
                
                section.classList.add('feedback-submitted');
            });
        }
    });
}

function generateFeedbackId() {
    return 'feedback-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function getSessionId() {
    let sessionId = sessionStorage.getItem('cv_screening_session');
    if (!sessionId) {
        sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('cv_screening_session', sessionId);
    }
    return sessionId;
}
// =============================================================================
// API STATUS AND COMMUNICATION
// =============================================================================

async function checkAPIStatus() {
    try {
        showLoading('Checking secure connection...');
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.health}`);
        if (response.ok) {
            const data = await response.json();
            useRealAI = true;
            console.log('🤖 AI Mode: Connected to secure backend');
            console.log('Rate limit:', data.rateLimit);
            updateRateLimitInfo(response.headers);
            showSuccess('Secure AI connection established!');
        } else {
            throw new Error('Backend not available');
        }
    } catch (error) {
        useRealAI = false;
        console.log('🎭 Demo Mode: Backend not available, using simulated responses');
        showWarning('Running in demo mode. Upload your own API key for full functionality.');
    } finally {
        hideLoading();
    }
}

function updateRateLimitInfo(headers) {
    const remaining = headers.get('x-ratelimit-remaining');
    const resetTime = headers.get('x-ratelimit-reset');
    
    if (remaining !== null) {
        rateLimitInfo.remaining = parseInt(remaining);
    }
    if (resetTime) {
        rateLimitInfo.resetTime = new Date(parseInt(resetTime) * 1000);
    }
    
    // Show rate limit warning
    if (rateLimitInfo.remaining <= 3 && rateLimitInfo.remaining > 0) {
        showWarning(`You have ${rateLimitInfo.remaining} AI analysis requests remaining this hour.`);
    }
}

async function makeSecureAPICall(prompt, type) {
    if (!useRealAI) {
        throw new Error('API not available - running in demo mode');
    }
    
    if (rateLimitInfo.remaining <= 0) {
        const resetTimeStr = rateLimitInfo.resetTime ? rateLimitInfo.resetTime.toLocaleTimeString() : 'later';
        throw new Error(`Rate limit exceeded. Please try again after ${resetTimeStr}`);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.analyze}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                type
            })
        });
        
        // Update rate limit info from response headers
        updateRateLimitInfo(response.headers);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 429) {
                throw new Error(errorData.error || 'Rate limit exceeded');
            }
            
            if (response.status === 500) {
                throw new Error('Server error - please try again later');
            }
            
            throw new Error(errorData.error || `Request failed: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Secure API call failed:', error);
        throw error;
    }
}
// =============================================================================
// STEP 1: JOB DESCRIPTION PROCESSING
// =============================================================================

function loadSampleJob() {
    document.getElementById('jobDescription').value = sampleJobDescription;
    showSuccess('Sample job description loaded!');
}

async function extractRequirements() {
    const jobText = document.getElementById('jobDescription').value.trim();
    
    if (!jobText) {
        showError('Please enter a job description first.');
        return;
    }
    
    if (useRealAI) {
        await extractRequirementsWithAI(jobText);
    } else {
        extractRequirementsSimple(jobText);
    }
}

async function extractRequirementsWithAI(jobText) {
    try {
        showLoading('Extracting requirements with AI...');
        
        // Check if we have an industry configuration
        const savedConfig = localStorage.getItem('currentProjectConfig');
        let prompt;
        
        if (savedConfig) {
            // Use industry-specific extraction
            const config = JSON.parse(savedConfig);
            const industry = config.industryTemplate;
            
            prompt = `You are an expert recruitment AI specialized in ${industry.name} talent assessment.

Extract structured requirements from this job description using ${industry.name} industry expertise:

${jobText}

Focus on ${industry.name} specific requirements:
${industry.focus_areas.map(area => `- ${area}`).join('\n')}

Consider these industry-specific positive indicators:
${industry.positive_indicators.map(indicator => `- ${indicator}`).join('\n')}

Watch for these industry red flags:
${industry.red_flags.map(flag => `- ${flag}`).join('\n')}

${industry.compliance_requirements.length > 0 ? `
Required certifications/compliance for ${industry.name}:
${industry.compliance_requirements.map(req => `- ${req}`).join('\n')}
` : ''}

Please respond with a JSON object containing:
- title: The job title
- skills: Array of required skills (prioritize ${industry.name} specific skills)
- experience: Minimum years of experience required (as number)
- education: Required education level
- keywords: Array of important keywords for this role
- industry: "${config.industry}"
- industryTemplate: Include the industry template data
- seniority: "${config.seniority || 'mid'}"
- roleType: "${config.roleType || 'individual_contributor'}"

Format as clean JSON only, no markdown formatting.`;
        } else {
            // Use generic extraction
            prompt = `Extract structured requirements from this job description:

${jobText}

Please respond with a JSON object containing:
- title: The job title
- skills: Array of required technical skills
- experience: Minimum years of experience required (as number)
- education: Required education level
- keywords: Array of important keywords for this role
- industry: Industry or sector

Format as clean JSON only, no markdown formatting.`;
        }
        
        const data = await makeSecureAPICall(prompt, 'extract_requirements');
        const requirements = JSON.parse(data.content[0].text);
        
        // If we have a saved config, merge it with extracted requirements
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            requirements.projectConfig = config;
            requirements.industryTemplate = config.industryTemplate;
            currentProjectConfig = config;
        }
        
        jobRequirements = requirements;
        completeStep(1);
        showStep(2);
        
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            showSuccess(`Requirements extracted with ${config.industryTemplate.name} expertise! 🤖`);
        } else {
            showSuccess('Requirements extracted with AI! 🤖');
        }
        
    } catch (error) {
        console.error('AI extraction failed:', error);
        
        if (error.message.includes('Rate limit')) {
            showError(error.message);
            return;
        } else {
            showError('AI extraction failed. Using fallback extraction.');
            extractRequirementsSimple(jobText);
        }
    } finally {
        hideLoading();
    }
}

function extractRequirementsSimple(jobText) {
    // Fallback simple extraction
    jobRequirements = {
        title: extractJobTitle(jobText),
        skills: extractSkills(jobText),
        experience: extractExperience(jobText),
        education: extractEducation(jobText),
        keywords: extractKeywords(jobText),
        industry: extractIndustry(jobText)
    };
    
    completeStep(1);
    showStep(2);
    showSuccess('Requirements extracted successfully!');
}
// Helper extraction functions
function extractJobTitle(text) {
    const lines = text.split('\n');
    return lines[0].trim() || 'Position';
}

function extractSkills(text) {
    const skillKeywords = [
        'HubSpot', 'Salesforce', 'Google Analytics', 'Marketing Automation',
        'SQL', 'Python', 'JavaScript', 'React', 'Node.js', 'AWS',
        'Lead Generation', 'ABM', 'SaaS', 'B2B', 'CRM'
    ];
    
    const foundSkills = [];
    const lowerText = text.toLowerCase();
    
    skillKeywords.forEach(skill => {
        if (lowerText.includes(skill.toLowerCase())) {
            foundSkills.push(skill);
        }
    });
    
    return foundSkills;
}

function extractExperience(text) {
    const experienceRegex = /(\d+)\+?\s*years?/i;
    const match = text.match(experienceRegex);
    return match ? parseInt(match[1]) : 3;
}

function extractEducation(text) {
    return text.toLowerCase().includes('degree') ? 'degree' : 'any';
}

function extractKeywords(text) {
    const keywords = ['startup', 'growth', 'analytics', 'data-driven', 'communication'];
    const lowerText = text.toLowerCase();
    return keywords.filter(keyword => lowerText.includes(keyword));
}

function extractIndustry(text) {
    const industries = { 'saas': 'SaaS', 'software': 'Software', 'technology': 'Technology' };
    const lowerText = text.toLowerCase();
    
    for (let [keyword, industry] of Object.entries(industries)) {
        if (lowerText.includes(keyword)) return industry;
    }
    return 'General';
}

// =============================================================================
// MAIN PROCESSING FUNCTIONS
// =============================================================================

function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    processFiles(files);
}

function handleDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('fileUploadArea').classList.add('drag-over');
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    // Set the dropEffect to copy to show the appropriate cursor
    event.dataTransfer.dropEffect = 'copy';
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('fileUploadArea').classList.remove('drag-over');
    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    // Only remove the drag-over class if we're leaving the drop area itself
    // This prevents flickering when dragging over child elements
    if (!event.currentTarget.contains(event.relatedTarget)) {
        document.getElementById('fileUploadArea').classList.remove('drag-over');
    }
}

function processFiles(files) {
    const validFiles = files.filter(file => {
        const validTypes = ['.pdf', '.doc', '.docx'];
        const fileName = file.name.toLowerCase();
        return validTypes.some(type => fileName.endsWith(type));
    });
    
    if (validFiles.length === 0) {
        showError('Please upload valid CV files (PDF, DOC, or DOCX).');
        return;
    }
    
    uploadedFiles = validFiles;
    displayFileList();
    document.getElementById('processCvsBtn').disabled = false;
    showSuccess(`${validFiles.length} CVs uploaded successfully!`);
}

function displayFileList() {
    const fileList = document.getElementById('fileList');
    if (uploadedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }
    
    let html = '<div style="margin-top: 20px;"><h4>Uploaded Files:</h4><ul>';
    uploadedFiles.forEach(file => {
        html += `<li style="padding: 5px 0;">${file.name}</li>`;
    });
    html += '</ul></div>';
    fileList.innerHTML = html;
}

function loadSampleCvs() {
    uploadedFiles = [
        { name: 'Sarah_Johnson_CV.pdf', size: 245760 },
        { name: 'Michael_Chen_CV.pdf', size: 312892 },
        { name: 'Emily_Rodriguez_CV.pdf', size: 198432 }
    ];
    displayFileList();
    document.getElementById('processCvsBtn').disabled = false;
    showSuccess('Sample CVs loaded!');
}
async function processCvs() {
    if (uploadedFiles.length === 0) {
        showError('Please upload some CVs first.');
        return;
    }
    
    completeStep(2);
    showStep(3);
    
    if (useRealAI) {
        await processWithAI();
    } else {
        simulateProcessing();
    }
}

function simulateProcessing() {
    const messages = [
        'Extracting text from CVs...',
        'Analyzing candidate profiles...',
        'Matching skills and experience...',
        'Calculating compatibility scores...',
        'Generating insights...'
    ];
    
    let messageIndex = 0;
    const processingText = document.getElementById('processingText');
    
    const interval = setInterval(() => {
        if (messageIndex < messages.length) {
            processingText.textContent = messages[messageIndex];
            messageIndex++;
        } else {
            clearInterval(interval);
            completeProcessing();
        }
    }, 2000);
}

function completeProcessing() {
    analysisResults = uploadedFiles.map((file, index) => {
        const extractedData = file.extractedData || {};
        
        // Use real extracted data if available
        let candidate = {
            name: extractedData.contactInfo?.name || 
                  extractCandidateName(file.content) || 
                  `Candidate ${index + 1}`,
            score: 0, // Will be calculated below
            experience: `${extractedData.experienceYears || 0} years`,
            skills: extractedData.skills?.join(', ') || 'Skills not detected',
            highlights: [],
            concerns: [],
            contactInfo: extractedData.contactInfo || {},
            education: extractedData.education || 'Not specified',
            certifications: extractedData.certifications || [],
            extractedData: extractedData
        };
        
        // Calculate industry-specific score
        candidate.score = calculateIndustryAwareScore(candidate, file.content);
        
        // Apply industry-specific analysis if configured
        const savedConfig = localStorage.getItem('currentProjectConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            const industry = config.industryTemplate;
            
            if (industry) {
                // Industry-specific highlights and concerns
                candidate = addIndustrySpecificInsights(candidate, industry, config);
            }
        }
        
        // Ensure minimum highlights and concerns
        if (candidate.highlights.length === 0) {
            candidate.highlights = ['Experience level assessed', 'Skills extracted'];
        }
        
        if (candidate.concerns.length === 0 && candidate.score < 70) {
            candidate.concerns = ['Some requirements may not be fully met'];
        }
        
        return candidate;
    });
    
    analysisResults.sort((a, b) => b.score - a.score);
    const timeSaved = uploadedFiles.length * 5 - 0.25;
    
    completeStep(3);
    showStep(4);
    displayResultsWithFeedback(timeSaved);
    
    // Show consent dialog after results are displayed
    setTimeout(() => showConsentDialog(), 2000);
}

// =============================================================================
// INDUSTRY-AWARE CV ANALYSIS HELPERS
// =============================================================================

// Calculate industry-aware score for a candidate
function calculateIndustryAwareScore(candidate, cvText) {
    let baseScore = 50; // Starting score
    
    const savedConfig = localStorage.getItem('currentProjectConfig');
    if (!savedConfig) {
        // Basic scoring without industry configuration
        return Math.floor(Math.random() * 30) + 60;
    }
    
    const config = JSON.parse(savedConfig);
    const industry = config.industryTemplate;
    const extractedData = candidate.extractedData || {};
    
    // Experience scoring
    const experienceYears = extractedData.experienceYears || 0;
    const targetMinExp = config.minExperience || 0;
    const targetMaxExp = config.maxExperience || 10;
    
    if (experienceYears >= targetMinExp && experienceYears <= targetMaxExp + 2) {
        baseScore += 15; // Good experience match
    } else if (experienceYears < targetMinExp) {
        baseScore -= Math.min(10, (targetMinExp - experienceYears) * 2); // Penalize under-experience
    }
    
    // Skills scoring based on industry weights
    const candidateSkills = extractedData.skills || [];
    const mustHaveSkills = config.mustHave || [];
    const niceToHaveSkills = config.niceToHave || [];
    
    // Must-have skills (heavy weight)
    const foundMustHave = mustHaveSkills.filter(skill =>
        candidateSkills.some(candSkill => 
            candSkill.toLowerCase().includes(skill.toLowerCase())
        )
    );
    
    if (mustHaveSkills.length > 0) {
        const mustHavePercent = foundMustHave.length / mustHaveSkills.length;
        baseScore += mustHavePercent * 25; // Up to 25 points for must-have skills
    }
    
    // Nice-to-have skills (moderate weight)
    const foundNiceToHave = niceToHaveSkills.filter(skill =>
        candidateSkills.some(candSkill => 
            candSkill.toLowerCase().includes(skill.toLowerCase())
        )
    );
    
    if (niceToHaveSkills.length > 0) {
        const niceToHavePercent = foundNiceToHave.length / niceToHaveSkills.length;
        baseScore += niceToHavePercent * 10; // Up to 10 points for nice-to-have skills
    }
    
    // Industry-specific positive indicators
    const foundPositiveIndicators = industry.positive_indicators.filter(indicator =>
        cvText.toLowerCase().includes(indicator.toLowerCase())
    );
    baseScore += foundPositiveIndicators.length * 3; // 3 points per positive indicator
    
    // Industry-specific red flags
    const foundRedFlags = industry.red_flags.filter(flag =>
        cvText.toLowerCase().includes(flag.toLowerCase())
    );
    baseScore -= foundRedFlags.length * 5; // -5 points per red flag
    
    // Compliance requirements (for healthcare, finance, legal)
    if (industry.compliance_requirements.length > 0) {
        const foundCompliance = industry.compliance_requirements.filter(req =>
            cvText.toLowerCase().includes(req.toLowerCase())
        );
        
        const compliancePercent = foundCompliance.length / industry.compliance_requirements.length;
        baseScore += compliancePercent * 15; // Up to 15 points for compliance
    }
    
    // Apply industry scoring weights
    const weights = industry.scoring_weights;
    if (weights.skills > 30) baseScore += 5; // Skills-heavy industries get bonus for good skills match
    if (weights.experience > 30) baseScore += 5; // Experience-heavy industries get bonus for good experience
    
    // Ensure score is within reasonable bounds
    return Math.max(10, Math.min(100, Math.round(baseScore)));
}

// Add industry-specific insights to candidate
function addIndustrySpecificInsights(candidate, industry, config) {
    const cvText = candidate.extractedData?.rawText || '';
    const candidateSkills = candidate.extractedData?.skills || [];
    
    // Check for positive indicators
    const foundPositiveIndicators = industry.positive_indicators.filter(indicator =>
        cvText.toLowerCase().includes(indicator.toLowerCase()) ||
        candidateSkills.some(skill => skill.toLowerCase().includes(indicator.toLowerCase()))
    );
    
    foundPositiveIndicators.forEach(indicator => {
        candidate.highlights.push(`✓ ${indicator}`);
    });
    
    // Check for red flags
    const foundRedFlags = industry.red_flags.filter(flag =>
        cvText.toLowerCase().includes(flag.toLowerCase())
    );
    
    foundRedFlags.forEach(flag => {
        candidate.concerns.push(`⚠️ ${flag}`);
    });
    
    // Check compliance requirements
    if (industry.compliance_requirements.length > 0) {
        const foundCompliance = industry.compliance_requirements.filter(req =>
            cvText.toLowerCase().includes(req.toLowerCase())
        );
        
        foundCompliance.forEach(compliance => {
            candidate.highlights.push(`✓ ${compliance} certified`);
        });
        
        const missingCompliance = industry.compliance_requirements.filter(req =>
            !cvText.toLowerCase().includes(req.toLowerCase())
        );
        
        if (missingCompliance.length > 0) {
            candidate.concerns.push(`Missing certifications: ${missingCompliance.slice(0, 2).join(', ')}`);
        }
    }
    
    // Check must-have skills
    const mustHaveSkills = config.mustHave || [];
    const foundMustHave = mustHaveSkills.filter(skill =>
        candidateSkills.some(candSkill => 
            candSkill.toLowerCase().includes(skill.toLowerCase())
        )
    );
    
    const missingMustHave = mustHaveSkills.filter(skill =>
        !candidateSkills.some(candSkill => 
            candSkill.toLowerCase().includes(skill.toLowerCase())
        )
    );
    
    if (foundMustHave.length > 0) {
        candidate.highlights.push(`✓ Has ${foundMustHave.length}/${mustHaveSkills.length} required skills`);
    }
    
    if (missingMustHave.length > 0) {
        candidate.concerns.push(`Missing required skills: ${missingMustHave.slice(0, 2).join(', ')}`);
    }
    
    // Experience level assessment
    const experienceYears = candidate.extractedData?.experienceYears || 0;
    const targetMinExp = config.minExperience || 0;
    const targetMaxExp = config.maxExperience || 10;
    
    if (experienceYears >= targetMinExp && experienceYears <= targetMaxExp) {
        candidate.highlights.push(`✓ Experience level matches (${experienceYears} years)`);
    } else if (experienceYears < targetMinExp) {
        candidate.concerns.push(`Under-experienced (${experienceYears} vs ${targetMinExp}+ years required)`);
    } else if (experienceYears > targetMaxExp + 5) {
        candidate.concerns.push(`May be overqualified (${experienceYears} vs ${targetMaxExp} years target)`);
    }
    
    // Industry-specific insights
    candidate.highlights.push(`Analyzed for ${industry.name} industry`);
    
    return candidate;
}

// =============================================================================
// PHASE 2.5: CANDIDATE POOL SEARCH & SUGGESTIONS
// =============================================================================

// Calculate candidate relevance score for job matching
function calculateCandidateRelevance(candidate, jobRequirements) {
    const weights = {
        skills: 0.35,
        experience: 0.25,
        industry: 0.20,
        seniority: 0.15,
        location: 0.05
    };
    
    const scores = {
        skills: calculateSkillsMatch(candidate.professional_data?.skills || [], jobRequirements.skills || []),
        experience: calculateExperienceMatch(candidate.professional_data?.experience_years || 0, jobRequirements.experience || 0),
        industry: calculateIndustryMatch(candidate.professional_data?.industry_background || [], jobRequirements.industry || ''),
        seniority: calculateSeniorityMatch(candidate.professional_data?.seniority_level || '', jobRequirements.seniority || ''),
        location: calculateLocationMatch(candidate.profile?.location || '', '')
    };
    
    const relevanceScore = Object.keys(weights).reduce((total, factor) => {
        return total + (weights[factor] * scores[factor]);
    }, 0);
    
    return {
        score: Math.round(relevanceScore * 100),
        breakdown: scores,
        explanation: generateScoreExplanation(scores, weights)
    };
}

// Calculate skills match percentage
function calculateSkillsMatch(candidateSkills, jobSkills) {
    if (!candidateSkills || candidateSkills.length === 0 || !jobSkills || jobSkills.length === 0) {
        return 0;
    }
    
    const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase());
    const jobSkillsLower = jobSkills.map(s => s.toLowerCase());
    
    let matchCount = 0;
    jobSkillsLower.forEach(jobSkill => {
        if (candidateSkillsLower.some(candSkill => 
            candSkill.includes(jobSkill) || jobSkill.includes(candSkill)
        )) {
            matchCount++;
        }
    });
    
    return matchCount / jobSkillsLower.length;
}

// Calculate experience match score
function calculateExperienceMatch(candidateYears, requiredYears) {
    if (candidateYears === requiredYears) return 1.0;
    if (candidateYears < requiredYears) {
        // Penalize under-experience
        const deficit = requiredYears - candidateYears;
        return Math.max(0, 1 - (deficit * 0.2));
    } else {
        // Slight penalty for over-experience (might be overqualified)
        const excess = candidateYears - requiredYears;
        return Math.max(0.7, 1 - (excess * 0.05));
    }
}

// Calculate industry match score
function calculateIndustryMatch(candidateIndustries, jobIndustry) {
    if (!candidateIndustries || candidateIndustries.length === 0 || !jobIndustry) {
        return 0.5; // Neutral if no industry info
    }
    
    const jobIndustryLower = jobIndustry.toLowerCase();
    const candidateIndustriesLower = Array.isArray(candidateIndustries) 
        ? candidateIndustries.map(i => i.toLowerCase())
        : [candidateIndustries.toLowerCase()];
    
    // Exact match
    if (candidateIndustriesLower.includes(jobIndustryLower)) {
        return 1.0;
    }
    
    // Partial match (related industries)
    const relatedMatches = candidateIndustriesLower.some(candIndustry => 
        candIndustry.includes(jobIndustryLower) || jobIndustryLower.includes(candIndustry)
    );
    
    return relatedMatches ? 0.7 : 0.3;
}

// Calculate seniority match score
function calculateSeniorityMatch(candidateSeniority, jobSeniority) {
    const seniorityLevels = ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'];
    
    const candidateLevel = seniorityLevels.indexOf(candidateSeniority.toLowerCase());
    const jobLevel = seniorityLevels.indexOf(jobSeniority.toLowerCase());
    
    if (candidateLevel === -1 || jobLevel === -1) return 0.5;
    if (candidateLevel === jobLevel) return 1.0;
    
    const difference = Math.abs(candidateLevel - jobLevel);
    return Math.max(0, 1 - (difference * 0.25));
}

// Calculate location match score (basic implementation)
function calculateLocationMatch(candidateLocation, jobLocation) {
    if (!candidateLocation || !jobLocation) return 0.5;
    
    const candLoc = candidateLocation.toLowerCase();
    const jobLoc = jobLocation.toLowerCase();
    
    if (candLoc.includes('remote') || jobLoc.includes('remote')) return 1.0;
    if (candLoc === jobLoc) return 1.0;
    
    // Simple city/state matching
    return candLoc.includes(jobLoc) || jobLoc.includes(candLoc) ? 0.8 : 0.3;
}

// Generate explanation for relevance score
function generateScoreExplanation(scores, weights) {
    const explanations = [];
    
    Object.entries(scores).forEach(([factor, score]) => {
        const weight = weights[factor];
        const contribution = score * weight * 100;
        let description = '';
        
        switch(factor) {
            case 'skills':
                description = score > 0.8 ? 'Excellent skills match' : 
                             score > 0.6 ? 'Good skills alignment' : 
                             score > 0.3 ? 'Some relevant skills' : 'Limited skills match';
                break;
            case 'experience':
                description = score > 0.9 ? 'Perfect experience level' :
                             score > 0.7 ? 'Good experience match' :
                             score > 0.5 ? 'Adequate experience' : 'Experience gap';
                break;
            case 'industry':
                description = score > 0.8 ? 'Strong industry background' :
                             score > 0.5 ? 'Related industry experience' : 'Different industry';
                break;
            case 'seniority':
                description = score > 0.8 ? 'Appropriate seniority level' :
                             score > 0.5 ? 'Close seniority match' : 'Seniority mismatch';
                break;
            case 'location':
                description = score > 0.8 ? 'Good location match' : 'Location considerations';
                break;
        }
        
        explanations.push(`${description} (${contribution.toFixed(0)}% contribution)`);
    });
    
    return explanations;
}

// Search candidate database for relevant suggestions
function searchCandidateDatabase(jobRequirements, excludeCurrentApplicants = []) {
    if (!candidateDatabase || candidateDatabase.length === 0) {
        return [];
    }
    
    const currentApplicantEmails = excludeCurrentApplicants
        .map(candidate => candidate.extractedData?.contactInfo?.email)
        .filter(email => email);
    
    // Filter out current applicants and calculate relevance
    const relevantCandidates = candidateDatabase
        .filter(candidate => {
            // Exclude current applicants
            if (currentApplicantEmails.includes(candidate.profile?.email)) {
                return false;
            }
            
            // Only include candidates who gave consent
            return candidate.consent?.storage_agreed === true;
        })
        .map(candidate => {
            const relevance = calculateCandidateRelevance(candidate, jobRequirements);
            return {
                ...candidate,
                relevanceScore: relevance.score,
                relevanceBreakdown: relevance.breakdown,
                relevanceExplanation: relevance.explanation
            };
        })
        .filter(candidate => candidate.relevanceScore >= 30) // Minimum relevance threshold
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 8); // Top 8 suggestions
    
    return relevantCandidates;
}

// =============================================================================
// RESULTS DISPLAY WITH FEEDBACK INTEGRATION
// =============================================================================

function displayResults(timeSaved) {
    const timeSavedElement = document.getElementById('timeSaved');
    const minutes = Math.floor(timeSaved);
    const seconds = Math.round((timeSaved - minutes) * 60);
    timeSavedElement.textContent = `Time saved: ${minutes} minutes ${seconds} seconds`;
    
    const candidateList = document.getElementById('candidateList');
    let html = '';
    
    // Phase 2.5 Feature 1: Two-tiered results display
    
    // Section 1: Current Job Applicants (Priority)
    html += `
        <div class="results-section current-applicants">
            <div class="section-header">
                <h3 class="section-title">
                    Current Applicants (${analysisResults.length})
                    <span class="priority-badge">Priority</span>
                </h3>
                <div class="section-description">New applications for this role</div>
            </div>
            <div class="candidate-grid">
    `;
    
    analysisResults.forEach((candidate, index) => {
        const scoreColor = candidate.score >= 90 ? '#059669' : 
                          candidate.score >= 80 ? '#d97706' : '#dc2626';
        
        html += `
            <div class="candidate-card current-applicant" data-type="current" data-index="${index}">
                <div class="candidate-header">
                    <div class="candidate-name">${candidate.name}</div>
                    <div class="candidate-score" style="color: ${scoreColor};">${candidate.score}%</div>
                </div>
                <div class="candidate-details">
                    <div class="detail-item">
                        <span class="detail-label">Experience:</span> ${candidate.experience}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Key Skills:</span> ${candidate.skills}
                    </div>
                </div>
                <div class="highlights">
                    <strong>Highlights:</strong>
                    ${candidate.highlights.map(highlight => 
                        `<div class="highlight-item">✓ ${highlight}</div>`
                    ).join('')}
                </div>
                ${candidate.concerns && candidate.concerns.length > 0 ? `
                    <div style="margin-top: 10px; font-size: 0.9rem; color: #dc2626;">
                        <strong>Areas to explore:</strong> ${candidate.concerns.join(', ')}
                    </div>
                ` : ''}
                
                <div class="candidate-actions" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                    <button onclick="promptSaveCandidate(${index})" 
                            class="action-button save-button">
                        💾 Save to Database
                    </button>
                    <button onclick="showCandidateStatusManager(${index})" 
                            class="action-button status-button">
                        📋 Manage Status
                    </button>
                    <button onclick="connectWithCandidateOnLinkedIn(${index})" 
                            class="action-button linkedin-button">
                        🔗 LinkedIn
                    </button>
                    <span style="font-size: 12px; color: #6b7280;">Build your talent pipeline</span>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    // Section 2: Suggested Candidates from Database
    const suggestedCandidates = searchCandidateDatabase(jobRequirements, analysisResults);
    const maxSuggestions = 8; // Show top 8 suggestions
    const displayedSuggestions = suggestedCandidates.slice(0, maxSuggestions);
    
    if (displayedSuggestions.length > 0) {
        html += `
            <div class="results-section suggested-candidates">
                <div class="section-header">
                    <h3 class="section-title">
                        Suggested from Your Database (${displayedSuggestions.length})
                        ${suggestedCandidates.length > maxSuggestions ? 
                            `<button class="expand-search-button" onclick="showAllSuggestions()">Show More</button>` : 
                            ''
                        }
                    </h3>
                    <div class="section-description">Relevant candidates from previous recruitment processes</div>
                </div>
                <div class="candidate-grid">
        `;
        
        displayedSuggestions.forEach((candidate, index) => {
            const relevanceColor = candidate.relevanceScore >= 80 ? '#059669' : 
                                  candidate.relevanceScore >= 60 ? '#d97706' : '#dc2626';
            
            html += `
                <div class="candidate-card suggested-candidate" data-type="suggested" data-index="${index}">
                    <div class="candidate-header">
                        <div class="candidate-name">${candidate.profile?.name || 'Unknown Name'}</div>
                        <div class="relevance-score" style="color: ${relevanceColor};">
                            ${candidate.relevanceScore}% match
                        </div>
                    </div>
                    <div class="candidate-details">
                        <div class="detail-item">
                            <span class="detail-label">Experience:</span> ${candidate.professional_data?.experience_years || 'N/A'} years
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Current Role:</span> ${candidate.professional_data?.current_role || 'N/A'}
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Key Skills:</span> ${candidate.professional_data?.skills?.slice(0, 3).join(', ') || 'N/A'}
                        </div>
                    </div>
                    
                    <!-- Relevance Explanation -->
                    <div class="relevance-explanation">
                        <strong>Why this candidate:</strong>
                        <div class="explanation-text">${candidate.relevanceExplanation || 'Good skills and experience match'}</div>
                    </div>
                    
                    <!-- Relevance Breakdown -->
                    <div class="relevance-breakdown">
                        <div class="breakdown-item">
                            <span class="breakdown-label">Skills:</span>
                            <span class="breakdown-score">${Math.round((candidate.relevanceBreakdown?.skills || 0) * 100)}%</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">Experience:</span>
                            <span class="breakdown-score">${Math.round((candidate.relevanceBreakdown?.experience || 0) * 100)}%</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">Industry:</span>
                            <span class="breakdown-score">${Math.round((candidate.relevanceBreakdown?.industry || 0) * 100)}%</span>
                        </div>
                    </div>
                    
                    <div class="candidate-actions" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                        <button onclick="addSuggestedCandidateToJob('${candidate.candidate_id}')" 
                                class="action-button add-button">
                            ➕ Add to Current Job
                        </button>
                        <button onclick="viewCandidateProfile('${candidate.candidate_id}')" 
                                class="action-button view-button">
                            👁️ View Profile
                        </button>
                        <button onclick="connectWithDatabaseCandidateOnLinkedIn('${candidate.candidate_id}')" 
                                class="action-button linkedin-button">
                            🔗 LinkedIn
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    } else if (candidateDatabase && candidateDatabase.length > 0) {
        html += `
            <div class="results-section suggested-candidates">
                <div class="section-header">
                    <h3 class="section-title">Suggested from Your Database (0)</h3>
                    <div class="section-description">No relevant matches found in your database for this role</div>
                </div>
                <div class="no-suggestions">
                    <div class="no-suggestions-content">
                        <div class="no-suggestions-icon">🔍</div>
                        <div class="no-suggestions-text">
                            <strong>No relevant candidates found</strong><br>
                            Try adjusting your job requirements or continue screening new applications to build your database.
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    candidateList.innerHTML = html;
    
    // Add CSS for new layout if not already added
    addTwoTieredResultsCSS();
}

function displayResultsWithFeedback(timeSaved) {
    displayResults(timeSaved);
    
    // Add score correction interface to current applicant cards only
    const currentApplicantCards = document.querySelectorAll('.candidate-card.current-applicant');
    currentApplicantCards.forEach((card, index) => {
        if (index < analysisResults.length) {
            addScoreCorrectionInterface(card, analysisResults[index], 'analysis');
        }
    });
}

// =============================================================================
// PHASE 2.5 TWO-TIERED RESULTS SUPPORTING FUNCTIONS
// =============================================================================

function addTwoTieredResultsCSS() {
    // Check if CSS already added
    if (document.getElementById('two-tiered-results-css')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'two-tiered-results-css';
    style.textContent = `
        .results-section {
            margin-bottom: 40px;
        }
        
        .section-header {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .priority-badge {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .expand-search-button {
            background: #667eea;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
            transition: background 0.2s;
        }
        
        .expand-search-button:hover {
            background: #5a67d8;
        }
        
        .section-description {
            color: #6b7280;
            font-size: 0.95rem;
        }
        
        .candidate-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 20px;
        }
        
        .current-applicants .candidate-card {
            border-left: 4px solid #fbbf24;
            background: #fffbeb;
        }
        
        .suggested-candidates .candidate-card {
            border-left: 4px solid #667eea;
            background: #f8faff;
        }
        
        .relevance-score {
            font-weight: 600;
            font-size: 1rem;
        }
        
        .relevance-explanation {
            margin: 15px 0;
            padding: 12px;
            background: rgba(102, 126, 234, 0.1);
            border-radius: 6px;
            font-size: 0.9rem;
        }
        
        .explanation-text {
            margin-top: 5px;
            color: #4b5563;
            font-style: italic;
        }
        
        .relevance-breakdown {
            display: flex;
            gap: 15px;
            margin: 10px 0;
            font-size: 0.85rem;
        }
        
        .breakdown-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }
        
        .breakdown-label {
            color: #6b7280;
            font-weight: 500;
        }
        
        .breakdown-score {
            font-weight: 600;
            color: #1f2937;
            margin-top: 2px;
        }
        
        .candidate-actions {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .action-button {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .save-button {
            background: #10b981;
            color: white;
        }
        
        .save-button:hover {
            background: #059669;
        }
        
        .add-button {
            background: #667eea;
            color: white;
        }
        
        .add-button:hover {
            background: #5a67d8;
        }
        
        .view-button {
            background: #6b7280;
            color: white;
        }
        
        .view-button:hover {
            background: #4b5563;
        }
        
        .status-button {
            background: #8b5cf6;
            color: white;
        }
        
        .status-button:hover {
            background: #7c3aed;
        }
        
        .linkedin-button {
            background: #0077b5;
            color: white;
        }
        
        .linkedin-button:hover {
            background: #005885;
        }
        
        .no-suggestions {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
        }
        
        .no-suggestions-content {
            max-width: 400px;
            margin: 0 auto;
        }
        
        .no-suggestions-icon {
            font-size: 3rem;
            margin-bottom: 15px;
        }
        
        .no-suggestions-text {
            line-height: 1.6;
        }
        
        @media (max-width: 768px) {
            .candidate-grid {
                grid-template-columns: 1fr;
            }
            
            .section-title {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            
            .relevance-breakdown {
                justify-content: space-around;
            }
        }
    `;
    
    document.head.appendChild(style);
}

function showAllSuggestions() {
    const suggestedCandidates = searchCandidateDatabase(jobRequirements, analysisResults);
    
    if (suggestedCandidates.length <= 8) {
        showSuccess('All suggestions are already displayed.');
        return;
    }
    
    // Create modal to show all suggestions
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 90vw;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    let modalHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.5rem;">All Suggested Candidates (${suggestedCandidates.length})</h3>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ✕ Close
            </button>
        </div>
        <div class="candidate-grid">
    `;
    
    suggestedCandidates.forEach((candidate, index) => {
        const relevanceColor = candidate.relevanceScore >= 80 ? '#059669' : 
                              candidate.relevanceScore >= 60 ? '#d97706' : '#dc2626';
        
        modalHtml += `
            <div class="candidate-card suggested-candidate" style="margin-bottom: 20px;">
                <div class="candidate-header">
                    <div class="candidate-name">${candidate.profile?.name || 'Unknown Name'}</div>
                    <div class="relevance-score" style="color: ${relevanceColor};">
                        ${candidate.relevanceScore}% match
                    </div>
                </div>
                <div class="candidate-details">
                    <div class="detail-item">
                        <span class="detail-label">Experience:</span> ${candidate.professional_data?.experience_years || 'N/A'} years
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Current Role:</span> ${candidate.professional_data?.current_role || 'N/A'}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Key Skills:</span> ${candidate.professional_data?.skills?.slice(0, 3).join(', ') || 'N/A'}
                    </div>
                </div>
                
                <div class="relevance-explanation">
                    <strong>Why this candidate:</strong>
                    <div class="explanation-text">${candidate.relevanceExplanation || 'Good skills and experience match'}</div>
                </div>
                
                <div class="candidate-actions" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                    <button onclick="addSuggestedCandidateToJob('${candidate.candidate_id}'); this.closest('.modal-overlay').remove();" 
                            class="action-button add-button">
                        ➕ Add to Current Job
                    </button>
                    <button onclick="viewCandidateProfile('${candidate.candidate_id}')" 
                            class="action-button view-button">
                        👁️ View Profile
                    </button>
                </div>
            </div>
        `;
    });
    
    modalHtml += '</div>';
    modalContent.innerHTML = modalHtml;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function addSuggestedCandidateToJob(candidateId) {
    const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
    if (!candidate) {
        showError('Candidate not found in database.');
        return;
    }
    
    // Create a candidate object in the format expected by analysisResults
    const candidateForJob = {
        name: candidate.profile?.name || 'Unknown Name',
        experience: `${candidate.professional_data?.experience_years || 'N/A'} years`,
        skills: candidate.professional_data?.skills?.join(', ') || 'N/A',
        score: Math.min(95, Math.max(60, candidate.relevanceScore || 70)), // Convert relevance to score
        highlights: [
            `${candidate.professional_data?.experience_years || 0} years of experience`,
            `Currently: ${candidate.professional_data?.current_role || 'Available'}`,
            `Skills: ${candidate.professional_data?.skills?.slice(0, 2).join(', ') || 'Various skills'}`
        ],
        concerns: [],
        extractedData: {
            contactInfo: {
                email: candidate.profile?.email,
                phone: candidate.profile?.phone
            }
        },
        fromDatabase: true,
        originalCandidateId: candidateId
    };
    
    // Add to current analysis results
    analysisResults.push(candidateForJob);
    
    // Update the database candidate status
    candidate.metadata = candidate.metadata || {};
    candidate.metadata.status = 'contacted';
    candidate.metadata.last_contacted = new Date().toISOString();
    
    // Save updated database
    saveCandidateDatabase();
    
    // Refresh the display
    displayResults(0);
    
    showSuccess(`${candidateForJob.name} has been added to the current job screening.`);
}

function viewCandidateProfile(candidateId) {
    const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
    if (!candidate) {
        showError('Candidate not found in database.');
        return;
    }
    
    // Create profile modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    const modalHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.5rem;">${candidate.profile?.name || 'Candidate Profile'}</h3>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ✕ Close
            </button>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 10px; color: #1f2937;">Contact Information</h4>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                <p><strong>Email:</strong> ${candidate.profile?.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${candidate.profile?.phone || 'N/A'}</p>
                <p><strong>Location:</strong> ${candidate.profile?.location || 'N/A'}</p>
                ${candidate.profile?.linkedin ? `<p><strong>LinkedIn:</strong> <a href="${candidate.profile.linkedin}" target="_blank">View Profile</a></p>` : ''}
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 10px; color: #1f2937;">Professional Summary</h4>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                <p><strong>Experience:</strong> ${candidate.professional_data?.experience_years || 'N/A'} years</p>
                <p><strong>Current Role:</strong> ${candidate.professional_data?.current_role || 'N/A'}</p>
                <p><strong>Industry:</strong> ${candidate.professional_data?.industry_background?.join(', ') || 'N/A'}</p>
                <p><strong>Seniority:</strong> ${candidate.professional_data?.seniority_level || 'N/A'}</p>
                <p><strong>Education:</strong> ${candidate.professional_data?.education || 'N/A'}</p>
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 10px; color: #1f2937;">Skills & Certifications</h4>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                <p><strong>Skills:</strong></p>
                <div style="margin-top: 8px;">
                    ${candidate.professional_data?.skills?.map(skill => 
                        `<span style="background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; margin: 2px; display: inline-block; font-size: 0.9rem;">${skill}</span>`
                    ).join('') || 'No skills listed'}
                </div>
                ${candidate.professional_data?.certifications?.length > 0 ? `
                    <p style="margin-top: 15px;"><strong>Certifications:</strong></p>
                    <ul style="margin-top: 5px;">
                        ${candidate.professional_data.certifications.map(cert => `<li>${cert}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        </div>
        
        ${candidate.analysis_history?.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <h4 style="margin-bottom: 10px; color: #1f2937;">Previous Applications</h4>
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                    ${candidate.analysis_history.map(app => `
                        <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 6px;">
                            <strong>${app.job_title}</strong> - Score: ${app.ai_score}%
                            <br><small style="color: #6b7280;">${new Date(app.analysis_date).toLocaleDateString()}</small>
                            ${app.feedback_notes ? `<br><em>"${app.feedback_notes}"</em>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 10px; color: #1f2937;">Status & Metadata</h4>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                <p><strong>Status:</strong> <span style="text-transform: capitalize;">${candidate.metadata?.status || 'available'}</span></p>
                <p><strong>Added to Database:</strong> ${new Date(candidate.metadata?.upload_date || candidate.upload_date).toLocaleDateString()}</p>
                ${candidate.metadata?.last_contacted ? `<p><strong>Last Contacted:</strong> ${new Date(candidate.metadata.last_contacted).toLocaleDateString()}</p>` : ''}
                <p><strong>Consent Status:</strong> ${candidate.consent?.storage_agreed ? '✅ Consented' : '❌ Not consented'}</p>
            </div>
        </div>
    `;
    
    modalContent.innerHTML = modalHtml;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// =============================================================================
// PHASE 2.5 EMAIL AUTOMATION ENGINE
// =============================================================================

// Email automation configuration
const emailConfig = {
    enabled: false, // Will be enabled when user provides SendGrid API key
    apiKey: null,
    fromEmail: null,
    fromName: null,
    autoSendDelay: 5, // minutes
    requireApproval: true
};

// Email templates storage
// Enhanced email templates with branding support
let emailTemplates = {
    first_interview: {
        id: 'first_interview',
        name: 'First Interview Invitation',
        subject: 'Interview Invitation - {{job.title}} at {{company.name}}',
        category: 'interview',
        description: 'Professional invitation for first round interviews',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Interview Invitation</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">{{company.name}}</p>
                </div>
                
                <div style="padding: 0 20px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Hi {{candidate.name}},</h2>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        Thank you for your application for the <strong>{{job.title}}</strong> position at {{company.name}}. 
                        We were impressed with your background and would like to invite you for a first interview.
                    </p>
                    
                    <div style="background: #f8faff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; margin: 25px 0;">
                        <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Interview Details:</h3>
                        <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
                            <li><strong>Duration:</strong> {{interview.duration}} minutes</li>
                            <li><strong>Format:</strong> {{interview.format}}</li>
                            <li><strong>Interviewer:</strong> {{recruiter.name}}, {{recruiter.title}}</li>
                            <li><strong>Next Steps:</strong> Please use the link below to schedule a convenient time</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{interview.schedulingLink}}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                            📅 Schedule Your Interview
                        </a>
                    </div>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        If you have any questions or need to reschedule, please don't hesitate to reach out to me directly.
                    </p>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin-top: 30px;">
                        Looking forward to speaking with you!
                    </p>
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                        <p style="color: #1f2937; margin: 0; font-weight: 600;">{{recruiter.name}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{recruiter.title}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{company.name}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{recruiter.email}} | {{recruiter.phone}}</p>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        This email was sent by {{company.name}} recruitment team. 
                        <a href="{{system.unsubscribeLink}}" style="color: #9ca3af;">Unsubscribe</a>
                    </p>
                </div>
            </div>
        `,
        text: `
Hi {{candidate.name}},

Thank you for your application for the {{job.title}} position at {{company.name}}. We were impressed with your background and would like to invite you for a first interview.

Interview Details:
- Duration: {{interview.duration}} minutes  
- Format: {{interview.format}}
- Interviewer: {{recruiter.name}}, {{recruiter.title}}

Please schedule your interview using this link: {{interview.schedulingLink}}

If you have any questions, please contact me directly.

Best regards,
{{recruiter.name}}
{{recruiter.title}}
{{company.name}}
{{recruiter.email}} | {{recruiter.phone}}
        `,
        variables: ['candidate.name', 'job.title', 'company.name', 'interview.duration', 'interview.format', 'recruiter.name', 'recruiter.title', 'interview.schedulingLink', 'recruiter.email', 'recruiter.phone']
    },
    final_interview: {
        id: 'final_interview',
        name: 'Final Interview Invitation',
        subject: 'Final Interview - {{job.title}} at {{company.name}}',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Final Interview Invitation</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">{{company.name}}</p>
                </div>
                
                <div style="padding: 0 20px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Hi {{candidate.name}},</h2>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        Congratulations! After reviewing your initial interview, we're excited to invite you to the final round 
                        for the <strong>{{job.title}}</strong> position at {{company.name}}.
                    </p>
                    
                    <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 25px; margin: 25px 0;">
                        <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Final Interview Details:</h3>
                        <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
                            <li><strong>Duration:</strong> {{interview.duration}} minutes</li>
                            <li><strong>Format:</strong> {{interview.format}}</li>
                            <li><strong>Participants:</strong> {{interview.participants}}</li>
                            <li><strong>Focus:</strong> Technical deep-dive and culture fit</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{interview.schedulingLink}}" 
                           style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                            📅 Schedule Final Interview
                        </a>
                    </div>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        We're looking forward to this final conversation and learning more about how you can contribute to our team.
                    </p>
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                        <p style="color: #1f2937; margin: 0; font-weight: 600;">{{recruiter.name}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{recruiter.title}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{company.name}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{recruiter.email}}</p>
                    </div>
                </div>
            </div>
        `,
        text: `
Hi {{candidate.name}},

Congratulations! After reviewing your initial interview, we're excited to invite you to the final round for the {{job.title}} position at {{company.name}}.

Final Interview Details:
- Duration: {{interview.duration}} minutes
- Format: {{interview.format}}  
- Participants: {{interview.participants}}
- Focus: Technical deep-dive and culture fit

Please schedule your final interview: {{interview.schedulingLink}}

We're looking forward to this final conversation.

Best regards,
{{recruiter.name}}
{{recruiter.title}}
{{company.name}}
{{recruiter.email}}
        `,
        variables: ['candidate.name', 'job.title', 'company.name', 'interview.duration', 'interview.format', 'interview.participants', 'interview.schedulingLink', 'recruiter.name', 'recruiter.title', 'recruiter.email']
    },
    job_offer: {
        id: 'job_offer',
        name: 'Job Offer',
        subject: 'Job Offer - {{job.title}} at {{company.name}}',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 Job Offer</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">{{company.name}}</p>
                </div>
                
                <div style="padding: 0 20px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Hi {{candidate.name}},</h2>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        We're thrilled to extend an offer for the <strong>{{job.title}}</strong> position at {{company.name}}! 
                        After our interviews, we believe you'll be a fantastic addition to our team.
                    </p>
                    
                    <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 25px; margin: 25px 0;">
                        <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Offer Details:</h3>
                        <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
                            <li><strong>Position:</strong> {{job.title}}</li>
                            <li><strong>Start Date:</strong> {{offer.startDate}}</li>
                            <li><strong>Salary:</strong> {{offer.salary}}</li>
                            <li><strong>Benefits:</strong> {{offer.benefits}}</li>
                        </ul>
                    </div>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        Please review the attached formal offer letter for complete details. We'd love to have your response by {{offer.deadline}}.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{offer.responseLink}}" 
                           style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
                            📝 Respond to Offer
                        </a>
                    </div>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        Congratulations again, and we hope you'll join our team!
                    </p>
                </div>
            </div>
        `,
        text: `
Hi {{candidate.name}},

We're thrilled to extend an offer for the {{job.title}} position at {{company.name}}!

Offer Details:
- Position: {{job.title}}
- Start Date: {{offer.startDate}}
- Salary: {{offer.salary}}  
- Benefits: {{offer.benefits}}

Please respond by {{offer.deadline}}: {{offer.responseLink}}

Congratulations!

{{recruiter.name}}
{{company.name}}
        `,
        variables: ['candidate.name', 'job.title', 'company.name', 'offer.startDate', 'offer.salary', 'offer.benefits', 'offer.deadline', 'offer.responseLink', 'recruiter.name']
    },
    rejection: {
        id: 'rejection',
        name: 'Rejection (Polite)',
        subject: 'Update on your application - {{job.title}} at {{company.name}}',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Application Update</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">{{company.name}}</p>
                </div>
                
                <div style="padding: 0 20px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Hi {{candidate.name}},</h2>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        Thank you for your interest in the <strong>{{job.title}}</strong> position at {{company.name}} 
                        and for taking the time to go through our interview process.
                    </p>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        After careful consideration, we've decided to move forward with another candidate whose 
                        background more closely aligns with our current needs for this specific role.
                    </p>
                    
                    <div style="background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; padding: 25px; margin: 25px 0;">
                        <p style="color: #4b5563; line-height: 1.6; margin: 0; font-style: italic;">
                            "We were impressed with your skills and experience. We'll keep your profile on file 
                            for future opportunities that might be a better fit."
                        </p>
                    </div>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        We appreciate the time you invested in learning about our company and wish you the very 
                        best in your career journey.
                    </p>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        Thank you again for your interest in {{company.name}}.
                    </p>
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                        <p style="color: #1f2937; margin: 0; font-weight: 600;">{{recruiter.name}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{recruiter.title}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{company.name}}</p>
                    </div>
                </div>
            </div>
        `,
        text: `
Hi {{candidate.name}},

Thank you for your interest in the {{job.title}} position at {{company.name}} and for taking the time to go through our interview process.

After careful consideration, we've decided to move forward with another candidate whose background more closely aligns with our current needs for this specific role.

We were impressed with your skills and experience. We'll keep your profile on file for future opportunities that might be a better fit.

Thank you again for your interest in {{company.name}}.

Best regards,
{{recruiter.name}}
{{recruiter.title}}
{{company.name}}
        `,
        variables: ['candidate.name', 'job.title', 'company.name', 'recruiter.name', 'recruiter.title']
    },
    
    // NEW TEMPLATES - Enhanced with branding
    job_offer: {
        id: 'job_offer',
        name: 'Job Offer Letter',
        subject: '🎉 Job Offer - {{job.title}} at {{company.name}}',
        category: 'offer',
        description: 'Professional job offer with terms and conditions',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
                <!-- Company Header with Branding -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: #f8faff; border-radius: 12px;">
                    {{#if company.logo}}
                    <img src="{{company.logo}}" alt="{{company.name}}" style="max-height: 60px; margin-bottom: 15px;">
                    {{/if}}
                    <h1 style="color: #1f2937; margin: 0; font-size: 24px; font-weight: 600;">{{company.name}}</h1>
                    <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">{{company.address}}</p>
                </div>
                
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 Job Offer</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Congratulations!</p>
                </div>
                
                <div style="padding: 0 20px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Dear {{candidate.name}},</h2>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        We are delighted to offer you the position of <strong>{{job.title}}</strong> at {{company.name}}. 
                        After careful consideration, we believe you will be an excellent addition to our team.
                    </p>
                    
                    <!-- Offer Details -->
                    <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 25px; margin: 25px 0;">
                        <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Offer Details:</h3>
                        <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
                            <li><strong>Position:</strong> {{job.title}}</li>
                            <li><strong>Department:</strong> {{job.department}}</li>
                            <li><strong>Start Date:</strong> {{offer.startDate}}</li>
                            <li><strong>Salary:</strong> {{offer.salary}} per year</li>
                            <li><strong>Location:</strong> {{job.location}}</li>
                            <li><strong>Employment Type:</strong> {{offer.employmentType}}</li>
                        </ul>
                    </div>
                    
                    <!-- Benefits -->
                    {{#if offer.benefits}}
                    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 25px; margin: 25px 0;">
                        <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Benefits Package:</h3>
                        <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
                            {{#each offer.benefits}}
                            <li>{{this}}</li>
                            {{/each}}
                        </ul>
                    </div>
                    {{/if}}
                    
                    <!-- Next Steps -->
                    <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 25px; margin: 25px 0;">
                        <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Next Steps:</h3>
                        <p style="color: #4b5563; line-height: 1.6; margin: 0;">
                            Please review this offer carefully. To accept, please click the link below by <strong>{{offer.deadline}}</strong>. 
                            If you have any questions, don't hesitate to reach out.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{offer.responseLink}}" 
                           style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                            📝 Review & Accept Offer
                        </a>
                    </div>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        We're excited about the possibility of you joining our team and look forward to your response.
                    </p>
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                        <p style="color: #1f2937; margin: 0; font-weight: 600;">{{recruiter.name}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{recruiter.title}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{company.name}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{recruiter.email}} | {{recruiter.phone}}</p>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        This offer is confidential and should not be shared. 
                        <a href="{{system.privacyPolicy}}" style="color: #9ca3af;">Privacy Policy</a>
                    </p>
                </div>
            </div>
        `,
        text: `
Dear {{candidate.name}},

We are delighted to offer you the position of {{job.title}} at {{company.name}}.

OFFER DETAILS:
- Position: {{job.title}}
- Department: {{job.department}}
- Start Date: {{offer.startDate}}
- Salary: {{offer.salary}} per year
- Location: {{job.location}}
- Employment Type: {{offer.employmentType}}

Please review this offer and respond by {{offer.deadline}} using this link: {{offer.responseLink}}

If you have any questions, please contact me directly.

Best regards,
{{recruiter.name}}
{{recruiter.title}}
{{company.name}}
{{recruiter.email}} | {{recruiter.phone}}
        `,
        variables: ['candidate.name', 'job.title', 'company.name', 'job.department', 'offer.startDate', 'offer.salary', 'job.location', 'offer.employmentType', 'offer.deadline', 'offer.responseLink', 'recruiter.name', 'recruiter.title', 'recruiter.email', 'recruiter.phone']
    },
    
    rejection_polite: {
        id: 'rejection_polite',
        name: 'Polite Rejection',
        subject: 'Thank you for your application - {{job.title}}',
        category: 'rejection',
        description: 'Professional and respectful rejection email',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Thank You</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">{{company.name}}</p>
                </div>
                
                <div style="padding: 0 20px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Dear {{candidate.name}},</h2>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        Thank you for your interest in the <strong>{{job.title}}</strong> position at {{company.name}} 
                        and for taking the time to share your background with us.
                    </p>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        After careful consideration, we have decided to move forward with other candidates whose 
                        experience more closely aligns with our current needs for this specific role.
                    </p>
                    
                    <div style="background: #f8faff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; margin: 25px 0;">
                        <p style="color: #4b5563; line-height: 1.6; margin: 0;">
                            <strong>Please don't be discouraged.</strong> Your skills and experience are valuable, 
                            and we encourage you to apply for future opportunities that may be a better fit.
                        </p>
                    </div>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        We'll keep your information on file and will reach out if a suitable position becomes available. 
                        Thank you again for considering {{company.name}} as a potential employer.
                    </p>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin-top: 30px;">
                        We wish you all the best in your career search.
                    </p>
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                        <p style="color: #1f2937; margin: 0; font-weight: 600;">{{recruiter.name}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{recruiter.title}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{company.name}}</p>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        <a href="{{system.unsubscribeLink}}" style="color: #9ca3af;">Unsubscribe</a> from future communications
                    </p>
                </div>
            </div>
        `,
        text: `
Dear {{candidate.name}},

Thank you for your interest in the {{job.title}} position at {{company.name}} and for taking the time to share your background with us.

After careful consideration, we have decided to move forward with other candidates whose experience more closely aligns with our current needs for this specific role.

Please don't be discouraged. Your skills and experience are valuable, and we encourage you to apply for future opportunities that may be a better fit.

We'll keep your information on file and will reach out if a suitable position becomes available. Thank you again for considering {{company.name}} as a potential employer.

We wish you all the best in your career search.

Best regards,
{{recruiter.name}}
{{recruiter.title}}
{{company.name}}
        `,
        variables: ['candidate.name', 'job.title', 'company.name', 'recruiter.name', 'recruiter.title']
    },
    
    follow_up: {
        id: 'follow_up',
        name: 'Follow-up Email',
        subject: 'Following up on your application - {{job.title}}',
        category: 'communication',
        description: 'Gentle follow-up for pending applications',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Following Up</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">{{company.name}}</p>
                </div>
                
                <div style="padding: 0 20px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Hi {{candidate.name}},</h2>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        I wanted to follow up on your application for the <strong>{{job.title}}</strong> position at {{company.name}}. 
                        {{#if followUp.reason}}{{followUp.reason}}{{else}}We're currently reviewing applications and wanted to keep you updated on our process.{{/if}}
                    </p>
                    
                    <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 25px; margin: 25px 0;">
                        <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Current Status:</h3>
                        <p style="color: #4b5563; line-height: 1.6; margin: 0;">
                            {{#if followUp.status}}{{followUp.status}}{{else}}Your application is under review and we'll be in touch with next steps soon.{{/if}}
                        </p>
                    </div>
                    
                    {{#if followUp.timeline}}
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        <strong>Expected Timeline:</strong> {{followUp.timeline}}
                    </p>
                    {{/if}}
                    
                    {{#if followUp.nextSteps}}
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        <strong>Next Steps:</strong> {{followUp.nextSteps}}
                    </p>
                    {{/if}}
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
                        If you have any questions or if anything has changed with your availability, 
                        please don't hesitate to reach out.
                    </p>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin-top: 30px;">
                        Thank you for your continued interest in {{company.name}}.
                    </p>
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                        <p style="color: #1f2937; margin: 0; font-weight: 600;">{{recruiter.name}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{recruiter.title}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{company.name}}</p>
                        <p style="color: #6b7280; margin: 5px 0;">{{recruiter.email}} | {{recruiter.phone}}</p>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        <a href="{{system.unsubscribeLink}}" style="color: #9ca3af;">Unsubscribe</a> from updates
                    </p>
                </div>
            </div>
        `,
        text: `
Hi {{candidate.name}},

I wanted to follow up on your application for the {{job.title}} position at {{company.name}}.

Current Status: {{followUp.status}}

{{#if followUp.timeline}}Expected Timeline: {{followUp.timeline}}{{/if}}
{{#if followUp.nextSteps}}Next Steps: {{followUp.nextSteps}}{{/if}}

If you have any questions or if anything has changed with your availability, please don't hesitate to reach out.

Thank you for your continued interest in {{company.name}}.

Best regards,
{{recruiter.name}}
{{recruiter.title}}
{{company.name}}
{{recruiter.email}} | {{recruiter.phone}}
        `,
        variables: ['candidate.name', 'job.title', 'company.name', 'followUp.reason', 'followUp.status', 'followUp.timeline', 'followUp.nextSteps', 'recruiter.name', 'recruiter.title', 'recruiter.email', 'recruiter.phone']
    }
};

// Company branding configuration
let companyBranding = {
    logo: null,
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    address: '',
    website: '',
    socialMedia: {
        linkedin: '',
        twitter: '',
        facebook: ''
    }
};

// Load company branding from localStorage
function loadCompanyBranding() {
    const savedBranding = localStorage.getItem('companyBranding');
    if (savedBranding) {
        companyBranding = { ...companyBranding, ...JSON.parse(savedBranding) };
    }
}

// Save company branding to localStorage
function saveCompanyBranding() {
    localStorage.setItem('companyBranding', JSON.stringify(companyBranding));
}

// Email template management and preview functions
function showEmailTemplateManager() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 800px;
        width: 95%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    const templateCategories = {
        interview: { name: 'Interview', icon: '👥', color: '#667eea' },
        offer: { name: 'Job Offers', icon: '🎉', color: '#10b981' },
        rejection: { name: 'Rejections', icon: '💌', color: '#6b7280' },
        communication: { name: 'Communication', icon: '📞', color: '#3b82f6' }
    };
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
            <h3 style="margin: 0; font-size: 1.5rem;">📧 Email Template Manager</h3>
            <div style="display: flex; gap: 10px;">
                <button onclick="showCompanyBrandingSetup()" 
                        style="background: #f59e0b; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 14px;">
                    🎨 Branding
                </button>
                <button onclick="this.closest('.modal-overlay').remove()" 
                        style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                    ✕ Close
                </button>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 25px;">
            ${Object.entries(templateCategories).map(([key, category]) => `
                <div onclick="showTemplateCategory('${key}')" 
                     style="background: ${category.color}20; border: 2px solid ${category.color}40; border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s;">
                    <div style="font-size: 24px; margin-bottom: 10px;">${category.icon}</div>
                    <div style="font-weight: 600; color: #1f2937;">${category.name}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                        ${Object.values(emailTemplates).filter(t => t.category === key).length} templates
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div id="templateList" style="margin-top: 20px;">
            <h4 style="color: #1f2937; margin-bottom: 15px;">All Templates</h4>
            <div style="display: grid; gap: 15px;">
                ${Object.values(emailTemplates).map(template => `
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                            <h5 style="margin: 0 0 5px 0; color: #1f2937;">${template.name}</h5>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">${template.description}</p>
                            <div style="margin-top: 8px;">
                                <span style="background: ${templateCategories[template.category]?.color || '#6b7280'}20; color: ${templateCategories[template.category]?.color || '#6b7280'}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
                                    ${templateCategories[template.category]?.name || template.category}
                                </span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; margin-left: 20px;">
                            <button onclick="previewEmailTemplate('${template.id}')" 
                                    style="background: #3b82f6; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 14px;">
                                👁️ Preview
                            </button>
                            <button onclick="editEmailTemplate('${template.id}')" 
                                    style="background: #f59e0b; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 14px;">
                                ✏️ Edit
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Preview email template with sample data
function previewEmailTemplate(templateId) {
    const template = emailTemplates[templateId];
    if (!template) {
        showError('Template not found');
        return;
    }
    
    // Sample data for preview
    const sampleData = {
        candidate: {
            name: 'Sarah Johnson',
            email: 'sarah.johnson@email.com'
        },
        job: {
            title: 'Senior Marketing Manager',
            department: 'Marketing',
            location: 'San Francisco, CA'
        },
        company: {
            name: emailConfig.fromName?.split('-')[0]?.trim() || 'TechCorp Inc.',
            address: companyBranding.address || '123 Innovation Drive, San Francisco, CA 94107',
            logo: companyBranding.logo,
            website: companyBranding.website || 'https://company.com'
        },
        recruiter: {
            name: emailConfig.fromName || 'Alex Thompson',
            title: 'Senior Recruiter',
            email: emailConfig.fromEmail || 'alex@company.com',
            phone: '+1 (555) 123-4567'
        },
        interview: {
            duration: '45',
            format: 'Video call via Zoom',
            schedulingLink: 'https://calendly.com/alex-recruiter/interview'
        },
        offer: {
            startDate: 'January 15, 2025',
            salary: '$95,000',
            employmentType: 'Full-time',
            deadline: 'December 20, 2024',
            responseLink: 'https://company.com/offer-response/12345',
            benefits: ['Health Insurance', 'Dental & Vision', '401k with 4% match', '20 days PTO', 'Remote work options']
        },
        followUp: {
            reason: 'We wanted to provide you with an update on your application status.',
            status: 'Your application is progressing well and we are scheduling second round interviews.',
            timeline: 'We expect to complete the interview process by next Friday.',
            nextSteps: 'You should hear back from us with interview details by Wednesday.'
        },
        system: {
            unsubscribeLink: 'https://company.com/unsubscribe/12345',
            privacyPolicy: 'https://company.com/privacy'
        }
    };
    
    // Render template with sample data
    const emailService = new EmailAutomationService();
    const renderedContent = emailService.renderTemplate(template, sampleData);
    
    // Show preview modal
    const previewModal = document.createElement('div');
    previewModal.className = 'modal-overlay';
    previewModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1001;
    `;
    
    const previewContent = document.createElement('div');
    previewContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 900px;
        width: 95%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    previewContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.5rem;">👁️ Email Preview: ${template.name}</h3>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ✕ Close
            </button>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background: #f8faff; border-radius: 8px; border: 1px solid #e5e7eb;">
            <strong>Subject:</strong> ${renderedContent.subject}
        </div>
        
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; background: #ffffff;">
            ${renderedContent.html}
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
            <button onclick="sendTestEmail('${templateId}')" 
                    style="background: #10b981; color: white; border: none; border-radius: 6px; padding: 12px 20px; cursor: pointer; font-weight: 600; margin-right: 10px;">
                📤 Send Test Email
            </button>
            <button onclick="editEmailTemplate('${templateId}')" 
                    style="background: #f59e0b; color: white; border: none; border-radius: 6px; padding: 12px 20px; cursor: pointer; font-weight: 600;">
                ✏️ Edit Template
            </button>
        </div>
    `;
    
    previewModal.appendChild(previewContent);
    document.body.appendChild(previewModal);
    
    // Close modal when clicking outside
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            previewModal.remove();
        }
    });
}

// Send test email using template
function sendTestEmail(templateId) {
    if (!emailConfig.enabled) {
        showError('Please configure email settings first.');
        return;
    }
    
    const template = emailTemplates[templateId];
    if (!template) {
        showError('Template not found');
        return;
    }
    
    // Use the same sample data as preview
    const testData = {
        candidate: {
            name: 'Test User',
            email: emailConfig.fromEmail // Send to self for testing
        },
        job: {
            title: 'Test Position',
            department: 'Testing'
        },
        company: {
            name: emailConfig.fromName?.split('-')[0]?.trim() || 'Test Company'
        },
        recruiter: {
            name: emailConfig.fromName,
            title: 'Recruiter',
            email: emailConfig.fromEmail,
            phone: '+1 (555) 123-4567'
        },
        interview: {
            duration: '30',
            format: 'Test call',
            schedulingLink: 'https://calendly.com/test'
        },
        offer: {
            startDate: 'Test Date',
            salary: '$50,000',
            employmentType: 'Test',
            deadline: 'Test Deadline',
            responseLink: 'https://test.com'
        },
        system: {
            unsubscribeLink: 'https://test.com/unsubscribe'
        }
    };
    
    // Queue test email
    const emailService = new EmailAutomationService();
    const emailJobId = emailService.queueEmail('test_user', templateId, testData, 0);
    
    if (emailJobId) {
        showSuccess(`Test email queued successfully! Check ${emailConfig.fromEmail} for the test message.`);
    } else {
        showError('Failed to queue test email.');
    }
}

// Show company branding setup
function showCompanyBrandingSetup() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1001;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 600px;
        width: 95%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
            <h3 style="margin: 0; font-size: 1.5rem;">🎨 Company Branding</h3>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ✕ Close
            </button>
        </div>
        
        <form id="brandingForm">
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Company Logo URL:</label>
                <input type="url" id="logoUrl" value="${companyBranding.logo || ''}" placeholder="https://company.com/logo.png" 
                       style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                <small style="color: #6b7280;">Will be displayed in email headers</small>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Company Address:</label>
                <textarea id="companyAddress" placeholder="123 Business St, City, State 12345" 
                          style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; height: 60px; resize: vertical;">${companyBranding.address || ''}</textarea>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Website:</label>
                <input type="url" id="website" value="${companyBranding.website || ''}" placeholder="https://company.com" 
                       style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Primary Color:</label>
                    <input type="color" id="primaryColor" value="${companyBranding.primaryColor}" 
                           style="width: 100%; height: 40px; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Secondary Color:</label>
                    <input type="color" id="secondaryColor" value="${companyBranding.secondaryColor}" 
                           style="width: 100%; height: 40px; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer;">
                </div>
            </div>
            
            <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0; color: #065f46; font-weight: 500;">📧 Email Branding</p>
                <p style="margin: 5px 0 0 0; color: #065f46; font-size: 14px;">Your logo and colors will be automatically applied to all email templates.</p>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button type="submit" 
                        style="flex: 1; background: #10b981; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; cursor: pointer;">
                    💾 Save Branding
                </button>
                <button type="button" onclick="previewBranding()" 
                        style="background: #3b82f6; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; cursor: pointer;">
                    👁️ Preview
                </button>
            </div>
        </form>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Handle form submission
    document.getElementById('brandingForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        companyBranding.logo = document.getElementById('logoUrl').value;
        companyBranding.address = document.getElementById('companyAddress').value;
        companyBranding.website = document.getElementById('website').value;
        companyBranding.primaryColor = document.getElementById('primaryColor').value;
        companyBranding.secondaryColor = document.getElementById('secondaryColor').value;
        
        saveCompanyBranding();
        showSuccess('Company branding saved successfully!');
        modal.remove();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Initialize branding on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCompanyBranding();
});

// Candidate workflow statuses with email automation
const candidateWorkflow = {
    statuses: [
        { id: 'applied', name: 'Applied', color: '#6b7280', automated: false },
        { id: 'screened', name: 'CV Screened', color: '#3b82f6', automated: false },
        { id: 'invite_first', name: 'Invite to First Interview', color: '#f59e0b', automated: true, emailTemplate: 'first_interview' },
        { id: 'first_scheduled', name: 'First Interview Scheduled', color: '#8b5cf6', automated: false },
        { id: 'first_completed', name: 'First Interview Completed', color: '#eab308', automated: false },
        { id: 'invite_second', name: 'Invite to Final Interview', color: '#10b981', automated: true, emailTemplate: 'final_interview' },
        { id: 'final_scheduled', name: 'Final Interview Scheduled', color: '#06b6d4', automated: false },
        { id: 'offered', name: 'Offer Extended', color: '#f59e0b', automated: true, emailTemplate: 'job_offer' },
        { id: 'hired', name: 'Hired', color: '#10b981', automated: false },
        { id: 'rejected', name: 'Not Selected', color: '#ef4444', automated: true, emailTemplate: 'rejection' }
    ],
    automationRules: {
        'invite_first': {
            triggerDelay: 5, // minutes
            emailTemplate: 'first_interview',
            requireApproval: false
        },
        'invite_second': {
            triggerDelay: 30, // minutes
            emailTemplate: 'final_interview',
            requireApproval: true
        },
        'offered': {
            triggerDelay: 60, // minutes
            emailTemplate: 'job_offer',
            requireApproval: true
        },
        'rejected': {
            triggerDelay: 10, // minutes
            emailTemplate: 'rejection',
            requireApproval: false
        }
    }
};

// Email automation service class
class EmailAutomationService {
    constructor() {
        this.pendingEmails = JSON.parse(localStorage.getItem('pendingEmails') || '[]');
        this.emailLogs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
        this.processingInterval = null;
    }

    // Initialize email service
    initialize(apiKey, fromEmail, fromName) {
        emailConfig.apiKey = apiKey;
        emailConfig.fromEmail = fromEmail;
        emailConfig.fromName = fromName;
        emailConfig.enabled = true;
        
        // Save config to localStorage
        localStorage.setItem('emailConfig', JSON.stringify(emailConfig));
        
        // Start processing pending emails
        this.startProcessing();
        
        return true;
    }

    // Start processing pending emails
    startProcessing() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }
        
        // Check for pending emails every minute
        this.processingInterval = setInterval(() => {
            this.processPendingEmails();
        }, 60000);
    }

    // Add email to sending queue
    queueEmail(candidateId, templateId, data, triggerDelayMinutes = 0) {
        const emailJob = {
            id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            candidateId,
            templateId,
            data,
            scheduledTime: new Date(Date.now() + (triggerDelayMinutes * 60 * 1000)),
            status: 'pending',
            requiresApproval: candidateWorkflow.automationRules[data.status]?.requireApproval || false,
            approved: false,
            createdAt: new Date(),
            attempts: 0
        };
        
        this.pendingEmails.push(emailJob);
        this.savePendingEmails();
        
        return emailJob.id;
    }

    // Process pending emails
    async processPendingEmails() {
        const now = new Date();
        const readyEmails = this.pendingEmails.filter(email => 
            email.status === 'pending' && 
            new Date(email.scheduledTime) <= now &&
            (!email.requiresApproval || email.approved)
        );

        for (const email of readyEmails) {
            try {
                await this.sendEmail(email);
                email.status = 'sent';
                email.sentAt = new Date();
                this.logEmail(email, 'sent', 'Email sent successfully');
            } catch (error) {
                email.attempts += 1;
                email.lastError = error.message;
                
                if (email.attempts >= 3) {
                    email.status = 'failed';
                    this.logEmail(email, 'failed', error.message);
                } else {
                    // Retry in 15 minutes
                    email.scheduledTime = new Date(Date.now() + (15 * 60 * 1000));
                }
            }
        }
        
        // Clean up old completed emails (keep for 7 days)
        const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
        this.pendingEmails = this.pendingEmails.filter(email => 
            email.status === 'pending' || new Date(email.createdAt) > weekAgo
        );
        
        this.savePendingEmails();
    }

    // Send email (mock implementation for demo - would use SendGrid in production)
    async sendEmail(emailJob) {
        if (!emailConfig.enabled) {
            throw new Error('Email service not configured');
        }

        const template = emailTemplates[emailJob.templateId];
        if (!template) {
            throw new Error(`Template ${emailJob.templateId} not found`);
        }

        // Render email content
        const renderedContent = this.renderTemplate(template, emailJob.data);
        
        // In a real implementation, this would call SendGrid API
        // For demo purposes, we'll simulate the email sending
        console.log('📧 Sending email:', {
            to: emailJob.data.candidate.email,
            from: emailConfig.fromEmail,
            subject: renderedContent.subject,
            html: renderedContent.html
        });
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate 95% success rate
        if (Math.random() > 0.95) {
            throw new Error('Simulated email delivery failure');
        }
        
        return {
            messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'sent'
        };
    }

    // Render email template with data
    renderTemplate(template, data) {
        let subject = template.subject;
        let html = template.html;
        let text = template.text;
        
        // Simple template variable replacement
        const replaceVariables = (content, data) => {
            return content.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
                const value = this.getNestedValue(data, path.trim());
                return value !== undefined ? value : match;
            });
        };
        
        return {
            subject: replaceVariables(subject, data),
            html: replaceVariables(html, data),
            text: replaceVariables(text, data)
        };
    }

    // Get nested object value by path
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    // Log email activity
    logEmail(emailJob, status, message) {
        const log = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            emailJobId: emailJob.id,
            candidateId: emailJob.candidateId,
            templateId: emailJob.templateId,
            recipientEmail: emailJob.data.candidate.email,
            status,
            message,
            timestamp: new Date(),
            attempts: emailJob.attempts
        };
        
        this.emailLogs.push(log);
        
        // Keep only last 1000 logs
        if (this.emailLogs.length > 1000) {
            this.emailLogs = this.emailLogs.slice(-1000);
        }
        
        localStorage.setItem('emailLogs', JSON.stringify(this.emailLogs));
    }

    // Save pending emails to localStorage
    savePendingEmails() {
        localStorage.setItem('pendingEmails', JSON.stringify(this.pendingEmails));
    }

    // Get email status for candidate
    getCandidateEmailStatus(candidateId) {
        const candidateEmails = this.pendingEmails.filter(email => email.candidateId === candidateId);
        const candidateLogs = this.emailLogs.filter(log => log.candidateId === candidateId);
        
        return {
            pending: candidateEmails.filter(e => e.status === 'pending').length,
            sent: candidateEmails.filter(e => e.status === 'sent').length,
            failed: candidateEmails.filter(e => e.status === 'failed').length,
            logs: candidateLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        };
    }

    // Approve pending email
    approveEmail(emailJobId) {
        const email = this.pendingEmails.find(e => e.id === emailJobId);
        if (email) {
            email.approved = true;
            this.savePendingEmails();
            return true;
        }
        return false;
    }

    // Cancel pending email
    cancelEmail(emailJobId) {
        const emailIndex = this.pendingEmails.findIndex(e => e.id === emailJobId);
        if (emailIndex >= 0) {
            this.pendingEmails[emailIndex].status = 'cancelled';
            this.savePendingEmails();
            return true;
        }
        return false;
    }
}

// Initialize email service
const emailService = new EmailAutomationService();

// Load saved email config
const savedEmailConfig = localStorage.getItem('emailConfig');
if (savedEmailConfig) {
    const config = JSON.parse(savedEmailConfig);
    if (config.enabled && config.apiKey) {
        emailService.initialize(config.apiKey, config.fromEmail, config.fromName);
    }
}

// =============================================================================
// EMAIL AUTOMATION UI FUNCTIONS
// =============================================================================

function showEmailSetupModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.5rem;">📧 Email Automation Setup</h3>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ✕ Close
            </button>
        </div>
        
        <div style="margin-bottom: 20px;">
            <p style="color: #6b7280; margin-bottom: 15px;">Configure email automation to send interview invitations, job offers, and candidate communications automatically.</p>
            
            <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0; color: #065f46; font-weight: 500;">✅ Features:</p>
                <ul style="margin: 10px 0 0 20px; color: #065f46;">
                    <li>Automated interview invitations</li>
                    <li>Job offer and rejection emails</li>
                    <li>Professional email templates</li>
                    <li>Delivery tracking and analytics</li>
                </ul>
            </div>
        </div>
        
        <form id="emailSetupForm" style="margin-bottom: 20px;">
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">SendGrid API Key:</label>
                <input type="password" id="sendgridApiKey" placeholder="SG...." 
                       style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                <small style="color: #6b7280;">Get your API key from SendGrid dashboard</small>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">From Email:</label>
                <input type="email" id="fromEmail" placeholder="recruiting@yourcompany.com" 
                       style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                <small style="color: #6b7280;">Must be verified in SendGrid</small>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">From Name:</label>
                <input type="text" id="fromName" placeholder="John Smith - Recruitment" 
                       style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="requireApproval" ${emailConfig.requireApproval ? 'checked' : ''}>
                    <span>Require approval for important emails (offers, rejections)</span>
                </label>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button type="submit" 
                        style="flex: 1; background: #10b981; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; cursor: pointer;">
                    💾 Save Configuration
                </button>
                <button type="button" onclick="testEmailConfiguration()" 
                        style="background: #3b82f6; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; cursor: pointer;">
                    🧪 Test
                </button>
            </div>
        </form>
        
        <div style="margin-top: 20px; text-align: center;">
            <button onclick="showEmailTemplateManager()" 
                    style="background: #f59e0b; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; cursor: pointer;">
                📧 Manage Email Templates
            </button>
        </div>
        
        ${emailConfig.enabled ? `
            <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 15px;">
                <p style="margin: 0; color: #065f46; font-weight: 500;">✅ Email automation is currently enabled</p>
                <p style="margin: 5px 0 0 0; color: #065f46; font-size: 14px;">From: ${emailConfig.fromEmail}</p>
                <button onclick="disableEmailAutomation()" 
                        style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; margin-top: 10px;">
                    Disable Automation
                </button>
            </div>
        ` : ''}
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Handle form submission
    document.getElementById('emailSetupForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const apiKey = document.getElementById('sendgridApiKey').value;
        const fromEmail = document.getElementById('fromEmail').value;
        const fromName = document.getElementById('fromName').value;
        const requireApproval = document.getElementById('requireApproval').checked;
        
        if (!apiKey || !fromEmail || !fromName) {
            showError('Please fill in all required fields.');
            return;
        }
        
        // Update configuration
        emailConfig.requireApproval = requireApproval;
        
        // Initialize email service
        emailService.initialize(apiKey, fromEmail, fromName);
        
        showSuccess('Email automation configured successfully!');
        modal.remove();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function testEmailConfiguration() {
    if (!emailConfig.enabled) {
        showError('Please save the configuration first.');
        return;
    }
    
    // Create test email data
    const testData = {
        candidate: {
            name: 'Test Candidate',
            email: emailConfig.fromEmail // Send to self for testing
        },
        job: {
            title: 'Test Position'
        },
        company: {
            name: 'Test Company'
        },
        recruiter: {
            name: emailConfig.fromName,
            title: 'Recruiter',
            email: emailConfig.fromEmail,
            phone: '+1 (555) 123-4567'
        },
        interview: {
            duration: '45',
            format: 'Video call',
            schedulingLink: 'https://calendly.com/test'
        },
        status: 'invite_first'
    };
    
    // Queue test email
    const emailJobId = emailService.queueEmail('test_candidate', 'first_interview', testData, 0);
    
    if (emailJobId) {
        showSuccess('Test email queued successfully! Check your email in a few moments.');
    } else {
        showError('Failed to queue test email.');
    }
}

function disableEmailAutomation() {
    emailConfig.enabled = false;
    emailConfig.apiKey = null;
    emailConfig.fromEmail = null;
    emailConfig.fromName = null;
    
    localStorage.removeItem('emailConfig');
    
    showSuccess('Email automation disabled.');
    
    // Close any open modals
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => modal.remove());
}

function showCandidateStatusManager(candidateIndex) {
    const candidate = analysisResults[candidateIndex];
    if (!candidate) {
        showError('Candidate not found.');
        return;
    }
    
    // Get current status (default to 'screened' if not set)
    const currentStatus = candidate.status || 'screened';
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    // Generate status options HTML
    const statusOptionsHTML = candidateWorkflow.statuses.map(status => {
        const isSelected = status.id === currentStatus;
        const automation = candidateWorkflow.automationRules[status.id];
        
        return `
            <div class="status-option ${isSelected ? 'selected' : ''}" 
                 onclick="selectCandidateStatus('${status.id}', this)"
                 style="
                     border: 2px solid ${isSelected ? status.color : '#e5e7eb'};
                     background: ${isSelected ? status.color + '20' : '#ffffff'};
                     border-radius: 8px;
                     padding: 15px;
                     margin: 10px 0;
                     cursor: pointer;
                     transition: all 0.2s;
                 ">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <div style="font-weight: 600; color: #1f2937;">${status.name}</div>
                        ${status.automated ? `
                            <div style="font-size: 12px; color: ${status.color}; margin-top: 5px;">
                                📧 Auto-sends: ${emailTemplates[automation?.emailTemplate]?.name || 'Email'}
                                ${automation?.requireApproval ? ' (requires approval)' : ' (immediate)'}
                            </div>
                        ` : ''}
                    </div>
                    <div style="
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: ${status.color};
                    "></div>
                </div>
            </div>
        `;
    }).join('');
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.5rem;">📋 Manage Candidate Status</h3>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ✕ Close
            </button>
        </div>
        
        <div style="margin-bottom: 20px;">
            <div style="background: #f9fafb; border-radius: 8px; padding: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #1f2937;">Candidate: ${candidate.name}</h4>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Current Status: <span style="font-weight: 600; color: ${candidateWorkflow.statuses.find(s => s.id === currentStatus)?.color || '#6b7280'}">${candidateWorkflow.statuses.find(s => s.id === currentStatus)?.name || 'Unknown'}</span></p>
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 15px; color: #1f2937;">Select New Status:</h4>
            <div id="statusOptions">
                ${statusOptionsHTML}
            </div>
        </div>
        
        ${!emailConfig.enabled ? `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0; color: #92400e; font-weight: 500;">⚠️ Email automation not configured</p>
                <p style="margin: 5px 0 0 0; color: #92400e; font-size: 14px;">
                    Some status changes include automated emails. 
                    <a href="#" onclick="showEmailSetupModal()" style="color: #92400e; text-decoration: underline;">Configure email automation</a>
                </p>
            </div>
        ` : ''}
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Notes (optional):</label>
            <textarea id="statusNotes" placeholder="Add any notes about this status change..." 
                      style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; min-height: 80px; resize: vertical;"></textarea>
        </div>
        
        <div style="display: flex; gap: 10px;">
            <button onclick="updateCandidateStatus(${candidateIndex})" 
                    style="flex: 1; background: #10b981; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; cursor: pointer;">
                🚀 Update Status
            </button>
            <button onclick="viewEmailHistory(${candidateIndex})" 
                    style="background: #3b82f6; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; cursor: pointer;">
                📧 Email History
            </button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Store selected status
    window.selectedCandidateStatus = currentStatus;
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function selectCandidateStatus(statusId, element) {
    // Update visual selection
    const statusOptions = document.querySelectorAll('.status-option');
    statusOptions.forEach(option => {
        option.classList.remove('selected');
        option.style.border = '2px solid #e5e7eb';
        option.style.background = '#ffffff';
    });
    
    element.classList.add('selected');
    const status = candidateWorkflow.statuses.find(s => s.id === statusId);
    element.style.border = `2px solid ${status.color}`;
    element.style.background = `${status.color}20`;
    
    // Store selected status
    window.selectedCandidateStatus = statusId;
}

function updateCandidateStatus(candidateIndex) {
    const candidate = analysisResults[candidateIndex];
    const newStatus = window.selectedCandidateStatus;
    const notes = document.getElementById('statusNotes').value;
    
    if (!newStatus) {
        showError('Please select a status.');
        return;
    }
    
    if (newStatus === candidate.status) {
        showError('Candidate is already in this status.');
        return;
    }
    
    // Update candidate status
    const oldStatus = candidate.status;
    candidate.status = newStatus;
    candidate.statusHistory = candidate.statusHistory || [];
    candidate.statusHistory.push({
        status: newStatus,
        timestamp: new Date().toISOString(),
        notes: notes || null
    });
    
    // Track analytics for status change
    trackStatusChange(`candidate_${candidateIndex}`, oldStatus, newStatus, {
        notes: notes,
        timestamp: new Date().toISOString(),
        candidateName: candidate.name,
        source: 'analysis-results'
    });
    
    // Check if this status change should trigger an email
    const statusConfig = candidateWorkflow.statuses.find(s => s.id === newStatus);
    if (statusConfig && statusConfig.automated && emailConfig.enabled) {
        // Prepare email data
        const emailData = {
            candidate: {
                name: candidate.name,
                email: candidate.extractedData?.contactInfo?.email || 'candidate@example.com'
            },
            job: {
                title: jobRequirements.title || 'Position'
            },
            company: {
                name: emailConfig.fromName?.split('-')[0]?.trim() || 'Our Company'
            },
            recruiter: {
                name: emailConfig.fromName || 'Recruiter',
                title: 'Recruitment Specialist',
                email: emailConfig.fromEmail,
                phone: '+1 (555) 123-4567'
            },
            interview: {
                duration: '45',
                format: 'Video call',
                schedulingLink: 'https://calendly.com/interview',
                participants: 'Hiring Manager and Team Lead'
            },
            offer: {
                startDate: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)).toLocaleDateString(),
                salary: '$75,000 - $95,000',
                benefits: 'Health insurance, 401k, flexible PTO',
                deadline: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toLocaleDateString(),
                responseLink: 'https://company.com/offer-response'
            },
            status: newStatus
        };
        
        // Queue the email
        const automation = candidateWorkflow.automationRules[newStatus];
        const emailJobId = emailService.queueEmail(
            `candidate_${candidateIndex}`,
            statusConfig.emailTemplate,
            emailData,
            automation.triggerDelay
        );
        
        if (emailJobId) {
            if (automation.requireApproval) {
                showSuccess(`Status updated! Email queued and awaiting approval. Check the email queue to approve.`);
            } else {
                showSuccess(`Status updated! Automated email will be sent in ${automation.triggerDelay} minutes.`);
            }
        }
    } else {
        showSuccess('Status updated successfully!');
    }
    
    // Update the display
    displayResults(0);
    
    // Close modal
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
}

function viewEmailHistory(candidateIndex) {
    const candidate = analysisResults[candidateIndex];
    const candidateId = `candidate_${candidateIndex}`;
    const emailStatus = emailService.getCandidateEmailStatus(candidateId);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 700px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    // Generate email logs HTML
    const emailLogsHTML = emailStatus.logs.length > 0 ? 
        emailStatus.logs.map(log => `
            <div style="border-left: 4px solid ${log.status === 'sent' ? '#10b981' : log.status === 'failed' ? '#ef4444' : '#f59e0b'}; padding-left: 15px; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
                    <strong>${emailTemplates[log.templateId]?.name || log.templateId}</strong>
                    <span style="font-size: 12px; color: #6b7280;">${new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">
                    To: ${log.recipientEmail}
                </div>
                <div style="font-size: 14px;">
                    Status: <span style="font-weight: 600; color: ${log.status === 'sent' ? '#10b981' : log.status === 'failed' ? '#ef4444' : '#f59e0b'}">${log.status}</span>
                    ${log.attempts > 1 ? ` (${log.attempts} attempts)` : ''}
                </div>
                ${log.message ? `<div style="font-size: 12px; color: #6b7280; margin-top: 5px;">${log.message}</div>` : ''}
            </div>
        `).join('') : 
        '<p style="text-align: center; color: #6b7280; padding: 20px;">No email history found for this candidate.</p>';
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.5rem;">📧 Email History</h3>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ✕ Close
            </button>
        </div>
        
        <div style="margin-bottom: 20px;">
            <div style="background: #f9fafb; border-radius: 8px; padding: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #1f2937;">Candidate: ${candidate.name}</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-top: 15px;">
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #f59e0b;">${emailStatus.pending}</div>
                        <div style="font-size: 12px; color: #6b7280;">Pending</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #10b981;">${emailStatus.sent}</div>
                        <div style="font-size: 12px; color: #6b7280;">Sent</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #ef4444;">${emailStatus.failed}</div>
                        <div style="font-size: 12px; color: #6b7280;">Failed</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div>
            <h4 style="margin-bottom: 15px; color: #1f2937;">Email Activity:</h4>
            <div style="max-height: 400px; overflow-y: auto;">
                ${emailLogsHTML}
            </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
            <button onclick="showPendingEmailsManager()" 
                    style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; cursor: pointer;">
                📬 Manage All Pending Emails
            </button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function showPendingEmailsManager() {
    const pendingEmails = emailService.pendingEmails.filter(email => email.status === 'pending');
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 800px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    const pendingEmailsHTML = pendingEmails.length > 0 ?
        pendingEmails.map(email => {
            const template = emailTemplates[email.templateId];
            const scheduledTime = new Date(email.scheduledTime);
            const isReady = scheduledTime <= new Date();
            
            return `
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                        <div>
                            <strong>${template?.name || email.templateId}</strong>
                            ${email.requiresApproval ? '<span style="background: #fbbf24; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 8px;">NEEDS APPROVAL</span>' : ''}
                        </div>
                        <span style="font-size: 12px; color: #6b7280;">
                            ${isReady ? 'Ready to send' : `Scheduled: ${scheduledTime.toLocaleString()}`}
                        </span>
                    </div>
                    <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
                        To: ${email.data.candidate.email} • Subject: ${emailService.renderTemplate(template, email.data).subject}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        ${email.requiresApproval && !email.approved ? `
                            <button onclick="approveEmail('${email.id}')" 
                                    style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                ✅ Approve
                            </button>
                        ` : ''}
                        <button onclick="previewEmail('${email.id}')" 
                                style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            👁️ Preview
                        </button>
                        <button onclick="cancelEmail('${email.id}')" 
                                style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            ❌ Cancel
                        </button>
                    </div>
                </div>
            `;
        }).join('') :
        '<p style="text-align: center; color: #6b7280; padding: 40px;">No pending emails.</p>';
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.5rem;">📬 Pending Emails (${pendingEmails.length})</h3>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ✕ Close
            </button>
        </div>
        
        <div style="margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                <div style="background: #f8faff; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 600; color: #3b82f6;">${pendingEmails.length}</div>
                    <div style="font-size: 12px; color: #6b7280;">Total Pending</div>
                </div>
                <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 600; color: #fbbf24;">${pendingEmails.filter(e => e.requiresApproval && !e.approved).length}</div>
                    <div style="font-size: 12px; color: #6b7280;">Need Approval</div>
                </div>
                <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 15px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 600; color: #10b981;">${pendingEmails.filter(e => new Date(e.scheduledTime) <= new Date()).length}</div>
                    <div style="font-size: 12px; color: #6b7280;">Ready to Send</div>
                </div>
            </div>
        </div>
        
        <div>
            <h4 style="margin-bottom: 15px; color: #1f2937;">Pending Emails:</h4>
            <div style="max-height: 400px; overflow-y: auto;">
                ${pendingEmailsHTML}
            </div>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function approveEmail(emailJobId) {
    if (emailService.approveEmail(emailJobId)) {
        showSuccess('Email approved and will be sent shortly.');
        // Refresh the pending emails view
        showPendingEmailsManager();
    } else {
        showError('Failed to approve email.');
    }
}

function cancelEmail(emailJobId) {
    if (emailService.cancelEmail(emailJobId)) {
        showSuccess('Email cancelled.');
        // Refresh the pending emails view
        showPendingEmailsManager();
    } else {
        showError('Failed to cancel email.');
    }
}

function previewEmail(emailJobId) {
    const email = emailService.pendingEmails.find(e => e.id === emailJobId);
    if (!email) {
        showError('Email not found.');
        return;
    }
    
    const template = emailTemplates[email.templateId];
    const renderedContent = emailService.renderTemplate(template, email.data);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1001;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 700px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.5rem;">📧 Email Preview</h3>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ✕ Close
            </button>
        </div>
        
        <div style="margin-bottom: 20px; background: #f9fafb; border-radius: 8px; padding: 15px;">
            <div style="margin-bottom: 10px;"><strong>To:</strong> ${email.data.candidate.email}</div>
            <div style="margin-bottom: 10px;"><strong>From:</strong> ${emailConfig.fromEmail}</div>
            <div style="margin-bottom: 10px;"><strong>Subject:</strong> ${renderedContent.subject}</div>
            <div><strong>Template:</strong> ${template.name}</div>
        </div>
        
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; background: white;">
            ${renderedContent.html}
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// =============================================================================
// PHASE 2.5 LINKEDIN CONNECTION FACILITATION & TRACKING
// =============================================================================

// LinkedIn connection tracking data
let linkedinConnections = JSON.parse(localStorage.getItem('linkedinConnections') || '[]');
let linkedinSettings = JSON.parse(localStorage.getItem('linkedinSettings') || JSON.stringify({
    enableTracking: true,
    autoGenerateMessages: true,
    defaultMessage: 'professional',
    trackingEnabled: true
}));

// LinkedIn message templates
const linkedinMessageTemplates = {
    professional: {
        name: "Professional Introduction",
        template: "Hi {{candidate.name}}, I came across your profile while reviewing applications for our {{job.title}} position at {{company.name}}. I'd love to connect and potentially discuss this opportunity further.",
        variables: ['candidate.name', 'job.title', 'company.name']
    },
    post_interview: {
        name: "Post-Interview Connection",
        template: "Hi {{candidate.name}}, thank you for the great conversation about the {{job.title}} role at {{company.name}}. I'd like to stay connected regardless of this particular opportunity.",
        variables: ['candidate.name', 'job.title', 'company.name']
    },
    networking: {
        name: "General Networking",
        template: "Hi {{candidate.name}}, I'm impressed by your background in {{candidate.industry}}. I'd like to connect as I frequently have opportunities that might interest you in the {{industry}} space.",
        variables: ['candidate.name', 'candidate.industry', 'industry']
    },
    follow_up: {
        name: "Follow-up Connection",
        template: "Hi {{candidate.name}}, I wanted to follow up on our recent discussion about opportunities at {{company.name}}. Would love to stay connected for future possibilities.",
        variables: ['candidate.name', 'company.name']
    },
    talent_pipeline: {
        name: "Talent Pipeline Building",
        template: "Hi {{candidate.name}}, while we've filled the current {{job.title}} position, your profile stands out. I'd like to connect to keep you in mind for future opportunities.",
        variables: ['candidate.name', 'job.title']
    }
};

// LinkedIn facilitation service
class LinkedInFacilitationService {
    constructor() {
        this.connections = linkedinConnections;
        this.settings = linkedinSettings;
    }

    // Generate LinkedIn connection URL with pre-filled message
    generateConnectionURL(candidate, recruiter, jobPosting, templateType = 'professional') {
        // Extract LinkedIn profile URL from candidate data
        const linkedinProfile = this.extractLinkedInProfile(candidate);
        
        if (!linkedinProfile) {
            return null;
        }

        // Generate personalized message
        const template = linkedinMessageTemplates[templateType];
        if (!template) {
            console.warn(`LinkedIn template ${templateType} not found`);
            return linkedinProfile;
        }

        const personalizedMessage = this.generatePersonalizedMessage(candidate, recruiter, jobPosting, template);
        
        // Create LinkedIn connection URL with message
        const baseURL = linkedinProfile.includes('linkedin.com/in/') ? linkedinProfile : `https://linkedin.com/in/${linkedinProfile}`;
        
        // LinkedIn doesn't support direct connection URLs with messages, but we can provide the message for copy-paste
        return {
            profileURL: baseURL,
            message: personalizedMessage,
            template: template.name
        };
    }

    // Extract LinkedIn profile from candidate data
    extractLinkedInProfile(candidate) {
        // Check various possible LinkedIn URL formats
        const possibleFields = [
            candidate.extractedData?.contactInfo?.linkedin,
            candidate.profile?.linkedin,
            candidate.linkedin_url,
            candidate.professional_data?.linkedin
        ];

        for (const field of possibleFields) {
            if (field && typeof field === 'string') {
                // Clean and validate LinkedIn URL
                const cleanURL = this.cleanLinkedInURL(field);
                if (cleanURL) return cleanURL;
            }
        }

        // Try to extract from resume text if available
        if (candidate.extractedData?.resumeText || candidate.resume_text) {
            const resumeText = candidate.extractedData?.resumeText || candidate.resume_text;
            const linkedinMatch = resumeText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9-]+)/i);
            if (linkedinMatch) {
                return `https://linkedin.com/in/${linkedinMatch[1]}`;
            }
        }

        return null;
    }

    // Clean and validate LinkedIn URL
    cleanLinkedInURL(url) {
        if (!url) return null;
        
        // Remove whitespace and common prefixes
        url = url.trim().toLowerCase();
        
        // Handle various LinkedIn URL formats
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9-]+)/,
            /^([a-zA-Z0-9-]+)$/ // Just the username
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                const username = match[1] || match[0];
                return `https://linkedin.com/in/${username}`;
            }
        }

        return null;
    }

    // Generate personalized connection message
    generatePersonalizedMessage(candidate, recruiter, jobPosting, template) {
        const data = {
            candidate: {
                name: candidate.name || 'there',
                industry: this.extractIndustry(candidate) || 'your field'
            },
            job: {
                title: jobPosting?.title || 'our current position'
            },
            company: {
                name: recruiter?.company || emailConfig.fromName?.split('-')[0]?.trim() || 'our company'
            },
            industry: jobPosting?.industry || 'technology'
        };

        return this.renderTemplate(template.template, data);
    }

    // Extract industry from candidate data
    extractIndustry(candidate) {
        return candidate.professional_data?.industry_background?.[0] ||
               candidate.industry ||
               candidate.extractedData?.industry ||
               null;
    }

    // Simple template rendering
    renderTemplate(template, data) {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.getNestedValue(data, path.trim());
            return value !== undefined ? value : match;
        });
    }

    // Get nested object value
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    // Track LinkedIn connection
    trackConnection(candidateId, candidateData, connectionData) {
        const connection = {
            id: `linkedin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            candidateId,
            candidateName: candidateData.name,
            candidateEmail: candidateData.extractedData?.contactInfo?.email || candidateData.profile?.email,
            linkedinURL: connectionData.profileURL,
            message: connectionData.message,
            template: connectionData.template,
            status: 'pending', // pending, connected, declined, not_found
            createdAt: new Date().toISOString(),
            connectedAt: null,
            notes: '',
            jobTitle: connectionData.jobTitle || 'Unknown Position',
            recruiterName: emailConfig.fromName || 'Recruiter'
        };

        this.connections.push(connection);
        this.saveConnections();
        return connection.id;
    }

    // Update connection status
    updateConnectionStatus(connectionId, status, notes = '') {
        const connection = this.connections.find(c => c.id === connectionId);
        if (connection) {
            connection.status = status;
            connection.notes = notes;
            if (status === 'connected') {
                connection.connectedAt = new Date().toISOString();
            }
            this.saveConnections();
            return true;
        }
        return false;
    }

    // Get connection statistics
    getConnectionStats() {
        const total = this.connections.length;
        const connected = this.connections.filter(c => c.status === 'connected').length;
        const pending = this.connections.filter(c => c.status === 'pending').length;
        const declined = this.connections.filter(c => c.status === 'declined').length;
        
        // Calculate this month's stats
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        
        const thisMonthConnections = this.connections.filter(c => 
            new Date(c.createdAt) >= thisMonth
        ).length;
        
        const thisMonthConnected = this.connections.filter(c => 
            c.status === 'connected' && c.connectedAt && new Date(c.connectedAt) >= thisMonth
        ).length;

        return {
            total,
            connected,
            pending,
            declined,
            thisMonth: thisMonthConnections,
            thisMonthConnected,
            acceptanceRate: total > 0 ? Math.round((connected / total) * 100) : 0
        };
    }

    // Get connections for a specific candidate
    getCandidateConnections(candidateId) {
        return this.connections.filter(c => c.candidateId === candidateId);
    }

    // Save connections to localStorage
    saveConnections() {
        localStorage.setItem('linkedinConnections', JSON.stringify(this.connections));
    }

    // Save settings
    saveSettings() {
        localStorage.setItem('linkedinSettings', JSON.stringify(this.settings));
    }
}

// Initialize LinkedIn service
const linkedinService = new LinkedInFacilitationService();

// =============================================================================
// LINKEDIN UI FUNCTIONS
// =============================================================================

function showLinkedInDashboard() {
    const stats = linkedinService.getConnectionStats();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 900px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.5rem;">🔗 LinkedIn Pipeline Management</h3>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ✕ Close
            </button>
        </div>
        
        <!-- Network Growth Analytics -->
        <div style="margin-bottom: 30px;">
            <h4 style="margin-bottom: 15px; color: #1f2937;">📊 Network Growth Analytics</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                <div style="background: linear-gradient(135deg, #0077b5, #005885); color: white; border-radius: 8px; padding: 20px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 600; margin-bottom: 5px;">${stats.thisMonth}</div>
                    <div style="font-size: 12px; opacity: 0.9;">New Connections This Month</div>
                </div>
                <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; border-radius: 8px; padding: 20px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 600; margin-bottom: 5px;">${stats.acceptanceRate}%</div>
                    <div style="font-size: 12px; opacity: 0.9;">Connection Acceptance Rate</div>
                </div>
                <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border-radius: 8px; padding: 20px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 600; margin-bottom: 5px;">${stats.total}</div>
                    <div style="font-size: 12px; opacity: 0.9;">Total Professional Network</div>
                </div>
                <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border-radius: 8px; padding: 20px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 600; margin-bottom: 5px;">${stats.connected}</div>
                    <div style="font-size: 12px; opacity: 0.9;">Active Connections</div>
                </div>
            </div>
        </div>
        
        <!-- Connection Status Overview -->
        <div style="margin-bottom: 30px;">
            <h4 style="margin-bottom: 15px; color: #1f2937;">🎯 Connection Status Overview</h4>
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; text-align: center;">
                    <div>
                        <div style="font-size: 24px; font-weight: 600; color: #f59e0b;">${stats.pending}</div>
                        <div style="font-size: 12px; color: #6b7280;">Pending</div>
                    </div>
                    <div>
                        <div style="font-size: 24px; font-weight: 600; color: #10b981;">${stats.connected}</div>
                        <div style="font-size: 12px; color: #6b7280;">Connected</div>
                    </div>
                    <div>
                        <div style="font-size: 24px; font-weight: 600; color: #ef4444;">${stats.declined}</div>
                        <div style="font-size: 12px; color: #6b7280;">Declined</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Quick Actions -->
        <div style="margin-bottom: 30px;">
            <h4 style="margin-bottom: 15px; color: #1f2937;">⚡ Quick Actions</h4>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="showLinkedInConnections()" 
                        style="background: #0077b5; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    📋 View All Connections
                </button>
                <button onclick="showLinkedInSettings()" 
                        style="background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    ⚙️ LinkedIn Settings
                </button>
                <button onclick="exportLinkedInData()" 
                        style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    📤 Export Network Data
                </button>
                <button onclick="showLinkedInBestPractices()" 
                        style="background: #8b5cf6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    💡 Best Practices
                </button>
            </div>
        </div>
        
        <!-- Recent Connection Activity -->
        <div>
            <h4 style="margin-bottom: 15px; color: #1f2937;">📈 Recent Connection Activity</h4>
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; max-height: 300px; overflow-y: auto;">
                ${generateRecentConnectionsHTML()}
            </div>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function generateRecentConnectionsHTML() {
    const recentConnections = linkedinService.connections
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
    
    if (recentConnections.length === 0) {
        return '<p style="text-align: center; color: #6b7280; padding: 20px;">No LinkedIn connections tracked yet. Start connecting with candidates to see activity here.</p>';
    }
    
    return recentConnections.map(connection => {
        const statusColor = {
            pending: '#f59e0b',
            connected: '#10b981',
            declined: '#ef4444',
            not_found: '#6b7280'
        }[connection.status] || '#6b7280';
        
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <div>
                    <div style="font-weight: 600; color: #1f2937;">${connection.candidateName}</div>
                    <div style="font-size: 12px; color: #6b7280;">${connection.jobTitle} • ${new Date(connection.createdAt).toLocaleDateString()}</div>
                </div>
                <div style="text-align: right;">
                    <div style="padding: 4px 8px; background: ${statusColor}20; color: ${statusColor}; border-radius: 4px; font-size: 12px; font-weight: 500; text-transform: capitalize;">
                        ${connection.status.replace('_', ' ')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function connectWithDatabaseCandidateOnLinkedIn(candidateId, templateType = 'professional') {
    const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
    if (!candidate) {
        showError('Candidate not found in database.');
        return;
    }
    
    const recruiter = {
        company: emailConfig.fromName?.split('-')[0]?.trim() || 'Our Company'
    };
    
    const jobPosting = {
        title: jobRequirements.title || 'Position',
        industry: currentProjectConfig.industry || 'Technology'
    };
    
    const connectionData = linkedinService.generateConnectionURL(candidate, recruiter, jobPosting, templateType);
    
    if (!connectionData) {
        showError('No LinkedIn profile found for this candidate.');
        return;
    }
    
    // Track the connection attempt
    connectionData.jobTitle = jobPosting.title;
    const connectionId = linkedinService.trackConnection(candidateId, candidate, connectionData);
    
    // Show connection modal
    showLinkedInConnectionModal(connectionData, connectionId, candidate.profile?.name || 'Unknown Candidate');
}

function connectWithCandidateOnLinkedIn(candidateIndex, templateType = 'professional') {
    const candidate = analysisResults[candidateIndex];
    if (!candidate) {
        showError('Candidate not found.');
        return;
    }
    
    const recruiter = {
        company: emailConfig.fromName?.split('-')[0]?.trim() || 'Our Company'
    };
    
    const jobPosting = {
        title: jobRequirements.title || 'Position',
        industry: currentProjectConfig.industry || 'Technology'
    };
    
    const connectionData = linkedinService.generateConnectionURL(candidate, recruiter, jobPosting, templateType);
    
    if (!connectionData) {
        showError('No LinkedIn profile found for this candidate.');
        return;
    }
    
    // Track the connection attempt
    connectionData.jobTitle = jobPosting.title;
    const connectionId = linkedinService.trackConnection(`candidate_${candidateIndex}`, candidate, connectionData);
    
    // Show connection modal
    showLinkedInConnectionModal(connectionData, connectionId, candidate.name);
}

function showLinkedInConnectionModal(connectionData, connectionId, candidateName) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.5rem;">🔗 Connect on LinkedIn</h3>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ✕ Close
            </button>
        </div>
        
        <div style="margin-bottom: 20px;">
            <div style="background: #f0f9ff; border: 1px solid #0077b5; border-radius: 8px; padding: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #0077b5;">📋 Instructions:</h4>
                <ol style="margin: 0; padding-left: 20px; color: #1f2937; line-height: 1.6;">
                    <li>Click the LinkedIn profile link below to open their profile</li>
                    <li>Click the "Connect" button on their LinkedIn profile</li>
                    <li>Copy and paste the personalized message below</li>
                    <li>Send the connection request</li>
                    <li>Return here to update the connection status</li>
                </ol>
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 10px; color: #1f2937;">👤 Candidate: ${candidateName}</h4>
            <div style="background: #f9fafb; border-radius: 8px; padding: 15px;">
                <div style="margin-bottom: 15px;">
                    <strong>LinkedIn Profile:</strong><br>
                    <a href="${connectionData.profileURL}" target="_blank" 
                       style="color: #0077b5; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 5px; margin-top: 5px; padding: 8px 15px; background: #0077b520; border-radius: 6px;">
                        🔗 Open LinkedIn Profile
                        <span style="font-size: 12px;">↗</span>
                    </a>
                </div>
                
                <div>
                    <strong>Template Used:</strong> ${connectionData.template}
                </div>
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 10px; color: #1f2937;">💬 Personalized Message:</h4>
            <div style="background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; padding: 15px; position: relative;">
                <div style="white-space: pre-wrap; line-height: 1.6; margin-bottom: 10px;">${connectionData.message}</div>
                <button onclick="copyToClipboard('${connectionData.message.replace(/'/g, "\\'")}', this)" 
                        style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    📋 Copy Message
                </button>
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 10px; color: #1f2937;">📊 Update Connection Status:</h4>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="updateLinkedInConnectionStatus('${connectionId}', 'connected')" 
                        style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    ✅ Connected
                </button>
                <button onclick="updateLinkedInConnectionStatus('${connectionId}', 'declined')" 
                        style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    ❌ Declined
                </button>
                <button onclick="updateLinkedInConnectionStatus('${connectionId}', 'not_found')" 
                        style="background: #6b7280; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    🔍 Profile Not Found
                </button>
            </div>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>💡 Tip:</strong> LinkedIn connection requests with personalized messages have a 70% higher acceptance rate than generic requests.
            </p>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = '✅ Copied!';
        button.style.background = '#10b981';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '#10b981';
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        showSuccess('Message copied to clipboard!');
    });
}

function updateLinkedInConnectionStatus(connectionId, status) {
    if (linkedinService.updateConnectionStatus(connectionId, status)) {
        const statusText = {
            connected: 'Connected successfully!',
            declined: 'Connection declined - noted for future reference.',
            not_found: 'Profile not found - marked accordingly.'
        }[status] || 'Status updated.';
        
        showSuccess(statusText);
        
        // Close the modal
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
        
        // Refresh dashboard if open
        if (document.querySelector('.modal-overlay')) {
            setTimeout(() => showLinkedInDashboard(), 100);
        }
    } else {
        showError('Failed to update connection status.');
    }
}

function showLinkedInConnections() {
    const connections = linkedinService.connections.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 900px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    const connectionsHTML = connections.length > 0 ? 
        connections.map(connection => {
            const statusColor = {
                pending: '#f59e0b',
                connected: '#10b981',
                declined: '#ef4444',
                not_found: '#6b7280'
            }[connection.status] || '#6b7280';
            
            return `
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                        <div>
                            <h4 style="margin: 0; color: #1f2937;">${connection.candidateName}</h4>
                            <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${connection.jobTitle} • ${new Date(connection.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="padding: 6px 12px; background: ${statusColor}20; color: ${statusColor}; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: capitalize; margin-bottom: 5px;">
                                ${connection.status.replace('_', ' ')}
                            </div>
                            ${connection.connectedAt ? `<div style="font-size: 11px; color: #6b7280;">Connected: ${new Date(connection.connectedAt).toLocaleDateString()}</div>` : ''}
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <strong style="font-size: 14px;">Template:</strong> <span style="color: #6b7280; font-size: 14px;">${connection.template}</span>
                    </div>
                    
                    <div style="background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 10px;">
                        <div style="font-size: 13px; color: #4b5563; line-height: 1.4;">"${connection.message}"</div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <a href="${connection.linkedinURL}" target="_blank" 
                           style="color: #0077b5; text-decoration: none; font-size: 12px; padding: 4px 8px; background: #0077b520; border-radius: 4px;">
                            🔗 View Profile
                        </a>
                        ${connection.status === 'pending' ? `
                            <button onclick="updateLinkedInConnectionStatus('${connection.id}', 'connected')" 
                                    style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                Mark Connected
                            </button>
                        ` : ''}
                        ${connection.notes ? `<span style="font-size: 11px; color: #6b7280;">Notes: ${connection.notes}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('') :
        '<p style="text-align: center; color: #6b7280; padding: 40px;">No LinkedIn connections tracked yet.</p>';
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.5rem;">📋 All LinkedIn Connections (${connections.length})</h3>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ✕ Close
            </button>
        </div>
        
        <div style="max-height: 600px; overflow-y: auto;">
            ${connectionsHTML}
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function showLinkedInSettings() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.5rem;">⚙️ LinkedIn Settings</h3>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ✕ Close
            </button>
        </div>
        
        <form id="linkedinSettingsForm">
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                    <input type="checkbox" id="enableTracking" ${linkedinSettings.enableTracking ? 'checked' : ''}>
                    <span>Enable LinkedIn connection tracking</span>
                </label>
                
                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                    <input type="checkbox" id="autoGenerateMessages" ${linkedinSettings.autoGenerateMessages ? 'checked' : ''}>
                    <span>Auto-generate personalized connection messages</span>
                </label>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Default Message Template:</label>
                <select id="defaultMessage" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                    <option value="professional" ${linkedinSettings.defaultMessage === 'professional' ? 'selected' : ''}>Professional Introduction</option>
                    <option value="networking" ${linkedinSettings.defaultMessage === 'networking' ? 'selected' : ''}>General Networking</option>
                    <option value="post_interview" ${linkedinSettings.defaultMessage === 'post_interview' ? 'selected' : ''}>Post-Interview Connection</option>
                    <option value="talent_pipeline" ${linkedinSettings.defaultMessage === 'talent_pipeline' ? 'selected' : ''}>Talent Pipeline Building</option>
                </select>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="margin-bottom: 10px;">Message Template Preview:</h4>
                <div id="templatePreview" style="background: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px; padding: 15px; font-size: 14px; line-height: 1.5;">
                    ${linkedinMessageTemplates[linkedinSettings.defaultMessage]?.template || 'Template not found'}
                </div>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button type="submit" 
                        style="flex: 1; background: #0077b5; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; cursor: pointer;">
                    💾 Save Settings
                </button>
                <button type="button" onclick="resetLinkedInSettings()" 
                        style="background: #6b7280; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; cursor: pointer;">
                    🔄 Reset
                </button>
            </div>
        </form>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Update preview when template changes
    document.getElementById('defaultMessage').addEventListener('change', (e) => {
        const template = linkedinMessageTemplates[e.target.value];
        document.getElementById('templatePreview').textContent = template?.template || 'Template not found';
    });
    
    // Handle form submission
    document.getElementById('linkedinSettingsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        linkedinSettings.enableTracking = document.getElementById('enableTracking').checked;
        linkedinSettings.autoGenerateMessages = document.getElementById('autoGenerateMessages').checked;
        linkedinSettings.defaultMessage = document.getElementById('defaultMessage').value;
        
        linkedinService.settings = linkedinSettings;
        linkedinService.saveSettings();
        
        showSuccess('LinkedIn settings saved successfully!');
        modal.remove();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function resetLinkedInSettings() {
    linkedinSettings = {
        enableTracking: true,
        autoGenerateMessages: true,
        defaultMessage: 'professional',
        trackingEnabled: true
    };
    
    linkedinService.settings = linkedinSettings;
    linkedinService.saveSettings();
    
    showSuccess('LinkedIn settings reset to defaults.');
    showLinkedInSettings(); // Refresh the modal
}

function exportLinkedInData() {
    const data = {
        connections: linkedinService.connections,
        settings: linkedinService.settings,
        exportDate: new Date().toISOString(),
        stats: linkedinService.getConnectionStats()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkedin-network-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('LinkedIn network data exported successfully!');
}

function showLinkedInBestPractices() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 700px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.5rem;">💡 LinkedIn Best Practices</h3>
            <button onclick="this.closest('.modal-overlay').remove()" 
                    style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
                ✕ Close
            </button>
        </div>
        
        <div style="line-height: 1.6; color: #374151;">
            <div style="background: #f0f9ff; border-left: 4px solid #0077b5; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #0077b5;">🎯 Connection Strategy</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>Always send personalized connection requests - they have 70% higher acceptance rates</li>
                    <li>Connect within 24-48 hours of initial contact for best response rates</li>
                    <li>Mention specific details from their profile or application</li>
                    <li>Be genuine about your intent to build professional relationships</li>
                </ul>
            </div>
            
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #10b981;">✅ Do's</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>Keep connection messages under 300 characters</li>
                    <li>Follow up with a thank you message after connecting</li>
                    <li>Share relevant industry content to stay visible</li>
                    <li>Maintain professional relationships even after hiring decisions</li>
                    <li>Update connection status in the system for accurate tracking</li>
                </ul>
            </div>
            
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #ef4444;">❌ Don'ts</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>Don't send generic "I'd like to add you to my network" messages</li>
                    <li>Don't immediately pitch jobs after connecting</li>
                    <li>Don't spam candidates with multiple connection requests</li>
                    <li>Don't forget to follow LinkedIn's terms of service</li>
                    <li>Don't connect without a clear professional purpose</li>
                </ul>
            </div>
            
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #f59e0b;">📈 Performance Tips</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>Aim for 70%+ connection acceptance rate</li>
                    <li>Track and analyze which message templates perform best</li>
                    <li>Connect on weekdays for higher response rates</li>
                    <li>Build relationships gradually - quality over quantity</li>
                    <li>Use LinkedIn Sales Navigator for advanced searching</li>
                </ul>
            </div>
            
            <div style="background: #f8faff; border-left: 4px solid #8b5cf6; padding: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #8b5cf6;">🚀 Advanced Strategies</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>Engage with candidates' posts before connecting</li>
                    <li>Create valuable content to attract potential candidates</li>
                    <li>Use LinkedIn Groups to build industry relationships</li>
                    <li>Set up LinkedIn alerts for target companies and roles</li>
                    <li>Leverage warm introductions through mutual connections</li>
                </ul>
            </div>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function resetTool() {
    currentStep = 1;
    uploadedFiles = [];
    analysisResults = [];
    jobRequirements = {};
    
    document.getElementById('jobDescription').value = '';
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('processCvsBtn').disabled = true;
    
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    showStep(1);
    showSuccess('Tool reset! Ready for a new role.');
}

function showStep(stepNumber) {
    currentStep = stepNumber;
    
    document.querySelectorAll('.step').forEach(step => {
        step.classList.add('hidden');
    });
    
    document.getElementById(`step${stepNumber}`).classList.remove('hidden');
    document.getElementById(`step${stepNumber}`).classList.add('active');
    document.getElementById(`step${stepNumber}`).scrollIntoView({ behavior: 'smooth' });
}

function completeStep(stepNumber) {
    const step = document.getElementById(`step${stepNumber}`);
    step.classList.remove('active');
    step.classList.add('completed');
}

function downloadReport() {
    let report = `AI CV SCREENING REPORT\n${'='.repeat(50)}\n\n`;
    report += `Generated: ${new Date().toLocaleDateString()}\n`;
    report += `Job Role: ${jobRequirements.title || 'N/A'}\n`;
    report += `CVs Processed: ${analysisResults.length}\n\n`;
    
    analysisResults.forEach((candidate, index) => {
        report += `${index + 1}. ${candidate.name} - ${candidate.score}%\n`;
        report += `   Experience: ${candidate.experience}\n`;
        report += `   Skills: ${candidate.skills}\n\n`;
    });
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CV_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Report downloaded!');
}

// Notification functions
function createNotification(message, type) {
    const colors = {
        error: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
        success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#059669' },
        warning: { bg: '#fefce8', border: '#fde68a', text: '#d97706' },
        loading: { bg: '#f0f9ff', border: '#bae6fd', text: '#0284c7' }
    };
    
    const color = colors[type] || colors.loading;
    const notification = document.createElement('div');
    notification.className = `${type}-notification`;
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: ${color.bg}; border: 1px solid ${color.border}; color: ${color.text};
        padding: 15px 20px; border-radius: 8px; z-index: 1000; max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-weight: 500;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    if (type !== 'loading') {
        setTimeout(() => notification.remove(), type === 'error' ? 5000 : 3000);
    }
}

function showError(message) { createNotification(message, 'error'); }
function showSuccess(message) { createNotification(message, 'success'); }
function showWarning(message) { createNotification(message, 'warning'); }
function showLoading(message) { 
    document.querySelectorAll('.loading-notification').forEach(el => el.remove());
    createNotification(message, 'loading'); 
}
function hideLoading() { 
    document.querySelectorAll('.loading-notification').forEach(el => el.remove());
}

// =============================================================================
// PHASE 4: CV DATABASE & TALENT PIPELINE 
// =============================================================================

// Function to prompt saving candidate from analysis results
function promptSaveCandidate(candidateIndex) {
    if (candidateIndex >= analysisResults.length) {
        showError('Candidate not found');
        return;
    }
    
    const candidate = analysisResults[candidateIndex];
    
    // Get the CV text for this candidate (assuming we have it stored)
    const cvText = uploadedFiles[candidateIndex]?.content || `CV content for ${candidate.name}`;
    
    // Create analysis result object in the format expected by addCandidateToDatabase
    const analysisResult = {
        score: candidate.score,
        experience_years: extractExperienceYears(candidate.experience),
        skills: candidate.skills ? candidate.skills.split(', ') : [],
        industry: [jobRequirements.industry || 'General'],
        education: candidate.education || 'Not specified',
        feedback: candidate.feedback || null,
        corrected_score: candidate.corrected_score || null,
        feedback_categories: candidate.feedback_categories || []
    };
    
    addCandidateToDatabase(analysisResult, cvText);
}

// Helper function to extract years from experience string
function extractExperienceYears(experienceStr) {
    if (!experienceStr) return 0;
    const match = experienceStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

// =============================================================================
// PHASE 4: CV DATABASE & TALENT PIPELINE 
// =============================================================================

// Global candidate database
let candidateDatabase = [];
let currentCandidateView = null;

// Candidate status definitions
const candidateStatuses = {
    available: { label: "Available", color: "#10b981", description: "Available for new opportunities" },
    contacted: { label: "Contacted", color: "#3b82f6", description: "Initial contact made" },
    interested: { label: "Interested", color: "#8b5cf6", description: "Expressed interest in role" },
    interviewing: { label: "Interviewing", color: "#f59e0b", description: "In interview process" },
    offered: { label: "Offered", color: "#ec4899", description: "Offer extended" },
    hired: { label: "Hired", color: "#059669", description: "Successfully hired" },
    declined: { label: "Declined", color: "#dc2626", description: "Declined opportunity" },
    not_interested: { label: "Not Interested", color: "#6b7280", description: "Not interested at this time" },
    not_suitable: { label: "Not Suitable", color: "#ef4444", description: "Not suitable for current needs" }
};

// Initialize candidate database from localStorage
function initializeCandidateDatabase() {
    const saved = localStorage.getItem('cv_candidate_database');
    if (saved) {
        try {
            candidateDatabase = JSON.parse(saved);
            console.log(`📊 Loaded ${candidateDatabase.length} candidates from database`);
        } catch (error) {
            console.error('Failed to load candidate database:', error);
            candidateDatabase = [];
        }
    }
}

// Save candidate database to localStorage
function saveCandidateDatabase() {
    try {
        localStorage.setItem('cv_candidate_database', JSON.stringify(candidateDatabase));
    } catch (error) {
        console.error('Failed to save candidate database:', error);
        showError('Failed to save to database. Storage may be full.');
    }
}

// Show consent dialog for saving candidate
function showConsentDialog(candidateData, callback) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 2000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">Save Candidate to Database</h3>
            <p style="color: #6b7280; margin-bottom: 20px;">
                We'd like to save this candidate's information for future opportunities. 
                This helps build your talent pipeline.
            </p>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #374151;">Data to be saved:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px;">
                    <li>CV content and analysis results</li>
                    <li>Skills and experience extracted</li>
                    <li>Your feedback and scoring</li>
                    <li>Contact information (if provided)</li>
                </ul>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; margin-bottom: 10px;">
                    <input type="checkbox" id="storageConsent" style="margin-right: 8px;">
                    <span style="font-size: 14px;">I consent to storing this candidate's information</span>
                </label>
                <label style="display: flex; align-items: center; margin-bottom: 10px;">
                    <input type="checkbox" id="contactConsent" style="margin-right: 8px;">
                    <span style="font-size: 14px;">Candidate can be contacted for future opportunities</span>
                </label>
                <label style="display: flex; align-items: center;">
                    <span style="font-size: 14px; margin-right: 8px;">Data retention:</span>
                    <select id="retentionPeriod" style="padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                        <option value="365">1 year</option>
                        <option value="730">2 years</option>
                        <option value="1095">3 years</option>
                    </select>
                </label>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="this.closest('.modal').remove()" 
                        style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 6px; cursor: pointer;">
                    Skip
                </button>
                <button onclick="handleConsentSubmit()" id="saveWithConsent"
                        style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;" disabled>
                    Save to Database
                </button>
            </div>
        </div>
    `;
    
    modal.className = 'modal';
    document.body.appendChild(modal);
    
    // Handle consent validation
    const storageConsent = modal.querySelector('#storageConsent');
    const saveBtn = modal.querySelector('#saveWithConsent');
    
    storageConsent.addEventListener('change', () => {
        saveBtn.disabled = !storageConsent.checked;
        saveBtn.style.opacity = storageConsent.checked ? '1' : '0.5';
    });
    
    // Handle consent submission
    window.handleConsentSubmit = () => {
        const consent = {
            storage_agreed: storageConsent.checked,
            contact_permission: modal.querySelector('#contactConsent').checked,
            data_retention_days: parseInt(modal.querySelector('#retentionPeriod').value),
            consent_date: new Date().toISOString()
        };
        
        modal.remove();
        delete window.handleConsentSubmit;
        callback(consent);
    };
}

// Add candidate to database with GDPR compliance
function addCandidateToDatabase(analysisResult, cvText) {
    showConsentDialog(analysisResult, (consent) => {
        const candidate = {
            candidate_id: generateUUID(),
            profile: {
                name: extractCandidateName(cvText) || "Candidate",
                email: extractEmail(cvText) || null,
                phone: extractPhone(cvText) || null,
                linkedin: extractLinkedIn(cvText) || null,
                location: extractLocation(cvText) || null
            },
            professional_data: {
                experience_years: analysisResult.experience_years || 0,
                current_role: extractCurrentRole(cvText) || "Unknown",
                industry_background: analysisResult.industry || [],
                seniority_level: determineSeniorityLevel(analysisResult.experience_years),
                skills: analysisResult.skills || [],
                certifications: extractCertifications(cvText) || [],
                education: analysisResult.education || "Not specified"
            },
            analysis_history: [{
                job_id: generateUUID(),
                job_title: jobRequirements.title || "Unknown Position",
                ai_score: analysisResult.score,
                user_feedback: analysisResult.feedback || null,
                corrected_score: analysisResult.corrected_score || null,
                analysis_date: new Date().toISOString(),
                feedback_categories: analysisResult.feedback_categories || []
            }],
            consent: consent,
            metadata: {
                upload_date: new Date().toISOString(),
                last_contacted: null,
                status: "available",
                tags: generateCandidateTags(analysisResult),
                cv_text: cvText
            }
        };
        
        candidateDatabase.push(candidate);
        saveCandidateDatabase();
        showSuccess(`Candidate saved to database! Total: ${candidateDatabase.length} candidates`);
    });
}

// Helper functions for data extraction
function extractCandidateName(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const firstLine = lines[0]?.trim();
    if (firstLine && firstLine.length < 50 && !firstLine.includes('@')) {
        return firstLine;
    }
    return null;
}

function extractEmail(text) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
}

function extractPhone(text) {
    const phoneRegex = /[\+]?[1-9]?[\s]?[\(]?[0-9]{3}[\)]?[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}/;
    const match = text.match(phoneRegex);
    return match ? match[0] : null;
}

function extractLinkedIn(text) {
    const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9\-]+/;
    const match = text.match(linkedinRegex);
    return match ? 'https://' + match[0] : null;
}

function extractLocation(text) {
    const locationWords = ['New York', 'San Francisco', 'Los Angeles', 'Chicago', 'London', 'Remote'];
    for (const location of locationWords) {
        if (text.includes(location)) return location;
    }
    return null;
}

function extractCurrentRole(text) {
    const lines = text.split('\n');
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i].trim();
        if (line.includes('Manager') || line.includes('Developer') || line.includes('Analyst')) {
            return line;
        }
    }
    return null;
}

function extractCertifications(text) {
    const certWords = ['certified', 'certification', 'certificate'];
    const lines = text.split('\n');
    const certs = [];
    
    lines.forEach(line => {
        if (certWords.some(word => line.toLowerCase().includes(word))) {
            certs.push(line.trim());
        }
    });
    
    return certs.slice(0, 3); // Max 3 certifications
}

function determineSeniorityLevel(years) {
    if (years >= 10) return 'senior';
    if (years >= 5) return 'mid';
    if (years >= 2) return 'junior';
    return 'entry';
}

function generateCandidateTags(analysisResult) {
    const tags = [];
    
    if (analysisResult.score >= 90) tags.push('high-potential');
    if (analysisResult.score >= 80) tags.push('strong-candidate');
    if (analysisResult.feedback === 'good') tags.push('recommended');
    if (analysisResult.experience_years >= 10) tags.push('senior-level');
    
    return tags;
}

// Show candidate database interface
function showCandidateDatabase() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 2000; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 15px; width: 90%; max-width: 1200px; height: 90%; display: flex; flex-direction: column;">
            <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: between; align-items: center;">
                <div>
                    <h2 style="margin: 0; color: #1f2937;">Candidate Database</h2>
                    <p style="margin: 5px 0 0 0; color: #6b7280;">${candidateDatabase.length} candidates • GDPR compliant</p>
                </div>
                <button onclick="this.closest('.database-modal').remove()" 
                        style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
            
            <div style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
                <div style="display: grid; grid-template-columns: 1fr auto auto; gap: 15px; align-items: end; margin-bottom: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">🔍 Search candidates</label>
                        <input type="text" id="candidateSearch" placeholder="Search by name, skills, role, company, or location..." 
                               style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                    </div>
                    <button onclick="showAdvancedFilters()" 
                            style="padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        🎛️ Advanced Filters
                    </button>
                    <button onclick="showBulkOperations()" 
                            style="padding: 8px 16px; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        📋 Bulk Actions
                    </button>
                </div>
                
                <!-- Quick Filters -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 15px;">
                    <select id="experienceFilter" style="padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                        <option value="">👔 Any experience</option>
                        <option value="0-2">🌱 0-2 years</option>
                        <option value="3-5">📈 3-5 years</option>
                        <option value="6-10">🎯 6-10 years</option>
                        <option value="10+">🏆 10+ years</option>
                    </select>
                    
                    <select id="statusFilter" style="padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                        <option value="">📊 All statuses</option>
                        ${Object.entries(candidateStatuses).map(([key, status]) => 
                            `<option value="${key}">${status.label}</option>`
                        ).join('')}
                    </select>
                    
                    <select id="skillsFilter" style="padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                        <option value="">💡 All skills</option>
                        ${getTopSkills().map(skill => 
                            `<option value="${skill}">${skill}</option>`
                        ).join('')}
                    </select>
                    
                    <select id="sourceFilter" style="padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                        <option value="">📥 All sources</option>
                        <option value="cv_upload">CV Upload</option>
                        <option value="csv_import">CSV Import</option>
                        <option value="json_import">JSON Import</option>
                        <option value="batch_upload">Batch Upload</option>
                        <option value="linkedin">LinkedIn</option>
                    </select>
                    
                    <select id="sortBy" style="padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                        <option value="recent">📅 Most Recent</option>
                        <option value="score">⭐ Highest Score</option>
                        <option value="name">🔤 Name A-Z</option>
                        <option value="experience">👔 Experience</option>
                        <option value="last_contacted">📞 Last Contacted</option>
                    </select>
                </div>
                
                <!-- Active Filters Display -->
                <div id="activeFilters" style="display: none; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Active filters:</span>
                        <div id="activeFiltersList" style="display: flex; gap: 5px; flex-wrap: wrap;">
                            <!-- Active filters will be displayed here -->
                        </div>
                        <button onclick="clearAllFilters()" 
                                style="padding: 2px 8px; background: #ef4444; color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 11px;">
                            Clear All
                        </button>
                    </div>
                </div>
                
                <!-- Search Results Summary -->
                <div id="searchSummary" style="padding: 8px 12px; background: #f9fafb; border-radius: 6px; font-size: 14px; color: #374151;">
                    <span id="resultCount">Showing ${candidateDatabase.length} candidates</span>
                    <span style="margin-left: 15px; color: #6b7280;" id="searchTime"></span>
                </div>
            </div>
            
            <div style="flex: 1; padding: 20px; overflow-y: auto;">
                <div id="candidateResults">
                    ${renderCandidateList(candidateDatabase)}
                </div>
            </div>
        </div>
    `;
    
    modal.className = 'database-modal';
    document.body.appendChild(modal);
    
    // Add search functionality with real-time filtering
    const searchInput = modal.querySelector('#candidateSearch');
    searchInput.addEventListener('input', debounce(performSearch, 300));
    
    // Add listeners for all filter controls
    ['experienceFilter', 'statusFilter', 'skillsFilter', 'sourceFilter', 'sortBy'].forEach(filterId => {
        const element = modal.querySelector(`#${filterId}`);
        if (element) {
            element.addEventListener('change', performSearch);
        }
    });
}

// Render candidate list
function renderCandidateList(candidates, showCheckboxes = false) {
    if (candidates.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <h3>No candidates found</h3>
                <p>Start analyzing CVs to build your talent pipeline!</p>
            </div>
        `;
    }
    
    return candidates.map(candidate => {
        const status = candidateStatuses[candidate.metadata.status];
        const lastAnalysis = candidate.analysis_history[candidate.analysis_history.length - 1];
        
        return `
            <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 15px; background: white;">
                <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 15px;">
                    ${showCheckboxes ? `
                        <div style="margin-right: 15px; margin-top: 5px;">
                            <input type="checkbox" class="bulk-candidate" value="${candidate.candidate_id}" 
                                   style="width: 16px; height: 16px; cursor: pointer;">
                        </div>
                    ` : ''}
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 5px 0; color: #1f2937;">${candidate.profile.name}</h3>
                        <p style="margin: 0; color: #6b7280;">${candidate.professional_data.current_role} • ${candidate.professional_data.experience_years} years experience</p>
                        <div style="margin-top: 8px;">
                            <span style="background: ${status.color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                                ${status.label}
                            </span>
                            ${candidate.metadata.tags.map(tag => 
                                `<span style="background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 5px;">${tag}</span>`
                            ).join('')}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 24px; font-weight: bold; color: ${lastAnalysis.ai_score >= 80 ? '#10b981' : lastAnalysis.ai_score >= 60 ? '#f59e0b' : '#ef4444'};">
                            ${lastAnalysis.ai_score}%
                        </div>
                        <div style="font-size: 12px; color: #6b7280;">Last analyzed</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                    <div>
                        <strong>Skills:</strong><br>
                        <span style="color: #6b7280;">${candidate.professional_data.skills.slice(0, 4).join(', ')}</span>
                    </div>
                    <div>
                        <strong>Industry:</strong><br>
                        <span style="color: #6b7280;">${Array.isArray(candidate.professional_data.industry_background) ? 
                            candidate.professional_data.industry_background.join(', ') : 
                            candidate.professional_data.industry_background || 'Not specified'}</span>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button onclick="viewCandidateProfile('${candidate.candidate_id}')" 
                            style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        View Profile
                    </button>
                    <button onclick="updateCandidateStatus('${candidate.candidate_id}')" 
                            style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Update Status
                    </button>
                    <button onclick="deleteCandidateWithConfirm('${candidate.candidate_id}')" 
                            style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Search candidates with filters
function searchCandidates() {
    const query = document.getElementById('candidateSearch')?.value.toLowerCase() || '';
    const experienceFilter = document.getElementById('experienceFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    let filtered = candidateDatabase;
    
    // Text search
    if (query) {
        filtered = filtered.filter(candidate => {
            return candidate.profile.name.toLowerCase().includes(query) ||
                   candidate.professional_data.skills.some(skill => skill.toLowerCase().includes(query)) ||
                   candidate.professional_data.current_role.toLowerCase().includes(query);
        });
    }
    
    // Experience filter
    if (experienceFilter) {
        filtered = filtered.filter(candidate => {
            const years = candidate.professional_data.experience_years;
            switch (experienceFilter) {
                case '0-2': return years <= 2;
                case '3-5': return years >= 3 && years <= 5;
                case '6-10': return years >= 6 && years <= 10;
                case '10+': return years >= 10;
                default: return true;
            }
        });
    }
    
    // Status filter
    if (statusFilter) {
        filtered = filtered.filter(candidate => candidate.metadata.status === statusFilter);
    }
    
    const resultsContainer = document.getElementById('candidateResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = renderCandidateList(filtered);
    }
}

// View detailed candidate profile
function viewCandidateProfile(candidateId) {
    const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
    if (!candidate) {
        showError('Candidate not found');
        return;
    }
    
    currentCandidateView = candidate;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 2100; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 15px; width: 90%; max-width: 800px; height: 90%; display: flex; flex-direction: column;">
            <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: between; align-items: center;">
                <div>
                    <h2 style="margin: 0; color: #1f2937;">${candidate.profile.name}</h2>
                    <p style="margin: 5px 0 0 0; color: #6b7280;">${candidate.professional_data.current_role}</p>
                </div>
                <button onclick="this.closest('.profile-modal').remove()" 
                        style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
            
            <div style="flex: 1; padding: 20px; overflow-y: auto;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                    <div>
                        <h3 style="margin: 0 0 15px 0; color: #1f2937;">Contact Information</h3>
                        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            ${candidate.profile.email ? `<p><strong>Email:</strong> ${candidate.profile.email}</p>` : ''}
                            ${candidate.profile.phone ? `<p><strong>Phone:</strong> ${candidate.profile.phone}</p>` : ''}
                            ${candidate.profile.linkedin ? `<p><strong>LinkedIn:</strong> <a href="${candidate.profile.linkedin}" target="_blank">Profile</a></p>` : ''}
                            ${candidate.profile.location ? `<p><strong>Location:</strong> ${candidate.profile.location}</p>` : ''}
                        </div>
                        
                        <h3 style="margin: 0 0 15px 0; color: #1f2937;">Professional Summary</h3>
                        <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                            <p><strong>Experience:</strong> ${candidate.professional_data.experience_years} years</p>
                            <p><strong>Seniority:</strong> ${candidate.professional_data.seniority_level}</p>
                            <p><strong>Education:</strong> ${candidate.professional_data.education}</p>
                        </div>
                    </div>
                    
                    <div>
                        <h3 style="margin: 0 0 15px 0; color: #1f2937;">Skills & Expertise</h3>
                        <div style="margin-bottom: 20px;">
                            ${candidate.professional_data.skills.map(skill => 
                                `<span style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 12px; margin: 2px; font-size: 14px;">${skill}</span>`
                            ).join('')}
                        </div>
                        
                        <h3 style="margin: 0 0 15px 0; color: #1f2937;">Analysis History</h3>
                        <div style="max-height: 300px; overflow-y: auto;">
                            ${candidate.analysis_history.map(analysis => `
                                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <strong>${analysis.job_title}</strong>
                                        <span style="font-size: 18px; font-weight: bold; color: ${analysis.ai_score >= 80 ? '#10b981' : analysis.ai_score >= 60 ? '#f59e0b' : '#ef4444'};">
                                            ${analysis.ai_score}%
                                        </span>
                                    </div>
                                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                        ${new Date(analysis.analysis_date).toLocaleDateString()}
                                    </p>
                                    ${analysis.feedback_categories && analysis.feedback_categories.length > 0 ? `
                                        <div style="margin-top: 8px;">
                                            ${analysis.feedback_categories.map(cat => 
                                                `<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 8px; font-size: 12px; margin-right: 4px;">${cat}</span>`
                                            ).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <h3 style="margin: 0 0 15px 0; color: #1f2937;">Consent & Data Management</h3>
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px;">
                        <p style="margin: 0; color: #166534;">
                            ✓ Storage consent given on ${new Date(candidate.consent.consent_date).toLocaleDateString()}<br>
                            ✓ Contact permission: ${candidate.consent.contact_permission ? 'Yes' : 'No'}<br>
                            ✓ Data retention: ${candidate.consent.data_retention_days} days
                        </p>
                    </div>
                </div>
                
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button onclick="updateCandidateStatus('${candidate.candidate_id}')" 
                            style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Update Status
                    </button>
                    <button onclick="exportCandidateData('${candidate.candidate_id}')" 
                            style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Export Data
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.className = 'profile-modal';
    document.body.appendChild(modal);
}

// Update candidate status
function updateCandidateStatus(candidateId) {
    const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
    if (!candidate) return;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 2200;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 400px; width: 90%;">
            <h3 style="margin: 0 0 20px 0; color: #1f2937;">Update Status: ${candidate.profile.name}</h3>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px; font-weight: 500;">New Status:</label>
                <select id="newStatus" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                    ${Object.entries(candidateStatuses).map(([key, status]) => 
                        `<option value="${key}" ${candidate.metadata.status === key ? 'selected' : ''}>${status.label}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px; font-weight: 500;">Notes (optional):</label>
                <textarea id="statusNotes" placeholder="Add any notes about this status change..." 
                          style="width: 100%; height: 80px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; resize: vertical;"></textarea>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="this.closest('.status-modal').remove()" 
                        style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 6px; cursor: pointer;">
                    Cancel
                </button>
                <button onclick="confirmStatusUpdate('${candidateId}')" 
                        style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Update Status
                </button>
            </div>
        </div>
    `;
    
    modal.className = 'status-modal';
    document.body.appendChild(modal);
}

// Confirm status update
function confirmStatusUpdate(candidateId) {
    const modal = document.querySelector('.status-modal');
    const newStatus = modal.querySelector('#newStatus').value;
    const notes = modal.querySelector('#statusNotes').value;
    
    const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
    if (candidate) {
        const oldStatus = candidate.metadata.status;
        candidate.metadata.status = newStatus;
        candidate.metadata.last_contacted = new Date().toISOString();
        
        // Track analytics for status change
        trackStatusChange(candidateId, oldStatus, newStatus, {
            notes: notes,
            timestamp: new Date().toISOString(),
            candidateName: candidate.profile.name
        });
        
        // Add status change to analysis history
        if (notes) {
            candidate.analysis_history.push({
                job_id: 'status-update',
                job_title: 'Status Update',
                ai_score: null,
                user_feedback: notes,
                corrected_score: null,
                analysis_date: new Date().toISOString(),
                feedback_categories: ['status-change'],
                status_change: { from: oldStatus, to: newStatus }
            });
        }
        
        saveCandidateDatabase();
        showSuccess(`Status updated to ${candidateStatuses[newStatus].label}`);
        
        // Refresh database view if open
        searchCandidates();
    }
    
    modal.remove();
}

// Delete candidate with confirmation
function deleteCandidateWithConfirm(candidateId) {
    const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
    if (!candidate) return;
    
    const confirmed = confirm(`Are you sure you want to delete ${candidate.profile.name} from the database? This action cannot be undone.`);
    if (confirmed) {
        candidateDatabase = candidateDatabase.filter(c => c.candidate_id !== candidateId);
        saveCandidateDatabase();
        showSuccess('Candidate deleted from database');
        searchCandidates();
    }
}

// Export candidate data
function exportCandidateData(candidateId) {
    const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
    if (!candidate) return;
    
    const exportData = {
        candidate_profile: candidate.profile,
        professional_data: candidate.professional_data,
        analysis_summary: {
            total_analyses: candidate.analysis_history.length,
            average_score: candidate.analysis_history.reduce((sum, a) => sum + (a.ai_score || 0), 0) / candidate.analysis_history.length,
            last_analysis: candidate.analysis_history[candidate.analysis_history.length - 1]?.analysis_date
        },
        export_date: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidate-${candidate.profile.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Candidate data exported!');
}

// Show bulk operations modal
function showBulkOperations() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 2100; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 15px; width: 90%; max-width: 800px; max-height: 90%; display: flex; flex-direction: column;">
            <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: between; align-items: center;">
                <div>
                    <h2 style="margin: 0; color: #1f2937;">Bulk Operations</h2>
                    <p style="margin: 5px 0 0 0; color: #6b7280;">Perform actions on multiple candidates at once</p>
                </div>
                <button onclick="this.closest('.bulk-modal').remove()" 
                        style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
            
            <div style="flex: 1; padding: 20px; overflow-y: auto;">
                <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0 0 10px 0; color: #374151;">Select Candidates</h3>
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <button onclick="selectAllCandidates()" 
                                style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Select All
                        </button>
                        <button onclick="deselectAllCandidates()" 
                                style="padding: 6px 12px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Deselect All
                        </button>
                        <button onclick="filterCandidatesByStatus()" 
                                style="padding: 6px 12px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Filter by Status
                        </button>
                    </div>
                    
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; max-height: 300px; overflow-y: auto; padding: 10px;">
                        ${renderCandidateList(candidateDatabase, true)}
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #374151;">Bulk Actions</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                            <h4 style="margin: 0 0 10px 0; color: #1f2937; font-size: 14px;">Status Update</h4>
                            <select id="bulkStatusSelect" style="width: 100%; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 10px;">
                                <option value="">Select new status...</option>
                                ${Object.entries(candidateStatuses).map(([key, status]) => 
                                    `<option value="${key}">${status.label}</option>`
                                ).join('')}
                            </select>
                            <button onclick="executeBulkStatusUpdate()" 
                                    style="width: 100%; padding: 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                Update Status
                            </button>
                        </div>
                        
                        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                            <h4 style="margin: 0 0 10px 0; color: #1f2937; font-size: 14px;">Send Email</h4>
                            <select id="bulkEmailTemplate" style="width: 100%; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 10px;">
                                <option value="">Select email template...</option>
                                ${Object.entries(emailTemplates).map(([key, template]) => 
                                    `<option value="${key}">${template.name}</option>`
                                ).join('')}
                            </select>
                            <button onclick="executeBulkEmail()" 
                                    style="width: 100%; padding: 8px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                Send Emails
                            </button>
                        </div>
                        
                        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                            <h4 style="margin: 0 0 10px 0; color: #1f2937; font-size: 14px;">Add Tags</h4>
                            <input type="text" id="bulkTags" placeholder="Tag1, Tag2, Tag3..." 
                                   style="width: 100%; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 10px;">
                            <button onclick="executeBulkAddTags()" 
                                    style="width: 100%; padding: 8px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                Add Tags
                            </button>
                        </div>
                        
                        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                            <h4 style="margin: 0 0 10px 0; color: #1f2937; font-size: 14px;">Export Data</h4>
                            <div style="display: flex; flex-direction: column; gap: 5px;">
                                <button onclick="executeBulkExportCSV()" 
                                        style="width: 100%; padding: 6px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                    Export as CSV
                                </button>
                                <button onclick="executeBulkExportJSON()" 
                                        style="width: 100%; padding: 6px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                    Export as JSON
                                </button>
                            </div>
                        </div>
                        
                        <div style="border: 1px solid #8b5cf6; border-radius: 8px; padding: 15px;">
                            <h4 style="margin: 0 0 10px 0; color: #1f2937; font-size: 14px;">📥 Import</h4>
                            <button onclick="showMassImport()" 
                                    style="width: 100%; padding: 8px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                Import Candidates
                            </button>
                        </div>
                        
                        <div style="border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px;">
                            <h4 style="margin: 0 0 10px 0; color: #1f2937; font-size: 14px;">🔗 LinkedIn</h4>
                            <button onclick="showLinkedInConnections()" 
                                    style="width: 100%; padding: 8px; background: #0ea5e9; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                LinkedIn Tools
                            </button>
                        </div>
                        
                        <div style="border: 1px solid #ef4444; border-radius: 8px; padding: 15px;">
                            <h4 style="margin: 0 0 10px 0; color: #ef4444; font-size: 14px;">⚠️ Delete</h4>
                            <button onclick="executeBulkDelete()" 
                                    style="width: 100%; padding: 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                Delete Selected
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="bulkResults" style="margin-top: 20px; display: none;">
                    <h3 style="margin: 0 0 10px 0; color: #374151;">Operation Results</h3>
                    <div id="bulkResultsContent" style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <!-- Results will be populated here -->
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.className = 'bulk-modal';
    document.body.appendChild(modal);
}

// Bulk operation helper functions
function getSelectedCandidateIds() {
    const checkboxes = document.querySelectorAll('.bulk-candidate:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function selectAllCandidates() {
    const checkboxes = document.querySelectorAll('.bulk-candidate');
    checkboxes.forEach(cb => cb.checked = true);
}

function deselectAllCandidates() {
    const checkboxes = document.querySelectorAll('.bulk-candidate');
    checkboxes.forEach(cb => cb.checked = false);
}

function filterCandidatesByStatus() {
    const statusFilter = prompt('Enter status to filter by (available, contacted, interested, interviewing, offered, hired, declined, not_interested, not_suitable):');
    if (!statusFilter || !candidateStatuses[statusFilter]) {
        showError('Invalid status filter.');
        return;
    }
    
    const checkboxes = document.querySelectorAll('.bulk-candidate');
    checkboxes.forEach(cb => {
        const candidate = candidateDatabase.find(c => c.candidate_id === cb.value);
        cb.checked = candidate && candidate.metadata.status === statusFilter;
    });
}

function executeBulkStatusUpdate() {
    const selectedIds = getSelectedCandidateIds();
    const newStatus = document.getElementById('bulkStatusSelect').value;
    
    if (selectedIds.length === 0) {
        showError('Please select at least one candidate.');
        return;
    }
    
    if (!newStatus) {
        showError('Please select a status.');
        return;
    }
    
    const confirmed = confirm(`Update status to "${candidateStatuses[newStatus].label}" for ${selectedIds.length} candidate(s)?`);
    if (!confirmed) return;
    
    let successCount = 0;
    selectedIds.forEach(candidateId => {
        const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
        if (candidate) {
            const oldStatus = candidate.metadata.status;
            candidate.metadata.status = newStatus;
            candidate.metadata.last_contacted = new Date().toISOString();
            
            // Track analytics
            trackStatusChange(candidateId, oldStatus, newStatus, {
                timestamp: new Date().toISOString(),
                candidateName: candidate.profile.name,
                source: 'bulk-operation'
            });
            
            successCount++;
        }
    });
    
    saveCandidateDatabase();
    showBulkResults(`Successfully updated status for ${successCount} candidate(s).`);
}

function executeBulkEmail() {
    const selectedIds = getSelectedCandidateIds();
    const templateKey = document.getElementById('bulkEmailTemplate').value;
    
    if (selectedIds.length === 0) {
        showError('Please select at least one candidate.');
        return;
    }
    
    if (!templateKey) {
        showError('Please select an email template.');
        return;
    }
    
    const template = emailTemplates[templateKey];
    const confirmed = confirm(`Send "${template.name}" email to ${selectedIds.length} candidate(s)?`);
    if (!confirmed) return;
    
    let successCount = 0;
    selectedIds.forEach(candidateId => {
        const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
        if (candidate && candidate.contact_info.email) {
            // Queue email (in real implementation, this would integrate with email service)
            successCount++;
        }
    });
    
    showBulkResults(`Successfully queued ${successCount} email(s) for sending.`);
}

function executeBulkAddTags() {
    const selectedIds = getSelectedCandidateIds();
    const tagsInput = document.getElementById('bulkTags').value;
    
    if (selectedIds.length === 0) {
        showError('Please select at least one candidate.');
        return;
    }
    
    if (!tagsInput.trim()) {
        showError('Please enter tags to add.');
        return;
    }
    
    const newTags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    const confirmed = confirm(`Add tags "${newTags.join(', ')}" to ${selectedIds.length} candidate(s)?`);
    if (!confirmed) return;
    
    let successCount = 0;
    selectedIds.forEach(candidateId => {
        const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
        if (candidate) {
            newTags.forEach(tag => {
                if (!candidate.metadata.tags.includes(tag)) {
                    candidate.metadata.tags.push(tag);
                }
            });
            successCount++;
        }
    });
    
    saveCandidateDatabase();
    showBulkResults(`Successfully added tags to ${successCount} candidate(s).`);
}

function executeBulkExportCSV() {
    const selectedIds = getSelectedCandidateIds();
    
    if (selectedIds.length === 0) {
        showError('Please select at least one candidate.');
        return;
    }
    
    const selectedCandidates = candidateDatabase.filter(c => selectedIds.includes(c.candidate_id));
    const headers = ['Name', 'Email', 'Status', 'Experience Years', 'Current Role', 'Skills', 'Last Contact', 'Tags'];
    
    const data = [headers, ...selectedCandidates.map(candidate => [
        candidate.profile.name,
        candidate.contact_info.email || '',
        candidateStatuses[candidate.metadata.status].label,
        candidate.professional_data.experience_years,
        candidate.professional_data.current_role,
        candidate.professional_data.skills.join('; '),
        candidate.metadata.last_contacted || '',
        candidate.metadata.tags.join('; ')
    ])];
    
    const csvContent = data.map(row => 
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bulk_candidates_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showBulkResults(`Exported ${selectedIds.length} candidate(s) to CSV.`);
}

function executeBulkExportJSON() {
    const selectedIds = getSelectedCandidateIds();
    
    if (selectedIds.length === 0) {
        showError('Please select at least one candidate.');
        return;
    }
    
    const selectedCandidates = candidateDatabase.filter(c => selectedIds.includes(c.candidate_id));
    const exportData = {
        export_date: new Date().toISOString(),
        total_candidates: selectedIds.length,
        candidates: selectedCandidates
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk_candidates_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showBulkResults(`Exported ${selectedIds.length} candidate(s) to JSON.`);
}

function executeBulkDelete() {
    const selectedIds = getSelectedCandidateIds();
    
    if (selectedIds.length === 0) {
        showError('Please select at least one candidate.');
        return;
    }
    
    const confirmed = confirm(`⚠️ PERMANENTLY DELETE ${selectedIds.length} candidate(s)? This action cannot be undone.`);
    if (!confirmed) return;
    
    const secondConfirm = confirm('Are you absolutely sure? This will remove all candidate data permanently.');
    if (!secondConfirm) return;
    
    candidateDatabase = candidateDatabase.filter(c => !selectedIds.includes(c.candidate_id));
    saveCandidateDatabase();
    
    showBulkResults(`Deleted ${selectedIds.length} candidate(s) from database.`);
    
    // Refresh the candidate list in bulk modal
    setTimeout(() => {
        const candidateListContainer = document.querySelector('.bulk-modal .candidates-container');
        if (candidateListContainer) {
            candidateListContainer.innerHTML = renderCandidateList(candidateDatabase, true);
        }
    }, 1000);
}

function showBulkResults(message) {
    const resultsDiv = document.getElementById('bulkResults');
    const resultsContent = document.getElementById('bulkResultsContent');
    
    if (resultsDiv && resultsContent) {
        resultsContent.innerHTML = `
            <div style="color: #059669; font-weight: 500;">
                ✅ ${message}
            </div>
            <div style="color: #6b7280; font-size: 12px; margin-top: 5px;">
                ${new Date().toLocaleString()}
            </div>
        `;
        resultsDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (resultsDiv) resultsDiv.style.display = 'none';
        }, 5000);
    }
    
    showSuccess(message);
}

// Mass candidate import functionality
function showMassImport() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 2200; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 15px; width: 90%; max-width: 900px; max-height: 90%; display: flex; flex-direction: column;">
            <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: between; align-items: center;">
                <div>
                    <h2 style="margin: 0; color: #1f2937;">Mass Candidate Import</h2>
                    <p style="margin: 5px 0 0 0; color: #6b7280;">Import multiple candidates from CSV, JSON, or batch CV upload</p>
                </div>
                <button onclick="this.closest('.import-modal').remove()" 
                        style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
            
            <div style="flex: 1; padding: 20px; overflow-y: auto;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 25px;">
                    <!-- CSV Import -->
                    <div style="border: 2px dashed #d1d5db; border-radius: 10px; padding: 20px; text-align: center; cursor: pointer;" 
                         onclick="document.getElementById('csvImportFile').click()">
                        <div style="font-size: 2rem; margin-bottom: 10px;">📊</div>
                        <h3 style="margin: 0 0 10px 0; color: #1f2937;">CSV Import</h3>
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">Upload a CSV file with candidate data</p>
                        <input type="file" id="csvImportFile" accept=".csv" style="display: none;" onchange="processCsvImport(this)">
                    </div>
                    
                    <!-- JSON Import -->
                    <div style="border: 2px dashed #d1d5db; border-radius: 10px; padding: 20px; text-align: center; cursor: pointer;" 
                         onclick="document.getElementById('jsonImportFile').click()">
                        <div style="font-size: 2rem; margin-bottom: 10px;">🗃️</div>
                        <h3 style="margin: 0 0 10px 0; color: #1f2937;">JSON Import</h3>
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">Import from exported candidate data</p>
                        <input type="file" id="jsonImportFile" accept=".json" style="display: none;" onchange="processJsonImport(this)">
                    </div>
                    
                    <!-- Batch CV Upload -->
                    <div style="border: 2px dashed #d1d5db; border-radius: 10px; padding: 20px; text-align: center; cursor: pointer;" 
                         onclick="document.getElementById('batchCvFiles').click()">
                        <div style="font-size: 2rem; margin-bottom: 10px;">📄</div>
                        <h3 style="margin: 0 0 10px 0; color: #1f2937;">Batch CV Upload</h3>
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">Upload multiple CV files at once</p>
                        <input type="file" id="batchCvFiles" accept=".pdf,.doc,.docx" multiple style="display: none;" onchange="processBatchCvUpload(this)">
                    </div>
                </div>
                
                <!-- CSV Template Download -->
                <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: #0c4a6e;">📋 CSV Template</h4>
                    <p style="margin: 0 0 10px 0; color: #0369a1; font-size: 14px;">
                        Download a CSV template with the correct column format for importing candidates.
                    </p>
                    <button onclick="downloadCsvTemplate()" 
                            style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        Download CSV Template
                    </button>
                </div>
                
                <!-- LinkedIn Import (Future Feature) -->
                <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: #a16207;">🔗 LinkedIn Integration (Coming Soon)</h4>
                    <p style="margin: 0; color: #a16207; font-size: 14px;">
                        Connect your LinkedIn account to import candidate profiles directly from search results.
                    </p>
                </div>
                
                <!-- Import Preview Area -->
                <div id="importPreview" style="display: none; margin-top: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #374151;">Import Preview</h3>
                    <div id="importPreviewContent" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; max-height: 300px; overflow-y: auto;">
                        <!-- Preview content will be populated here -->
                    </div>
                    
                    <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="cancelImport()" 
                                style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            Cancel
                        </button>
                        <button onclick="confirmImport()" 
                                style="padding: 8px 16px; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            Import Candidates
                        </button>
                    </div>
                </div>
                
                <!-- Import Results -->
                <div id="importResults" style="display: none; margin-top: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #374151;">Import Results</h3>
                    <div id="importResultsContent" style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <!-- Results will be populated here -->
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.className = 'import-modal';
    document.body.appendChild(modal);
}

// Global variable to store import data
let pendingImportData = [];

// Download CSV template
function downloadCsvTemplate() {
    const headers = [
        'Name', 'Email', 'Phone', 'Current Role', 'Experience Years', 
        'Skills', 'Education', 'Location', 'Status', 'Tags', 'Notes'
    ];
    
    const sampleData = [
        [
            'John Smith', 'john.smith@email.com', '+1234567890', 'Senior Developer', 
            '5', 'JavaScript, React, Node.js, Python', 'Bachelor Computer Science', 
            'New York, NY', 'available', 'senior, fullstack', 'Excellent problem solver'
        ],
        [
            'Sarah Johnson', 'sarah.j@email.com', '+1987654321', 'Product Manager', 
            '7', 'Product Strategy, Agile, Analytics', 'MBA Business Administration', 
            'San Francisco, CA', 'contacted', 'leadership, product', 'Strong communication skills'
        ]
    ];
    
    const csvContent = [headers, ...sampleData].map(row => 
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'candidate_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('CSV template downloaded!');
}

// Process CSV import
function processCsvImport(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            const lines = csvText.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                showError('CSV file must contain at least a header row and one data row.');
                return;
            }
            
            const headers = parseCsvLine(lines[0]);
            const candidates = [];
            
            for (let i = 1; i < lines.length; i++) {
                const values = parseCsvLine(lines[i]);
                if (values.length >= headers.length) {
                    const candidate = {};
                    headers.forEach((header, index) => {
                        candidate[header.toLowerCase().replace(/\s+/g, '_')] = values[index] || '';
                    });
                    candidates.push(candidate);
                }
            }
            
            pendingImportData = candidates.map(transformCsvToCandidate);
            showImportPreview('CSV', candidates.length);
            
        } catch (error) {
            showError('Failed to parse CSV file: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

// Process JSON import
function processJsonImport(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonData = JSON.parse(e.target.result);
            let candidates = [];
            
            // Handle different JSON formats
            if (Array.isArray(jsonData)) {
                candidates = jsonData;
            } else if (jsonData.candidates && Array.isArray(jsonData.candidates)) {
                candidates = jsonData.candidates;
            } else if (jsonData.candidate_data) {
                candidates = [jsonData.candidate_data];
            } else {
                throw new Error('Unrecognized JSON format');
            }
            
            pendingImportData = candidates.map(transformJsonToCandidate);
            showImportPreview('JSON', candidates.length);
            
        } catch (error) {
            showError('Failed to parse JSON file: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

// Process batch CV upload
function processBatchCvUpload(input) {
    const files = Array.from(input.files);
    if (files.length === 0) return;
    
    showInfo(`Processing ${files.length} CV files...`);
    
    const candidates = files.map((file, index) => {
        return {
            candidate_id: generateCandidateId(),
            profile: {
                name: extractNameFromFilename(file.name),
                source: 'batch_upload'
            },
            contact_info: {
                email: '',
                phone: ''
            },
            professional_data: {
                current_role: 'To be extracted',
                experience_years: 0,
                skills: [],
                education: ''
            },
            metadata: {
                status: 'available',
                tags: ['batch_import'],
                last_contacted: null,
                added_date: new Date().toISOString(),
                consent_given: false,
                data_retention_days: 365
            },
            analysis_history: [],
            cv_file: {
                name: file.name,
                size: file.size,
                type: file.type
            }
        };
    });
    
    pendingImportData = candidates;
    showImportPreview('Batch CV Upload', files.length);
}

// Helper functions
function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result.map(field => field.replace(/^"|"$/g, ''));
}

function transformCsvToCandidate(csvData) {
    return {
        candidate_id: generateCandidateId(),
        profile: {
            name: csvData.name || 'Unknown',
            source: 'csv_import'
        },
        contact_info: {
            email: csvData.email || '',
            phone: csvData.phone || ''
        },
        professional_data: {
            current_role: csvData.current_role || '',
            experience_years: parseInt(csvData.experience_years) || 0,
            skills: csvData.skills ? csvData.skills.split(',').map(s => s.trim()) : [],
            education: csvData.education || ''
        },
        metadata: {
            status: csvData.status || 'available',
            tags: csvData.tags ? csvData.tags.split(',').map(t => t.trim()) : [],
            last_contacted: null,
            added_date: new Date().toISOString(),
            consent_given: true,
            data_retention_days: 365,
            notes: csvData.notes || ''
        },
        analysis_history: []
    };
}

function transformJsonToCandidate(jsonData) {
    // Handle different JSON candidate formats
    return {
        candidate_id: jsonData.candidate_id || generateCandidateId(),
        profile: jsonData.profile || {
            name: jsonData.name || 'Unknown',
            source: 'json_import'
        },
        contact_info: jsonData.contact_info || {
            email: jsonData.email || '',
            phone: jsonData.phone || ''
        },
        professional_data: jsonData.professional_data || {
            current_role: jsonData.current_role || jsonData.role || '',
            experience_years: jsonData.experience_years || jsonData.experience || 0,
            skills: jsonData.skills || [],
            education: jsonData.education || ''
        },
        metadata: {
            ...jsonData.metadata,
            status: jsonData.status || 'available',
            added_date: new Date().toISOString(),
            consent_given: true
        },
        analysis_history: jsonData.analysis_history || []
    };
}

function extractNameFromFilename(filename) {
    return filename
        .replace(/\.(pdf|doc|docx)$/i, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

function generateCandidateId() {
    return 'candidate-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function showImportPreview(type, count) {
    const preview = document.getElementById('importPreview');
    const content = document.getElementById('importPreviewContent');
    
    content.innerHTML = `
        <div style="margin-bottom: 15px;">
            <h4 style="margin: 0; color: #1f2937;">Import Type: ${type}</h4>
            <p style="margin: 5px 0 0 0; color: #6b7280;">Ready to import ${count} candidate(s)</p>
        </div>
        
        <div style="max-height: 200px; overflow-y: auto;">
            ${pendingImportData.slice(0, 5).map((candidate, index) => `
                <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                    <div style="font-weight: 500; color: #1f2937;">${candidate.profile.name}</div>
                    <div style="font-size: 12px; color: #6b7280;">
                        ${candidate.contact_info.email} • ${candidate.professional_data.current_role}
                        ${candidate.professional_data.skills.length > 0 ? ' • ' + candidate.professional_data.skills.slice(0, 3).join(', ') : ''}
                    </div>
                </div>
            `).join('')}
            ${count > 5 ? `<div style="text-align: center; color: #6b7280; font-style: italic;">... and ${count - 5} more candidates</div>` : ''}
        </div>
    `;
    
    preview.style.display = 'block';
}

function confirmImport() {
    if (pendingImportData.length === 0) {
        showError('No candidates to import.');
        return;
    }
    
    let successCount = 0;
    let duplicateCount = 0;
    
    pendingImportData.forEach(candidate => {
        // Check for duplicates by email or name
        const existingCandidate = candidateDatabase.find(c => 
            (candidate.contact_info.email && c.contact_info.email === candidate.contact_info.email) ||
            c.profile.name.toLowerCase() === candidate.profile.name.toLowerCase()
        );
        
        if (existingCandidate) {
            duplicateCount++;
        } else {
            candidateDatabase.push(candidate);
            
            // Track analytics
            trackStatusChange(candidate.candidate_id, null, candidate.metadata.status, {
                timestamp: new Date().toISOString(),
                candidateName: candidate.profile.name,
                source: 'mass-import'
            });
            
            successCount++;
        }
    });
    
    saveCandidateDatabase();
    
    // Show results
    const results = document.getElementById('importResults');
    const resultsContent = document.getElementById('importResultsContent');
    
    resultsContent.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
            <div style="text-align: center;">
                <div style="font-size: 1.5rem; font-weight: bold; color: #059669;">${successCount}</div>
                <div style="font-size: 12px; color: #6b7280;">Successfully Imported</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 1.5rem; font-weight: bold; color: #f59e0b;">${duplicateCount}</div>
                <div style="font-size: 12px; color: #6b7280;">Duplicates Skipped</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 1.5rem; font-weight: bold; color: #3b82f6;">${candidateDatabase.length}</div>
                <div style="font-size: 12px; color: #6b7280;">Total Candidates</div>
            </div>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px;">
            <div style="color: #059669; font-weight: 500;">✅ Import completed successfully!</div>
            <div style="color: #16a34a; font-size: 12px; margin-top: 5px;">
                ${successCount} new candidates added to your database.
                ${duplicateCount > 0 ? `${duplicateCount} duplicates were automatically skipped.` : ''}
            </div>
        </div>
    `;
    
    results.style.display = 'block';
    document.getElementById('importPreview').style.display = 'none';
    
    showSuccess(`Import completed! ${successCount} candidates added, ${duplicateCount} duplicates skipped.`);
    
    // Clear pending data
    pendingImportData = [];
}

function cancelImport() {
    pendingImportData = [];
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importResults').style.display = 'none';
}

// LinkedIn connection and outreach tools
function showLinkedInConnections() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 2200; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 15px; width: 90%; max-width: 800px; max-height: 90%; display: flex; flex-direction: column;">
            <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: between; align-items: center;">
                <div>
                    <h2 style="margin: 0; color: #1f2937;">🔗 LinkedIn Tools</h2>
                    <p style="margin: 5px 0 0 0; color: #6b7280;">Bulk LinkedIn connection and outreach management</p>
                </div>
                <button onclick="this.closest('.linkedin-modal').remove()" 
                        style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
            
            <div style="flex: 1; padding: 20px; overflow-y: auto;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 25px;">
                    <!-- Connection Request Generator -->
                    <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px;">
                        <h3 style="margin: 0 0 15px 0; color: #1f2937; display: flex; align-items: center;">
                            <span style="font-size: 1.5rem; margin-right: 10px;">👋</span>
                            Connection Messages
                        </h3>
                        <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">
                            Generate personalized LinkedIn connection request messages for selected candidates.
                        </p>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Message Template:</label>
                            <select id="linkedinTemplate" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                <option value="professional">Professional Introduction</option>
                                <option value="opportunity">Opportunity Focused</option>
                                <option value="networking">Networking & Growth</option>
                                <option value="industry">Industry Connection</option>
                                <option value="custom">Custom Message</option>
                            </select>
                        </div>
                        
                        <div id="customMessageDiv" style="display: none; margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Custom Message:</label>
                            <textarea id="customLinkedInMessage" placeholder="Hi {name}, I came across your profile..." 
                                      style="width: 100%; height: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; resize: vertical;"></textarea>
                        </div>
                        
                        <button onclick="generateConnectionMessages()" 
                                style="width: 100%; padding: 10px; background: #0ea5e9; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            Generate Messages
                        </button>
                    </div>
                    
                    <!-- LinkedIn Profile URL Generator -->
                    <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px;">
                        <h3 style="margin: 0 0 15px 0; color: #1f2937; display: flex; align-items: center;">
                            <span style="font-size: 1.5rem; margin-right: 10px;">🔍</span>
                            Profile Search
                        </h3>
                        <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">
                            Generate LinkedIn search URLs to find candidate profiles based on their information.
                        </p>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Search Strategy:</label>
                            <select id="searchStrategy" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                <option value="name_company">Name + Current Company</option>
                                <option value="name_skills">Name + Skills</option>
                                <option value="role_location">Role + Location</option>
                                <option value="comprehensive">Comprehensive Search</option>
                            </select>
                        </div>
                        
                        <button onclick="generateLinkedInSearchUrls()" 
                                style="width: 100%; padding: 10px; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            Generate Search URLs
                        </button>
                    </div>
                </div>
                
                <!-- Outreach Campaign Management -->
                <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #1f2937; display: flex; align-items: center;">
                        <span style="font-size: 1.5rem; margin-right: 10px;">📈</span>
                        Outreach Campaign Tracking
                    </h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div style="text-align: center; padding: 10px; background: #f9fafb; border-radius: 6px;">
                            <div style="font-size: 1.2rem; font-weight: bold; color: #3b82f6;">${getLinkedInStat('sent')}</div>
                            <div style="font-size: 12px; color: #6b7280;">Requests Sent</div>
                        </div>
                        <div style="text-align: center; padding: 10px; background: #f9fafb; border-radius: 6px;">
                            <div style="font-size: 1.2rem; font-weight: bold; color: #059669;">${getLinkedInStat('accepted')}</div>
                            <div style="font-size: 12px; color: #6b7280;">Accepted</div>
                        </div>
                        <div style="text-align: center; padding: 10px; background: #f9fafb; border-radius: 6px;">
                            <div style="font-size: 1.2rem; font-weight: bold; color: #f59e0b;">${getLinkedInStat('response_rate')}%</div>
                            <div style="font-size: 12px; color: #6b7280;">Response Rate</div>
                        </div>
                        <div style="text-align: center; padding: 10px; background: #f9fafb; border-radius: 6px;">
                            <div style="font-size: 1.2rem; font-weight: bold; color: #8b5cf6;">${getLinkedInStat('follow_up')}</div>
                            <div style="font-size: 12px; color: #6b7280;">Follow-ups Due</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="showLinkedInCampaigns()" 
                                style="padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            View Campaigns
                        </button>
                        <button onclick="exportLinkedInData()" 
                                style="padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Export Data
                        </button>
                    </div>
                </div>
                
                <!-- LinkedIn Best Practices -->
                <div style="background: #fef3c7; border: 1px solid #fde047; border-radius: 8px; padding: 15px;">
                    <h4 style="margin: 0 0 10px 0; color: #a16207;">💡 LinkedIn Best Practices</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #a16207; font-size: 13px;">
                        <li>Personalize connection requests with candidate's name and relevant details</li>
                        <li>Keep messages under 300 characters for better response rates</li>
                        <li>Wait 3-7 days before sending follow-up messages</li>
                        <li>Respect LinkedIn's weekly connection limits (100-200 requests)</li>
                        <li>Track response rates and adjust messaging strategy accordingly</li>
                    </ul>
                </div>
                
                <!-- Generated Content Display -->
                <div id="linkedinResults" style="display: none; margin-top: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #374151;">Generated Content</h3>
                    <div id="linkedinResultsContent" style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; max-height: 300px; overflow-y: auto;">
                        <!-- Results will be populated here -->
                    </div>
                    <div style="margin-top: 10px; text-align: right;">
                        <button onclick="copyLinkedInContent()" 
                                style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Copy All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.className = 'linkedin-modal';
    document.body.appendChild(modal);
    
    // Add template change listener
    const templateSelect = modal.querySelector('#linkedinTemplate');
    templateSelect.addEventListener('change', function() {
        const customDiv = modal.querySelector('#customMessageDiv');
        customDiv.style.display = this.value === 'custom' ? 'block' : 'none';
    });
}

// LinkedIn message templates
const linkedInMessageTemplates = {
    professional: {
        subject: "Professional connection in {industry}",
        message: "Hi {name}, I noticed your impressive background in {role} and would love to connect. I'm working with exciting opportunities in {industry} and thought you might be interested in learning more. Best regards!"
    },
    opportunity: {
        subject: "Exciting {role} opportunity",
        message: "Hello {name}, I came across your profile and was impressed by your experience in {skills}. I'm currently working on a {role} position that might align with your career goals. Would you be open to a brief conversation?"
    },
    networking: {
        subject: "Growing our {industry} network",
        message: "Hi {name}, I'd love to connect with fellow {industry} professionals. Your background in {role} caught my attention, and I think we could have some valuable insights to share. Looking forward to connecting!"
    },
    industry: {
        subject: "{industry} professional connection",
        message: "Hello {name}, as someone working in {industry}, I appreciate connecting with talented professionals like yourself. Your experience in {role} is exactly what many companies are looking for. Let's connect!"
    }
};

// Get LinkedIn statistics (mock data for now)
function getLinkedInStat(type) {
    const stats = {
        sent: candidateDatabase.filter(c => c.metadata.tags.includes('linkedin_contacted')).length,
        accepted: candidateDatabase.filter(c => c.metadata.tags.includes('linkedin_connected')).length,
        response_rate: 23,
        follow_up: candidateDatabase.filter(c => c.metadata.tags.includes('linkedin_followup')).length
    };
    return stats[type] || 0;
}

// Generate connection messages
function generateConnectionMessages() {
    const selectedIds = getSelectedCandidateIds();
    const templateKey = document.getElementById('linkedinTemplate').value;
    
    if (selectedIds.length === 0) {
        showError('Please select candidates first from the bulk operations panel.');
        return;
    }
    
    let results = [];
    
    selectedIds.forEach(candidateId => {
        const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
        if (candidate) {
            let message;
            
            if (templateKey === 'custom') {
                message = document.getElementById('customLinkedInMessage').value;
            } else {
                const template = linkedInMessageTemplates[templateKey];
                message = template.message;
            }
            
            // Replace placeholders
            const personalizedMessage = message
                .replace(/{name}/g, candidate.profile.name.split(' ')[0])
                .replace(/{role}/g, candidate.professional_data.current_role || 'professional')
                .replace(/{industry}/g, extractIndustryFromRole(candidate.professional_data.current_role))
                .replace(/{skills}/g, candidate.professional_data.skills.slice(0, 2).join(' and ') || 'your field')
                .replace(/{company}/g, candidate.professional_data.company || 'your current company');
            
            results.push({
                name: candidate.profile.name,
                message: personalizedMessage,
                characterCount: personalizedMessage.length,
                linkedinUrl: generateLinkedInSearchUrl(candidate, 'name_company')
            });
        }
    });
    
    displayLinkedInResults('Connection Messages', results.map(r => 
        `<div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 8px;">
                <strong style="color: #1f2937;">${r.name}</strong>
                <span style="font-size: 11px; color: ${r.characterCount > 300 ? '#ef4444' : '#059669'};">
                    ${r.characterCount} chars
                </span>
            </div>
            <div style="background: #f9fafb; padding: 8px; border-radius: 4px; margin-bottom: 8px; font-size: 14px;">
                ${r.message}
            </div>
            <a href="${r.linkedinUrl}" target="_blank" style="font-size: 12px; color: #0ea5e9; text-decoration: none;">
                🔗 Search on LinkedIn
            </a>
        </div>`
    ).join(''));
}

// Generate LinkedIn search URLs
function generateLinkedInSearchUrls() {
    const selectedIds = getSelectedCandidateIds();
    const strategy = document.getElementById('searchStrategy').value;
    
    if (selectedIds.length === 0) {
        showError('Please select candidates first from the bulk operations panel.');
        return;
    }
    
    const results = selectedIds.map(candidateId => {
        const candidate = candidateDatabase.find(c => c.candidate_id === candidateId);
        if (candidate) {
            return {
                name: candidate.profile.name,
                url: generateLinkedInSearchUrl(candidate, strategy),
                strategy: strategy
            };
        }
    }).filter(Boolean);
    
    displayLinkedInResults('LinkedIn Search URLs', results.map(r => 
        `<div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 10px;">
            <div style="font-weight: 500; color: #1f2937; margin-bottom: 5px;">${r.name}</div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Strategy: ${r.strategy.replace('_', ' ')}</div>
            <a href="${r.url}" target="_blank" style="font-size: 12px; color: #0ea5e9; text-decoration: none; word-break: break-all;">
                ${r.url}
            </a>
        </div>`
    ).join(''));
}

// Generate LinkedIn search URL for a candidate
function generateLinkedInSearchUrl(candidate, strategy) {
    const baseUrl = 'https://www.linkedin.com/search/results/people/?keywords=';
    let searchTerms = [];
    
    switch (strategy) {
        case 'name_company':
            searchTerms.push(candidate.profile.name);
            if (candidate.professional_data.company) {
                searchTerms.push(candidate.professional_data.company);
            }
            break;
        case 'name_skills':
            searchTerms.push(candidate.profile.name);
            searchTerms.push(...candidate.professional_data.skills.slice(0, 2));
            break;
        case 'role_location':
            searchTerms.push(candidate.professional_data.current_role);
            if (candidate.contact_info.location) {
                searchTerms.push(candidate.contact_info.location);
            }
            break;
        case 'comprehensive':
            searchTerms.push(candidate.profile.name);
            searchTerms.push(candidate.professional_data.current_role);
            searchTerms.push(...candidate.professional_data.skills.slice(0, 1));
            break;
    }
    
    return baseUrl + encodeURIComponent(searchTerms.join(' '));
}

// Extract industry from role
function extractIndustryFromRole(role) {
    const industryMap = {
        'developer': 'technology',
        'engineer': 'technology', 
        'manager': 'business',
        'analyst': 'analytics',
        'designer': 'design',
        'marketing': 'marketing',
        'sales': 'sales'
    };
    
    const roleLower = (role || '').toLowerCase();
    for (const [keyword, industry] of Object.entries(industryMap)) {
        if (roleLower.includes(keyword)) {
            return industry;
        }
    }
    return 'your industry';
}

// Display LinkedIn results
function displayLinkedInResults(title, content) {
    const results = document.getElementById('linkedinResults');
    const resultsContent = document.getElementById('linkedinResultsContent');
    
    resultsContent.innerHTML = `
        <h4 style="margin: 0 0 15px 0; color: #1f2937;">${title}</h4>
        ${content}
    `;
    
    results.style.display = 'block';
    window.currentLinkedInContent = content;
}

// Copy LinkedIn content to clipboard
function copyLinkedInContent() {
    if (window.currentLinkedInContent) {
        // Extract text content from HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = window.currentLinkedInContent;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        
        navigator.clipboard.writeText(textContent).then(() => {
            showSuccess('Content copied to clipboard!');
        }).catch(() => {
            showError('Failed to copy content. Please copy manually.');
        });
    }
}

// Show LinkedIn campaigns (placeholder)
function showLinkedInCampaigns() {
    showInfo('LinkedIn campaign management coming soon! Track your outreach efforts and response rates.');
}

// Export LinkedIn data
function exportLinkedInData() {
    const linkedinCandidates = candidateDatabase.filter(c => 
        c.metadata.tags.some(tag => tag.includes('linkedin'))
    );
    
    if (linkedinCandidates.length === 0) {
        showError('No LinkedIn outreach data to export.');
        return;
    }
    
    const headers = ['Name', 'LinkedIn Status', 'Contact Date', 'Response Status', 'Follow-up Date'];
    const data = [headers, ...linkedinCandidates.map(candidate => [
        candidate.profile.name,
        candidate.metadata.tags.filter(t => t.includes('linkedin')).join(', '),
        candidate.metadata.last_contacted || '',
        candidate.metadata.tags.includes('linkedin_responded') ? 'Responded' : 'No Response',
        '' // Follow-up date would be calculated based on business logic
    ])];
    
    const csvContent = data.map(row => 
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `linkedin_outreach_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('LinkedIn outreach data exported successfully!');
}

// Enhanced search and filtering functionality
function getTopSkills() {
    const skillCounts = {};
    candidateDatabase.forEach(candidate => {
        if (candidate.professional_data.skills) {
            candidate.professional_data.skills.forEach(skill => {
                skillCounts[skill] = (skillCounts[skill] || 0) + 1;
            });
        }
    });
    
    return Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([skill]) => skill);
}

function performSearch() {
    const startTime = performance.now();
    
    // Get filter values
    const searchTerm = document.getElementById('candidateSearch')?.value.toLowerCase() || '';
    const experience = document.getElementById('experienceFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    const skill = document.getElementById('skillsFilter')?.value || '';
    const source = document.getElementById('sourceFilter')?.value || '';
    const sortBy = document.getElementById('sortBy')?.value || 'recent';
    
    // Apply filters
    let filteredCandidates = candidateDatabase.filter(candidate => {
        // Text search across multiple fields
        if (searchTerm) {
            const searchableText = [
                candidate.profile.name,
                candidate.professional_data.current_role,
                candidate.professional_data.skills.join(' '),
                candidate.professional_data.education,
                candidate.contact_info.email,
                candidate.contact_info.location,
                candidate.professional_data.company,
                candidate.metadata.tags.join(' ')
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        // Experience filter
        if (experience) {
            const years = candidate.professional_data.experience_years;
            switch (experience) {
                case '0-2': if (years > 2) return false; break;
                case '3-5': if (years < 3 || years > 5) return false; break;
                case '6-10': if (years < 6 || years > 10) return false; break;
                case '10+': if (years < 10) return false; break;
            }
        }
        
        // Status filter
        if (status && candidate.metadata.status !== status) {
            return false;
        }
        
        // Skill filter
        if (skill && !candidate.professional_data.skills.includes(skill)) {
            return false;
        }
        
        // Source filter
        if (source && candidate.profile.source !== source) {
            return false;
        }
        
        return true;
    });
    
    // Apply sorting
    filteredCandidates.sort((a, b) => {
        switch (sortBy) {
            case 'score':
                const scoreA = a.analysis_history.length > 0 ? a.analysis_history[a.analysis_history.length - 1].ai_score : 0;
                const scoreB = b.analysis_history.length > 0 ? b.analysis_history[b.analysis_history.length - 1].ai_score : 0;
                return scoreB - scoreA;
            
            case 'name':
                return a.profile.name.localeCompare(b.profile.name);
            
            case 'experience':
                return b.professional_data.experience_years - a.professional_data.experience_years;
            
            case 'last_contacted':
                const dateA = new Date(a.metadata.last_contacted || 0);
                const dateB = new Date(b.metadata.last_contacted || 0);
                return dateB - dateA;
            
            case 'recent':
            default:
                const addedA = new Date(a.metadata.added_date || 0);
                const addedB = new Date(b.metadata.added_date || 0);
                return addedB - addedA;
        }
    });
    
    // Update results
    const resultsContainer = document.getElementById('candidateResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = renderCandidateList(filteredCandidates);
    }
    
    // Update search summary
    const endTime = performance.now();
    updateSearchSummary(filteredCandidates.length, candidateDatabase.length, endTime - startTime);
    
    // Update active filters display
    updateActiveFilters({ searchTerm, experience, status, skill, source, sortBy });
}

function updateSearchSummary(filteredCount, totalCount, searchTime) {
    const resultCount = document.getElementById('resultCount');
    const searchTimeSpan = document.getElementById('searchTime');
    
    if (resultCount) {
        resultCount.textContent = `Showing ${filteredCount} of ${totalCount} candidates`;
    }
    
    if (searchTimeSpan) {
        searchTimeSpan.textContent = `(${Math.round(searchTime)}ms)`;
    }
}

function updateActiveFilters(filters) {
    const activeFiltersDiv = document.getElementById('activeFilters');
    const activeFiltersList = document.getElementById('activeFiltersList');
    
    if (!activeFiltersDiv || !activeFiltersList) return;
    
    const activeFilters = [];
    
    if (filters.searchTerm) activeFilters.push({ type: 'search', value: filters.searchTerm });
    if (filters.experience) activeFilters.push({ type: 'experience', value: filters.experience });
    if (filters.status) activeFilters.push({ type: 'status', value: candidateStatuses[filters.status]?.label || filters.status });
    if (filters.skill) activeFilters.push({ type: 'skill', value: filters.skill });
    if (filters.source) activeFilters.push({ type: 'source', value: filters.source });
    if (filters.sortBy && filters.sortBy !== 'recent') activeFilters.push({ type: 'sort', value: filters.sortBy });
    
    if (activeFilters.length > 0) {
        activeFiltersList.innerHTML = activeFilters.map(filter => `
            <span style="background: #e5e7eb; color: #374151; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                ${filter.type}: ${filter.value}
            </span>
        `).join('');
        activeFiltersDiv.style.display = 'block';
    } else {
        activeFiltersDiv.style.display = 'none';
    }
}

function clearAllFilters() {
    // Reset all filter controls
    const filterIds = ['candidateSearch', 'experienceFilter', 'statusFilter', 'skillsFilter', 'sourceFilter'];
    filterIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });
    
    // Reset sort to default
    const sortElement = document.getElementById('sortBy');
    if (sortElement) {
        sortElement.value = 'recent';
    }
    
    // Perform search to refresh results
    performSearch();
}

// Advanced filters modal
function showAdvancedFilters() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 2300; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 15px; width: 90%; max-width: 700px; max-height: 90%; display: flex; flex-direction: column;">
            <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: between; align-items: center;">
                <div>
                    <h2 style="margin: 0; color: #1f2937;">🎛️ Advanced Filters</h2>
                    <p style="margin: 5px 0 0 0; color: #6b7280;">Fine-tune your candidate search with detailed criteria</p>
                </div>
                <button onclick="this.closest('.advanced-filters-modal').remove()" 
                        style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
            
            <div style="flex: 1; padding: 20px; overflow-y: auto;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                    <!-- Score Range Filter -->
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                        <h3 style="margin: 0 0 15px 0; color: #374151;">⭐ Score Range</h3>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px; font-size: 12px;">Minimum Score:</label>
                            <input type="range" id="minScore" min="0" max="100" value="0" 
                                   style="width: 100%;" oninput="updateScoreDisplay()">
                            <span id="minScoreDisplay" style="font-size: 12px; color: #6b7280;">0</span>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px; font-size: 12px;">Maximum Score:</label>
                            <input type="range" id="maxScore" min="0" max="100" value="100" 
                                   style="width: 100%;" oninput="updateScoreDisplay()">
                            <span id="maxScoreDisplay" style="font-size: 12px; color: #6b7280;">100</span>
                        </div>
                    </div>
                    
                    <!-- Date Range Filter -->
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                        <h3 style="margin: 0 0 15px 0; color: #374151;">📅 Date Range</h3>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px; font-size: 12px;">Added From:</label>
                            <input type="date" id="dateFrom" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px; font-size: 12px;">Added To:</label>
                            <input type="date" id="dateTo" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;">
                        </div>
                    </div>
                    
                    <!-- Tags Filter -->
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                        <h3 style="margin: 0 0 15px 0; color: #374151;">🏷️ Tags</h3>
                        <div style="max-height: 150px; overflow-y: auto;">
                            ${getAvailableTags().map(tag => `
                                <label style="display: block; margin-bottom: 5px; font-size: 12px;">
                                    <input type="checkbox" class="tag-filter" value="${tag}" style="margin-right: 5px;">
                                    ${tag} (${getTagCount(tag)})
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Location Filter -->
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                        <h3 style="margin: 0 0 15px 0; color: #374151;">📍 Location</h3>
                        <input type="text" id="locationFilter" placeholder="City, State, Country..." 
                               style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 10px;">
                        <div style="max-height: 100px; overflow-y: auto;">
                            ${getTopLocations().map(location => `
                                <div style="padding: 4px 8px; background: #f3f4f6; margin: 2px 0; border-radius: 4px; cursor: pointer; font-size: 12px;"
                                     onclick="setLocationFilter('${location}')">
                                    ${location}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Education Filter -->
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                        <h3 style="margin: 0 0 15px 0; color: #374151;">🎓 Education</h3>
                        <select id="educationFilter" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                            <option value="">Any education level</option>
                            <option value="high school">High School</option>
                            <option value="associate">Associate Degree</option>
                            <option value="bachelor">Bachelor's Degree</option>
                            <option value="master">Master's Degree</option>
                            <option value="phd">PhD</option>
                            <option value="certification">Professional Certification</option>
                        </select>
                    </div>
                    
                    <!-- Company Filter -->
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                        <h3 style="margin: 0 0 15px 0; color: #374151;">🏢 Company</h3>
                        <input type="text" id="companyFilter" placeholder="Current or previous company..." 
                               style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 10px;">
                        <div style="max-height: 100px; overflow-y: auto;">
                            ${getTopCompanies().map(company => `
                                <div style="padding: 4px 8px; background: #f3f4f6; margin: 2px 0; border-radius: 4px; cursor: pointer; font-size: 12px;"
                                     onclick="setCompanyFilter('${company}')">
                                    ${company}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- Filter Actions -->
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="resetAdvancedFilters()" 
                            style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Reset All
                    </button>
                    <button onclick="applyAdvancedFilters()" 
                            style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.className = 'advanced-filters-modal';
    document.body.appendChild(modal);
}

// Helper functions for advanced filters
function getAvailableTags() {
    const allTags = new Set();
    candidateDatabase.forEach(candidate => {
        candidate.metadata.tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
}

function getTagCount(tag) {
    return candidateDatabase.filter(c => c.metadata.tags.includes(tag)).length;
}

function getTopLocations() {
    const locations = candidateDatabase
        .map(c => c.contact_info.location)
        .filter(loc => loc)
        .reduce((acc, loc) => {
            acc[loc] = (acc[loc] || 0) + 1;
            return acc;
        }, {});
    
    return Object.entries(locations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([location]) => location);
}

function getTopCompanies() {
    const companies = candidateDatabase
        .map(c => c.professional_data.company)
        .filter(company => company)
        .reduce((acc, company) => {
            acc[company] = (acc[company] || 0) + 1;
            return acc;
        }, {});
    
    return Object.entries(companies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([company]) => company);
}

function updateScoreDisplay() {
    const minScore = document.getElementById('minScore').value;
    const maxScore = document.getElementById('maxScore').value;
    document.getElementById('minScoreDisplay').textContent = minScore;
    document.getElementById('maxScoreDisplay').textContent = maxScore;
}

function setLocationFilter(location) {
    document.getElementById('locationFilter').value = location;
}

function setCompanyFilter(company) {
    document.getElementById('companyFilter').value = company;
}

function resetAdvancedFilters() {
    // Reset all advanced filter inputs
    const inputs = document.querySelectorAll('.advanced-filters-modal input, .advanced-filters-modal select');
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else if (input.type === 'range') {
            input.value = input.id === 'maxScore' ? '100' : '0';
        } else {
            input.value = '';
        }
    });
    updateScoreDisplay();
}

function applyAdvancedFilters() {
    // This would integrate with the main search function
    // For now, we'll close the modal and show a success message
    document.querySelector('.advanced-filters-modal').remove();
    showSuccess('Advanced filters would be applied here. This feature integrates with the main search system.');
}

// Legacy search function (maintained for compatibility)
function searchCandidates() {
    performSearch();
}

// Talent pipeline management
function showPipelineManager() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 2000; padding: 20px;
    `;
    
    const statusGroups = {};
    candidateDatabase.forEach(candidate => {
        const status = candidate.metadata.status;
        if (!statusGroups[status]) statusGroups[status] = [];
        statusGroups[status].push(candidate);
    });
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 15px; width: 95%; max-width: 1400px; height: 90%; display: flex; flex-direction: column;">
            <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: between; align-items: center;">
                <div>
                    <h2 style="margin: 0; color: #1f2937;">Talent Pipeline</h2>
                    <p style="margin: 5px 0 0 0; color: #6b7280;">Kanban-style candidate workflow management</p>
                </div>
                <button onclick="this.closest('.pipeline-modal').remove()" 
                        style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
            
            <div style="flex: 1; padding: 20px; overflow-x: auto;">
                <div style="display: flex; gap: 20px; min-width: 1200px;">
                    ${Object.entries(candidateStatuses).map(([statusKey, status]) => `
                        <div style="flex: 1; min-width: 250px; background: #f9fafb; border-radius: 10px; padding: 15px;">
                            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                                <div style="width: 12px; height: 12px; background: ${status.color}; border-radius: 50%; margin-right: 8px;"></div>
                                <h3 style="margin: 0; color: #1f2937; font-size: 16px;">${status.label}</h3>
                                <span style="margin-left: auto; background: ${status.color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                                    ${(statusGroups[statusKey] || []).length}
                                </span>
                            </div>
                            
                            <div style="max-height: 400px; overflow-y: auto;">
                                ${(statusGroups[statusKey] || []).map(candidate => {
                                    const lastAnalysis = candidate.analysis_history[candidate.analysis_history.length - 1];
                                    return `
                                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 10px; cursor: pointer;"
                                             onclick="viewCandidateProfile('${candidate.candidate_id}')">
                                            <h4 style="margin: 0 0 5px 0; font-size: 14px; color: #1f2937;">${candidate.profile.name}</h4>
                                            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">${candidate.professional_data.current_role}</p>
                                            <div style="display: flex; justify-content: between; align-items: center;">
                                                <span style="font-size: 12px; color: #6b7280;">${candidate.professional_data.experience_years}y exp</span>
                                                <span style="font-weight: bold; color: ${lastAnalysis.ai_score >= 80 ? '#10b981' : lastAnalysis.ai_score >= 60 ? '#f59e0b' : '#ef4444'};">
                                                    ${lastAnalysis.ai_score}%
                                                </span>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                                
                                ${(statusGroups[statusKey] || []).length === 0 ? `
                                    <div style="text-align: center; padding: 20px; color: #9ca3af; font-style: italic;">
                                        No candidates
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    modal.className = 'pipeline-modal';
    document.body.appendChild(modal);
}

// Utility functions
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// =============================================================================
// PHASE 3: INDUSTRY CONFIGURATION & SETUP WIZARD
// =============================================================================

// Show industry selection and setup wizard
function showSetupWizard() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 3000; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 15px; width: 90%; max-width: 800px; height: 90%; display: flex; flex-direction: column;">
            <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: between; align-items: center;">
                <div>
                    <h2 style="margin: 0; color: #1f2937;">Setup New Recruitment Project</h2>
                    <p style="margin: 5px 0 0 0; color: #6b7280;">Configure industry-specific screening criteria</p>
                </div>
                <button onclick="this.closest('.setup-modal').remove()" 
                        style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Cancel
                </button>
            </div>
            
            <div style="flex: 1; padding: 20px; overflow-y: auto;">
                <div id="wizardContent">
                    ${renderStep0_IndustrySelection()}
                </div>
            </div>
        </div>
    `;
    
    modal.className = 'setup-modal';
    document.body.appendChild(modal);
}

// Step 0: Industry Selection
function renderStep0_IndustrySelection() {
    return `
        <div class="wizard-step">
            <h3 style="margin: 0 0 20px 0; color: #1f2937;">Step 0: Select Industry</h3>
            <p style="color: #6b7280; margin-bottom: 30px;">Choose the industry that best matches your recruitment needs. This will customize the AI analysis for industry-specific requirements.</p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                ${Object.entries(industryTemplates).map(([key, industry]) => `
                    <div class="industry-card" onclick="selectIndustry('${key}')" 
                         style="border: 2px solid #e5e7eb; border-radius: 10px; padding: 20px; cursor: pointer; transition: all 0.3s ease;
                                background: white; hover: border-color: #3b82f6;">
                        <h4 style="margin: 0 0 10px 0; color: #1f2937;">${industry.name}</h4>
                        <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">Focus: ${industry.focus_areas.slice(0, 2).join(', ')}</p>
                        
                        <div style="margin-bottom: 10px;">
                            <strong style="font-size: 12px; color: #374151;">Key Criteria:</strong>
                            <ul style="margin: 5px 0 0 0; padding-left: 15px; font-size: 12px; color: #6b7280;">
                                ${Object.entries(industry.scoring_weights).slice(0, 2).map(([criteria, weight]) => 
                                    `<li>${criteria.replace('_', ' ')}: ${weight}%</li>`
                                ).join('')}
                            </ul>
                        </div>
                        
                        ${industry.compliance_requirements.length > 0 ? `
                            <div style="background: #fef3c7; padding: 8px; border-radius: 6px; margin-top: 10px;">
                                <strong style="font-size: 11px; color: #92400e;">Compliance Focus</strong>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Select industry and move to next step
function selectIndustry(industryKey) {
    currentProjectConfig.industry = industryKey;
    currentProjectConfig.industryTemplate = industryTemplates[industryKey];
    
    // Update UI to show selection
    document.querySelectorAll('.industry-card').forEach(card => {
        card.style.borderColor = '#e5e7eb';
        card.style.background = 'white';
    });
    
    event.target.closest('.industry-card').style.borderColor = '#3b82f6';
    event.target.closest('.industry-card').style.background = '#f0f9ff';
    
    setTimeout(() => {
        document.getElementById('wizardContent').innerHTML = renderStep1_RoleConfiguration();
    }, 500);
}

// Step 1: Role Configuration
function renderStep1_RoleConfiguration() {
    const industry = currentProjectConfig.industryTemplate;
    
    return `
        <div class="wizard-step">
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <button onclick="document.getElementById('wizardContent').innerHTML = renderStep0_IndustrySelection()" 
                        style="padding: 4px 8px; background: #f3f4f6; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                    ← Back
                </button>
                <h3 style="margin: 0; color: #1f2937;">Step 1: Role Configuration</h3>
            </div>
            
            <p style="color: #6b7280; margin-bottom: 30px;">Define the specific role requirements for <strong>${industry.name}</strong>.</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div>
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Seniority Level</label>
                    <select id="seniorityLevel" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="">Select level...</option>
                        <option value="junior">Junior (0-2 years)</option>
                        <option value="mid">Mid-level (3-5 years)</option>
                        <option value="senior">Senior (6-10 years)</option>
                        <option value="lead">Lead/Principal (10+ years)</option>
                        <option value="executive">Executive/C-level</option>
                    </select>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Role Type</label>
                    <select id="roleType" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="">Select type...</option>
                        <option value="individual_contributor">Individual Contributor</option>
                        <option value="team_lead">Team Lead (2-5 people)</option>
                        <option value="manager">Manager (6-15 people)</option>
                        <option value="director">Director (15+ people)</option>
                        <option value="specialist">Specialist/Expert</option>
                    </select>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Experience Range</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="number" id="minExperience" placeholder="Min" min="0" max="30" 
                               style="width: 70px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <span>to</span>
                        <input type="number" id="maxExperience" placeholder="Max" min="0" max="30" 
                               style="width: 70px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <span style="color: #6b7280;">years</span>
                    </div>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Location Preference</label>
                    <select id="locationPreference" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="any">Any location</option>
                        <option value="onsite">On-site only</option>
                        <option value="remote">Remote friendly</option>
                        <option value="hybrid">Hybrid preferred</option>
                        <option value="specific">Specific location</option>
                    </select>
                </div>
            </div>
            
            <div style="margin-top: 30px;">
                <button onclick="proceedToStep2()" 
                        style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Next: Requirements →
                </button>
            </div>
        </div>
    `;
}

// Proceed to Step 2
function proceedToStep2() {
    // Validate step 1
    const seniority = document.getElementById('seniorityLevel').value;
    const roleType = document.getElementById('roleType').value;
    
    if (!seniority || !roleType) {
        showError('Please complete all required fields');
        return;
    }
    
    // Save step 1 data
    currentProjectConfig.seniority = seniority;
    currentProjectConfig.roleType = roleType;
    currentProjectConfig.minExperience = parseInt(document.getElementById('minExperience').value) || 0;
    currentProjectConfig.maxExperience = parseInt(document.getElementById('maxExperience').value) || 20;
    currentProjectConfig.locationPreference = document.getElementById('locationPreference').value;
    
    document.getElementById('wizardContent').innerHTML = renderStep2_RequirementsPrioritization();
}

// Step 2: Requirements Prioritization  
function renderStep2_RequirementsPrioritization() {
    const industry = currentProjectConfig.industryTemplate;
    
    return `
        <div class="wizard-step">
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <button onclick="document.getElementById('wizardContent').innerHTML = renderStep1_RoleConfiguration()" 
                        style="padding: 4px 8px; background: #f3f4f6; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                    ← Back
                </button>
                <h3 style="margin: 0; color: #1f2937;">Step 2: Requirements Prioritization</h3>
            </div>
            
            <p style="color: #6b7280; margin-bottom: 30px;">Define what's most important for this ${industry.name} role.</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div>
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Must-Have Skills (max 5)</label>
                    <div id="mustHaveSkills" style="margin-bottom: 10px;">
                        <input type="text" placeholder="Enter skill and press Enter" 
                               style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 5px;"
                               onkeypress="addSkill(event, 'mustHave')">
                        <div id="mustHaveList" style="display: flex; flex-wrap: wrap; gap: 5px;"></div>
                    </div>
                    
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Nice-to-Have Skills (max 5)</label>
                    <div id="niceToHaveSkills">
                        <input type="text" placeholder="Enter skill and press Enter" 
                               style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 5px;"
                               onkeypress="addSkill(event, 'niceToHave')">
                        <div id="niceToHaveList" style="display: flex; flex-wrap: wrap; gap: 5px;"></div>
                    </div>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Deal Breakers (max 3)</label>
                    <div id="dealBreakers" style="margin-bottom: 20px;">
                        <input type="text" placeholder="Enter deal breaker and press Enter" 
                               style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 5px;"
                               onkeypress="addSkill(event, 'dealBreakers')">
                        <div id="dealBreakersList" style="display: flex; flex-wrap: wrap; gap: 5px;"></div>
                    </div>
                    
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Education Requirements</label>
                    <select id="educationRequirement" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="none">No specific requirement</option>
                        <option value="high_school">High School Diploma</option>
                        <option value="associate">Associate Degree</option>
                        <option value="bachelor">Bachelor's Degree</option>
                        <option value="master">Master's Degree</option>
                        <option value="phd">PhD/Doctorate</option>
                        <option value="professional">Professional Certification</option>
                    </select>
                </div>
            </div>
            
            <!-- Industry-specific suggestions -->
            <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px;">
                <h4 style="margin: 0 0 15px 0; color: #1f2937;">💡 ${industry.name} Recommendations</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <strong style="color: #059669;">Positive Indicators:</strong>
                        <ul style="margin: 5px 0 0 0; padding-left: 15px; color: #6b7280; font-size: 14px;">
                            ${industry.positive_indicators.map(indicator => `<li>${indicator}</li>`).join('')}
                        </ul>
                    </div>
                    <div>
                        <strong style="color: #dc2626;">Red Flags:</strong>
                        <ul style="margin: 5px 0 0 0; padding-left: 15px; color: #6b7280; font-size: 14px;">
                            ${industry.red_flags.map(flag => `<li>${flag}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 30px;">
                <button onclick="proceedToStep3()" 
                        style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Next: Scoring Preferences →
                </button>
            </div>
        </div>
    `;
}

// Add skill function
function addSkill(event, category) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = event.target;
        const skill = input.value.trim();
        
        if (!skill) return;
        
        const listId = category + 'List';
        const list = document.getElementById(listId);
        const maxLimits = { mustHave: 5, niceToHave: 5, dealBreakers: 3 };
        
        if (list.children.length >= maxLimits[category]) {
            showError(`Maximum ${maxLimits[category]} items allowed`);
            return;
        }
        
        // Initialize arrays if needed
        if (!currentProjectConfig[category]) currentProjectConfig[category] = [];
        
        if (currentProjectConfig[category].includes(skill)) {
            showError('Item already added');
            return;
        }
        
        currentProjectConfig[category].push(skill);
        
        const tag = document.createElement('span');
        tag.style.cssText = `
            background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 12px; 
            font-size: 12px; display: inline-flex; align-items: center; gap: 5px;
        `;
        tag.innerHTML = `${skill} <button onclick="removeSkill('${skill}', '${category}')" 
                                style="background: none; border: none; color: #1e40af; cursor: pointer;">×</button>`;
        
        list.appendChild(tag);
        input.value = '';
    }
}

// Remove skill function
function removeSkill(skill, category) {
    const index = currentProjectConfig[category].indexOf(skill);
    if (index > -1) {
        currentProjectConfig[category].splice(index, 1);
    }
    
    // Re-render the list
    const listId = category + 'List';
    const list = document.getElementById(listId);
    list.innerHTML = '';
    
    currentProjectConfig[category].forEach(s => {
        const tag = document.createElement('span');
        tag.style.cssText = `
            background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 12px; 
            font-size: 12px; display: inline-flex; align-items: center; gap: 5px;
        `;
        tag.innerHTML = `${s} <button onclick="removeSkill('${s}', '${category}')" 
                                style="background: none; border: none; color: #1e40af; cursor: pointer;">×</button>`;
        list.appendChild(tag);
    });
}

// Proceed to Step 3
function proceedToStep3() {
    // Save step 2 data
    currentProjectConfig.educationRequirement = document.getElementById('educationRequirement').value;
    
    document.getElementById('wizardContent').innerHTML = renderStep3_ScoringPreferences();
}

// Step 3: Scoring Preferences
function renderStep3_ScoringPreferences() {
    const industry = currentProjectConfig.industryTemplate;
    
    return `
        <div class="wizard-step">
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <button onclick="document.getElementById('wizardContent').innerHTML = renderStep2_RequirementsPrioritization()" 
                        style="padding: 4px 8px; background: #f3f4f6; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                    ← Back
                </button>
                <h3 style="margin: 0; color: #1f2937;">Step 3: Scoring Preferences</h3>
            </div>
            
            <p style="color: #6b7280; margin-bottom: 30px;">Customize how the AI weighs different factors when scoring candidates.</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div>
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 500;">Skills vs Experience Balance</label>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 12px; color: #6b7280;">Skills</span>
                            <input type="range" id="skillsExperienceBalance" min="0" max="100" value="60" 
                                   style="flex: 1;" oninput="updateSliderValue('skillsExperienceBalance', this.value)">
                            <span style="font-size: 12px; color: #6b7280;">Experience</span>
                        </div>
                        <div style="text-align: center; margin-top: 5px;">
                            <span id="skillsExperienceBalanceValue" style="font-size: 12px; color: #374151;">60% Skills, 40% Experience</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 500;">Industry Background Importance</label>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 12px; color: #6b7280;">Flexible</span>
                            <input type="range" id="industryImportance" min="0" max="100" value="70" 
                                   style="flex: 1;" oninput="updateSliderValue('industryImportance', this.value)">
                            <span style="font-size: 12px; color: #6b7280;">Strict</span>
                        </div>
                        <div style="text-align: center; margin-top: 5px;">
                            <span id="industryImportanceValue" style="font-size: 12px; color: #374151;">70% - Industry experience preferred</span>
                        </div>
                    </div>
                </div>
                
                <div>
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 500;">Growth Potential vs Current Ability</label>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 12px; color: #6b7280;">Potential</span>
                            <input type="range" id="potentialAbilityBalance" min="0" max="100" value="40" 
                                   style="flex: 1;" oninput="updateSliderValue('potentialAbilityBalance', this.value)">
                            <span style="font-size: 12px; color: #6b7280;">Current</span>
                        </div>
                        <div style="text-align: center; margin-top: 5px;">
                            <span id="potentialAbilityBalanceValue" style="font-size: 12px; color: #374151;">40% Potential, 60% Current Ability</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 500;">Cultural Fit Consideration</label>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 12px; color: #6b7280;">Low</span>
                            <input type="range" id="culturalFitImportance" min="0" max="100" value="50" 
                                   style="flex: 1;" oninput="updateSliderValue('culturalFitImportance', this.value)">
                            <span style="font-size: 12px; color: #6b7280;">High</span>
                        </div>
                        <div style="text-align: center; margin-top: 5px;">
                            <span id="culturalFitImportanceValue" style="font-size: 12px; color: #374151;">50% - Moderate consideration</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Industry Default Weights -->
            <div style="margin-top: 30px; padding: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                <h4 style="margin: 0 0 15px 0; color: #166534;">💡 ${industry.name} Default Weights</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                    ${Object.entries(industry.scoring_weights).map(([criteria, weight]) => `
                        <div style="text-align: center;">
                            <div style="font-weight: 500; color: #1f2937;">${criteria.replace('_', ' ')}</div>
                            <div style="font-size: 24px; color: #059669;">${weight}%</div>
                        </div>
                    `).join('')}
                </div>
                <p style="margin: 15px 0 0 0; color: #166534; font-size: 14px;">These weights are automatically applied based on ${industry.name} best practices. Your preferences above will fine-tune these defaults.</p>
            </div>
            
            <div style="margin-top: 30px;">
                <button onclick="proceedToStep4()" 
                        style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Next: Final Review →
                </button>
            </div>
        </div>
    `;
}

// Update slider values
function updateSliderValue(sliderId, value) {
    const val = parseInt(value);
    const element = document.getElementById(sliderId + 'Value');
    
    switch(sliderId) {
        case 'skillsExperienceBalance':
            element.textContent = `${val}% Skills, ${100-val}% Experience`;
            break;
        case 'industryImportance':
            const industryText = val < 30 ? 'Very flexible on industry' : 
                                val < 50 ? 'Somewhat flexible' : 
                                val < 70 ? 'Industry experience preferred' : 
                                val < 90 ? 'Industry experience important' : 'Industry experience required';
            element.textContent = `${val}% - ${industryText}`;
            break;
        case 'potentialAbilityBalance':
            element.textContent = `${val}% Potential, ${100-val}% Current Ability`;
            break;
        case 'culturalFitImportance':
            const culturalText = val < 30 ? 'Low consideration' : 
                                val < 70 ? 'Moderate consideration' : 'High consideration';
            element.textContent = `${val}% - ${culturalText}`;
            break;
    }
}

// Proceed to Step 4
function proceedToStep4() {
    // Save step 3 data
    currentProjectConfig.skillsExperienceBalance = parseInt(document.getElementById('skillsExperienceBalance').value);
    currentProjectConfig.industryImportance = parseInt(document.getElementById('industryImportance').value);
    currentProjectConfig.potentialAbilityBalance = parseInt(document.getElementById('potentialAbilityBalance').value);
    currentProjectConfig.culturalFitImportance = parseInt(document.getElementById('culturalFitImportance').value);
    
    document.getElementById('wizardContent').innerHTML = renderStep4_FinalReview();
}

// Step 4: Final Review and Context
function renderStep4_FinalReview() {
    const industry = currentProjectConfig.industryTemplate;
    
    return `
        <div class="wizard-step">
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <button onclick="document.getElementById('wizardContent').innerHTML = renderStep3_ScoringPreferences()" 
                        style="padding: 4px 8px; background: #f3f4f6; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                    ← Back
                </button>
                <h3 style="margin: 0; color: #1f2937;">Step 4: Context & Review</h3>
            </div>
            
            <p style="color: #6b7280; margin-bottom: 30px;">Add final context and review your configuration before starting the screening process.</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div>
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Company Stage</label>
                    <select id="companyStage" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 20px;">
                        <option value="startup">Startup (0-50 employees)</option>
                        <option value="growth">Growth (51-500 employees)</option>
                        <option value="enterprise">Enterprise (500+ employees)</option>
                    </select>
                    
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Salary Range (optional)</label>
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 20px;">
                        <input type="number" id="minSalary" placeholder="Min" min="0" 
                               style="flex: 1; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <span>to</span>
                        <input type="number" id="maxSalary" placeholder="Max" min="0" 
                               style="flex: 1; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <select id="salaryCurrency" style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                        </select>
                    </div>
                    
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Timeline Urgency</label>
                    <select id="timelineUrgency" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="flexible">Flexible - Take time to find the right fit</option>
                        <option value="moderate">Moderate - Fill within 1-2 months</option>
                        <option value="urgent">Urgent - Need to fill ASAP</option>
                    </select>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Additional Context</label>
                    <textarea id="additionalContext" placeholder="Any specific requirements, company culture notes, or additional context for this role..." 
                              style="width: 100%; height: 120px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; resize: vertical;"></textarea>
                </div>
            </div>
            
            <!-- Configuration Summary -->
            <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px;">
                <h4 style="margin: 0 0 15px 0; color: #1f2937;">📋 Configuration Summary</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <p><strong>Industry:</strong> ${industry.name}</p>
                        <p><strong>Seniority:</strong> ${currentProjectConfig.seniority}</p>
                        <p><strong>Role Type:</strong> ${currentProjectConfig.roleType.replace('_', ' ')}</p>
                        <p><strong>Experience:</strong> ${currentProjectConfig.minExperience}-${currentProjectConfig.maxExperience} years</p>
                    </div>
                    <div>
                        <p><strong>Must-Have Skills:</strong> ${(currentProjectConfig.mustHave || []).join(', ') || 'None specified'}</p>
                        <p><strong>Deal Breakers:</strong> ${(currentProjectConfig.dealBreakers || []).join(', ') || 'None specified'}</p>
                        <p><strong>Education:</strong> ${currentProjectConfig.educationRequirement}</p>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 30px; display: flex; gap: 15px;">
                <button onclick="saveConfigurationAndClose()" 
                        style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    ✓ Save Configuration & Start Screening
                </button>
                <button onclick="previewGeneratedPrompt()" 
                        style="padding: 10px 20px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    👁️ Preview AI Prompt
                </button>
            </div>
        </div>
    `;
}

// Save configuration and close wizard
function saveConfigurationAndClose() {
    // Save final step data
    currentProjectConfig.companyStage = document.getElementById('companyStage').value;
    currentProjectConfig.minSalary = parseInt(document.getElementById('minSalary').value) || null;
    currentProjectConfig.maxSalary = parseInt(document.getElementById('maxSalary').value) || null;
    currentProjectConfig.salaryCurrency = document.getElementById('salaryCurrency').value;
    currentProjectConfig.timelineUrgency = document.getElementById('timelineUrgency').value;
    currentProjectConfig.additionalContext = document.getElementById('additionalContext').value;
    currentProjectConfig.createdDate = new Date().toISOString();
    
    // Save to localStorage
    localStorage.setItem('currentProjectConfig', JSON.stringify(currentProjectConfig));
    
    // Close wizard
    document.querySelector('.setup-modal').remove();
    
    // Update job requirements with the configuration
    updateJobRequirementsFromConfig();
    
    showSuccess(`Configuration saved! AI is now optimized for ${currentProjectConfig.industryTemplate.name} screening.`);
}

// Preview generated prompt
function previewGeneratedPrompt() {
    const prompt = generateDynamicPrompt();
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 3100; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 15px; width: 90%; max-width: 700px; height: 80%; display: flex; flex-direction: column;">
            <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: between; align-items: center;">
                <h3 style="margin: 0; color: #1f2937;">Generated AI Prompt Preview</h3>
                <button onclick="this.closest('.prompt-modal').remove()" 
                        style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
            
            <div style="flex: 1; padding: 20px; overflow-y: auto;">
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${prompt}</div>
            </div>
        </div>
    `;
    
    modal.className = 'prompt-modal';
    document.body.appendChild(modal);
}

// Generate dynamic prompt based on configuration
function generateDynamicPrompt() {
    const config = currentProjectConfig;
    const industry = config.industryTemplate;
    
    return `You are an expert recruitment AI specialized in ${industry.name} talent assessment.

ROLE SPECIFICATION:
- Position Level: ${config.seniority} ${config.roleType.replace('_', ' ')}
- Experience Range: ${config.minExperience}-${config.maxExperience} years
- Industry: ${industry.name}

MUST-HAVE REQUIREMENTS:
${(config.mustHave || []).map(skill => `- ${skill}`).join('\n')}

NICE-TO-HAVE SKILLS:
${(config.niceToHave || []).map(skill => `- ${skill}`).join('\n')}

DEAL BREAKERS:
${(config.dealBreakers || []).map(breaker => `- ${breaker}`).join('\n')}

SCORING WEIGHTS (Industry-Optimized):
${Object.entries(industry.scoring_weights).map(([criteria, weight]) => 
    `- ${criteria.replace('_', ' ')}: ${weight}%`
).join('\n')}

INDUSTRY-SPECIFIC FOCUS AREAS:
${industry.focus_areas.map(area => `- ${area}`).join('\n')}

RED FLAGS TO WATCH FOR:
${industry.red_flags.map(flag => `- ${flag}`).join('\n')}

POSITIVE INDICATORS:
${industry.positive_indicators.map(indicator => `- ${indicator}`).join('\n')}

${industry.compliance_requirements.length > 0 ? `
COMPLIANCE REQUIREMENTS:
${industry.compliance_requirements.map(req => `- ${req}`).join('\n')}
` : ''}

SCORING PREFERENCES:
- Skills vs Experience Balance: ${config.skillsExperienceBalance || 60}% skills, ${100-(config.skillsExperienceBalance || 60)}% experience
- Industry Background Importance: ${config.industryImportance || 70}% (${config.industryImportance > 70 ? 'strict' : 'flexible'})
- Growth Potential vs Current Ability: ${config.potentialAbilityBalance || 40}% potential, ${100-(config.potentialAbilityBalance || 40)}% current
- Cultural Fit Consideration: ${config.culturalFitImportance || 50}% importance

${config.additionalContext ? `
ADDITIONAL CONTEXT:
${config.additionalContext}
` : ''}

${industry.prompt_additions}

Please analyze the CV against these criteria and provide a score from 0-100 with detailed reasoning.`;
}

// Update job requirements from configuration
function updateJobRequirementsFromConfig() {
    if (!currentProjectConfig.industry) return;
    
    const config = currentProjectConfig;
    jobRequirements = {
        title: `${config.seniority} ${config.roleType.replace('_', ' ')} - ${config.industryTemplate.name}`,
        skills: config.mustHave || [],
        experience: config.maxExperience || 5,
        education: config.educationRequirement || 'bachelor',
        keywords: [...(config.mustHave || []), ...(config.niceToHave || [])],
        industry: config.industry,
        industryTemplate: config.industryTemplate,
        projectConfig: config
    };
}

// =============================================================================
// PHASE 3.3: REAL PDF TEXT EXTRACTION
// =============================================================================

// Extract text from PDF file using PDF.js
async function extractTextFromPDF(file) {
    try {
        showLoading(`Extracting text from ${file.name}...`);
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        let fullText = '';
        let extractedData = {
            rawText: '',
            pages: [],
            contactInfo: {},
            sections: {}
        };
        
        // Extract text from each page
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Combine text items with position awareness
            const pageText = textContent.items
                .sort((a, b) => {
                    // Sort by Y position (top to bottom), then X position (left to right)
                    if (Math.abs(a.transform[5] - b.transform[5]) > 5) {
                        return b.transform[5] - a.transform[5]; // Reverse Y for top-to-bottom
                    }
                    return a.transform[4] - b.transform[4]; // X position left-to-right
                })
                .map(item => item.str)
                .join(' ')
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
            
            extractedData.pages.push(pageText);
            fullText += pageText + '\n';
        }
        
        extractedData.rawText = fullText;
        
        // Enhanced data extraction
        extractedData.contactInfo = extractContactInformation(fullText);
        extractedData.sections = extractCVSections(fullText);
        extractedData.experienceYears = calculateExperienceYears(fullText);
        extractedData.skills = extractSkillsFromText(fullText);
        extractedData.education = extractEducationFromText(fullText);
        extractedData.certifications = extractCertificationsFromText(fullText);
        
        hideLoading();
        return extractedData;
        
    } catch (error) {
        hideLoading();
        console.error('PDF text extraction failed:', error);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
}

// Enhanced contact information extraction
function extractContactInformation(text) {
    const contactInfo = {};
    
    // Email extraction (improved regex)
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const emails = text.match(emailRegex);
    if (emails && emails.length > 0) {
        contactInfo.email = emails[0]; // Take the first email found
    }
    
    // Phone extraction (multiple formats)
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})|(\+\d{1,3}[-.\s]?\d{1,14})/g;
    const phones = text.match(phoneRegex);
    if (phones && phones.length > 0) {
        contactInfo.phone = phones[0].replace(/\s+/g, ' ').trim();
    }
    
    // LinkedIn extraction
    const linkedinRegex = /(linkedin\.com\/in\/[a-zA-Z0-9\-._]+)/gi;
    const linkedin = text.match(linkedinRegex);
    if (linkedin && linkedin.length > 0) {
        contactInfo.linkedin = 'https://' + linkedin[0];
    }
    
    // GitHub extraction
    const githubRegex = /(github\.com\/[a-zA-Z0-9\-._]+)/gi;
    const github = text.match(githubRegex);
    if (github && github.length > 0) {
        contactInfo.github = 'https://' + github[0];
    }
    
    // Location extraction (common patterns)
    const locationPatterns = [
        /(?:Location|Address|Based in|Located in)[:\s]*([A-Za-z\s,]+(?:USA|US|United States|UK|Canada|Australia))/gi,
        /(New York|San Francisco|Los Angeles|Chicago|Boston|Seattle|Austin|Denver|Remote)/gi,
        /([A-Za-z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?)/g // City, ST ZIP
    ];
    
    for (const pattern of locationPatterns) {
        const match = text.match(pattern);
        if (match && match.length > 0) {
            contactInfo.location = match[0].replace(/^(Location|Address|Based in|Located in)[:\s]*/i, '').trim();
            break;
        }
    }
    
    return contactInfo;
}

// Extract CV sections (experience, education, skills, etc.)
function extractCVSections(text) {
    const sections = {};
    
    // Common section headers
    const sectionPatterns = {
        experience: /(?:work\s+)?experience|employment\s+history|professional\s+experience|career\s+history/gi,
        education: /education|academic\s+background|qualifications/gi,
        skills: /skills|technical\s+skills|competencies|expertise/gi,
        certifications: /certifications?|certificates?|licenses?/gi,
        projects: /projects?|portfolio|work\s+samples/gi,
        achievements: /achievements?|accomplishments?|awards?/gi
    };
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const [sectionName, pattern] of Object.entries(sectionPatterns)) {
        const sectionIndex = lines.findIndex(line => pattern.test(line));
        
        if (sectionIndex !== -1) {
            // Find the next section to determine boundaries
            const nextSectionIndex = lines.findIndex((line, index) => {
                if (index <= sectionIndex) return false;
                
                // Check if this line starts a new section
                return Object.values(sectionPatterns).some(p => p !== pattern && p.test(line));
            });
            
            const endIndex = nextSectionIndex !== -1 ? nextSectionIndex : lines.length;
            sections[sectionName] = lines.slice(sectionIndex + 1, endIndex).join('\n');
        }
    }
    
    return sections;
}

// Calculate years of experience from CV text
function calculateExperienceYears(text) {
    // Look for date patterns and employment periods
    const datePatterns = [
        /(\d{4})\s*[-–—]\s*(\d{4}|present|current)/gi,
        /(\d{1,2}\/\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4}|present|current)/gi
    ];
    
    let totalYears = 0;
    const workPeriods = [];
    
    for (const pattern of datePatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const startYear = parseInt(match[1]);
            const endYear = match[2].toLowerCase().includes('present') || match[2].toLowerCase().includes('current') 
                ? new Date().getFullYear() 
                : parseInt(match[2]);
            
            if (startYear && endYear && endYear >= startYear && startYear > 1990) {
                workPeriods.push({ start: startYear, end: endYear });
            }
        }
    }
    
    // Calculate total experience (handling overlaps)
    if (workPeriods.length > 0) {
        workPeriods.sort((a, b) => a.start - b.start);
        
        let lastEnd = 0;
        for (const period of workPeriods) {
            const start = Math.max(period.start, lastEnd);
            const end = period.end;
            
            if (end > start) {
                totalYears += end - start;
                lastEnd = end;
            }
        }
    }
    
    return Math.min(totalYears, 50); // Cap at 50 years for sanity
}

// Extract skills from CV text
function extractSkillsFromText(text) {
    // Common technical skills database
    const skillDatabase = [
        // Programming Languages
        'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'TypeScript',
        
        // Web Technologies
        'React', 'Angular', 'Vue.js', 'Node.js', 'Express', 'HTML', 'CSS', 'SASS', 'LESS', 'jQuery',
        
        // Databases
        'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQL Server', 'SQLite', 'DynamoDB',
        
        // Cloud & DevOps
        'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'CI/CD', 'Terraform',
        
        // Data & Analytics
        'SQL', 'Tableau', 'Power BI', 'Excel', 'R', 'MATLAB', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch',
        
        // Marketing & Sales
        'HubSpot', 'Salesforce', 'Google Analytics', 'AdWords', 'Facebook Ads', 'SEO', 'SEM', 'CRM',
        
        // Design
        'Photoshop', 'Illustrator', 'Figma', 'Sketch', 'InDesign', 'UI/UX', 'Wireframing', 'Prototyping',
        
        // Project Management
        'Agile', 'Scrum', 'Kanban', 'JIRA', 'Trello', 'Asana', 'Monday.com', 'PMP'
    ];
    
    const foundSkills = [];
    const lowerText = text.toLowerCase();
    
    for (const skill of skillDatabase) {
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        if (regex.test(lowerText)) {
            foundSkills.push(skill);
        }
    }
    
    return [...new Set(foundSkills)]; // Remove duplicates
}

// Extract education from CV text
function extractEducationFromText(text) {
    const educationKeywords = [
        'Bachelor', 'Master', 'PhD', 'Doctorate', 'Associate', 'Diploma', 'Certificate',
        'BSc', 'MSc', 'MBA', 'MA', 'BA', 'BS', 'MS', 'PhD'
    ];
    
    const lines = text.split('\n');
    const educationLines = lines.filter(line => 
        educationKeywords.some(keyword => 
            line.toLowerCase().includes(keyword.toLowerCase())
        )
    );
    
    return educationLines.length > 0 ? educationLines[0].trim() : 'Not specified';
}

// Extract certifications from CV text
function extractCertificationsFromText(text) {
    const certificationKeywords = [
        'certified', 'certification', 'certificate', 'licensed', 'accredited',
        'AWS Certified', 'Google Certified', 'Microsoft Certified', 'Cisco Certified',
        'PMP', 'CISSP', 'CISA', 'CPA', 'CFA', 'FRM', 'Six Sigma'
    ];
    
    const lines = text.split('\n');
    const certifications = [];
    
    for (const line of lines) {
        if (certificationKeywords.some(keyword => 
            line.toLowerCase().includes(keyword.toLowerCase())
        )) {
            certifications.push(line.trim());
        }
    }
    
    return certifications.slice(0, 5); // Return top 5 certifications
}

// Update file processing to use real PDF extraction
async function handleFileUpload(files) {
    const validFiles = [];
    
    for (const file of files) {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            try {
                // Use real PDF extraction
                const extractedData = await extractTextFromPDF(file);
                
                validFiles.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    content: extractedData.rawText,
                    extractedData: extractedData // Store all extracted data
                });
            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
                showError(`Failed to extract text from ${file.name}: ${error.message}`);
            }
        } else if (file.type.includes('text') || file.name.toLowerCase().endsWith('.txt')) {
            // Handle text files
            try {
                const text = await file.text();
                validFiles.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    content: text,
                    extractedData: {
                        rawText: text,
                        contactInfo: extractContactInformation(text),
                        sections: extractCVSections(text),
                        experienceYears: calculateExperienceYears(text),
                        skills: extractSkillsFromText(text),
                        education: extractEducationFromText(text),
                        certifications: extractCertificationsFromText(text)
                    }
                });
            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
                showError(`Failed to read ${file.name}: ${error.message}`);
            }
        } else {
            showError(`${file.name} is not a supported format. Please upload PDF or TXT files only.`);
        }
    }
    
    if (validFiles.length > 0) {
        uploadedFiles.push(...validFiles);
        displayFileList();
        document.getElementById('processCvsBtn').disabled = false;
        showSuccess(`${validFiles.length} files processed successfully!`);
    }
}

// Initialize candidate database on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeCandidateDatabase();
});

// Export feedback system for debugging
window.feedbackSystem = {
    getFeedbackStats,
    showFeedbackDashboard,
    feedbackDatabase: () => feedbackDatabase
};

// Export candidate database for debugging
window.candidateSystem = {
    database: () => candidateDatabase,
    showDatabase: showCandidateDatabase,
    showPipeline: showPipelineManager,
    addCandidate: addCandidateToDatabase
};

// =============================================================================
// DATABASE MIGRATION FUNCTIONS - LOCALSTORAGE TO POSTGRESQL
// =============================================================================

// Database connection status
let databaseConnected = false;
let migrationInProgress = false;

// Check database connection status
async function checkDatabaseConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        databaseConnected = data.database === 'connected';
        return databaseConnected;
    } catch (error) {
        console.error('Failed to check database connection:', error);
        databaseConnected = false;
        return false;
    }
}

// Initialize database schema
async function initializeDatabaseSchema() {
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.migration}/init-schema`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to initialize schema: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Database schema initialized:', result.message);
        return true;
    } catch (error) {
        console.error('Failed to initialize database schema:', error);
        throw error;
    }
}

// Migrate data from localStorage to PostgreSQL
async function migrateLocalStorageToDatabase() {
    if (migrationInProgress) {
        showError('Migration already in progress...');
        return;
    }
    
    try {
        migrationInProgress = true;
        showLoading('Migrating data to PostgreSQL database...');
        
        // Check database connection first
        const isConnected = await checkDatabaseConnection();
        if (!isConnected) {
            throw new Error('Database not connected. Please check your PostgreSQL configuration.');
        }
        
        // Collect all localStorage data
        const localStorageData = {
            analysisResults: analysisResults,
            candidateDatabase: candidateDatabase || [],
            feedbackDatabase: feedbackDatabase || [],
            recruiterProfile: recruiterProfile || defaultRecruiterProfile,
            projectConfigs: []
        };
        
        // Collect any saved project configurations
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('projectConfig_')) {
                try {
                    const config = JSON.parse(localStorage.getItem(key));
                    localStorageData.projectConfigs.push(config);
                } catch (e) {
                    console.warn('Failed to parse project config:', key);
                }
            }
        }
        
        console.log('Migrating data:', localStorageData);
        
        // Send data to backend for migration
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.migration}/from-localstorage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ localStorageData })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Migration failed');
        }
        
        const result = await response.json();
        hideLoading();
        
        // Show migration success and statistics
        const stats = await getMigrationStatus();
        showSuccess(`Migration completed successfully! 
                    ${stats.candidates} candidates, 
                    ${stats.jobs} jobs, 
                    ${stats.applications} applications migrated.`);
        
        // Update UI to show database mode
        updateUIForDatabaseMode();
        
        return true;
        
    } catch (error) {
        hideLoading();
        console.error('Migration failed:', error);
        showError(`Migration failed: ${error.message}`);
        return false;
    } finally {
        migrationInProgress = false;
    }
}

// Get migration status and statistics
async function getMigrationStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.migration}/status`);
        if (!response.ok) {
            throw new Error('Failed to get migration status');
        }
        
        const data = await response.json();
        return data.statistics;
    } catch (error) {
        console.error('Failed to get migration status:', error);
        return { candidates: 0, jobs: 0, applications: 0, feedback: 0 };
    }
}

// Update UI to show database mode
function updateUIForDatabaseMode() {
    // Add database status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'database-status';
    statusIndicator.innerHTML = `
        <div class="status-badge database-connected">
            <i class="icon">🗄️</i>
            <span>PostgreSQL Connected</span>
        </div>
    `;
    
    // Add to header if it exists
    const header = document.querySelector('.header');
    if (header) {
        header.appendChild(statusIndicator);
    }
    
    // Update data source in results display
    const resultContainers = document.querySelectorAll('.results-container');
    resultContainers.forEach(container => {
        const dataSource = document.createElement('div');
        dataSource.className = 'data-source-info';
        dataSource.innerHTML = `
            <small><i class="icon">🗄️</i> Using PostgreSQL Database</small>
        `;
        container.prepend(dataSource);
    });
}

// Show migration interface
function showMigrationInterface() {
    const migrationModal = document.createElement('div');
    migrationModal.className = 'modal migration-modal';
    migrationModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🗄️ Database Migration</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="migration-info">
                    <p>This tool can migrate your localStorage data to a PostgreSQL database for:</p>
                    <ul>
                        <li>✅ Persistent data storage</li>
                        <li>✅ Better performance with large datasets</li>
                        <li>✅ Multi-user support</li>
                        <li>✅ Advanced search capabilities</li>
                        <li>✅ Production-ready deployment</li>
                    </ul>
                    
                    <div class="migration-status" id="migrationStatus">
                        <div class="status-item">
                            <strong>Database Status:</strong> 
                            <span id="dbStatus">Checking...</span>
                        </div>
                        <div class="status-item">
                            <strong>Current Data:</strong>
                            <span>${analysisResults.length} analyses, ${candidateDatabase.length} candidates</span>
                        </div>
                    </div>
                    
                    <div class="migration-warnings">
                        <p><strong>⚠️ Before migrating:</strong></p>
                        <ol>
                            <li>Ensure PostgreSQL is running and accessible</li>
                            <li>Set DATABASE_URL environment variable</li>
                            <li>Backup your data if needed</li>
                        </ol>
                    </div>
                </div>
                
                <div class="migration-actions">
                    <button class="btn btn-secondary" onclick="testDatabaseConnection()">
                        Test Connection
                    </button>
                    <button class="btn btn-primary" onclick="startMigration()" id="migrateBtn" disabled>
                        Migrate Data
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(migrationModal);
    
    // Check initial database status
    checkMigrationStatus();
}

// Check migration status and update UI
async function checkMigrationStatus() {
    const statusElement = document.getElementById('dbStatus');
    const migrateBtn = document.getElementById('migrateBtn');
    
    if (!statusElement) return;
    
    try {
        statusElement.textContent = 'Checking...';
        const isConnected = await checkDatabaseConnection();
        
        if (isConnected) {
            statusElement.innerHTML = '<span class="status-connected">✅ Connected</span>';
            if (migrateBtn) migrateBtn.disabled = false;
        } else {
            statusElement.innerHTML = '<span class="status-error">❌ Not Connected</span>';
            if (migrateBtn) migrateBtn.disabled = true;
        }
    } catch (error) {
        statusElement.innerHTML = '<span class="status-error">❌ Error</span>';
        if (migrateBtn) migrateBtn.disabled = true;
    }
}

// Test database connection
async function testDatabaseConnection() {
    showLoading('Testing database connection...');
    
    try {
        const isConnected = await checkDatabaseConnection();
        hideLoading();
        
        if (isConnected) {
            showSuccess('Database connection successful!');
        } else {
            showError('Database connection failed. Please check your PostgreSQL configuration.');
        }
        
        checkMigrationStatus();
    } catch (error) {
        hideLoading();
        showError(`Connection test failed: ${error.message}`);
    }
}

// Start migration process
async function startMigration() {
    const confirmed = confirm(`This will migrate all your localStorage data to PostgreSQL. 
                              Your localStorage data will remain as backup. 
                              Continue?`);
    
    if (!confirmed) return;
    
    try {
        await initializeDatabaseSchema();
        const success = await migrateLocalStorageToDatabase();
        
        if (success) {
            // Close migration modal
            const modal = document.querySelector('.migration-modal');
            if (modal) modal.remove();
        }
    } catch (error) {
        showError(`Migration setup failed: ${error.message}`);
    }
}

// Database API functions for frontend use
const DatabaseAPI = {
    // Candidate operations
    async createCandidate(candidateData) {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.candidates}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(candidateData)
        });
        return response.json();
    },
    
    async searchCandidates(searchParams) {
        const params = new URLSearchParams(searchParams);
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.candidates}/search?${params}`);
        return response.json();
    },
    
    async getCandidates() {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.candidates}`);
        return response.json();
    },
    
    // Job operations
    async createJob(jobData) {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.jobs}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobData)
        });
        return response.json();
    },
    
    async getJobs() {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.jobs}`);
        return response.json();
    },
    
    // Application operations
    async createApplication(applicationData) {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.applications}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applicationData)
        });
        return response.json();
    },
    
    async updateApplicationStatus(candidateId, jobId, status, userScore) {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.applications}/${candidateId}/${jobId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, user_score: userScore })
        });
        return response.json();
    },
    
    // Feedback operations
    async createFeedback(feedbackData) {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.feedback}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feedbackData)
        });
        return response.json();
    }
};

// Auto-check database connection on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const isConnected = await checkDatabaseConnection();
        if (isConnected) {
            console.log('✅ PostgreSQL database connected');
            updateUIForDatabaseMode();
        } else {
            console.log('⚠️ Using localStorage mode - database not connected');
        }
    } catch (error) {
        console.log('⚠️ Database check failed - using localStorage mode');
    }
});

// Export migration functions for console access
window.databaseMigration = {
    showInterface: showMigrationInterface,
    migrate: migrateLocalStorageToDatabase,
    testConnection: testDatabaseConnection,
    getStatus: getMigrationStatus,
    API: DatabaseAPI
};

console.log('🎯 CV Screening Tool with Feedback System loaded!');
console.log('📊 Phase 4: Candidate Database & Talent Pipeline ready!');
console.log('🗄️ PostgreSQL Migration Support ready!');
console.log('📧 Built by Streets Digital - andrew@streetsdigital.com');