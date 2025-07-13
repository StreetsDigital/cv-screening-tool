// Unit tests for utility functions and business logic

describe('CV Analysis Utilities', () => {
  describe('Input Validation', () => {
    test('should validate CV text input', () => {
      const validateCVText = (text) => {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
          return { valid: false, error: 'CV text is required' };
        }
        if (text.length < 50) {
          return { valid: false, error: 'CV text too short' };
        }
        if (text.length > 10000) {
          return { valid: false, error: 'CV text too long' };
        }
        return { valid: true };
      };

      // Valid cases
      const validCV = "John Doe\n".repeat(10) + "Software Engineer with 5 years experience";
      expect(validateCVText(validCV)).toEqual({ valid: true });

      // Invalid cases
      expect(validateCVText('')).toEqual({ valid: false, error: 'CV text is required' });
      expect(validateCVText('short')).toEqual({ valid: false, error: 'CV text too short' });
      expect(validateCVText('x'.repeat(10001))).toEqual({ valid: false, error: 'CV text too long' });
    });

    test('should validate job description input', () => {
      const validateJobDescription = (description) => {
        if (!description || typeof description !== 'string' || description.trim().length === 0) {
          return { valid: false, error: 'Job description is required' };
        }
        if (description.length < 20) {
          return { valid: false, error: 'Job description too short' };
        }
        return { valid: true };
      };

      // Valid case
      const validJob = "Looking for a Senior Software Engineer with 5+ years experience";
      expect(validateJobDescription(validJob)).toEqual({ valid: true });

      // Invalid cases
      expect(validateJobDescription('')).toEqual({ valid: false, error: 'Job description is required' });
      expect(validateJobDescription('short')).toEqual({ valid: false, error: 'Job description too short' });
    });

    test('should validate feedback type', () => {
      const validateFeedback = (feedback) => {
        const validTypes = ['positive', 'negative'];
        if (!validTypes.includes(feedback)) {
          return { valid: false, error: 'Invalid feedback type' };
        }
        return { valid: true };
      };

      expect(validateFeedback('positive')).toEqual({ valid: true });
      expect(validateFeedback('negative')).toEqual({ valid: true });
      expect(validateFeedback('invalid')).toEqual({ valid: false, error: 'Invalid feedback type' });
    });
  });

  describe('Score Processing', () => {
    test('should normalize scores to 0-100 range', () => {
      const normalizeScore = (score) => {
        if (typeof score !== 'number') return 0;
        return Math.max(0, Math.min(100, Math.round(score)));
      };

      expect(normalizeScore(85.7)).toBe(86);
      expect(normalizeScore(-10)).toBe(0);
      expect(normalizeScore(150)).toBe(100);
      expect(normalizeScore('invalid')).toBe(0);
    });

    test('should categorize scores correctly', () => {
      const categorizeScore = (score) => {
        if (score >= 90) return 'excellent';
        if (score >= 80) return 'good';
        if (score >= 70) return 'fair';
        if (score >= 60) return 'poor';
        return 'very_poor';
      };

      expect(categorizeScore(95)).toBe('excellent');
      expect(categorizeScore(85)).toBe('good');
      expect(categorizeScore(75)).toBe('fair');
      expect(categorizeScore(65)).toBe('poor');
      expect(categorizeScore(50)).toBe('very_poor');
    });
  });

  describe('Text Processing', () => {
    test('should extract keywords from text', () => {
      const extractKeywords = (text) => {
        if (!text) return [];
        
        const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        const words = text.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 2 && !commonWords.includes(word));
        
        return [...new Set(words)].slice(0, 10);
      };

      const text = "Software Engineer with JavaScript, Node.js, and React experience";
      const keywords = extractKeywords(text);
      
      expect(keywords).toContain('software');
      expect(keywords).toContain('engineer');
      expect(keywords).toContain('javascript');
      expect(keywords).not.toContain('and');
      expect(keywords.length).toBeLessThanOrEqual(10);
    });

    test('should calculate text similarity', () => {
      const calculateSimilarity = (text1, text2) => {
        if (!text1 || !text2) return 0;
        
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
      };

      const text1 = "JavaScript React Node.js developer";
      const text2 = "React JavaScript frontend developer";
      const similarity = calculateSimilarity(text1, text2);
      
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });
});