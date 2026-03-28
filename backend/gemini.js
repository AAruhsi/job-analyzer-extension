const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

// Define the schema for the AI to follow strictly
const schema = {
    description: "Resume analysis results",
    type: SchemaType.OBJECT,
    properties: {
        match_score: { type: SchemaType.NUMBER },
        matched_keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        missing_keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        summary: { type: SchemaType.STRING },
        suggestions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    },
    // Ensure all properties are guaranteed to be returned by making them required
    required: ["match_score", "matched_keywords", "missing_keywords", "summary", "suggestions"],
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: "ATS system. Analyze resume vs job description. Output only the required JSON schema. No markdown.",
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
    },
});

async function analyzeResume(resumeData, job) {
    // You can now simplify the prompt because the schema handles the structure
    const prompt = `Analyze this resume against the job description. 
    Job: ${job}
    Resume/Keywords: ${resumeData}`;

    const result = await model.generateContent(prompt);
    return result.response.text(); // This will now be guaranteed clean JSON
}

module.exports = analyzeResume;