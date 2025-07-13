# AI CV Screening Platform - Product Requirements Document
## From Learning Tool → Global Recruitment Platform

**Version:** 2.0  
**Date:** January 2025  
**Owner:** Streets Digital  
**Status:** Phase 1 Complete → Planning Phase 2-4

---

## 🎯 **Vision & Strategy**

### **Current State (Phase 1 ✅ Complete)**
- Basic AI CV screening tool with feedback system
- 👍👎 feedback collection implemented
- Secure backend with rate limiting
- Demo + real AI modes functional
- Data persistence in localStorage

### **Target State (Phases 2-4)**
- **Global recruitment platform** serving any industry
- **Learning AI system** that adapts to each recruiter's preferences
- **Talent pipeline management** with searchable CV database
- **Enterprise-ready** solution with team collaboration
- **Revenue model** supporting $500/month ARR per user

---

## 📋 **Phase 2: Score Correction & Advanced Feedback**
**Timeline:** 2-3 weeks  
**Goal:** Replace basic feedback with detailed correction system

### **2.1 Score Adjustment Interface**
**Priority:** High | **Effort:** Medium

**Requirements:**
- Replace 👍👎 buttons with score adjustment slider (0-100)
- Show AI score vs user-corrected score side-by-side
- Require minimum score difference (±10) to trigger correction flow
- Visual feedback showing score change impact

**Acceptance Criteria:**
- [ ] User can adjust any AI score from 0-100 with slider
- [ ] Slider shows real-time score changes with color coding
- [ ] Score differences ≥10 points trigger "Why was this wrong?" flow
- [ ] Original AI score preserved alongside corrected score
- [ ] Smooth animations for score adjustments

**Technical Implementation:**
```html
<div class="score-correction">
  <div class="score-comparison">
    <div class="ai-score">AI: 85%</div>
    <div class="user-score">Your Score: <span id="userScore">75%</span></div>
  </div>
  <input type="range" min="0" max="100" value="85" class="score-slider">
  <button class="apply-correction">Apply Correction</button>
</div>
```

### **2.2 Detailed Feedback Collection**
**Priority:** High | **Effort:** Medium

**Requirements:**
- Multi-select reason categories for score corrections
- Free-text feedback field for specific insights
- Context-aware suggestions based on correction type
- Feedback categorization (skills, experience, cultural fit, etc.)

**Feedback Categories:**
- **Skills Mismatch:** Required skills missing/over-emphasized
- **Experience Level:** Too junior/senior for role requirements
- **Industry Background:** Different industry experience needed
- **Overqualified:** Candidate exceeds role requirements significantly
- **Underqualified:** Candidate lacks fundamental requirements
- **Cultural Fit:** Team/company culture considerations
- **Location/Remote:** Geographic or work arrangement issues
- **Salary Expectations:** Compensation misalignment
- **Growth Potential:** Learning ability vs current skill set

**Acceptance Criteria:**
- [ ] 9 standardized correction categories implemented
- [ ] Multi-select interface allows multiple reasons
- [ ] Free-text field with 500 character limit
- [ ] Smart suggestions based on job requirements
- [ ] Correction patterns tracked per user

### **2.3 Learning Algorithm Foundation**
**Priority:** Medium | **Effort:** High

**Requirements:**
- Personal recruiter profiles with preference weights
- Scoring bias adjustments based on feedback patterns
- A/B testing framework for prompt modifications
- Feedback impact measurement system

**Recruiter Profile Schema:**
```json
{
  "recruiter_id": "uuid",
  "preference_weights": {
    "skills_importance": 1.2,
    "experience_weight": 0.9,
    "industry_strictness": 1.1,
    "growth_potential_value": 0.8
  },
  "correction_patterns": {
    "tends_to_prefer_overqualified": true,
    "strict_on_industry_match": false,
    "values_potential_over_experience": true
  },
  "learning_stats": {
    "total_corrections": 47,
    "accuracy_improvement": "+12%",
    "last_learning_update": "2025-01-15"
  }
}
```

---

## 📋 **Phase 3: Industry Configuration & Scalability**
**Timeline:** 3-4 weeks  
**Goal:** Transform from single-use tool to multi-industry platform

### **3.1 Pre-Qualifying Questionnaire System**
**Priority:** High | **Effort:** High

**Requirements:**
- Multi-step setup wizard for new recruitment projects
- Industry-specific question flows
- Dynamic prompt generation based on selections
- Configuration templates for common roles

**Setup Flow:**
```
Step 0: Industry Selection (6 major industries)
├── Technology & Software
├── Healthcare & Medical
├── Finance & Banking
├── Sales & Business Development
├── Marketing & Creative
└── Legal & Professional Services

Step 1: Role Configuration
├── Seniority Level (Junior/Mid/Senior/Executive)
├── Role Type (IC/Manager/Specialist/Leadership)
├── Team Size (if management role)
└── Department (Engineering/Product/Operations/etc.)

Step 2: Requirements Prioritization
├── Must-Have Skills (max 5)
├── Nice-to-Have Skills (max 5)
├── Deal Breakers (max 3)
├── Experience Range (min-max years)
└── Education Requirements

Step 3: Scoring Preferences
├── Skills vs Experience weight (slider)
├── Industry background importance (slider)
├── Growth potential vs current ability (slider)
└── Cultural fit consideration level (slider)

Step 4: Context & Constraints
├── Company stage (Startup/Growth/Enterprise)
├── Remote work policy
├── Salary range (optional)
└── Timeline urgency
```

**Acceptance Criteria:**
- [ ] 5-step wizard completed in <3 minutes
- [ ] Industry-specific questions and prompts
- [ ] Configuration saved and reusable
- [ ] Preview of generated AI prompt before processing
- [ ] Ability to modify configuration mid-process

### **3.2 Industry-Specific Prompt Templates**
**Priority:** High | **Effort:** Medium

**Requirements:**
- 6 industry-specific prompt templates
- Role-specific scoring criteria
- Industry red flags and positive indicators
- Compliance and certification awareness

**Template Structure:**
```javascript
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
  }
  // ... 4 more industries
};
```

### **3.3 Real PDF Text Extraction**
**Priority:** High | **Effort:** Medium

**Requirements:**
- Client-side PDF parsing using PDF.js
- Text extraction with structure preservation
- Experience timeline calculation
- Skills extraction from context

**Technical Implementation:**
```javascript
// PDF.js integration for real text extraction
import * as pdfjsLib from 'pdfjs-dist';

async function extractTextFromPDF(file) {
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
}
```

---

## 📋 **Phase 4: CV Database & Talent Pipeline**
**Timeline:** 4-5 weeks  
**Goal:** Create persistent talent pipeline management system

### **4.1 CV Database Architecture**
**Priority:** High | **Effort:** High

**Requirements:**
- Searchable candidate database with consent management
- Cross-role candidate discovery
- Talent pipeline visualization
- GDPR-compliant data handling

**Database Schema:**
```json
{
  "candidate_id": "uuid",
  "profile": {
    "name": "Sarah Johnson",
    "email": "sarah@example.com",
    "phone": "+1234567890",
    "linkedin": "linkedin.com/in/sarah",
    "location": "San Francisco, CA"
  },
  "professional_data": {
    "experience_years": 7,
    "current_role": "Senior Marketing Manager",
    "industry_background": ["SaaS", "Technology"],
    "seniority_level": "senior",
    "skills": ["HubSpot", "Analytics", "Automation"],
    "certifications": ["HubSpot Certified", "Google Analytics"],
    "education": "Bachelor's Marketing"
  },
  "analysis_history": [
    {
      "job_id": "uuid",
      "job_title": "Marketing Manager",
      "ai_score": 94,
      "user_feedback": "good",
      "corrected_score": null,
      "analysis_date": "2025-01-10"
    }
  ],
  "consent": {
    "storage_agreed": true,
    "contact_permission": true,
    "data_retention_days": 365,
    "consent_date": "2025-01-10"
  },
  "metadata": {
    "upload_date": "2025-01-10",
    "last_contacted": null,
    "status": "available",
    "tags": ["high-potential", "saa-background"]
  }
}
```

### **4.2 Database Search & Matching**
**Priority:** High | **Effort:** High

**Requirements:**
- Semantic search across candidate profiles
- Advanced filtering by multiple criteria
- AI-powered candidate-job matching
- Search result ranking and explanation

**Search Interface:**
```html
<div class="database-search">
  <div class="search-header">
    <h3>Search Talent Database</h3>
    <div class="database-stats">
      <span>247 candidates • 18 added this month</span>
    </div>
  </div>
  
  <div class="search-filters">
    <input type="text" placeholder="Search skills, experience, or keywords">
    
    <div class="filter-group">
      <label>Experience Range:</label>
      <select name="minExperience">
        <option value="0">Any</option>
        <option value="2">2+ years</option>
        <option value="5">5+ years</option>
        <option value="10">10+ years</option>
      </select>
    </div>
    
    <div class="filter-group">
      <label>Industry:</label>
      <select multiple name="industries">
        <option value="technology">Technology</option>
        <option value="healthcare">Healthcare</option>
        <option value="finance">Finance</option>
      </select>
    </div>
    
    <div class="filter-group">
      <label>Availability:</label>
      <select name="availability">
        <option value="all">All Candidates</option>
        <option value="available">Available</option>
        <option value="passive">Open to Opportunities</option>
      </select>
    </div>
  </div>
  
  <button class="search-button">Search Database</button>
</div>
```

### **4.3 Talent Pipeline Workflow**
**Priority:** Medium | **Effort:** Medium

**Requirements:**
- Candidate status tracking (Available/Contacted/Interviewing/Hired)
- Communication history logging
- Automated follow-up reminders
- Pipeline analytics and reporting

**Status Management:**
```javascript
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
```

---

## 📋 **Phase 5: Enterprise Features & Team Collaboration**
**Timeline:** 5-6 weeks  
**Goal:** Scale to enterprise customers with team features

### **5.1 Multi-User Team Management**
**Priority:** Medium | **Effort:** High

**Requirements:**
- Team workspace with role-based permissions
- Shared candidate database across team members
- Collaborative feedback and decision-making
- Team performance analytics

**User Roles:**
- **Admin:** Full access, team management, billing
- **Manager:** Team oversight, advanced analytics, approval workflows
- **Recruiter:** Full recruiting functionality, candidate management
- **Viewer:** Read-only access, basic reporting

### **5.2 Advanced Analytics Dashboard**
**Priority:** Medium | **Effort:** Medium

**Requirements:**
- Team performance metrics
- AI accuracy trends over time
- Recruitment funnel analytics
- ROI and time-saved calculations

**Key Metrics:**
- CVs processed per month
- Average time per screening
- Accuracy improvement rates
- Successful hire correlation
- Cost per hire reduction
- Team productivity metrics

### **5.3 Integration Ecosystem**
**Priority:** Low | **Effort:** High

**Requirements:**
- ATS system integrations (Greenhouse, Lever, BambooHR)
- Calendar scheduling (Google Calendar, Outlook)
- Communication tools (Slack, Teams, Email)
- CRM systems (HubSpot, Salesforce)

---

## 🏗️ **Technical Architecture Evolution**

### **Current Architecture (Phase 1)**
```
Frontend (Static) → Backend (Express) → Claude API
                ↓
        localStorage (Feedback)
```

### **Target Architecture (Phase 4)**
```
React Frontend → Node.js API → PostgreSQL Database
                     ↓              ↓
            Claude API + Cache → Redis Cache
                     ↓
            Background Jobs → Queue System
                     ↓
            Analytics → Data Warehouse
```

### **Infrastructure Requirements**
- **Database:** PostgreSQL for structured data, Redis for caching
- **Authentication:** Auth0 or similar for enterprise SSO
- **File Storage:** AWS S3 for CV document storage
- **Queue System:** Bull/Redis for background processing
- **Monitoring:** DataDog or similar for performance tracking
- **CDN:** CloudFlare for global performance

---

## 💰 **Business Model & Pricing Strategy**

### **Freemium Model**
**Free Tier:**
- 10 CV screenings per month
- Basic feedback system
- 1 industry template
- Individual use only

**Professional ($99/month):**
- 500 CV screenings per month
- All industry templates
- CV database (up to 1,000 candidates)
- Advanced feedback system
- Basic analytics

**Team ($299/month):**
- 2,000 CV screenings per month
- Unlimited database
- Team collaboration features
- Advanced analytics
- Priority support
- Up to 10 team members

**Enterprise ($799/month):**
- Unlimited screenings
- Custom industry templates
- SSO integration
- API access
- Custom reporting
- Dedicated success manager
- Unlimited team members

### **Revenue Projections**
**Year 1 Goals:**
- 100 Free users → 20 Professional conversions
- 20 Professional → 5 Team upgrades
- 5 Team → 1 Enterprise

**Monthly Recurring Revenue:**
- Professional: 20 × $99 = $1,980
- Team: 5 × $299 = $1,495
- Enterprise: 1 × $799 = $799
- **Total MRR:** $4,274

---

## 📊 **Success Metrics & KPIs**

### **Product Metrics**
- **User Engagement:** Daily/Monthly Active Users
- **Feature Adoption:** % users using feedback system
- **Accuracy Improvement:** AI learning effectiveness
- **Time Saved:** Manual vs AI screening time

### **Business Metrics**
- **Customer Acquisition Cost (CAC)**
- **Lifetime Value (LTV)**
- **Monthly Recurring Revenue (MRR) Growth**
- **Churn Rate** by pricing tier
- **Net Promoter Score (NPS)**

### **Technical Metrics**
- **Response Time:** <3 seconds for CV analysis
- **Uptime:** 99.9% availability
- **Error Rate:** <0.1% failed analyses
- **Feedback Collection Rate:** >60% of analyses

---

## 🎯 **Go-to-Market Strategy**

### **Phase 2-3: Product-Market Fit**
- **Target:** Independent recruiters and small agencies
- **Channel:** Direct website, content marketing
- **Message:** "AI that learns your preferences"
- **Goal:** 100 active users, strong feedback loops

### **Phase 4-5: Scale & Enterprise**
- **Target:** Mid-market companies, large agencies
- **Channel:** Sales team, partner integrations
- **Message:** "Complete talent pipeline platform"
- **Goal:** $50K+ MRR, enterprise customers

### **Content Marketing Strategy**
- **Blog:** Recruitment best practices, AI insights
- **Videos:** Product demos, customer success stories
- **Webinars:** Industry-specific recruitment strategies
- **Case Studies:** ROI and efficiency improvements

---

## ⚠️ **Risks & Mitigation Strategies**

### **Technical Risks**
- **AI Accuracy Decline:** Continuous model monitoring and retraining
- **Scaling Issues:** Load testing and infrastructure planning
- **Data Privacy:** GDPR compliance and security audits

### **Business Risks**
- **Competitive Pressure:** Focus on unique learning capabilities
- **Market Saturation:** Expand to adjacent markets (HR analytics)
- **Economic Downturn:** Prove ROI and cost savings clearly

### **Product Risks**
- **Feature Complexity:** User testing and gradual rollouts
- **User Adoption:** Strong onboarding and customer success
- **Feedback Quality:** Gamification and incentive systems

---

## 🛣️ **Implementation Roadmap**

### **Q1 2025: Foundation (Phases 2-3)**
- Week 1-3: Score correction system
- Week 4-6: Industry configuration
- Week 7-9: Real PDF parsing
- Week 10-12: Basic CV database

### **Q2 2025: Scale (Phase 4)**
- Month 1: Advanced search and matching
- Month 2: Talent pipeline workflow
- Month 3: Team collaboration features

### **Q3 2025: Enterprise (Phase 5)**
- Month 1: Advanced analytics
- Month 2: Integration ecosystem
- Month 3: Enterprise sales and onboarding

### **Q4 2025: Growth & Optimization**
- Month 1: Performance optimization
- Month 2: Advanced AI features
- Month 3: Market expansion planning

---

## ✅ **Next Actions Required**

### **Immediate (This Week)**
1. **Deploy Phase 1** with feedback system to production
2. **User testing** with 5-10 recruiters to validate feedback UX
3. **Collect initial feedback data** to inform Phase 2 design

### **Short Term (Next 2 Weeks)**
1. **Design score correction interface** mockups
2. **Plan industry configuration system** architecture
3. **Research PDF parsing libraries** and integration approach

### **Medium Term (Next Month)**
1. **Develop Phase 2** score correction system
2. **Begin industry template** creation
3. **Plan database architecture** for Phase 4

---

*This PRD will evolve as we gather user feedback and validate assumptions. The goal is to transform from a demo tool into a defensible, scalable recruitment platform that becomes indispensable to users through continuous learning and improvement.*