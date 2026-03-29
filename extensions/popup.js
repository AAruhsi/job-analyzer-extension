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

            if (file.type === 'application/pdf') {
                try {
                    extractedText = await extractTextFromPDF(file);
                } catch (error) {
                    console.error("Extraction error:", error);
                    extractedText = '';
                }
            } 
        } else {
            selectedFileName.textContent = 'No file selected';
            extractedText = '';
        }
    });
    analyzeBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error("No active tab found");

            showLoading(true);

            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { type: "GET_JOB_DESCRIPTION" }, (response) => {
                    const lastError = chrome.runtime.lastError;
                    if (lastError) reject(lastError);
                    else resolve(response);
                });
            });

            if (!response || !response.text || response.text.length < 50) {
                alert('Could not find job description.');
                showLoading(false);
                return;
            }

            const jobText = response.text;

            if (!extractedText) {
                alert('Please upload a PDF resume first.');
                showLoading(false);
                return;
            }

            const analyzeResponse = await axios.post("http://localhost:5005/analyze", {
                job: jobText,
                resumeText: extractedText
            });

            displayResults(analyzeResponse.data);

        } catch (error) {
            console.error("Error:", error);
            const detailedError = error.response?.data?.detail || error.message;
            alert('Error: ' + detailedError);
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
    }


    function renderKeywords(containerId, keywords) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        keywords.forEach(kw => {
            const span = document.createElement('span');
            span.textContent = kw;
            container.appendChild(span);
        });
    }

    function showLoading(isLoading) {
        if (isLoading) {
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
});