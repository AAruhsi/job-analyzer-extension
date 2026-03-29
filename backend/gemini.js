const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
                match_score: { type: SchemaType.NUMBER },
                matched_keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                missing_keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                summary: { type: SchemaType.STRING },
                suggestions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            },
            required: ["match_score", "matched_keywords", "missing_keywords", "summary", "suggestions"],
        },
    },
});

async function analyzeResume(resumeData, job) {
    const prompt = `Analyze this resume against the job description and return the match analysis.
IMPORTANT: To ensure a fast response, keep the output extremely concise:
- Keep the summary to 1-2 short sentences.
- Provide a maximum of 3 brief, actionable suggestions.
- Limit matched and missing keywords to the top 5-7 most critical skills.

Job Description:
${job}

Resume:
${resumeData}`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

module.exports = analyzeResume;