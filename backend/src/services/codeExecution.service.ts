import Docker from 'dockerode';
import { logger } from './logger.service';
import { createError } from '@/middleware/error.middleware';
import { ProgrammingLanguage, ICodeExecution } from '@/types';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const docker = new Docker();

interface LanguageConfig {
  image: string;
  compile?: string;
  execute: string;
  fileExtension: string;
  timeout: number;
}

const languageConfigs: Record<ProgrammingLanguage, LanguageConfig> = {
  [ProgrammingLanguage.PYTHON]: {
    image: 'python:3.11-slim',
    execute: 'python main.py',
    fileExtension: '.py',
    timeout: 5000
  },
  [ProgrammingLanguage.JAVASCRIPT]: {
    image: 'node:18-slim',
    execute: 'node main.js',
    fileExtension: '.js',
    timeout: 5000
  },
  [ProgrammingLanguage.TYPESCRIPT]: {
    image: 'node:18-slim',
    compile: 'npm install -g typescript && tsc main.ts',
    execute: 'node main.js',
    fileExtension: '.ts',
    timeout: 10000
  },
  [ProgrammingLanguage.JAVA]: {
    image: 'openjdk:17-slim',
    compile: 'javac Main.java',
    execute: 'java Main',
    fileExtension: '.java',
    timeout: 10000
  },
  [ProgrammingLanguage.CPP]: {
    image: 'gcc:latest',
    compile: 'g++ -o main main.cpp',
    execute: './main',
    fileExtension: '.cpp',
    timeout: 8000
  },
  [ProgrammingLanguage.C]: {
    image: 'gcc:latest',
    compile: 'gcc -o main main.c',
    execute: './main',
    fileExtension: '.c',
    timeout: 8000
  },
  [ProgrammingLanguage.GO]: {
    image: 'golang:1.21-slim',
    compile: 'go build -o main main.go',
    execute: './main',
    fileExtension: '.go',
    timeout: 8000
  },
  [ProgrammingLanguage.RUST]: {
    image: 'rust:slim',
    compile: 'rustc main.rs',
    execute: './main',
    fileExtension: '.rs',
    timeout: 10000
  }
};

export class CodeExecutionService {
  private executionQueue: Map<string, Promise<ICodeExecution>> = new Map();
  private maxConcurrentExecutions = parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || '10');

  async executeCode(
    language: ProgrammingLanguage,
    code: string,
    input?: string,
    problemId?: string
  ): Promise<ICodeExecution> {
    const executionId = uuidv4();
    
    // Check if we're at the maximum concurrent executions
    if (this.executionQueue.size >= this.maxConcurrentExecutions) {
      throw createError('Maximum concurrent executions reached. Please try again later.', 429);
    }

    const executionPromise = this.runCodeInContainer(language, code, input, problemId);
    this.executionQueue.set(executionId, executionPromise);

    try {
      const result = await executionPromise;
      return result;
    } finally {
      this.executionQueue.delete(executionId);
    }
  }

  private async runCodeInContainer(
    language: ProgrammingLanguage,
    code: string,
    input?: string,
    problemId?: string
  ): Promise<ICodeExecution> {
    const config = languageConfigs[language];
    if (!config) {
      throw createError(`Unsupported language: ${language}`, 400);
    }

    const startTime = Date.now();
    let container: Docker.Container | null = null;
    const tempDir = path.join(process.cwd(), 'temp', uuidv4());

    try {
      // Create temporary directory
      await fs.mkdir(tempDir, { recursive: true });

      // Write code to file
      const filename = this.getFilename(language);
      const codePath = path.join(tempDir, filename);
      await fs.writeFile(codePath, code);

      // Write input file if provided
      if (input) {
        const inputPath = path.join(tempDir, 'input.txt');
        await fs.writeFile(inputPath, input);
      }

      // Create container
      container = await docker.createContainer({
        Image: config.image,
        WorkingDir: '/app',
        Cmd: ['/bin/bash', '-c', this.buildExecutionCommand(config, input)],
        HostConfig: {
          Memory: 256 * 1024 * 1024, // 256MB memory limit
          CpuQuota: 50000, // 50% CPU limit
          NetworkMode: 'none', // No network access
          AutoRemove: true,
          Binds: [`${tempDir}:/app:ro`] // Mount code directory as read-only
        },
        AttachStdout: true,
        AttachStderr: true
      });

      // Start container
      await container.start();

      // Wait for execution with timeout
      const stream = await container.attach({
        stream: true,
        stdout: true,
        stderr: true
      });

      let output = '';
      let error = '';

      // Collect output
      stream.on('data', (chunk) => {
        const data = chunk.toString();
        if (chunk[0] === 1) { // stdout
          output += data.slice(8); // Remove Docker stream header
        } else if (chunk[0] === 2) { // stderr
          error += data.slice(8);
        }
      });

      // Wait for container to finish with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), config.timeout);
      });

      const containerWait = container.wait();
      
      try {
        await Promise.race([containerWait, timeoutPromise]);
      } catch (timeoutError) {
        await container.kill();
        throw createError('Code execution timed out', 408);
      }

      const executionTime = Date.now() - startTime;

      return {
        problemId: problemId ? problemId as any : undefined,
        language,
        code,
        input,
        output: output.trim(),
        error: error.trim() || undefined,
        executionTime,
        memoryUsed: undefined, // Would need additional Docker stats API calls
        status: error ? 'error' : 'completed'
      };

    } catch (error) {
      logger.error('Code execution error:', error);
      
      return {
        problemId: problemId ? problemId as any : undefined,
        language,
        code,
        input,
        output: undefined,
        error: (error as Error).message,
        executionTime: Date.now() - startTime,
        memoryUsed: undefined,
        status: 'error'
      };

    } finally {
      // Cleanup
      if (container) {
        try {
          await container.remove({ force: true });
        } catch (cleanupError) {
          logger.warn('Failed to cleanup container:', cleanupError);
        }
      }

      // Remove temporary directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temp directory:', cleanupError);
      }
    }
  }

  async runTests(
    language: ProgrammingLanguage,
    code: string,
    testCases: Array<{ input: string; expectedOutput: string; isHidden: boolean }>,
    problemId?: string
  ): Promise<ICodeExecution> {
    const results = [];
    let passedTests = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      try {
        const execution = await this.executeCode(language, code, testCase.input, problemId);
        
        const passed = execution.output?.trim() === testCase.expectedOutput.trim();
        if (passed) passedTests++;

        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: execution.output || '',
          passed,
          error: execution.error
        });

      } catch (error) {
        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          passed: false,
          error: (error as Error).message
        });
      }
    }

    return {
      problemId: problemId ? problemId as any : undefined,
      language,
      code,
      output: undefined,
      error: undefined,
      executionTime: undefined,
      memoryUsed: undefined,
      status: 'completed',
      testResults: {
        passed: passedTests,
        total: testCases.length,
        details: results
      }
    };
  }

  private buildExecutionCommand(config: LanguageConfig, hasInput: boolean = false): string {
    let command = '';
    
    if (config.compile) {
      command += `${config.compile} && `;
    }
    
    if (hasInput) {
      command += `${config.execute} < input.txt`;
    } else {
      command += config.execute;
    }

    return command;
  }

  private getFilename(language: ProgrammingLanguage): string {
    const config = languageConfigs[language];
    
    // Special cases for certain languages
    switch (language) {
      case ProgrammingLanguage.JAVA:
        return `Main${config.fileExtension}`;
      default:
        return `main${config.fileExtension}`;
    }
  }

  // Get execution statistics
  getExecutionStats(): {
    currentExecutions: number;
    maxExecutions: number;
    queueUtilization: number;
  } {
    return {
      currentExecutions: this.executionQueue.size,
      maxExecutions: this.maxConcurrentExecutions,
      queueUtilization: (this.executionQueue.size / this.maxConcurrentExecutions) * 100
    };
  }

  // Check if language is supported
  isLanguageSupported(language: string): language is ProgrammingLanguage {
    return Object.values(ProgrammingLanguage).includes(language as ProgrammingLanguage);
  }

  // Get supported languages
  getSupportedLanguages(): ProgrammingLanguage[] {
    return Object.values(ProgrammingLanguage);
  }
}

export const codeExecutionService = new CodeExecutionService();
