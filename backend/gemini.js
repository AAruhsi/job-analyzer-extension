const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview"
});

async function analyzeResume(resumeData, job) {

    const prompt = `
You are an expert ATS (Applicant Tracking System) optimizer and career coach.
Your task is to analyze the provided resume against the job description.

REQUIRED OUTPUT FORMAT:
Return ONLY a valid JSON object. Do not include any explanations, markdown markers, or extra text.

JSON Structure:
{
  "match_score": 85, // A score from 0 to 100
  "matched_keywords": ["react", "node.js", "javascript"], // Keywords found in both
  "missing_keywords": ["typescript", "aws", "docker"], // Important keywords from job desc missing in resume
  "summary": "Brief summary of how the resume matches the job description.",
  "suggestions": ["Add AWS experience", "Highlight project management skills"]
}

Job Description Content:
${job}
`;

    // resumeData can be a string (text) or an object (for file upload)
    const contents = [prompt];
    if (typeof resumeData === 'string') {
        contents.push(`Resume Content:\n${resumeData}`);
    } else {
        contents.push(resumeData);
    }

    const result = await model.generateContent(contents);
    const response = await result.response;

    return response.text();
}

module.exports = analyzeResume;