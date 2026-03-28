document.addEventListener('DOMContentLoaded', async () => {
    // Initialize PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    }

    const resumeFileInput = document.getElementById('resume-file');
    const selectedFileName = document.getElementById('selected-file-name');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resultsContainer = document.getElementById('results');
    const loadingContainer = document.getElementById('loading');
    const backBtn = document.getElementById('back-btn');
    let extractedText = '';

    // Load cached resume from storage instantly on open
    chrome.storage.local.get(['savedResumeText', 'savedResumeName', 'savedResumeArr'], (result) => {
        if (result.savedResumeText) {
            extractedText = result.savedResumeText;
            selectedFileName.textContent = result.savedResumeName || 'Saved Resume';
            document.getElementById('file-preview-container').classList.remove('hidden');
            document.getElementById('file-preview-text').textContent = "Loaded from cache. You can proceed to Analyze!";
        }
    });

    // Helper to generate a unique cache key based on job text and resume text combo
    function getCacheKey(job, resume) {
        let stringToHash = job + resume;
        let hash = 0;
        for (let i = 0; i < stringToHash.length; i++) hash = ((hash << 5) - hash) + stringToHash.charCodeAt(i) | 0;
        return "cache_res_" + Math.abs(hash).toString(16);
    }

    // Fast local pre-screen using keyword overlap (replaces slow 23MB embedding model)
    function quickSimilarity(resumeText, jobText) {
        const tokenize = t => new Set(t.toLowerCase().match(/\b[a-z]{3,}\b/g) || []);
        const resumeTokens = tokenize(resumeText);
        const jobTokens = tokenize(jobText);
        let overlap = 0;
        jobTokens.forEach(t => { if (resumeTokens.has(t)) overlap++; });
        return overlap / jobTokens.size;
    }



    // --- NEW: Helper function for client-side extraction ---
    async function extractTextFromPDF(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function () {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let fullText = "";

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(" ");
                        fullText += pageText + "\n";
                    }
                    resolve(fullText.trim());
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // File Selection
    resumeFileInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            selectedFileName.textContent = file.name;

            const previewContainer = document.getElementById('file-preview-container');
            const previewText = document.getElementById('file-preview-text');

            previewContainer.classList.remove('hidden');
            previewText.textContent = 'Extracting text locally...';

            if (file.type === 'application/pdf') {
                try {
                    extractedText = await extractTextFromPDF(file);
                    previewText.textContent = extractedText || 'No text found in resume.';

                    chrome.storage.local.set({
                        savedResumeText: extractedText,
                        savedResumeName: file.name
                    });
                } catch (error) {
                    console.error("Extraction error:", error);
                    previewText.textContent = 'Error extracting text: ' + error.message;
                }
            } else {
                previewText.textContent = 'Preview only available for PDF files. You can still proceed with the analysis.';
            }
        } else {
            selectedFileName.textContent = 'No file selected';
            document.getElementById('file-preview-container').classList.add('hidden');
            extractedText = '';
        }
    });

    // Close preview
    document.getElementById('close-preview')?.addEventListener('click', () => {
        document.getElementById('file-preview-container').classList.add('hidden');
    });

    analyzeBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error("No active tab found");

            showLoading(true, "Extracting Job Details...");

            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { type: "GET_JOB_DESCRIPTION" }, (response) => {
                    const lastError = chrome.runtime.lastError;
                    if (lastError) reject(lastError);
                    else resolve(response);
                });
            });

            if (!response || !response.text || response.text.length < 50) {
                showError('Could not find job description.');
                showLoading(false);
                return;
            }

            const jobText = response.text;

            if (!extractedText) {
                showError('Please upload a PDF resume first.');
                showLoading(false);
                return;
            }

            // Check if we already analyzed this exact job and resume combo
            const analysisCacheKey = getCacheKey(jobText, extractedText);
            const cachedData = await chrome.storage.local.get([analysisCacheKey]);
            if (cachedData[analysisCacheKey]) {
                showLoading(false);
                displayResults(cachedData[analysisCacheKey]);
                return; // Early return, saving 45 seconds of wait time!
            }

            const similarityScore = quickSimilarity(extractedText, jobText);

            if (similarityScore < 0.08) {
                showLoading(false);
                displayResults({
                    match_score: Math.max(0, Math.round(similarityScore * 100)),
                    matched_keywords: [],
                    missing_keywords: ["(Skipped due to low match)"],
                    summary: "Low Match Warning: The local embedding prescreen indicates your resume has very low similarity to the job description. The expensive backend analysis was intentionally skipped.",
                    suggestions: [
                        "Tailor your resume heavily before applying.",
                        "Consider finding different roles that align better with your background."
                    ],
                    extractedResumeText: extractedText
                });
                return; // Early return prevents the backend axios call
            }

            showLoading(true, "AI is matching skills...");
            const analyzeResponse = await axios.post("http://localhost:5005/analyze", {
                job: jobText,
                resumeText: extractedText
            });

            const finalData = analyzeResponse.data;
            displayResults(finalData);

            // Cache the backend analysis to prevent duplicate expensive calls
            chrome.storage.local.set({ [analysisCacheKey]: finalData });

        } catch (error) {
            console.error("Error:", error);
            const detailedError = error.response?.data?.detail || error.message;
            showError('Error: ' + detailedError);
            showLoading(false);
        }
    });

    backBtn.addEventListener('click', () => showLoading(false));

    function displayResults(data) {
        loadingContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        document.querySelector('.score-card').style.display = 'flex';
        const score = data.match_score || 0;
        document.getElementById('match-score').textContent = `${score}%`;
        document.getElementById('score-path').style.strokeDasharray = `${score}, 100`;

        renderKeywords('matched-keywords', data.matched_keywords || []);
        renderKeywords('missing-keywords', data.missing_keywords || []);
        document.getElementById('analysis-summary').textContent = data.summary || '';

        const suggestionsList = document.getElementById('suggestions-list');
        suggestionsList.innerHTML = '';
        (data.suggestions || []).forEach(s => {
            const li = document.createElement('li');
            li.textContent = s;
            suggestionsList.appendChild(li);
        });

        const resumePreviewContent = document.getElementById('resume-preview-content');
        if (data.extractedResumeText || extractedText) {
            resumePreviewContent.textContent = data.extractedResumeText || extractedText;
            document.querySelector('.resume-preview-section').classList.remove('hidden');
        }
    }

    document.getElementById('resume-preview-toggle')?.addEventListener('click', () => {
        const content = document.getElementById('resume-preview-content');
        const chevron = document.querySelector('#resume-preview-toggle .chevron');
        content.classList.toggle('hidden');
        chevron.textContent = content.classList.contains('hidden') ? '▼' : '▲';
    });

    function renderKeywords(containerId, keywords) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        keywords.forEach(kw => {
            const span = document.createElement('span');
            span.textContent = kw;
            container.appendChild(span);
        });
    }

    function showLoading(isLoading, step = "") {
        const loadingText = document.getElementById('loading-text');
        if (isLoading) {
            if (loadingText) loadingText.textContent = step || "Analyzing...";
            document.getElementById('file-input-group')?.classList.add('hidden');
            analyzeBtn.classList.add('hidden');
            loadingContainer.classList.remove('hidden');
            resultsContainer.classList.add('hidden');
        } else {
            loadingContainer.classList.add('hidden');
            resultsContainer.classList.add('hidden');
            document.getElementById('file-input-group')?.classList.remove('hidden');
            analyzeBtn.classList.remove('hidden');
        }
    }

    function showError(message) {
        let errorEl = document.getElementById('error-toast');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'error-toast';
            errorEl.style.cssText = 'position: fixed; top: 10px; left: 50%; transform: translateX(-50%); background: #ef4444; color: white; padding: 10px 20px; border-radius: 4px; z-index: 1000; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: opacity 0.3s ease;';
            document.body.appendChild(errorEl);
        }
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }
});