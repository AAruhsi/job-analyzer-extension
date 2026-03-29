require("dotenv").config();
const express = require("express");
const cors = require("cors");
const analyzeResume = require("./gemini");

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// In-memory cache: survives across requests, resets on server restart
const cache = new Map();

function hashKey(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return h.toString(36);
}

app.post("/analyze", async (req, res) => {
    try {
        const { resumeText, job } = req.body;
        if (!resumeText || !job) return res.status(400).json({ error: "Missing resume text or job description" });

        // Trim texts to reduce input token size for faster processing
        const trimmedResume = resumeText.slice(0, 3000);
        const trimmedJob = job.slice(0, 3000);

        const cacheKey = hashKey(trimmedResume + trimmedJob);
        if (cache.has(cacheKey)) {
            console.log("Cache hit — skipping Gemini call");
            return res.json(cache.get(cacheKey));
        }

        let result;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                result = await analyzeResume(trimmedResume, trimmedJob);
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
        } catch (e) {
            return res.status(500).json({ error: "AI response parsing failed", raw: result });
        }

        parsedResult.extractedResumeText = resumeText;
        cache.set(cacheKey, parsedResult);
        res.json(parsedResult);

    } catch (error) {
        res.status(error.status === 429 ? 429 : 500).json({
            error: error.status === 429 ? "Rate limit reached. Try again later." : "Failed to analyze resume",
            detail: error.message
        });
    }
});

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
