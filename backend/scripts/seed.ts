import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Company, MCQQuestion, CodingProblem } from '../src/models';
import { QuestionCategory, QuestionDifficulty, ProgrammingLanguage } from '../src/types';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/verbal-vue-ai');
    console.log('MongoDB connected for seeding');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedCompanies = async () => {
  const companies = [
    {
      name: 'Google',
      description: 'Multinational technology company specializing in Internet-related services and products',
      website: 'https://google.com',
      logo: 'https://logo.clearbit.com/google.com'
    },
    {
      name: 'Microsoft',
      description: 'American multinational technology corporation',
      website: 'https://microsoft.com',
      logo: 'https://logo.clearbit.com/microsoft.com'
    },
    {
      name: 'Amazon',
      description: 'American multinational technology company focusing on e-commerce and cloud computing',
      website: 'https://amazon.com',
      logo: 'https://logo.clearbit.com/amazon.com'
    },
    {
      name: 'Meta',
      description: 'American multinational technology conglomerate',
      website: 'https://meta.com',
      logo: 'https://logo.clearbit.com/meta.com'
    },
    {
      name: 'Apple',
      description: 'American multinational technology company',
      website: 'https://apple.com',
      logo: 'https://logo.clearbit.com/apple.com'
    },
    {
      name: 'Netflix',
      description: 'American subscription streaming service and production company',
      website: 'https://netflix.com',
      logo: 'https://logo.clearbit.com/netflix.com'
    }
  ];

  for (const companyData of companies) {
    try {
      const existingCompany = await Company.findOne({ name: companyData.name });
      if (!existingCompany) {
        await Company.create(companyData);
        console.log(`✅ Created company: ${companyData.name}`);
      } else {
        console.log(`⏭️  Company already exists: ${companyData.name}`);
      }
    } catch (error) {
      console.error(`❌ Error creating company ${companyData.name}:`, error);
    }
  }
};

const seedMCQQuestions = async () => {
  const companies = await Company.find().limit(6);
  const googleId = companies.find(c => c.name === 'Google')?._id;
  const microsoftId = companies.find(c => c.name === 'Microsoft')?._id;
  const amazonId = companies.find(c => c.name === 'Amazon')?._id;

  const mcqQuestions = [
    {
      title: 'JavaScript Closures',
      question: 'What is a closure in JavaScript?',
      options: [
        'A function that returns another function',
        'A function that has access to variables in its outer scope',
        'A function that is immediately executed',
        'A function that cannot be modified'
      ],
      correctAnswers: [1],
      explanation: 'A closure gives you access to an outer function\'s scope from an inner function.',
      category: QuestionCategory.TECHNICAL,
      difficulty: QuestionDifficulty.MEDIUM,
      companies: [googleId, microsoftId],
      tags: ['javascript', 'closures', 'functions'],
      isMultiSelect: false,
      points: 2
    },
    {
      title: 'Database Normalization',
      question: 'Which normal form eliminates partial dependencies?',
      options: [
        'First Normal Form (1NF)',
        'Second Normal Form (2NF)',
        'Third Normal Form (3NF)',
        'Boyce-Codd Normal Form (BCNF)'
      ],
      correctAnswers: [1],
      explanation: 'Second Normal Form (2NF) eliminates partial dependencies on composite primary keys.',
      category: QuestionCategory.TECHNICAL,
      difficulty: QuestionDifficulty.HARD,
      companies: [amazonId, microsoftId],
      tags: ['database', 'normalization', 'sql'],
      isMultiSelect: false,
      points: 3
    },
    {
      title: 'Time Complexity',
      question: 'What is the time complexity of binary search?',
      options: [
        'O(n)',
        'O(log n)',
        'O(n log n)',
        'O(n²)'
      ],
      correctAnswers: [1],
      explanation: 'Binary search divides the search space in half with each comparison, resulting in O(log n) time complexity.',
      category: QuestionCategory.TECHNICAL,
      difficulty: QuestionDifficulty.EASY,
      companies: [googleId, amazonId],
      tags: ['algorithms', 'complexity', 'search'],
      isMultiSelect: false,
      points: 1
    },
    {
      title: 'HTTP Status Codes',
      question: 'Which HTTP status codes indicate client errors? (Select all that apply)',
      options: [
        '400 Bad Request',
        '401 Unauthorized',
        '500 Internal Server Error',
        '404 Not Found'
      ],
      correctAnswers: [0, 1, 3],
      explanation: '4xx status codes indicate client errors, while 5xx codes indicate server errors.',
      category: QuestionCategory.TECHNICAL,
      difficulty: QuestionDifficulty.MEDIUM,
      companies: [googleId, microsoftId, amazonId],
      tags: ['http', 'status-codes', 'web'],
      isMultiSelect: true,
      points: 2
    },
    {
      title: 'Logical Reasoning',
      question: 'If all roses are flowers and some flowers are red, which statement is definitely true?',
      options: [
        'All roses are red',
        'Some roses are red',
        'No roses are red',
        'All flowers are roses'
      ],
      correctAnswers: [1],
      explanation: 'We cannot definitively conclude about the color of roses, but it\'s possible that some roses are red.',
      category: QuestionCategory.REASONING,
      difficulty: QuestionDifficulty.MEDIUM,
      companies: [],
      tags: ['logic', 'reasoning'],
      isMultiSelect: false,
      points: 2
    }
  ];

  for (const questionData of mcqQuestions) {
    try {
      const existingQuestion = await MCQQuestion.findOne({ title: questionData.title });
      if (!existingQuestion) {
        await MCQQuestion.create(questionData);
        console.log(`✅ Created MCQ question: ${questionData.title}`);
      } else {
        console.log(`⏭️  MCQ question already exists: ${questionData.title}`);
      }
    } catch (error) {
      console.error(`❌ Error creating MCQ question ${questionData.title}:`, error);
    }
  }
};

const seedCodingProblems = async () => {
  const companies = await Company.find().limit(6);
  const googleId = companies.find(c => c.name === 'Google')?._id;
  const amazonId = companies.find(c => c.name === 'Amazon')?._id;

  const codingProblems = [
    {
      title: 'Two Sum',
      description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
      difficulty: QuestionDifficulty.EASY,
      category: 'Array',
      companies: [googleId, amazonId],
      tags: ['array', 'hash-table', 'two-pointers'],
      constraints: `- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.`,
      examples: [
        {
          input: 'nums = [2,7,11,15], target = 9',
          output: '[0,1]',
          explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
        },
        {
          input: 'nums = [3,2,4], target = 6',
          output: '[1,2]'
        }
      ],
      testCases: [
        {
          input: '[2,7,11,15]\n9',
          expectedOutput: '[0,1]',
          isHidden: false
        },
        {
          input: '[3,2,4]\n6',
          expectedOutput: '[1,2]',
          isHidden: false
        },
        {
          input: '[3,3]\n6',
          expectedOutput: '[0,1]',
          isHidden: true
        }
      ],
      supportedLanguages: [
        ProgrammingLanguage.PYTHON,
        ProgrammingLanguage.JAVASCRIPT,
        ProgrammingLanguage.JAVA,
        ProgrammingLanguage.CPP
      ],
      timeLimit: 5000,
      memoryLimit: 256,
      starterCode: new Map([
        [ProgrammingLanguage.PYTHON, `def twoSum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    pass

# Read input
import sys
lines = sys.stdin.read().strip().split('\\n')
nums = eval(lines[0])
target = int(lines[1])

# Call function and print result
result = twoSum(nums, target)
print(result)`],
        [ProgrammingLanguage.JAVASCRIPT, `function twoSum(nums, target) {
    // Your code here
}

// Read input
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split('\\n');
const nums = JSON.parse(input[0]);
const target = parseInt(input[1]);

// Call function and print result
const result = twoSum(nums, target);
console.log(JSON.stringify(result));`]
      ]),
      solution: new Map([
        [ProgrammingLanguage.PYTHON, `def twoSum(nums, target):
    num_map = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]
        num_map[num] = i
    return []`]
      ]),
      hints: [
        'Try using a hash table to store the numbers you\'ve seen so far.',
        'For each number, check if its complement (target - number) exists in the hash table.'
      ],
      isActive: true
    },
    {
      title: 'Valid Parentheses',
      description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
      difficulty: QuestionDifficulty.EASY,
      category: 'Stack',
      companies: [googleId],
      tags: ['stack', 'string'],
      constraints: `- 1 <= s.length <= 10^4
- s consists of parentheses only '()[]{}'.`,
      examples: [
        {
          input: 's = "()"',
          output: 'true'
        },
        {
          input: 's = "()[]{}"',
          output: 'true'
        },
        {
          input: 's = "(]"',
          output: 'false'
        }
      ],
      testCases: [
        {
          input: '()',
          expectedOutput: 'true',
          isHidden: false
        },
        {
          input: '()[{}]',
          expectedOutput: 'true',
          isHidden: false
        },
        {
          input: '(]',
          expectedOutput: 'false',
          isHidden: false
        },
        {
          input: '([)]',
          expectedOutput: 'false',
          isHidden: true
        }
      ],
      supportedLanguages: [
        ProgrammingLanguage.PYTHON,
        ProgrammingLanguage.JAVASCRIPT,
        ProgrammingLanguage.JAVA,
        ProgrammingLanguage.CPP
      ],
      timeLimit: 5000,
      memoryLimit: 256,
      starterCode: new Map([
        [ProgrammingLanguage.PYTHON, `def isValid(s):
    """
    :type s: str
    :rtype: bool
    """
    pass

# Read input
import sys
s = sys.stdin.read().strip()

# Call function and print result
result = isValid(s)
print('true' if result else 'false')`]
      ]),
      hints: [
        'Use a stack to keep track of opening brackets.',
        'When you encounter a closing bracket, check if it matches the most recent opening bracket.'
      ],
      isActive: true
    }
  ];

  for (const problemData of codingProblems) {
    try {
      const existingProblem = await CodingProblem.findOne({ title: problemData.title });
      if (!existingProblem) {
        await CodingProblem.create(problemData);
        console.log(`✅ Created coding problem: ${problemData.title}`);
      } else {
        console.log(`⏭️  Coding problem already exists: ${problemData.title}`);
      }
    } catch (error) {
      console.error(`❌ Error creating coding problem ${problemData.title}:`, error);
    }
  }
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    
    await seedCompanies();
    await seedMCQQuestions();
    await seedCodingProblems();
    
    console.log('✅ Database seeding completed successfully!');
    
    // Update question counts for companies
    const companies = await Company.find();
    for (const company of companies) {
      const mcqCount = await MCQQuestion.countDocuments({ companies: company._id });
      const codingCount = await CodingProblem.countDocuments({ companies: company._id });
      company.questionCount = mcqCount + codingCount;
      await company.save();
    }
    
    console.log('✅ Updated company question counts');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };
