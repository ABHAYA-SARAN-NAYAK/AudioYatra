import os
import json
import base64
import math
import logging
from datetime import date
from flask import Flask, request, jsonify, make_response, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import requests

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AudioYatra")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
MURF_API_KEY = os.getenv("MURF_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
PORT = int(os.getenv("PORT", 5000))

if not GEMINI_API_KEY:
    raise SystemExit("Missing GEMINI_API_KEY in .env file.")

# Initialize Google GenAI client
try:
    from google import genai
    from google.genai import types
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    logger.info("Successfully initialized google-genai Client.")
except Exception as e:
    logger.error("Failed to initialize google-genai SDK: %s", e)
    raise SystemExit(f"Failed to initialize google-genai SDK: {e}")

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app, resources={r"/*": {"origins": ["http://127.0.0.1:8000", "http://localhost:8000", "http://127.0.0.1:5000", "http://localhost:5000", "null", "*"]}})

# Load Places Database
PLACES_FILE = os.path.join(os.path.dirname(__file__), "places.json")
try:
    with open(PLACES_FILE, "r", encoding="utf-8") as f:
        PLACES_DATA = json.load(f)
except Exception as e:
    logger.error("Could not load places.json: %s", e)
    PLACES_DATA = []

# Zero-cache response helper
def no_cache_response(payload, status=200):
    resp = make_response(jsonify(payload), status)
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp

# Murf TTS Live Caller
def generate_murf_speech(text, voice_id="Matthew", locale="en-US"):
    if not MURF_API_KEY or MURF_API_KEY == "your_murf_api_key_here":
        return None, "Murf API key is not configured."

    url = "https://global.api.murf.ai/v1/speech/stream"
    headers = {
        "api-key": MURF_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "voice_id": voice_id,
        "text": text[:1500],
        "locale": locale,
        "model": "FALCON",
        "format": "MP3",
        "sampleRate": 24000,
        "channelType": "MONO"
    }

    try:
        res = requests.post(url, headers=headers, json=payload, timeout=30)
        if res.status_code == 200:
            return base64.b64encode(res.content).decode("utf-8"), None
        else:
            logger.error(f"Murf API Error {res.status_code}: {res.text}")
            return None, f"Murf TTS failed ({res.status_code}): {res.text}"
    except Exception as e:
        logger.error(f"Murf connection failure: {e}")
        return None, str(e)

# On-the-spot Gemini Bundle Generator
def call_gemini_tour_bundle(place, length, style, language):
    length_desc = {
        "Quick": "strictly around 70 words (30 seconds duration)",
        "Summary": "strictly around 200 words (90 seconds duration)",
        "Detailed": "strictly around 400 words (3 minutes duration)"
    }.get(length, "around 200 words")

    prompt = f"""
You are the AudioYatra tour guide for '{place}'. 
Generate a completely fresh, engaging tour package on the spot.

Constraints:
- Tour Style: {style}
- Script Length: {length_desc}
- Language: Respond ONLY in {language}.
- Audio Script: Plain spoken words ONLY. No markdown symbols (no asterisks, bolding, hashes), no bullet points, and no emojis.

Respond ONLY with a valid JSON object matching this structure:
{{
  "valid": true,
  "place": "{place}",
  "script": "The narrative script to be spoken aloud.",
  "visit": {{
    "bestTime": "Recommended season/months",
    "duration": "Recommended duration (e.g. 2-3 hours)",
    "entryFee": "Ticket price details",
    "openHours": "Operating hours",
    "dressCode": "Appropriate attire",
    "rules": "Crucial guidelines or photography restrictions",
    "tips": ["Tip 1", "Tip 2", "Tip 3"],
    "food": ["Local delicacy 1", "Local delicacy 2"],
    "mythVsFact": {{"myth": "Common myth", "fact": "True fact"}}
  }},
  "quiz": [
    {{
      "q": "Question 1?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "explanation": "Brief explanation"
    }},
    {{
      "q": "Question 2?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 1,
      "explanation": "Brief explanation"
    }},
    {{
      "q": "Question 3?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 2,
      "explanation": "Brief explanation"
    }},
    {{
      "q": "Question 4?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 3,
      "explanation": "Brief explanation"
    }},
    {{
      "q": "Question 5?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "explanation": "Brief explanation"
    }}
  ],
  "questions": [
    "Suggested question 1 about this place?",
    "Suggested question 2 about this place?",
    "Suggested question 3 about this place?"
  ]
}}
All text values must be in {language}. All JSON dictionary keys must remain in English.
"""

    models_to_try = [GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]
    last_error = None

    for model in models_to_try:
        try:
            logger.info("Calling Gemini model %s for place %s in %s", model, place, language)
            response = gemini_client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    response_mime_type="application/json"
                )
            )
            raw = response.text.strip()
            if raw.startswith("```json"): raw = raw[7:]
            if raw.startswith("```"): raw = raw[3:]
            if raw.endswith("```"): raw = raw[:-3]
            return json.loads(raw.strip()), None
        except Exception as e:
            last_error = e
            logger.warning(f"Model {model} failed: {e}")

    return None, str(last_error)

# Haversine distance calculator for planner
def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# --- ROUTES ---

@app.route("/", methods=["GET"])
def serve_index():
    return send_from_directory(".", "index.html")

@app.route("/health", methods=["GET"])
def health():
    return no_cache_response({
        "status": "healthy",
        "geminiConfigured": bool(gemini_client),
        "murfConfigured": bool(MURF_API_KEY and MURF_API_KEY != "your_murf_api_key_here"),
        "models": [GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.5-flash-lite"],
        "placesCount": len(PLACES_DATA)
    })

@app.route("/places", methods=["GET"])
def get_places():
    query = request.args.get("q", "").strip().lower()
    category = request.args.get("category", "").strip().lower()
    region = request.args.get("region", "").strip().lower()

    is_cat_all = not category or category in ["all", "all categories"]
    is_region_all = not region or region in ["all", "all regions"]

    results = []
    for p in PLACES_DATA:
        matches_q = (not query or query in p["name"].lower() or query in p["city"].lower() or query in p["country"].lower())
        matches_cat = (is_cat_all or p["category"].lower() == category)
        matches_region = (is_region_all or p.get("region", "").lower() == region or p.get("country", "").lower() == region)

        if matches_q and matches_cat and matches_region:
            results.append(p)

    return no_cache_response(results)

@app.route("/place-of-the-day", methods=["GET"])
def place_of_the_day():
    if not PLACES_DATA:
        return no_cache_response({"error": "No places database found"}, 404)
    today = date.today().toordinal()
    selected_place = PLACES_DATA[today % len(PLACES_DATA)]
    return no_cache_response(selected_place)

@app.route("/generate-audio-guide", methods=["POST"])
def generate_audio_guide():
    data = request.get_json(silent=True) or {}
    place = data.get("place", "").strip()
    answer_type = data.get("answerType", "Summary")
    style = data.get("style", "Storyteller")
    language = data.get("language", "English")
    voice_id = data.get("voiceId", "Matthew")
    locale = data.get("locale", "en-US")
    with_audio = data.get("withAudio", True)

    if not place:
        return no_cache_response({"error": "Place name is required."}, 400)

    # 1. On-the-spot Gemini Call
    bundle, gemini_err = call_gemini_tour_bundle(place, answer_type, style, language)
    if gemini_err or not bundle:
        return no_cache_response({"error": f"Gemini error: {gemini_err}"}, 502)

    script_text = bundle.get("script", "")
    audio_base64 = None
    audio_err = None

    # 2. On-the-spot Murf Call
    if with_audio and script_text:
        audio_base64, audio_err = generate_murf_speech(script_text, voice_id=voice_id, locale=locale)

    # Return full package
    return no_cache_response({
        "place": place,
        "description": script_text,
        "audioBase64": audio_base64,
        "audioError": audio_err,
        "visit": bundle.get("visit", {}),
        "quiz": bundle.get("quiz", []),
        "questions": bundle.get("questions", [])
    })

@app.route("/ask-guide", methods=["POST"])
def ask_guide():
    data = request.get_json(silent=True) or {}
    place = data.get("place", "")
    question = data.get("question", "").strip()
    language = data.get("language", "English")
    voice_id = data.get("voiceId", "Matthew")
    locale = data.get("locale", "en-US")
    history = data.get("history", [])
    with_audio = data.get("withAudio", True)

    if not question:
        return no_cache_response({"error": "Question is required"}, 400)

    recent_history = history[-5:]
    hist_text = "\n".join([f"Q: {h.get('q','')}\nA: {h.get('a','')}" for h in recent_history])

    prompt = f"""
You are the AudioYatra guide for {place}. Answer the tourist's question concisely in maximum 100 words.
Keep the tone helpful, authentic, and engaging.
Respond ONLY in {language}.
Plain spoken text only (no emojis, markdown, or bullet points).

Recent conversation:
{hist_text}

Tourist Question: {question}
"""
    answer_text = None
    if gemini_client:
        try:
            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt
            )
            answer_text = response.text.strip()
        except Exception as e:
            logger.error("Gemini ask-guide error: %s", e)

    if not answer_text:
        answer_text = f"That is a great question about {place}! Visitors love exploring its unique history."

    audio_base64 = None
    audio_error = None
    if with_audio and answer_text:
        audio_base64, audio_error = generate_murf_speech(answer_text, voice_id=voice_id, locale=locale)

    return no_cache_response({
        "answer": answer_text,
        "audioBase64": audio_base64,
        "audioError": audio_error
    })

@app.route("/speak", methods=["POST"])
def speak():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    voice_id = data.get("voiceId", "Matthew")
    locale = data.get("locale", "en-US")

    if not text:
        return no_cache_response({"error": "Text is required"}, 400)

    audio_base64, err = generate_murf_speech(text, voice_id=voice_id, locale=locale)
    if err:
        return no_cache_response({"error": err}, 502)

    return no_cache_response({"audioBase64": audio_base64})

@app.route("/plan-trip", methods=["POST"])
def plan_trip():
    data = request.get_json(silent=True) or {}
    place_ids = data.get("placeIds", [])
    place_names = data.get("placeNames", [])
    days = max(1, int(data.get("days", 1)))
    hours_per_day = float(data.get("hoursPerDay", 6.0))
    pace = data.get("pace", "Moderate")

    selected = []
    for p in PLACES_DATA:
        if p["id"] in place_ids or p["name"] in place_names:
            selected.append(p)

    if not selected:
        return no_cache_response({"error": "No matching places found for itinerary planning."}, 400)

    unvisited = selected.copy()
    route = [unvisited.pop(0)]
    while unvisited:
        curr = route[-1]
        next_place = min(unvisited, key=lambda x: haversine_km(curr["lat"], curr["lng"], x["lat"], x["lng"]))
        route.append(next_place)
        unvisited.remove(next_place)

    total_dist_km = 0.0
    for i in range(len(route) - 1):
        total_dist_km += haversine_km(route[i]["lat"], route[i]["lng"], route[i+1]["lat"], route[i+1]["lng"])

    itinerary_days = [[] for _ in range(days)]
    for i, stop in enumerate(route):
        day_idx = min(days - 1, int(i / math.ceil(len(route) / days)))
        itinerary_days[day_idx].append(stop)

    return no_cache_response({
        "orderedStops": route,
        "totalDistanceKm": round(total_dist_km, 1),
        "days": days,
        "itinerary": itinerary_days,
        "travelNotice": "approx., straight-line based"
    })

# --- SERVE FRONTEND ASSETS ---
@app.route("/<path:path>")
def serve_static_files(path):
    if os.path.exists(path):
        return send_from_directory(".", path)
    return send_from_directory(".", "index.html")

if __name__ == "__main__":
    logger.info("Starting AudioYatra Flask app on port %s...", PORT)
    app.run(debug=True, port=PORT, host="0.0.0.0")
