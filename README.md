# Jobalytics Clone

A Chrome/Edge extension that helps you analyze job descriptions against your resume using AI (powered by Google Gemini). 

It works seamlessly on **LinkedIn** and **Indeed**, parsing your resume locally and evaluating how well your background matches the job role.

## Features

- **Resume Parsing:** Upload your PDF resume. The extension securely parses it entirely on the client-side without sending the actual file to the server.
- **AI-Powered Analysis:** Leverages Google Gemini AI to analyze the similarities and gaps between your resume and the currently viewed job description.
- **Platform Support:** Designed to work specifically on LinkedIn (`*.linkedin.com`) and Indeed (`*.indeed.com`).
- **Seamless UI:** Accessible directly from your browser's toolbar via the extension popup.

## Prerequisites

Before running the extension, you need:
1. **Node.js** installed on your machine.
2. A **Google Gemini API Key** for the backend server to process matching analysis.

## Project Structure

The project is structured into two main parts:
- `extensions/` - The frontend Chrome/Edge extension files (`manifest.json`, `content.js`, `popup.html`, `popup.js`, etc.)
- `backend/` - The internal Node.js/Express server that securely interfaces with the Google Gemini API.

## Setup Instructions

### 1. Set Up the Backend
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd job-analyzer-extension/backend
   ```
2. Install the server dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory (or modify the existing one) and add your Gemini API key:
   ```env
   PORT=5005
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. Start the backend server:
   ```bash
   npx nodemon server.js
   ```
   *The server should now be running on `http://localhost:5005`.*

### 2. Install the Chrome/Edge Extension
1. Open Google Chrome (or Microsoft Edge) and go to the Extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
2. Enable **Developer mode** (usually a toggle in the top right corner).
3. Click on the **"Load unpacked"** button.
4. Select the `extensions/` folder located inside the `job-analyzer-extension` directory.
5. The **Jobalytics Clone** extension should now appear in your browser toolbar.

## Usage Flow

1. **Pin the extension** to your toolbar for easy access.
2. **Navigate to a Job Post** on either LinkedIn or Indeed. Wait for the job description to fully load on the page.
3. **Open the Extension** by clicking its icon.
4. **Upload your Resume**: In the extension popup, upload your latest resume in PDF format.
5. **Analyze**: Click the button to send the parsed resume text and the job description (extracted by `content.js`) to the backend.
6. **Review Results**: The AI backend will process the data via the Gemini API and return a matching score/analysis directly to the extension popup.

## Privacy & Security

- **Local PDF Parsing**: Your actual PDF file is parsed via `pdf.js` inside your browser. Only the extracted text is sent to the backend.
- **No Database**: Neither the extension nor the backend server stores your resume text or job description in a database. Data is processed locally and in-memory while requesting the API.

## License
MIT License
