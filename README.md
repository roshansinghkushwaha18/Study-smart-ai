# 🎓 StudySmart AI — Advanced Academic Learning Platform

> **Academic Project Showcase**: BBA Digital Marketing & Artificial Intelligence  
> **Course**: MKT-358 / AI Academic Suite (2026)  
> **Technology Stack**: Node.js, Express.js, Official OpenAI JavaScript SDK, Vanilla JavaScript (ES6+), CSS3 Glassmorphism, HTML5  
> **Zero Database Requirement**: High-performance, privacy-first local persistence powered by browser `LocalStorage`.

---

## 🌟 English Overview & Project Features

**StudySmart AI** is an all-in-one educational platform engineered for college and university students studying **BBA, Digital Marketing, Artificial Intelligence, Economics, and Management**.

### 🚀 Key Functional Modules
1. 🤖 **Official OpenAI Academic Tutor (`/api/chat`)**: Ask multi-turn questions in English, Hindi, or Hinglish with academic frameworks (SWOT, Porter's 5 Forces, 4Ps, STP) and real marketing formulas (CAC, LTV, ROAS, CTR).
2. 📝 **AI Smart Notes Generator (`/api/generate-notes`)**: Generates structured, high-yield revision notes with core learning objectives, formulas, case studies, and exam mnemonics. Supports instant copying and `.txt` file downloading.
3. 🏆 **Daily 50 Quiz Challenge (`/api/generate-quiz`)**: Practice up to 50 questions daily across 8 core university disciplines (Digital Marketing, AI, Business, Economics, Management, Accounting, English, Aptitude) with instant feedback, progress tracking, and score breakdowns.
4. 📚 **Subjects & Curriculum Manager**: View, add, search, and manage default and custom academic courses that sync with your quizzes and study notes.
5. 🔔 **Exam Alerts & Assignment Deadlines**: Real-time countdowns ("Today", "Tomorrow", "In X days", "Overdue") for midterms, finals, presentations, and coursework deadlines.
6. 📊 **AI Presentation Deck Generator (`/api/generate-ppt`)**: Generates customized slide decks with titles, bullet points, speaker talking points, visual concepts, and an interactive slide preview carousel.
7. 🧭 **Career Readiness & Learning Roadmaps (`/api/generate-career`)**: 6-month milestones for in-demand roles (Digital Marketing Strategist, AI & Prompt Engineer, Marketing Analytics Manager, Business Consultant, Startup Founder) with portfolio projects and STAR interview prep.
8. ⏱️ **Pomodoro Study Timer**: Scientific 25-minute focus intervals and 5-minute restorative breaks with animated circular SVG ring and Web Audio synthesizer chimes.
9. 📈 **Live Analytics Dashboard**: Aggregates real local statistics—tasks finished, quiz mastery %, daily challenge progress, study streak, and upcoming exams.
10. 🔍 **Global Quick Search (`Ctrl + K`)**: Instant keyboard-driven lookup across modules, subjects, study tasks, and marketing glossary terms.
11. 🌓 **Dark & Light Mode**: Accessible contrast with high-end dark navy glassmorphism and instant theme toggle.

---

## 🇮🇳 Simple Hinglish Setup Guide (Beginner Students Ke Liye Step-by-Step Guide)

Agar aap coding me beginner hain, toh yeh simple step-by-step guide follow karein:

### Step 1: Project Folder Me Terminal Kholein
VS Code ya PowerShell me project folder me aayein:
```bash
cd "d:\class Mkt 358 project 5"
```

### Step 2: Dependencies Install Karein
Saare zaroori packages download karne ke liye:
```bash
npm.cmd install
```
*(Windows PowerShell me agar `npm.ps1 cannot be loaded` ka error aaye, toh hamesha `npm.cmd install` use karein).*

### Step 3: Free Local Provider Setup (Default)
Project default free mode me **Ollama** use karta hai. Yani OpenAI billing required nahi hai.

1. Ollama install karein: https://ollama.com/download
2. Ollama server start karein:
```bash
ollama serve
```
3. Model install karein:
```bash
ollama pull llama3.2
```
4. `.env` file me default free provider set karein:
```env
HOST=127.0.0.1
PORT=5000
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=llama3.2
OPENAI_API_KEY=
```

### Step 4: Optional OpenAI Setup (Only If You Want It)
Agar aap OpenAI use karna chahte hain, toh `.env` me `AI_PROVIDER=openai` set kar ke `OPENAI_API_KEY` add karein:
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_actual_openai_key_here
OPENAI_MODEL=gpt-4o-mini
```
> ⚠️ Agar OpenAI quota/billing fail hoti hai, toh app automatically local free provider par fallback karega bina UI block kiye.

### Step 5: Backend Server Run Karein
```bash
cd "d:\class Mkt 358 project 5"
npm.cmd start
```
Ya fir `start-server.bat` file par click karke server start kar sakte hain.

Aapko terminal me yeh message dikhega:
```
===================================================
🚀 StudySmart AI Server is running on port 5000
🌐 Local Web App: http://127.0.0.1:5000
🤖 AI Status: Free Local Provider Active (Ollama default)
===================================================
```

### Step 6: Browser Me Website Kholein
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

> **Important:** Do not open `public/index.html` with VS Code Live Preview at `http://127.0.0.1:3000`. Port 3000 is not the StudySmart server. Start the backend first, then open the port 5000 URL above. The `start-server.bat` file does both automatically.

### Verify Backend Health
```bash
curl http://127.0.0.1:5000/api/health
```
Windows PowerShell me:
```powershell
Invoke-WebRequest http://127.0.0.1:5000/api/health
```
Agar output me `status: "healthy"` aaye, toh backend correctly running hai.

### Local Tutor Format (Free Tutoring)
Free tutor answer format remains:
1. One-sentence definition
2. Three key ideas
3. One business/marketing example
4. One practice example to test understanding

No billing is required for this mode.

---

## 🛠️ Troubleshooting & Common Errors (Aasan Samadhan)

### 1. "OpenAI API key is not configured" Notice
- **Karan**: `.env` file me `OPENAI_API_KEY` khali hai ya galat hai.
- **Solution**: `.env` file me valid OpenAI key (`sk-...`) dalein aur server ko restart karein (Terminal me `Ctrl + C` dabayein, fir `npm.cmd start` chalayein).

### 2. "Server Offline (Run npm start)"
- **Karan**: Node.js server band ho gaya hai.
- **Solution**: Terminal me `npm.cmd start` run karein ya `start-server.bat` par click karein, phir `http://127.0.0.1:5000` open karein. `http://127.0.0.1:3000/public/index.html?vscode-livepreview=true` use na karein.

### 3. "Quota Exceeded / Rate Limit (429 Error)"
- **Karan**: Aapke OpenAI account me credits khatam ho gaye hain ya free trial expire ho gaya hai.
- **Solution**: [OpenAI Billing Dashboard](https://platform.openai.com/account/billing) me jakar credits check karein.

### 4. GitHub Pages Par Full AI Backend Enable Karna
GitHub Pages sirf static frontend host karta hai. Full AI endpoints enable karne ke liye repository ko Render par Blueprint ke roop me deploy karein:

1. Render Dashboard me **New > Blueprint** kholein.
2. Repository `roshansinghkushwaha18/Study-smart-ai` select karein.
3. `render.yaml` ko apply karein aur `OPENAI_API_KEY` ko Render secret ke roop me add karein.
4. Service ka URL `https://studysmart-ai-api.onrender.com` rakhein, ya custom URL ko `public/script.js` ke `deployedBaseUrl` me update karein.
5. Deploy complete hone ke baad GitHub Pages frontend automatically backend se connect hoga.

### 5. Browser Console Kaise Check Karein?
- Browser me `F12` ya `Right Click -> Inspect` dabayein, aur **Console** tab par click karein. Wahan aapko frontend ke saare logs safely dikhenge.

---

## 🔒 Security Best Practices Implemented
- **Server-Side API Isolation**: Secret keys are never sent to the browser or bundled in client scripts.
- **Input Sanitization**: Request character limits (4,000 characters) and 1MB payload caps prevent abuse.
- **Crash-Proof LocalStorage**: `StorageHelper` includes JSON parse try-catch wrappers to prevent corrupted user data from crashing the frontend.
- **Zero Hallucination Quizzes**: All MCQs and presentation slide decks adhere to strict JSON schema validation before rendering.

---

## 📄 License & Academic Attribution
Developed as an academic capstone portfolio for **BBA Digital Marketing & Artificial Intelligence** university studies.  
Free for educational use and student demonstration.
