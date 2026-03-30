// Guard ONLY for preventing duplicate logic, NOT listener
if (window.jobalyticsLoaded) {
} else {
    window.jobalyticsLoaded = true;
}

function getJobDescription() {
    const selectors = [
        '[class*="JobDetails_jobDescription"][class*="JobDetails_showHidden"]',
        '[class*="JobDetails_jobDescription"]',
        '.jobs-description__container',
        '.jobs-description-content__text',
        '.jobs-box__html-content',
        '.show-more-less-html__markup',
        '.description__text',
        '#job-details',
        '.about-the-job',
        '#jobDescriptionText',
        '.jobsearch-JobComponent-description',
        '.jobsearch-DescriptionSection-section--jobFullText'

    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            const text = element.innerText.trim();
            if (text.length > 50) {
                return text;
            }
        }
    }
    return "";
}

// ✅ ALWAYS REGISTER LISTENER (outside guard)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_JOB_DESCRIPTION") {
        try {
            const text = getJobDescription();
            sendResponse({ text });
        } catch (err) {
            console.error("Error:", err);
            sendResponse({ text: "" });
        }
        return true;
    }
});