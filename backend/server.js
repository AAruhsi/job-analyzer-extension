require("dotenv").config();
const express = require("express");
const cors = require("cors");
const analyzeResume = require("./gemini");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/analyze", async (req, res) => {
    try {
        const { resumeText, job } = req.body;
        if (!resumeText || !job) return res.status(400).json({ error: "Missing resume text or job description" });

        let result;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                result = await analyzeResume(resumeText, job);
                break;
            } catch (err) {
                if (err.status === 429 && attempt < 3) {
                    await new Promise(r => setTimeout(r, attempt * 3000));
                } else throw err;
            }
        }

        let parsedResult;
        try {
            parsedResult = JSON.parse(result);
            if (typeof parsedResult.match_score !== 'number' ||
                !Array.isArray(parsedResult.matched_keywords) ||
                !Array.isArray(parsedResult.missing_keywords) ||
                typeof parsedResult.summary !== 'string' ||
                !Array.isArray(parsedResult.suggestions)) throw new Error("Invalid schema");
        } catch (e) {
            return res.status(500).json({ error: "AI response parsing failed", raw: result });
        }

        parsedResult.extractedResumeText = resumeText;
        res.json(parsedResult);

    } catch (error) {
        res.status(error.status === 429 ? 429 : 500).json({
            error: error.status === 429 ? "Rate limit reached. Try again later." : "Failed to analyze resume",
            detail: error.message
        });
    }
});


/* =========================
   🔹 SERVER START
========================= */
const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});