# AudioYatra — AI Audio Travel Guide 🎙️✈️

**AudioYatra** is a state-of-the-art AI-powered audio travel guide application that lets tourists and travelers explore 30+ world-famous monuments, historical wonders, and cultural landmarks through rich audio storytelling, interactive Q&A, custom trip planning, and educational quizzes in multiple languages (English, Hindi, Tamil, Telugu).

---

## 🌟 Features

- **🎙️ Multilingual AI Audio Guides:** Listen to high-quality audio narratives generated in English, Hindi (हिंदी), Tamil (தமிழ்), and Telugu (తెలుగు).
- **🎭 5 Guide Personalities:** Choose from Classic Guide, Storyteller, Kids Friendly, Quick Facts, and Funny Local.
- **⚡ Dual Audio Engine:** Seamlessly uses **Murf AI Stream TTS** when API key is provided, with clean automatic fallback to **Web Speech Synthesis API** (`window.speechSynthesis`) so playback always works!
- **💬 Interactive Ask-the-Guide Q&A:** Ask any question via text or voice input using Speech Recognition and get instant AI responses.
- **🗺️ AI Multi-Stop Trip Planner:** Select landmarks and let AudioYatra build an optimized multi-day travel itinerary with Haversine nearest-neighbor TSP route distance calculations.
- **🏆 Monument Knowledge Quiz:** Test your knowledge with 5-question trivia quizzes for each landmark, complete with immediate answer validation and detailed explanations.
- **📑 Detailed Visit Planning:** Essential visitor information, best visiting months, entry fee details, dress code, insider tips, hidden gems, local food highlights, and Myth vs. Fact comparisons.
- **🛂 Travel Passport & Stats:** Earn stamps for every monument explored and track your total listening time and quiz masteries.

---

## 📁 File Structure

```
audioyatra/
├── .env.example         # Environment variable template
├── .env                 # Local configuration
├── requirements.txt     # Python dependencies
├── places.json          # Consolidated database of 30 landmarks
├── build_places.py      # Script to parse metadata & generate places.json
├── app.py               # Flask backend API server & static file host
├── index.html           # Single-page application HTML structure
├── styles.css           # Glassmorphism dark-theme CSS design system
├── index.js             # Client-side JavaScript application engine
└── README.md            # Documentation
```

---

## ⚙️ Setup & Installation

### 1. Install Dependencies
Make sure Python 3.9+ is installed, then run:
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables (Optional)
Copy `.env.example` to `.env`:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
MURF_API_KEY=your_murf_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=5000
```
*Note: If `GEMINI_API_KEY` or `MURF_API_KEY` are not provided, AudioYatra automatically activates intelligent fallback data mode and Web Speech API audio synthesis.*

### 3. Build Places Database
Generate `places.json`:
```bash
python build_places.py
```

### 4. Run the Application
Launch the Flask development server:
```bash
python app.py
```
Open your browser and navigate to:
```
http://localhost:5000
```

---

## 🛠️ API Endpoints

- `GET /health` — Application health check & server status.
- `GET /places?q=&category=&region=` — Search & filter destinations.
- `GET /place-of-the-day` — Daily featured landmark selection.
- `POST /generate-audio-guide` — Generate full audio guide bundle (narrative script, visit plan, quiz, audio stream).
- `POST /ask-guide` — Ask interactive questions about a landmark.
- `POST /speak` — Convert text to speech via Murf API.
- `POST /plan-trip` — Generate optimized route & day-by-day travel itinerary.

---

## 🎨 Design System

Built using modern web design principles:
- **Dark Mode Aesthetic:** Deep navy dark backgrounds (`#090d16`, `#0f172a`), vibrant neon accents (`#6366f1`, `#ec4899`, `#06b6d4`).
- **Glassmorphism:** Frosted translucent cards with subtle gradients and borders.
- **Dynamic Animations:** Animated sound visualizer bars, floating quote badges, hover scale effects, and micro-interactions.
