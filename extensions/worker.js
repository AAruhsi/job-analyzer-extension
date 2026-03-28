import { pipeline, env } from './lib/transformers.min.js';

// In an extension, we must fetch models from the remote Hugging Face CDN
env.allowLocalModels = false;

// Disable local cache to prevent specific extension filesystem issues, 
// or set to true if browser cache permissions apply.
env.useBrowserCache = true;

let extractor = null;

async function getExtractor() {
    if (!extractor) {
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            progress_callback: (info) => {
                self.postMessage({ type: 'progress', data: info });
            }
        });
    }
    console.log("extractor", extractor)
    return extractor;
}

// Compute cosine similarity between two numeric vectors
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

self.onmessage = async (event) => {
    const { type, resumeText, jobText, cachedResumeArr } = event.data;
    console.log("event data ", event.data)
    if (type === 'analyze') {
        try {
            self.postMessage({ type: 'status', message: 'Local AI pre-screening...' });

            const extract = await getExtractor();

            self.postMessage({ type: 'status', message: 'Generating embeddings...' });

            let resumeArr;
            if (cachedResumeArr) {
                resumeArr = cachedResumeArr;
            } else {
                const output1 = await extract(resumeText, { pooling: 'mean', normalize: true });
                resumeArr = Array.from(output1.data);
                self.postMessage({ type: 'cache_resume', resumeArr });
            }

            const output2 = await extract(jobText, { pooling: 'mean', normalize: true });
            const jobArr = Array.from(output2.data);

            const sim = cosineSimilarity(resumeArr, jobArr);

            self.postMessage({ type: 'complete', similarity: sim });

        } catch (error) {
            self.postMessage({ type: 'error', error: error.message });
        }
    }
};
