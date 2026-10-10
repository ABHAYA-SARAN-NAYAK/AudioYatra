// Automatically switches between local dev and live deployed domain
const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? (window.location.port === "5000" ? window.location.origin : "http://127.0.0.1:5000")
  : window.location.origin;

// Global DOM Cache Object
const DOM = {};

// Global State
const STATE = {
  places: [],
  selectedPlace: null,
  currentBundle: null,
  favorites: JSON.parse(localStorage.getItem("audioyatra_favs") || "[]"),
  recent: JSON.parse(localStorage.getItem("audioyatra_recent") || "[]"),
  stats: JSON.parse(localStorage.getItem("audioyatra_stats") || '{"listened":0,"mins":0,"quizzes":0}'),
  audioMode: "idle", // 'murf' | 'webspeech' | 'idle'
  isPlaying: false,
  speechSynthUtterance: null,
  murfAudioElem: new Audio(),
  chatHistory: [],
  activeRegion: "All",
  activeCategory: "all"
};

// Strict Murf Voice Configuration
const MURF_LANG_MAP = {
  English: {
    locale: "en-US",
    voices: [
      { id: "Matthew", label: "Matthew (Male)" },
      { id: "Alicia", label: "Alicia (Female)" }
    ]
  },
  Hindi: {
    locale: "hi-IN",
    voices: [
      { id: "Aman", label: "Aman (Male)" },
      { id: "Namrita", label: "Namrita (Female)" }
    ]
  },
  Tamil: {
    locale: "ta-IN",
    voices: [
      { id: "Murali", label: "Murali (Male)" },
      { id: "Iniya", label: "Iniya (Female)" }
    ]
  },
  Telugu: {
    locale: "te-IN",
    voices: [
      { id: "Zion", label: "Zion (Male)" },
      { id: "Josie", label: "Josie (Female)" }
    ]
  }
};

function getSelectedLanguageKey() {
  const raw = (DOM.guideLang ? DOM.guideLang.value : "") || "English";
  if (raw.includes("Hindi") || raw.includes("हिंदी")) return "Hindi";
  if (raw.includes("Tamil") || raw.includes("தமிழ்")) return "Tamil";
  if (raw.includes("Telugu") || raw.includes("తెలుగు")) return "Telugu";
  return "English";
}

function syncVoiceDropdown() {
  const voiceSelect = DOM.guideVoice || document.getElementById("guideVoice");
  if (!voiceSelect) return;

  const langKey = getSelectedLanguageKey();
  const config = MURF_LANG_MAP[langKey] || MURF_LANG_MAP.English;

  voiceSelect.innerHTML = "";
  config.voices.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.label;
    voiceSelect.appendChild(opt);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  cacheDOMElements();
  initEventListeners();
  syncVoiceDropdown();
  loadPlacesDatabase();
  loadPlaceOfTheDay();
  updateFavoritesCount();
  updatePassportStats();
});

function cacheDOMElements() {
  DOM.navTabs = document.getElementById("navTabs");
  DOM.views = document.querySelectorAll(".view-panel");
  DOM.topSearchInput = document.getElementById("topSearchInput");
  DOM.searchSuggestionsList = document.getElementById("searchSuggestionsList");
  DOM.globalLangSelect = document.getElementById("globalLangSelect");
  DOM.profileBtn = document.getElementById("profileBtn");

  // Home View
  DOM.heroSearchInput = document.getElementById("heroSearchInput");
  DOM.heroSearchBtn = document.getElementById("heroSearchBtn");
  DOM.regionChips = document.getElementById("regionChips");
  DOM.featuredCardsContainer = document.getElementById("featuredCardsContainer");
  DOM.viewAllFeaturedBtn = document.getElementById("viewAllFeaturedBtn");
  DOM.potdBanner = document.getElementById("potdBanner");
  DOM.potdTitle = document.getElementById("potdTitle");
  DOM.potdHook = document.getElementById("potdHook");
  DOM.potdListenBtn = document.getElementById("potdListenBtn");

  // Explore View
  DOM.exploreSearchInput = document.getElementById("exploreSearchInput");
  DOM.categoryFilterContainer = document.getElementById("categoryFilterContainer");
  DOM.explorePlacesGrid = document.getElementById("explorePlacesGrid");

  // Detail Dashboard View
  DOM.backToExploreBtn = document.getElementById("backToExploreBtn");
  DOM.sidebarPlaceImg = document.getElementById("sidebarPlaceImg");
  DOM.sidebarPlaceFallback = document.getElementById("sidebarPlaceFallback");
  DOM.sidebarPlaceName = document.getElementById("sidebarPlaceName");
  DOM.sidebarPlaceLocationText = document.getElementById("sidebarPlaceLocationText");
  DOM.sideNavBtns = document.querySelectorAll(".side-nav-btn");
  DOM.subviews = document.querySelectorAll(".subview");
  
  DOM.detailHeroImage = document.getElementById("detailHeroImage");
  DOM.detailPlaceTitle = document.getElementById("detailPlaceTitle");
  DOM.detailPlaceHook = document.getElementById("detailPlaceHook");
  DOM.detailPlaceLocation = document.getElementById("detailPlaceLocation");
  DOM.detailPlaceTags = document.getElementById("detailPlaceTags");
  DOM.favToggleBtn = document.getElementById("favToggleBtn");
  DOM.favBtnText = document.getElementById("favBtnText");
  DOM.favBadgeCount = document.getElementById("favBadgeCount");
  DOM.addToTripBtn = document.getElementById("addToTripBtn");

  // Quick Info Sidebar
  DOM.quickBestTime = document.getElementById("quickBestTime");
  DOM.quickDuration = document.getElementById("quickDuration");
  DOM.quickFee = document.getElementById("quickFee");
  DOM.quickHours = document.getElementById("quickHours");

  // Audio Guide Generator Controls
  DOM.guideLang = document.getElementById("guideLang");
  DOM.guideVoice = document.getElementById("guideVoice");
  DOM.guideStyle = document.getElementById("guideStyle");
  DOM.guideLength = document.getElementById("guideLength");
  DOM.generateGuideBtn = document.getElementById("generateGuideBtn");
  DOM.resetOptionsBtn = document.getElementById("resetOptionsBtn");

  // Player Console
  DOM.audioSoundBars = document.getElementById("audioSoundBars");
  DOM.playingTitle = document.getElementById("playingTitle");
  DOM.playingMeta = document.getElementById("playingMeta");
  DOM.currentTimeLabel = document.getElementById("currentTimeLabel");
  DOM.durationLabel = document.getElementById("durationLabel");
  DOM.audioSeekSlider = document.getElementById("audioSeekSlider");
  DOM.mainPlayPauseBtn = document.getElementById("mainPlayPauseBtn");
  DOM.rewind10Btn = document.getElementById("rewind10Btn");
  DOM.forward10Btn = document.getElementById("forward10Btn");
  DOM.speedSlider = document.getElementById("speedSlider");
  DOM.speedBadge = document.getElementById("speedBadge");
  DOM.volumeSlider = document.getElementById("volumeSlider");
  DOM.scriptBody = document.getElementById("scriptBody");
  DOM.copyScriptBtn = document.getElementById("copyScriptBtn");

  // Ask Guide Chat
  DOM.presetQuestionsBar = document.getElementById("presetQuestionsBar");
  DOM.chatMessagesArea = document.getElementById("chatMessagesArea");
  DOM.chatInputText = document.getElementById("chatInputText");
  DOM.sendChatBtn = document.getElementById("sendChatBtn");
  DOM.voiceInputBtn = document.getElementById("voiceInputBtn");

  // Plan Visit Tab
  DOM.visitBestTime = document.getElementById("visitBestTime");
  DOM.visitDuration = document.getElementById("visitDuration");
  DOM.visitFee = document.getElementById("visitFee");
  DOM.visitHours = document.getElementById("visitHours");
  DOM.visitDress = document.getElementById("visitDress");
  DOM.visitRules = document.getElementById("visitRules");
  DOM.visitTipsList = document.getElementById("visitTipsList");
  DOM.visitGemsList = document.getElementById("visitGemsList");
  DOM.visitFoodList = document.getElementById("visitFoodList");
  DOM.mythText = document.getElementById("mythText");
  DOM.factText = document.getElementById("factText");

  // Quiz Tab
  DOM.quizContainer = document.getElementById("quizContainer");
  DOM.quizScorePill = document.getElementById("quizScorePill");
  DOM.startQuizBtn = document.getElementById("startQuizBtn");

  // Nearby Tab
  DOM.nearbyGrid = document.getElementById("nearbyGrid");

  // Trip Planner View
  DOM.tripPlaceSelector = document.getElementById("tripPlaceSelector");
  DOM.tripDaysInput = document.getElementById("tripDaysInput");
  DOM.tripPaceSelect = document.getElementById("tripPaceSelect");
  DOM.buildTripBtn = document.getElementById("buildTripBtn");
  DOM.tripDistanceBadge = document.getElementById("tripDistanceBadge");
  DOM.itineraryOutput = document.getElementById("itineraryOutput");

  // Favorites & Recent
  DOM.favoritesGrid = document.getElementById("favoritesGrid");
  DOM.recentList = document.getElementById("recentList");
  DOM.clearRecentBtn = document.getElementById("clearRecentBtn");

  // Profile Modal
  DOM.profileModal = document.getElementById("profileModal");
  DOM.closeProfileModal = document.getElementById("closeProfileModal");
  DOM.statPlacesCount = document.getElementById("statPlacesCount");
  DOM.statMinsCount = document.getElementById("statMinsCount");
  DOM.statQuizzesCount = document.getElementById("statQuizzesCount");
  DOM.statFavsCount = document.getElementById("statFavsCount");
  DOM.passportStampsGrid = document.getElementById("passportStampsGrid");
}

/* ==========================================================================
   EVENT LISTENERS INITIALIZATION
   ========================================================================== */

function initEventListeners() {
  // Navigation Tabs
  DOM.navTabs.addEventListener("click", (e) => {
    const pill = e.target.closest(".nav-pill");
    if (!pill) return;
    const targetView = pill.getAttribute("data-view");
    switchView(targetView);
  });

  // Global Language Selector Sync
  DOM.globalLangSelect.addEventListener("change", (e) => {
    DOM.guideLang.value = e.target.value;
    syncVoiceDropdown();
  });

  DOM.guideLang.addEventListener("change", syncVoiceDropdown);

  // Top Search Bar
  DOM.topSearchInput.addEventListener("input", handleTopSearchInput);
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-input-pill")) {
      DOM.searchSuggestionsList.classList.remove("active");
    }
  });

  // Hero Search
  DOM.heroSearchBtn.addEventListener("click", () => {
    const q = DOM.heroSearchInput.value.strip ? DOM.heroSearchInput.value.strip() : DOM.heroSearchInput.value.trim();
    if (q) {
      DOM.exploreSearchInput.value = q;
      switchView("explore-view");
      renderExploreGrid();
    }
  });

  // Region Filter Chips
  DOM.regionChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    DOM.regionChips.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    STATE.activeRegion = chip.getAttribute("data-region");
    renderFeaturedCarousel();
  });

  // Category Filter Pills
  DOM.categoryFilterContainer.addEventListener("click", (e) => {
    const pill = e.target.closest(".cat-pill");
    if (!pill) return;
    DOM.categoryFilterContainer.querySelectorAll(".cat-pill").forEach(c => c.classList.remove("active"));
    pill.classList.add("active");
    STATE.activeCategory = pill.getAttribute("data-cat");
    renderExploreGrid();
  });

  DOM.exploreSearchInput.addEventListener("input", renderExploreGrid);
  DOM.viewAllFeaturedBtn.addEventListener("click", () => switchView("explore-view"));

  // Dashboard Back Button
  DOM.backToExploreBtn.addEventListener("click", () => switchView("explore-view"));

  // Subview Nav
  DOM.sideNavBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const subviewId = btn.getAttribute("data-subview");
      switchDashboardSubview(subviewId);
    });
  });

  // Favorites Toggle
  DOM.favToggleBtn.addEventListener("click", toggleCurrentPlaceFavorite);

  // Audio Guide Generator
  DOM.generateGuideBtn.addEventListener("click", generateAudioGuideHandler);
  DOM.resetOptionsBtn.addEventListener("click", () => {
    DOM.guideLang.value = "English";
    DOM.guideVoice.value = "Matthew";
    DOM.guideStyle.value = "Storyteller";
    DOM.guideLength.value = "Summary";
  });

  // Player Controls
  DOM.mainPlayPauseBtn.addEventListener("click", toggleAudioPlayPause);
  DOM.rewind10Btn.addEventListener("click", () => seekAudioRelative(-10));
  DOM.forward10Btn.addEventListener("click", () => seekAudioRelative(10));
  DOM.speedSlider.addEventListener("input", (e) => {
    const rate = parseFloat(e.target.value);
    DOM.speedBadge.textContent = `${rate.toFixed(1)}x`;
    if (STATE.audioMode === "murf") {
      STATE.murfAudioElem.playbackRate = rate;
    }
  });
  DOM.volumeSlider.addEventListener("input", (e) => {
    const vol = parseFloat(e.target.value);
    STATE.murfAudioElem.volume = vol;
  });

  DOM.copyScriptBtn.addEventListener("click", () => {
    const text = DOM.scriptBody.innerText;
    if (text) {
      navigator.clipboard.writeText(text);
      DOM.copyScriptBtn.innerText = "✓ Copied!";
      setTimeout(() => DOM.copyScriptBtn.innerText = "Copy", 2000);
    }
  });

  // Ask Guide Chat
  DOM.sendChatBtn.addEventListener("click", sendChatMessage);
  DOM.chatInputText.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChatMessage();
  });
  DOM.presetQuestionsBar.addEventListener("click", (e) => {
    const btn = e.target.closest(".preset-q-btn");
    if (!btn) return;
    DOM.chatInputText.value = btn.getAttribute("data-q");
    sendChatMessage();
  });

  // Voice Input Speech Recognition
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      DOM.chatInputText.value = transcript;
      DOM.voiceInputBtn.classList.remove("listening");
      sendChatMessage();
    };

    recognition.onerror = () => DOM.voiceInputBtn.classList.remove("listening");
    recognition.onend = () => DOM.voiceInputBtn.classList.remove("listening");

    DOM.voiceInputBtn.addEventListener("click", () => {
      DOM.voiceInputBtn.classList.add("listening");
      recognition.start();
    });
  } else {
    DOM.voiceInputBtn.style.display = "none";
  }

  // Quiz Button
  if (DOM.startQuizBtn) {
    DOM.startQuizBtn.addEventListener("click", renderQuizQuestions);
  }

  // Trip Planner
  DOM.buildTripBtn.addEventListener("click", buildTripItineraryHandler);
  DOM.addToTripBtn.addEventListener("click", () => {
    switchView("trips-view");
  });

  // Recent History
  DOM.clearRecentBtn.addEventListener("click", () => {
    STATE.recent = [];
    localStorage.setItem("audioyatra_recent", JSON.stringify([]));
    renderRecentList();
  });

  // Profile Modal
  DOM.profileBtn.addEventListener("click", () => {
    updatePassportStats();
    DOM.profileModal.classList.remove("hidden");
  });
  DOM.closeProfileModal.addEventListener("click", () => {
    DOM.profileModal.classList.add("hidden");
  });
  DOM.profileModal.addEventListener("click", (e) => {
    if (e.target === DOM.profileModal) DOM.profileModal.classList.add("hidden");
  });
}

/* ==========================================================================
   VIEW ROUTING & CONTROLLER
   ========================================================================== */

function switchView(viewId) {
  DOM.views.forEach(v => v.classList.remove("active"));
  const target = document.getElementById(viewId);
  if (target) target.classList.add("active");

  DOM.navTabs.querySelectorAll(".nav-pill").forEach(p => {
    p.classList.toggle("active", p.getAttribute("data-view") === viewId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (viewId === "explore-view") renderExploreGrid();
  if (viewId === "trips-view") populateTripPlaceSelector();
  if (viewId === "favorites-view") renderFavoritesGrid();
  if (viewId === "recent-view") renderRecentList();
}

function switchDashboardSubview(subviewId) {
  DOM.subviews.forEach(s => s.classList.remove("active"));
  const target = document.getElementById(subviewId);
  if (target) target.classList.add("active");

  DOM.sideNavBtns.forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-subview") === subviewId);
  });
}

/* ==========================================================================
   DATA FETCHING & PLACES LOADING
   ========================================================================== */

async function loadPlacesDatabase() {
  try {
    console.log(`Fetching places from: ${API_BASE}/places`);
    const res = await fetch(`${API_BASE}/places`, { cache: "no-store" });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Failed to fetch places: HTTP ${res.status} - ${errBody}`);
    }
    const data = await res.json();
    STATE.places = data;
    renderFeaturedCarousel();
    renderExploreGrid();
    populateTripPlaceSelector();
  } catch (err) {
    console.error("Error loading places:", err);
  }
}

async function loadPlaceOfTheDay() {
  try {
    const res = await fetch(`${API_BASE}/place-of-the-day`, { cache: "no-store" });
    if (res.ok) {
      const p = await res.json();
      DOM.potdTitle.textContent = `${p.emoji} ${p.name}`;
      DOM.potdHook.textContent = p.shortHook;
      DOM.potdListenBtn.onclick = () => openPlaceDashboard(p);
    }
  } catch (e) {
    console.error("POTD fetch failed:", e);
  }
}

/* ==========================================================================
   RENDER CAROUSEL & GRIDS
   ========================================================================== */

function renderFeaturedCarousel() {
  if (!DOM.featuredCardsContainer) return;
  DOM.featuredCardsContainer.innerHTML = "";

  const filtered = STATE.places.filter(p => {
    if (STATE.activeRegion === "All") return true;
    return (p.region || "").toLowerCase() === STATE.activeRegion.toLowerCase() || (p.country || "").toLowerCase() === STATE.activeRegion.toLowerCase();
  });

  filtered.slice(0, 8).forEach(place => {
    const card = createPlaceCardElement(place);
    DOM.featuredCardsContainer.appendChild(card);
  });
}

function renderExploreGrid() {
  if (!DOM.explorePlacesGrid) return;
  DOM.explorePlacesGrid.innerHTML = "";

  const query = (DOM.exploreSearchInput ? DOM.exploreSearchInput.value : "").trim().toLowerCase();
  const cat = (STATE.activeCategory || "").trim().toLowerCase();
  const isAllCat = !cat || cat === "all" || cat === "all categories";

  const filtered = STATE.places.filter(p => {
    const matchesQ = !query || p.name.toLowerCase().includes(query) || p.city.toLowerCase().includes(query) || p.country.toLowerCase().includes(query);
    const matchesCat = isAllCat || p.category.toLowerCase() === cat;
    return matchesQ && matchesCat;
  });

  if (filtered.length === 0) {
    DOM.explorePlacesGrid.innerHTML = `<p class="placeholder-text" style="grid-column:1/-1; text-align:center;">No matching destinations found.</p>`;
    return;
  }

  filtered.forEach(place => {
    const card = createPlaceCardElement(place);
    DOM.explorePlacesGrid.appendChild(card);
  });
}

function createPlaceCardElement(place) {
  const card = document.createElement("div");
  card.className = "place-card";
  const isFav = STATE.favorites.includes(place.id);

  card.innerHTML = `
    <div class="card-thumb-wrap place-card-img-wrapper">
      <img 
        src="${place.image}" 
        alt="${place.name}" 
        loading="lazy" 
        referrerpolicy="no-referrer"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
      />
      <div class="fallback-gradient" style="background: ${place.gradient};">
        <span>${place.emoji}</span>
      </div>
      <div class="card-top-badges">
        <span class="cat-badge">${place.category || 'Historical'}</span>
        <button class="card-fav-btn ${isFav ? 'active' : ''}" title="Favorite">
          <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </button>
      </div>
    </div>
    <div class="place-card-body">
      <h4 class="place-card-title">${place.emoji} ${place.name}</h4>
      <p class="place-card-location"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg> ${place.city}, ${place.country}</p>
      <p class="place-card-hook">${place.shortHook || ''}</p>
      <div class="place-card-footer">
        <span class="listen-btn-pill">🎙️ Listen Audio Guide</span>
      </div>
    </div>
  `;

  card.querySelector(".card-fav-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    togglePlaceFavorite(place.id);
  });

  card.addEventListener("click", () => openPlaceDashboard(place));
  return card;
}

/* ==========================================================================
   PLACE DASHBOARD CONTROLLER
   ========================================================================== */

function openPlaceDashboard(place) {
  STATE.selectedPlace = place;
  STATE.currentBundle = null;
  STATE.chatHistory = [];

  // Update Hero & Sidebar Metadata
  DOM.sidebarPlaceName.textContent = place.name;
  DOM.sidebarPlaceLocationText.textContent = `${place.city}, ${place.country}`;
  DOM.sidebarPlaceImg.src = place.image;
  DOM.sidebarPlaceImg.onerror = function() {
    this.style.display = 'none';
    if (DOM.sidebarPlaceFallback) DOM.sidebarPlaceFallback.style.display = 'flex';
  };
  DOM.sidebarPlaceFallback.style.background = place.gradient;
  DOM.sidebarPlaceFallback.textContent = place.emoji;

  DOM.detailHeroImage.src = place.image;
  DOM.detailHeroImage.onerror = function() {
    this.style.display = 'none';
  };
  DOM.detailPlaceTitle.textContent = `${place.emoji} ${place.name}`;
  DOM.detailPlaceLocation.textContent = `${place.city}, ${place.country}`;
  DOM.detailPlaceHook.textContent = place.shortHook;
  DOM.detailPlaceTags.innerHTML = `
    <span class="tag-badge">🏛️ ${place.category}</span>
    <span class="tag-badge">📍 ${place.region}</span>
    <span class="tag-badge">⏱️ ~${place.avgVisitMinutes} mins</span>
  `;

  DOM.quickBestTime.textContent = place.bestMonths;
  DOM.quickDuration.textContent = `${Math.round(place.avgVisitMinutes / 60 * 10) / 10} hours`;

  updateFavButtonUI();

  // Reset Subviews
  switchDashboardSubview("audio-guide-tab");
  DOM.scriptBody.innerHTML = `<p class="placeholder-text">Click <strong>"Generate Audio Guide"</strong> above to craft an AI narrative audio story for ${place.name}.</p>`;
  DOM.playingTitle.textContent = `${place.name} Guide`;
  DOM.playingMeta.textContent = "Ready to generate";
  DOM.chatMessagesArea.innerHTML = `<div class="msg guide-msg"><p>Namaste! I am your AI Guide for ${place.name}. Ask me any question!</p></div>`;

  switchView("place-dashboard-view");
}

/* ==========================================================================
   AI AUDIO GUIDE GENERATION & AUDIO PLAYER
   ========================================================================== */

async function generateAudioGuideHandler() {
  const currentPlace = STATE.selectedPlace;
  if (!currentPlace) {
    alert("Please select a place first.");
    return;
  }

  const langKey = getSelectedLanguageKey();
  const langConfig = MURF_LANG_MAP[langKey] || MURF_LANG_MAP.English;
  const voiceSelect = DOM.guideVoice || document.getElementById("guideVoice");
  const voiceId = voiceSelect ? voiceSelect.value : langConfig.voices[0].id;
  const style = (DOM.guideStyle ? DOM.guideStyle.value : "") || "Storyteller";
  const length = (DOM.guideLength ? DOM.guideLength.value : "") || "Summary";

  // UI Loading State
  DOM.generateGuideBtn.disabled = true;
  DOM.generateGuideBtn.innerHTML = "<span>⏳ Generating live story with Gemini & Murf...</span>";
  if (DOM.scriptBody) {
    DOM.scriptBody.innerHTML = `<p class="placeholder-text">Generating a fresh ${langKey} story for ${currentPlace.name} on the spot...</p>`;
  }
  if (DOM.playingMeta) DOM.playingMeta.textContent = "Synthesizing tour...";

  try {
    const res = await fetch(`${API_BASE}/generate-audio-guide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        place: currentPlace.name,
        answerType: length,
        style: style,
        language: langKey,
        voiceId: voiceId,
        locale: langConfig.locale,
        withAudio: true
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Server failed to generate tour.");

    STATE.currentBundle = data;

    // 1. Render Gemini's live generated story
    if (DOM.scriptBody) {
      DOM.scriptBody.innerHTML = `<p>${data.description || "Tour generated."}</p>`;
    }
    if (DOM.playingTitle) DOM.playingTitle.textContent = `${currentPlace.name} (${style})`;
    if (DOM.playingMeta) DOM.playingMeta.textContent = `Narration ready (${langKey} • ${voiceId})`;

    // 2. Play Audio (Murf or Web Speech Fallback)
    if (data.audioBase64) {
      playMurfBase64Audio(data.audioBase64);
    } else if (data.audioError) {
      if (DOM.playingMeta) DOM.playingMeta.textContent = "Audio notice: using browser speech fallback";
      playWebSpeechSynthesis(data.description, langKey);
    }

    // 3. Render dynamically generated visit details, quiz, and questions
    if (data.visit) {
      renderVisitPlanData(data.visit);
    }
    if (data.quiz && data.quiz.length > 0) {
      renderQuizQuestions();
    }
    if (data.questions && data.questions.length > 0) {
      renderSuggestedQuestions(data.questions);
    }

    // Save to Recent
    addRecentHistory(currentPlace, data.description || "");

    // Passport Stats
    STATE.stats.listened += 1;
    STATE.stats.mins += 2;
    localStorage.setItem("audioyatra_stats", JSON.stringify(STATE.stats));
    updatePassportStats();

  } catch (err) {
    console.error("Tour generation failure:", err);
    alert(`Generation error: ${err.message}`);
    if (DOM.scriptBody) {
      DOM.scriptBody.innerHTML = `<p class="placeholder-text">Generation failed. Please try again.</p>`;
    }
  } finally {
    DOM.generateGuideBtn.disabled = false;
    DOM.generateGuideBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg> <span>Generate Audio Guide</span>`;
  }
}

function playMurfBase64Audio(base64Str) {
  stopAllAudio();
  STATE.audioMode = "murf";
  STATE.murfAudioElem.src = `data:audio/mp3;base64,${base64Str}`;
  STATE.murfAudioElem.playbackRate = parseFloat(DOM.speedSlider.value);
  STATE.murfAudioElem.play();
  STATE.isPlaying = true;
  updatePlayerControlsUI();

  STATE.murfAudioElem.ontimeupdate = () => {
    const curr = STATE.murfAudioElem.currentTime;
    const dur = STATE.murfAudioElem.duration || 1;
    DOM.audioSeekSlider.value = (curr / dur) * 100;
    DOM.currentTimeLabel.textContent = formatTime(curr);
    DOM.durationLabel.textContent = formatTime(dur);
  };

  STATE.murfAudioElem.onended = () => {
    STATE.isPlaying = false;
    updatePlayerControlsUI();
  };
}

function playWebSpeechSynthesis(text, language) {
  stopAllAudio();
  if (!('speechSynthesis' in window)) return;

  STATE.audioMode = "webspeech";
  const utterance = new SpeechSynthesisUtterance(text);
  
  const langMap = {
    "English": "en-US",
    "Hindi": "hi-IN",
    "Tamil": "ta-IN",
    "Telugu": "te-IN"
  };
  utterance.lang = langMap[language] || "en-US";
  utterance.rate = parseFloat(DOM.speedSlider.value);

  utterance.onend = () => {
    STATE.isPlaying = false;
    updatePlayerControlsUI();
  };

  STATE.speechSynthUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  STATE.isPlaying = true;
  updatePlayerControlsUI();
  DOM.playingMeta.textContent = `Client Speech Synthesis (${language})`;
}

function toggleAudioPlayPause() {
  if (STATE.audioMode === "murf") {
    if (STATE.isPlaying) {
      STATE.murfAudioElem.pause();
      STATE.isPlaying = false;
    } else {
      STATE.murfAudioElem.play();
      STATE.isPlaying = true;
    }
  } else if (STATE.audioMode === "webspeech") {
    if (STATE.isPlaying) {
      window.speechSynthesis.pause();
      STATE.isPlaying = false;
    } else {
      window.speechSynthesis.resume();
      STATE.isPlaying = true;
    }
  }
  updatePlayerControlsUI();
}

function stopAllAudio() {
  if (STATE.murfAudioElem) {
    STATE.murfAudioElem.pause();
    STATE.murfAudioElem.currentTime = 0;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  STATE.isPlaying = false;
  updatePlayerControlsUI();
}

function seekAudioRelative(seconds) {
  if (STATE.audioMode === "murf") {
    STATE.murfAudioElem.currentTime = Math.max(0, STATE.murfAudioElem.currentTime + seconds);
  }
}

function updatePlayerControlsUI() {
  const playIcon = DOM.mainPlayPauseBtn.querySelector(".play-icon");
  const pauseIcon = DOM.mainPlayPauseBtn.querySelector(".pause-icon");

  if (STATE.isPlaying) {
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");
    DOM.audioSoundBars.classList.add("playing");
  } else {
    playIcon.classList.remove("hidden");
    pauseIcon.classList.add("hidden");
    DOM.audioSoundBars.classList.remove("playing");
  }
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/* ==========================================================================
   ASK THE GUIDE CHAT
   ========================================================================== */

async function sendChatMessage() {
  const q = DOM.chatInputText.value.trim();
  if (!q) return;

  const placeName = STATE.selectedPlace ? STATE.selectedPlace.name : "Landmark";
  DOM.chatInputText.value = "";

  // Append user message
  const userMsgDiv = document.createElement("div");
  userMsgDiv.className = "msg user-msg";
  userMsgDiv.innerHTML = `<p>${q}</p>`;
  DOM.chatMessagesArea.appendChild(userMsgDiv);
  DOM.chatMessagesArea.scrollTop = DOM.chatMessagesArea.scrollHeight;

  // Append thinking bubble
  const guideMsgDiv = document.createElement("div");
  guideMsgDiv.className = "msg guide-msg";
  guideMsgDiv.innerHTML = `<p>Thinking...</p>`;
  DOM.chatMessagesArea.appendChild(guideMsgDiv);
  DOM.chatMessagesArea.scrollTop = DOM.chatMessagesArea.scrollHeight;

  try {
    const res = await fetch(`${API_BASE}/ask-guide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place: placeName,
        question: q,
        language: DOM.guideLang.value,
        history: STATE.chatHistory,
        withAudio: true
      })
    });

    const data = await res.json();
    const answer = data.answer || "I could not retrieve an answer at this moment.";
    guideMsgDiv.innerHTML = `<p>${answer}</p>`;
    DOM.chatMessagesArea.scrollTop = DOM.chatMessagesArea.scrollHeight;

    STATE.chatHistory.push({ q: q, a: answer });

    if (data.audioBase64) {
      playMurfBase64Audio(data.audioBase64);
    } else {
      playWebSpeechSynthesis(answer, DOM.guideLang.value);
    }
  } catch (err) {
    guideMsgDiv.innerHTML = `<p>Apologies, I ran into a connection issue.</p>`;
  }
}

/* ==========================================================================
   PLAN YOUR VISIT TAB DATA
   ========================================================================== */

function renderVisitPlanData(visit) {
  if (!visit) return;
  DOM.visitBestTime.textContent = visit.bestTime || "Year round";
  DOM.visitDuration.textContent = visit.duration || "2 - 3 Hours";
  DOM.visitFee.textContent = visit.entryFee || "Standard entry";
  DOM.visitHours.textContent = visit.openHours || "6:00 AM - 6:00 PM";
  DOM.visitDress.textContent = visit.dressCode || "Respectful attire";
  DOM.visitRules.textContent = visit.rules || "Standard tourist safety rules apply";

  DOM.visitTipsList.innerHTML = (visit.tips || []).map(t => `<div class="tip-item">💡 ${t}</div>`).join("");
  DOM.visitGemsList.innerHTML = (visit.hiddenGems || []).map(g => `<div class="gem-item">💎 ${g}</div>`).join("");
  DOM.visitFoodList.innerHTML = (visit.food || []).map(f => `<div class="food-item">🍛 ${f}</div>`).join("");

  if (visit.mythVsFact) {
    DOM.mythText.textContent = visit.mythVsFact.myth;
    DOM.factText.textContent = visit.mythVsFact.fact;
  }

  // Render Nearby
  if (visit.nearby) {
    DOM.nearbyGrid.innerHTML = visit.nearby.map(nb => `
      <div class="nearby-spot-card">
        <strong>${nb.name}</strong>
        <small>📍 ${nb.dist}</small>
        <p>${nb.desc}</p>
      </div>
    `).join("");
  }
}

function renderSuggestedQuestions(questions) {
  if (!DOM.presetQuestionsBar || !questions || questions.length === 0) return;
  DOM.presetQuestionsBar.innerHTML = questions.map(q => `
    <button class="preset-q-btn" data-q="${q}">${q}</button>
  `).join("");
}

/* ==========================================================================
   QUIZ MODE CONTROLLER
   ========================================================================== */

function renderQuizQuestions() {
  if (!STATE.currentBundle || !STATE.currentBundle.quiz || STATE.currentBundle.quiz.length === 0) {
    DOM.quizContainer.innerHTML = `<p class="placeholder-text">Please generate an Audio Guide first to unlock landmark trivia questions!</p>`;
    return;
  }

  let currentScore = 0;
  const questions = STATE.currentBundle.quiz;
  DOM.quizScorePill.textContent = `Score: 0/${questions.length}`;
  DOM.quizContainer.innerHTML = "";

  questions.forEach((qObj, qIdx) => {
    const qBlock = document.createElement("div");
    qBlock.className = "quiz-q-block";
    
    let optionsHtml = (qObj.options || []).map((opt, oIdx) => `
      <button class="quiz-opt-btn" data-qindex="${qIdx}" data-oindex="${oIdx}">${opt}</button>
    `).join("");

    qBlock.innerHTML = `
      <h4 class="quiz-q-title">${qIdx + 1}. ${qObj.q}</h4>
      <div class="quiz-options">${optionsHtml}</div>
      <div class="quiz-explanation hidden" id="exp_${qIdx}">${qObj.explanation}</div>
    `;

    DOM.quizContainer.appendChild(qBlock);
  });

  DOM.quizContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".quiz-opt-btn");
    if (!btn || btn.classList.contains("answered")) return;

    const qIdx = parseInt(btn.getAttribute("data-qindex"));
    const oIdx = parseInt(btn.getAttribute("data-oindex"));
    const qObj = questions[qIdx];

    const parentOpts = btn.parentElement;
    parentOpts.querySelectorAll(".quiz-opt-btn").forEach(b => b.classList.add("answered"));

    if (oIdx === qObj.answerIndex) {
      btn.classList.add("correct");
      currentScore += 1;
    } else {
      btn.classList.add("wrong");
      const correctBtn = parentOpts.querySelector(`[data-oindex="${qObj.answerIndex}"]`);
      if (correctBtn) correctBtn.classList.add("correct");
    }

    const expDiv = document.getElementById(`exp_${qIdx}`);
    if (expDiv) expDiv.classList.remove("hidden");

    DOM.quizScorePill.textContent = `Score: ${currentScore}/${questions.length}`;

    if (currentScore === questions.length) {
      STATE.stats.quizzes += 1;
      localStorage.setItem("audioyatra_stats", JSON.stringify(STATE.stats));
    }
  });
}

/* ==========================================================================
   TRIP PLANNER CONTROLLER
   ========================================================================== */

function populateTripPlaceSelector() {
  if (!DOM.tripPlaceSelector) return;
  DOM.tripPlaceSelector.innerHTML = "";

  STATE.places.forEach(p => {
    const label = document.createElement("label");
    label.className = "trip-place-checkbox";
    label.innerHTML = `
      <input type="checkbox" value="${p.id}">
      <span>${p.emoji} ${p.name} (${p.city})</span>
    `;
    DOM.tripPlaceSelector.appendChild(label);
  });
}

async function buildTripItineraryHandler() {
  const checkboxes = DOM.tripPlaceSelector.querySelectorAll("input[type='checkbox']:checked");
  const selectedIds = Array.from(checkboxes).map(c => c.value);

  if (selectedIds.length === 0) {
    alert("Please select at least 2 places to generate an itinerary.");
    return;
  }

  const days = parseInt(DOM.tripDaysInput.value) || 2;
  const pace = DOM.tripPaceSelect.value;

  DOM.buildTripBtn.disabled = true;
  DOM.buildTripBtn.textContent = "Calculating Optimal Route...";

  try {
    const res = await fetch(`${API_BASE}/plan-trip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placeIds: selectedIds,
        days: days,
        pace: pace
      })
    });

    const data = await res.json();
    DOM.buildTripBtn.disabled = false;
    DOM.buildTripBtn.textContent = "🚀 Generate Smart Itinerary";

    if (data.error) {
      alert("Error: " + data.error);
      return;
    }

    DOM.tripDistanceBadge.textContent = `${data.totalDistanceKm} km total`;
    DOM.itineraryOutput.innerHTML = "";

    (data.itinerary || []).forEach((dayStops, dIdx) => {
      const dayBlock = document.createElement("div");
      dayBlock.className = "itinerary-day-block";
      
      let stopsHtml = dayStops.map((stop, sIdx) => `
        <div class="itinerary-stop">
          <div class="stop-num">${sIdx + 1}</div>
          <div>
            <strong>${stop.emoji} ${stop.name}</strong>
            <small style="display:block; color:var(--text-muted);">${stop.city}, ${stop.country}</small>
          </div>
        </div>
      `).join("");

      dayBlock.innerHTML = `
        <h4>Day ${dIdx + 1} (${dayStops.length} Places)</h4>
        <div>${stopsHtml || '<p class="placeholder-text">Rest / Free Exploration</p>'}</div>
      `;
      DOM.itineraryOutput.appendChild(dayBlock);
    });

  } catch (e) {
    DOM.buildTripBtn.disabled = false;
    DOM.buildTripBtn.textContent = "🚀 Generate Smart Itinerary";
    console.error(e);
  }
}

/* ==========================================================================
   FAVORITES & RECENT HISTORY
   ========================================================================== */

function togglePlaceFavorite(placeId) {
  const idx = STATE.favorites.indexOf(placeId);
  if (idx >= 0) {
    STATE.favorites.splice(idx, 1);
  } else {
    STATE.favorites.push(placeId);
  }
  localStorage.setItem("audioyatra_favs", JSON.stringify(STATE.favorites));
  updateFavoritesCount();
  renderFeaturedCarousel();
  renderExploreGrid();
  renderFavoritesGrid();
  updateFavButtonUI();
}

function toggleCurrentPlaceFavorite() {
  if (STATE.selectedPlace) {
    togglePlaceFavorite(STATE.selectedPlace.id);
  }
}

function updateFavButtonUI() {
  if (!STATE.selectedPlace) return;
  const isFav = STATE.favorites.includes(STATE.selectedPlace.id);
  if (isFav) {
    DOM.favToggleBtn.classList.add("active");
    DOM.favBtnText.textContent = "Favorited";
  } else {
    DOM.favToggleBtn.classList.remove("active");
    DOM.favBtnText.textContent = "Add to Favorites";
  }
}

function updateFavoritesCount() {
  if (DOM.favBadgeCount) {
    DOM.favBadgeCount.textContent = STATE.favorites.length;
  }
}

function renderFavoritesGrid() {
  if (!DOM.favoritesGrid) return;
  DOM.favoritesGrid.innerHTML = "";

  const favPlaces = STATE.places.filter(p => STATE.favorites.includes(p.id));

  if (favPlaces.length === 0) {
    DOM.favoritesGrid.innerHTML = `<p class="placeholder-text" style="grid-column:1/-1; text-align:center;">No favorite places saved yet. Click the heart icon on any landmark to save it here!</p>`;
    return;
  }

  favPlaces.forEach(p => {
    const card = createPlaceCardElement(p);
    DOM.favoritesGrid.appendChild(card);
  });
}

function addRecentHistory(place, scriptText) {
  const item = {
    id: place.id,
    name: place.name,
    city: place.city,
    emoji: place.emoji,
    snippet: scriptText.substring(0, 120) + "...",
    timestamp: new Date().toLocaleDateString()
  };

  STATE.recent = STATE.recent.filter(r => r.id !== place.id);
  STATE.recent.unshift(item);
  if (STATE.recent.length > 10) STATE.recent.pop();
  localStorage.setItem("audioyatra_recent", JSON.stringify(STATE.recent));
}

function renderRecentList() {
  if (!DOM.recentList) return;
  DOM.recentList.innerHTML = "";

  if (STATE.recent.length === 0) {
    DOM.recentList.innerHTML = `<p class="placeholder-text">No recently listened audio guides yet.</p>`;
    return;
  }

  STATE.recent.forEach(r => {
    const item = document.createElement("div");
    item.className = "tip-item";
    item.style.cursor = "pointer";
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:0.2rem;">
        <strong>${r.emoji} ${r.name} (${r.city})</strong>
        <small style="color:var(--text-muted);">${r.timestamp}</small>
      </div>
      <p style="font-size:0.8rem; color:var(--text-sub);">${r.snippet}</p>
    `;
    item.onclick = () => {
      const p = STATE.places.find(pl => pl.id === r.id);
      if (p) openPlaceDashboard(p);
    };
    DOM.recentList.appendChild(item);
  });
}

/* ==========================================================================
   TOP SEARCH AUTOCOMPLETE
   ========================================================================== */

function handleTopSearchInput(e) {
  const val = e.target.value.trim().toLowerCase();
  if (!val) {
    DOM.searchSuggestionsList.classList.remove("active");
    return;
  }

  const matches = STATE.places.filter(p => 
    p.name.toLowerCase().includes(val) || 
    p.city.toLowerCase().includes(val) || 
    p.country.toLowerCase().includes(val)
  ).slice(0, 6);

  if (matches.length === 0) {
    DOM.searchSuggestionsList.classList.remove("active");
    return;
  }

  DOM.searchSuggestionsList.innerHTML = matches.map(p => `
    <div class="sug-item" data-id="${p.id}">
      <span class="emoji">${p.emoji}</span>
      <div>
        <strong>${p.name}</strong>
        <small>${p.city}, ${p.country}</small>
      </div>
    </div>
  `).join("");

  DOM.searchSuggestionsList.classList.add("active");

  DOM.searchSuggestionsList.querySelectorAll(".sug-item").forEach(item => {
    item.addEventListener("click", () => {
      const pid = item.getAttribute("data-id");
      const p = STATE.places.find(x => x.id === pid);
      if (p) {
        DOM.topSearchInput.value = "";
        DOM.searchSuggestionsList.classList.remove("active");
        openPlaceDashboard(p);
      }
    });
  });
}

/* ==========================================================================
   PASSPORT & USER STATS
   ========================================================================== */

function updatePassportStats() {
  if (DOM.statPlacesCount) DOM.statPlacesCount.textContent = STATE.stats.listened;
  if (DOM.statMinsCount) DOM.statMinsCount.textContent = STATE.stats.mins;
  if (DOM.statQuizzesCount) DOM.statQuizzesCount.textContent = STATE.stats.quizzes;
  if (DOM.statFavsCount) DOM.statFavsCount.textContent = STATE.favorites.length;

  if (DOM.passportStampsGrid) {
    DOM.passportStampsGrid.innerHTML = "";
    const listenedIds = STATE.recent.map(r => r.id);

    if (listenedIds.length === 0) {
      DOM.passportStampsGrid.innerHTML = `<p class="placeholder-text" style="grid-column:1/-1;">Listen to audio guides to earn passport stamps!</p>`;
      return;
    }

    listenedIds.forEach(id => {
      const p = STATE.places.find(x => x.id === id);
      if (p) {
        const stamp = document.createElement("div");
        stamp.className = "stamp-badge";
        stamp.innerHTML = `<span>${p.emoji}</span><small>${p.name}</small>`;
        DOM.passportStampsGrid.appendChild(stamp);
      }
    });
  }
}
