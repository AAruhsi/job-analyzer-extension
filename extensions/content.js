// Guard ONLY for preventing duplicate logic, NOT listener
if (window.jobalyticsLoaded) {
} else {
    window.jobalyticsLoaded = true;
}

function getJobDescription() {
    const selectors = [
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
            let text = element.innerText;
            // Collapse extra whitespace mapped to reduce token count
            text = text.replace(/\\s+/g, ' ').trim();
            // Strip common boilerplate
            text = text.replace(/About Us.*$/i, '');
            text = text.replace(/Equal Opportunity.*$/i, '');
            text = text.replace(/Diversity, Equity, and Inclusion.*$/i, '');
            
            if (text.length > 50) {
                // Apply length capping
                return text.substring(0, 5000);
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