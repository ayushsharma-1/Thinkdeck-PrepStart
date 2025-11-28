/**
 * DUMMY RESULT GENERATOR - FOR TESTING ONLY
 * This file generates dummy interview results with random low scores.
 * TODO: Remove this entire file in production - replace with real API results
 */

// Helper function to generate random score between min and max
const getRandomScore = (min = 3, max = 6) => {
  return Math.random() * (max - min) + min;
};

// Helper function to get random item from array
const getRandomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Dummy data arrays
const technicalSkills = [
  { skill: 'Programming', score: getRandomScore(2, 5) },
  { skill: 'System Design', score: getRandomScore(2, 5) },
  { skill: 'Debugging', score: getRandomScore(2, 5) },
  { skill: 'Best Practices', score: getRandomScore(2, 5) }
];

const softSkills = [
  { skill: 'Communication', score: getRandomScore(2, 5) },
  { skill: 'Teamwork', score: getRandomScore(2, 5) },
  { skill: 'Learning Attitude', score: getRandomScore(3, 6) },
  { skill: 'Professional Maturity', score: getRandomScore(2, 5) }
];

const strengthsList = [
  'Shows willingness to learn',
  'Attempted to solve problems',
  'Good effort and participation',
  'Maintained composure',
  'Asked clarifying questions'
];

const weaknessesList = [
  'Limited technical knowledge',
  'Struggled with core concepts',
  'Communication could be clearer',
  'Time management needs improvement',
  'More practice needed on fundamentals',
  'Leadership experience lacking',
  'Problem-solving approach needs refinement'
];

const recommendationsList = [
  'Focus on strengthening core programming concepts',
  'Practice system design with real-world examples',
  'Work on communication and explanation skills',
  'Build more hands-on projects',
  'Study design patterns and best practices',
  'Practice mock interviews regularly',
  'Improve problem-solving techniques',
  'Learn industry standards and conventions'
];

/**
 * Generate dummy interview results with random low scores
 * @returns {Object} Dummy results object
 */
export const generateDummyResults = () => {
  // Calculate average scores from skills breakdown
  const avgTechnicalScore = technicalSkills.reduce((sum, s) => sum + s.score, 0) / technicalSkills.length;
  const avgSoftScore = softSkills.reduce((sum, s) => sum + s.score, 0) / softSkills.length;
  
  const dummyResults = {
    success: true,
    overall_score: getRandomScore(3.5, 5.5),
    technical_score: avgTechnicalScore,
    communication_score: softSkills[0].score,
    problem_solving_score: getRandomScore(2, 5),
    cultural_fit_score: getRandomScore(2, 5),
    job_based_skills_score: getRandomScore(2, 5),
    leadership_score: getRandomScore(1, 4),
    adaptability_score: getRandomScore(2, 5),
    creativity_score: getRandomScore(2, 5),
    time_management_score: getRandomScore(2, 4),
    domain_knowledge_score: getRandomScore(2, 5),
    
    // Skills breakdown
    technical_skills_breakdown: {
      "Programming": technicalSkills[0].score,
      "System Design": technicalSkills[1].score,
      "Debugging": technicalSkills[2].score,
      "Best Practices": technicalSkills[3].score
    },
    
    soft_skills_breakdown: {
      "Communication": softSkills[0].score,
      "Teamwork": softSkills[1].score,
      "Learning Attitude": softSkills[2].score,
      "Professional Maturity": softSkills[3].score
    },
    
    // Random selection from predefined lists
    strengths: [
      getRandomItem(strengthsList),
      getRandomItem(strengthsList),
      getRandomItem(strengthsList)
    ].filter((item, index, self) => self.indexOf(item) === index), // Remove duplicates
    
    weaknesses: [
      getRandomItem(weaknessesList),
      getRandomItem(weaknessesList),
      getRandomItem(weaknessesList),
      getRandomItem(weaknessesList)
    ].filter((item, index, self) => self.indexOf(item) === index), // Remove duplicates
    
    feedback: 'Performance indicates need for more preparation and practice in core technical areas. Focus on fundamental concepts and practical applications.',
    
    recommendations: [
      getRandomItem(recommendationsList),
      getRandomItem(recommendationsList),
      getRandomItem(recommendationsList),
      getRandomItem(recommendationsList)
    ].filter((item, index, self) => self.indexOf(item) === index), // Remove duplicates
    
    confidence_level: getRandomItem(['Low', 'Low', 'Low', 'Medium', 'Medium']),
    total_questions: 3,
    questions_answered: 3,
    interview_duration: getRandomScore(10, 20),
    timestamp: new Date().toISOString()
  };
  
  return dummyResults;
};

/**
 * Generate dummy violations (security breaches)
 * @returns {Array} Array of dummy violations
 */
export const generateDummyViolations = () => {
  const violationTypes = [
    { type: 'TAB_SWITCH', details: 'User switched to another tab' },
    { type: 'WINDOW_FOCUS_LOSS', details: 'Application lost focus' },
    { type: 'FULLSCREEN_EXIT', details: 'User exited fullscreen mode' },
    { type: 'RIGHT_CLICK', details: 'Right-click attempt detected' }
  ];
  
  const numViolations = Math.floor(Math.random() * 3); // 0-2 violations
  const violations = [];
  
  for (let i = 0; i < numViolations; i++) {
    const randomViolation = getRandomItem(violationTypes);
    violations.push({
      type: randomViolation.type,
      details: randomViolation.details,
      timestamp: new Date(Date.now() - Math.random() * 60000).toISOString(),
      questionNumber: Math.floor(Math.random() * 3) + 1
    });
  }
  
  return violations;
};

/**
 * Store dummy results in localStorage
 * This is a convenience function to immediately populate results
 */
export const storeDummyResults = () => {
  const dummyResults = generateDummyResults();
  const dummyViolations = generateDummyViolations();
  
  localStorage.setItem('interviewResults', JSON.stringify(dummyResults));
  localStorage.setItem('interviewViolations', JSON.stringify(dummyViolations));
  
  console.log('✅ [DUMMY DATA] Dummy results stored in localStorage');
  console.log('📊 Results:', dummyResults);
  console.log('⚠️ Violations:', dummyViolations);
  
  return { dummyResults, dummyViolations };
};

export default {
  generateDummyResults,
  generateDummyViolations,
  storeDummyResults,
  getRandomScore
};
