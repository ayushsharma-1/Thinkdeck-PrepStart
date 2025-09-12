const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * Extract text from different file types
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} mimetype - File MIME type
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromFile(fileBuffer, filename, mimetype) {
  try {
    const fileExtension = path.extname(filename).toLowerCase();
    
    switch (fileExtension) {
      case '.pdf':
        return await extractTextFromPDF(fileBuffer);
      
      case '.txt':
        return fileBuffer.toString('utf-8');
      
      case '.doc':
      case '.docx':
        // For now, return a placeholder - DOCX parsing requires more complex libraries
        return extractBasicTextFromBuffer(fileBuffer, filename);
      
      default:
        // Try to extract as plain text
        return extractBasicTextFromBuffer(fileBuffer, filename);
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Failed to extract text from ${filename}`);
  }
}

/**
 * Extract text from PDF buffer
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPDF(buffer) {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract basic text from buffer (fallback method)
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @returns {string} Extracted text
 */
function extractBasicTextFromBuffer(buffer, filename) {
  try {
    // Try to extract readable text from buffer
    const text = buffer.toString('utf-8');
    
    // Clean up common binary artifacts
    const cleanText = text
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Remove non-printable characters
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim();
    
    if (cleanText.length < 50) {
      throw new Error('Insufficient text extracted');
    }
    
    return cleanText;
  } catch (error) {
    // If all else fails, return a helpful message
    return `Unable to extract text from ${filename}. Please ensure the file is a text-based PDF, Word document, or plain text file. You can also manually paste your resume content.`;
  }
}

/**
 * Validate file for resume processing
 * @param {Object} file - Multer file object
 * @returns {boolean} Whether file is valid
 */
function validateResumeFile(file) {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  return allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension);
}

/**
 * Process resume file and extract text
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} Processing result
 */
async function processResumeFile(file) {
  try {
    // Validate file
    if (!validateResumeFile(file)) {
      throw new Error('Unsupported file type. Please upload PDF, DOC, DOCX, or TXT files.');
    }
    
    // Extract text
    const extractedText = await extractTextFromFile(
      file.buffer, 
      file.originalname, 
      file.mimetype
    );
    
    if (!extractedText || extractedText.length < 20) {
      throw new Error('Could not extract sufficient text from the resume');
    }
    
    return {
      success: true,
      text: extractedText,
      filename: file.originalname,
      size: file.size,
      type: file.mimetype,
      extractedLength: extractedText.length
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      filename: file.originalname
    };
  }
}

module.exports = {
  extractTextFromFile,
  processResumeFile,
  validateResumeFile
};