require("dotenv").config();
const express = require("express");
const cors = require("cors");
const analyzeResume = require("./gemini");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   🔹 ANALYZE API
========================= */
app.post("/analyze", async (req, res) => {
    try {
        const { resumeText, job } = req.body;

        if (!resumeText || !job) {
            return res.status(400).json({ error: "Missing resume text or job description" });
        }

        /* ===== CALL GEMINI ===== */
        let result;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                result = await analyzeResume(resumeText, job);
                break;
            } catch (err) {
                if (err.status === 429 && attempt < maxRetries) {
                    const wait = attempt * 3000;
                    console.log(`Rate limited. Retrying in ${wait / 1000}s...`);
                    await new Promise(r => setTimeout(r, wait));
                } else {
                    throw err;
                }
            }
        }

        /* ===== PARSE RESULT ===== */
        let parsedResult;
        try {
            const cleanJson = result.replace(/```json|```/g, "").trim();
            parsedResult = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON parse failed:", result);
            return res.status(500).json({
                error: "AI response parsing failed",
                raw: result
            });
        }

        parsedResult.extractedResumeText = resumeText;
        res.json(parsedResult);

    } catch (error) {
        console.error("Analysis error:", error);
        res.status(error.status === 429 ? 429 : 500).json({
            error: error.status === 429
                ? "Rate limit reached. Try again later."
                : "Failed to analyze resume",
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