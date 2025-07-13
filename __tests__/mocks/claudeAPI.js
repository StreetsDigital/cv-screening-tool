// Mock responses for Claude API to avoid API calls during testing

const mockClaudeResponses = {
  // Mock successful CV analysis response
  analyzeCV: {
    success: true,
    analysis: {
      score: 85,
      summary: "Strong candidate with relevant experience in software development. The candidate demonstrates solid technical skills in JavaScript, Node.js, and React, with 5 years of professional experience. Leadership experience as a team lead is valuable for senior roles.",
      strengths: [
        "5 years of relevant software development experience",
        "Strong technical skills in required technologies (JavaScript, Node.js, React)",
        "Leadership experience as team lead",
        "Good educational background with Computer Science degree",
        "Experience with agile development methodologies"
      ],
      concerns: [
        "Limited experience with cloud platforms (AWS/Azure)",
        "No mention of DevOps or CI/CD experience",
        "Could benefit from more diverse project portfolio"
      ],
      recommendation: "Proceed to first interview. Candidate shows strong potential and meets most requirements. Consider exploring cloud experience during interview."
    }
  },

  // Mock demo mode response
  demoMode: {
    success: true,
    analysis: {
      score: 92,
      summary: "Excellent candidate profile with comprehensive experience matching job requirements. This is a demo response showcasing the AI analysis capabilities.",
      strengths: [
        "10+ years of industry experience",
        "Expert-level technical skills",
        "Strong leadership and communication abilities",
        "Proven track record of successful project delivery"
      ],
      concerns: [
        "Salary expectations may be above budget",
        "May be overqualified for the role"
      ],
      recommendation: "Highly recommended for immediate interview. This candidate represents an ideal match for the position."
    }
  },

  // Mock error response
  error: {
    success: false,
    error: "API Error: Unable to analyze CV at this time. Please try again later."
  }
};

// Mock fetch function for API calls
const mockFetch = (responseType = 'analyzeCV') => {
  return Promise.resolve({
    ok: responseType !== 'error',
    json: () => Promise.resolve(mockClaudeResponses[responseType])
  });
};

module.exports = {
  mockClaudeResponses,
  mockFetch
};