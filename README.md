# CV Screening Tool - Recruitment Automation Suite

An AI-powered CV screening platform that evolves from basic resume analysis to a comprehensive recruitment automation suite with candidate pool management, email automation, and LinkedIn integration.

## 🎯 Overview

This platform transforms the recruitment process by combining AI-powered CV analysis with intelligent automation features:

- **🤖 AI CV Screening** - Intelligent resume analysis with learning feedback system
- **🔍 Candidate Pool Search** - Smart suggestions from historical candidate database  
- **📧 Email Automation** - Automated interview invitations and candidate communication
- **🔗 LinkedIn Integration** - Professional networking and relationship management

## ✨ Current Features (Phase 1)

- AI-powered CV scoring using Claude API
- Interactive feedback system for AI learning
- Secure backend with rate limiting
- Real-time CV analysis and scoring
- Demo and production modes

## 🚀 Planned Features (Phase 2.5)

See `recruitment-automation-suite-prd.md` for detailed specifications:

### Candidate Pool Search & Suggestions
- Persistent candidate database with consent management
- Intelligent matching algorithm with explainable scoring
- Two-tiered results: current applicants + historical suggestions
- Advanced filtering and search capabilities

### Interview Invitation Automation  
- SendGrid/Mailgun email service integration
- Customizable email templates with personalization
- Automated triggers based on candidate status changes
- Email delivery tracking and analytics

### LinkedIn Pipeline Management
- LinkedIn connection facilitation with pre-filled messages
- Connection status tracking and relationship timeline
- Professional networking analytics dashboard
- Optional Chrome extension for enhanced workflow

## 🏗️ Technical Architecture

### Current Stack
- **Frontend**: Static HTML/CSS/JavaScript
- **Backend**: Node.js with Express
- **AI**: Anthropic Claude API
- **Storage**: localStorage (Phase 1)

### Planned Stack (Phase 2.5)
- **Frontend**: React with modern UI components
- **Backend**: Node.js API server with Express
- **Database**: PostgreSQL with Redis caching
- **Email**: SendGrid/Mailgun integration
- **Queue**: Bull/Redis for background jobs
- **Monitoring**: Analytics and performance tracking

## 📋 Prerequisites

- Node.js 16+ 
- npm or yarn
- Anthropic Claude API key
- (Future) PostgreSQL database
- (Future) SendGrid/Mailgun account

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cv-screening-tool.git
   cd cv-screening-tool
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Claude API key
   ```

4. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the application**
   - Open http://localhost:3000 in your browser

## 📁 Project Structure

```
cv-screening-tool-updated/
├── public/                 # Frontend static files
│   ├── index.html         # Main application interface
│   └── functions.js       # Frontend JavaScript logic
├── routes/                # API route handlers (Phase 2.5)
├── database/             # Database migrations and setup (Phase 2.5)
├── server.js             # Express server and API endpoints
├── package.json          # Project dependencies and scripts
├── prd.md               # Original product requirements
├── recruitment-automation-suite-prd.md  # Phase 2.5 detailed specifications
└── README.md            # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Required
ANTHROPIC_API_KEY=your_claude_api_key_here

# Optional
PORT=3000
NODE_ENV=development

# Phase 2.5 (Future)
DATABASE_URL=postgresql://...
SENDGRID_API_KEY=your_sendgrid_key
REDIS_URL=redis://localhost:6379
```

### Rate Limiting

The API includes rate limiting:
- 100 requests per 15 minutes per IP
- Configurable in `server.js`

## 📖 Usage

### Basic CV Screening

1. **Upload CV**: Drag and drop or select PDF files
2. **Job Description**: Enter the job requirements and description
3. **AI Analysis**: System provides scoring and detailed feedback
4. **User Feedback**: Rate the AI analysis to improve future results
5. **Results**: View comprehensive candidate evaluation

### Demo Mode

- Use "Demo Mode" toggle for testing without API calls
- Simulates AI responses for development and demonstration

## 📊 API Documentation

### Current Endpoints

#### POST /api/analyze-cv
Analyzes a CV against job requirements.

**Request:**
```json
{
  "cvText": "Resume content...",
  "jobDescription": "Job requirements...",
  "demoMode": false
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "score": 85,
    "summary": "Strong candidate with relevant experience...",
    "strengths": ["Technical skills", "Leadership experience"],
    "concerns": ["Limited industry experience"],
    "recommendation": "Proceed to interview"
  }
}
```

#### POST /api/feedback
Submits feedback on AI analysis quality.

**Request:**
```json
{
  "cvText": "Resume content...",
  "jobDescription": "Job requirements...", 
  "analysis": {...},
  "feedback": "positive"
}
```

## 🔮 Future Development

### Phase 2.5 Implementation Timeline

- **Weeks 1-3**: Database foundation and candidate search
- **Weeks 4-6**: Email automation system
- **Weeks 7-8**: LinkedIn integration
- **Weeks 9-10**: Testing and production deployment

### Phase 4 Vision

- Enterprise team collaboration features
- Advanced analytics and reporting
- ATS integrations (Greenhouse, Lever, BambooHR)
- Mobile application
- Advanced AI features and learning

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and structure
- Add tests for new features
- Update documentation for API changes
- Test both demo and production modes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic Claude](https://anthropic.com) for AI-powered analysis
- [Express.js](https://expressjs.com) for backend framework
- Open source community for various dependencies

## 📞 Support

For questions, issues, or feature requests:

- Create an issue on GitHub
- Contact: andrew@streetsdigital.com
- Company: Streets Digital Ltd

## 🏢 About Streets Digital

Professional recruitment technology and advertising consultancy specializing in AI-powered solutions for talent acquisition and programmatic advertising.

---

**Current Version**: 1.1.0 (Phase 1 Complete)  
**Next Release**: 2.5.0 (Recruitment Automation Suite)  
**Status**: Production Ready (Phase 1) | Planning (Phase 2.5)