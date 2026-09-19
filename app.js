(function () {
    "use strict";

    const APP_NAME = "القرآن الكريم والرقية الشرعية";
    const STORAGE_KEYS = {
        bookmarks: "quran_app_bookmarks",
        theme: "quran_app_theme",
        lastView: "quran_app_last_view"
    };

    const state = {
        quran: [],
        ruqyah: [],
        bookmarks: [],
        favoriteImages: [],
        lastRead: null,
        currentSurah: null,
        currentRuqyahItem: null,
        searchQuery: "",
        view: "quran", // 'quran', 'surah', 'ruqyah', 'ruqyahReading', 'bookmarks', 'search'
        theme: "light",
        loading: false
    };

    let mainArea, searchInput, searchBtn, navBtns, themeToggleBtn, aboutBtn, aboutOverlay, closeAboutBtn, toast, brandHomeBtn, currentYearEl;

    function initElements() {
        mainArea = document.getElementById("mainArea");
        searchInput = document.getElementById("searchInput");
        searchBtn = document.getElementById("searchBtn");
        navBtns = document.querySelectorAll("[data-view]");
        themeToggleBtn = document.getElementById("themeToggle");
        aboutBtn = document.getElementById("aboutBtn");
        aboutOverlay = document.getElementById("aboutOverlay");
        closeAboutBtn = document.getElementById("aboutClose");
        toast = document.getElementById("toast");
        brandHomeBtn = document.getElementById("brandHome");
        currentYearEl = document.getElementById("currentYear");
    }

    function navigate(view, params = {}) {
        state.view = view;
        saveLastView();

        if (params.surahNum !== undefined) state.currentSurah = params.surahNum;
        if (params.ruqyahItem !== undefined) state.currentRuqyahItem = params.ruqyahItem;

        updateNavUI();
        render();
        scrollTop();
    }

    function updateNavUI() {
        if (!navBtns) return;
        navBtns.forEach(btn => {
            const viewTarget = btn.getAttribute("data-view");
            if (viewTarget === state.view) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }

    function render() {
        if (!mainArea) return;

        if (state.loading) {
            mainArea.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>جاري تحميل البيانات...</p></div>`;
            return;
        }

        switch (state.view) {
            case "home":
                renderQuran();
                break;
            case "quran":
                renderQuran();
                break;
            case "surah":
                renderSurah();
                break;
            case "ruqyah":
                renderRuqyah();
                break;
            case "ruqyahReading":
                renderRuqyahReading();
                break;
            case "bookmarks":
                renderBookmarks();
                break;
            case "search":
                renderSearch();
                break;
            default:
                renderQuran();
        }
    }

    function renderQuran() {
        if (!state.quran.length) {
            mainArea.innerHTML = `<div class="empty-state"><p>لم يتم العثور على سور القرآن الكريم.</p></div>`;
            return;
        }

        mainArea.innerHTML = `
            <section class="quran-page">
                <div class="section-title">فهرس السور</div>
                <div class="surah-grid">
                    ${renderSurahCards(state.quran)}
                </div>
            </section>
        `;

        attachSurahEvents();
    }

    function renderSurahCards(surahs) {
        return surahs.map(surah => {
            const num = getSurahNumber(surah);
            const name = surah.name || surah.arabicName || "";
            const englishName = surah.englishName || "";
            const ayahsCount = (surah.ayahs || surah.verses || []).length || surah.numberOfAyahs || 0;
            const revelationType = surah.revelationType === "Meccan" ? "مكية" : "مدنية";

            return `
                <div class="surah-card" data-surah-number="${num}">
                    <div class="surah-number">${toArabicNumber(num)}</div>
                    <div class="surah-info">
                        <h3>سورة ${escapeHTML(name)}</h3>
                        <span class="surah-meta">${revelationType} - ${toArabicNumber(ayahsCount)} آية</span>
                    </div>
                    <div class="surah-english">${escapeHTML(englishName)}</div>
                </div>
            `;
        }).join("");
    }

    function renderSurah() {
        const surah = findSurah(state.currentSurah);
        if (!surah) {
            navigate("quran");
            return;
        }

        const ayahs = getAyahs(surah);
        const name = surah.name || surah.arabicName || "";
        const num = getSurahNumber(surah);

        mainArea.innerHTML = `
            <section class="surah-reading">
                <div class="surah-header">
                    <h2>سورة ${escapeHTML(name)}</h2>
                    <button class="btn btn-light" id="backToQuran">← الفهرس</button>
                </div>
                ${num !== 1 && num !== 9 ? `<div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>` : ""}
                <div class="ayahs-container">
                    ${ayahs.map(ayah => renderAyah(ayah, surah)).join("")}
                </div>
            </section>
        `;

        const backBtn = document.getElementById("backToQuran");
        if (backBtn) backBtn.addEventListener("click", () => navigate("quran"));
    }

    function renderAyah(ayah, surah) {
        const ayahNum = ayah.numberInSurah ?? ayah.number ?? ayah.id;
        const surahNum = getSurahNumber(surah);
        const bookmarkId = makeBookmarkId(surahNum, ayahNum);
        const isBookmarked = state.bookmarks.includes(bookmarkId);
        const isLastRead = state.lastRead && state.lastRead.surahNum === surahNum && state.lastRead.ayahNum === Number(ayahNum);

        return `
            <div class="ayah-block" data-ayah-id="${bookmarkId}">
                <span class="ayah-text">${escapeHTML(ayah.text)}</span>
                <span class="ayah-number-symbol">﴿${toArabicNumber(ayahNum)}﴾</span>
                <div class="ayah-actions">
                    <button class="btn-action ${isBookmarked ? "active" : ""}" data-action="bookmark" data-id="${bookmarkId}" title="المفضلة">
                        ${isBookmarked ? "⭐" : "☆"}
                    </button>
                    <button class="btn-action ${isLastRead ? "active" : ""}" data-action="lastread" data-surah="${surahNum}" data-ayah="${ayahNum}" title="تحديد آخر آية">
                        ${isLastRead ? "📍" : "⚑"}
                    </button>
                    <button class="btn-action" data-action="copy" data-surah="${surahNum}" data-ayah="${ayahNum}" title="نسخ">📋</button>
                    <button class="btn-action" data-action="share" data-surah="${surahNum}" data-ayah="${ayahNum}" title="مشاركة">🔗</button>
                </div>
            </div>
        `;
    }

    function renderRuqyah() {
        if (!state.ruqyah.length) {
            mainArea.innerHTML = `<div class="empty-state"><p>لا توجد بيانات للرقية الشرعية حالياً.</p></div>`;
            return;
        }

        mainArea.innerHTML = `
            <section class="ruqyah-page">
                <div class="section-title">الرقية الشرعية</div>
                <div class="ruqyah-grid">
                    ${state.ruqyah.map((item, idx) => `
                        <div class="ruqyah-card" data-ruqyah-idx="${idx}">
                            <h3>${escapeHTML(item.title || `قسم ${idx + 1}`)}</h3>
                            <p>${escapeHTML(item.description || item.shortText || "اضغط للقراءة والاطلاع")}</p>
                        </div>
                    `).join("")}
                </div>
            </section>
        `;

        const cards = mainArea.querySelectorAll(".ruqyah-card");
        cards.forEach(card => {
            card.addEventListener("click", () => {
                const idx = card.getAttribute("data-ruqyah-idx");
                navigate("ruqyahReading", { ruqyahItem: state.ruqyah[idx] });
            });
        });
    }
    function attachSurahEvents() {
        const cards = mainArea.querySelectorAll(".surah-card");
        cards.forEach(card => {
            card.addEventListener("click", () => {
                const num = card.getAttribute("data-surah-number");
                navigate("surah", { surahNum: Number(num) });
            });
        });
    }

    
    function attachMainAreaEvents() {
        if (!mainArea) return;
        mainArea.addEventListener("click", (e) => {
            const actionBtn = e.target.closest("[data-action]");
            if (actionBtn) {
                const action = actionBtn.getAttribute("data-action");
                const surahNum = Number(actionBtn.getAttribute("data-surah") || state.currentSurah);
                const aNum = Number(actionBtn.getAttribute("data-ayah"));

                if (action === "bookmark") {
                    const bmId = actionBtn.getAttribute("data-id");
                    toggleBookmark(bmId);
                    render();
                } else if (action === "lastread") {
                    state.lastRead = { surahNum, ayahNum: aNum };
                    localStorage.setItem("quran_app_last_read", JSON.stringify(state.lastRead));
                    showToast("تم تحديد هذه الآية كآخر موضع قراءة");
                    render();
                } else if (action === "copy") {
                    copyAyah(surahNum, aNum);
                } else if (action === "share") {
                    shareAyah(surahNum, aNum);
                }
                return;
            }

            const gotoCard = e.target.closest("[data-goto-surah]");
            if (gotoCard) {
                const sNum = gotoCard.getAttribute("data-goto-surah");
                navigate("surah", { surahNum: Number(sNum) });
            }
        });
    }

    function renderRuqyahReading() {
        const item = state.currentRuqyahItem || {};
        const title = item.title || "الرقية الشرعية";
        const text = item.text || item.content || "";

        mainArea.innerHTML = `
            <section class="ruqyah-reading">
                <div class="reading-header">
                    <h2>${escapeHTML(title)}</h2>
                    <div class="reading-controls">
                        <button class="btn btn-light" id="backToRuqyah">
                            ← قائمة الرقية
                        </button>
                    </div>
                </div>

                <div class="ruqyah-content-box">
                    ${
                        text
                            ? `<div class="ruqyah-text-body">${escapeHTML(text).replace(/\n/g, '<br>')}</div>`
                            : `<div class="empty-state"><p>لا يوجد نص متاح حالياً لهذا القسم.</p></div>`
                    }
                </div>
            </section>
        `;

        const backBtn = document.getElementById("backToRuqyah");
        if (backBtn) {
            backBtn.addEventListener("click", () => navigate("ruqyah"));
        }
    }

    function renderBookmarks() {
        const bookmarkedAyahs = [];
        state.bookmarks.forEach(bmId => {
            const [surahNum, ayahNum] = bmId.split(":").map(Number);
            const surah = findSurah(surahNum);
            if (surah) {
                const ayah = getAyahs(surah).find(a => Number(a.numberInSurah ?? a.number ?? a.id) === ayahNum);
                if (ayah) bookmarkedAyahs.push({ surah, ayah, ayahNum });
            }
        });

        mainArea.innerHTML = `
            <section class="bookmarks-page">
                <div class="section-title">المفضلة</div>
                <div class="favorite-tools">
                    <label class="upload-image-btn" for="favoriteImageInput">🖼️ إضافة صورة للمفضلة</label>
                    <input id="favoriteImageInput" type="file" accept="image/*" hidden>
                </div>
                <div id="favoriteImagesList" class="favorite-images-list">
                    ${state.favoriteImages.map((src, i) => `
                        <div class="favorite-image-card">
                            <img src="${src}" alt="صورة محفوظة في المفضلة">
                            <button class="btn btn-danger remove-image-btn" data-image-index="${i}">حذف الصورة</button>
                        </div>
                    `).join("")}
                </div>
                ${bookmarkedAyahs.length ? `
                  <h3 class="favorites-subtitle">الآيات المحفوظة</h3>
                  <div id="bookmarkList">
                    ${bookmarkedAyahs.map(item => `
                      <div class="bookmark-item-card" data-goto-surah="${getSurahNumber(item.surah)}">
                        <div class="surah-badge">سورة ${escapeHTML(item.surah.name || item.surah.arabicName || "")}</div>
                        ${renderAyah(item.ayah, item.surah)}
                      </div>
                    `).join("")}
                  </div>` : `
                  <div class="empty-state">
                    <div class="empty-state-icon">⭐</div>
                    <h3>لا توجد آيات محفوظة</h3>
                    <p>اضغط على ⭐ بجانب أي آية لإضافتها إلى المفضلة.</p>
                  </div>`}
            </section>
        `;

        const input = document.getElementById("favoriteImageInput");
        if (input) input.addEventListener("change", e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                state.favoriteImages.push(ev.target.result);
                localStorage.setItem("quran_app_favorite_images", JSON.stringify(state.favoriteImages));
                showToast("تم حفظ الصورة في المفضلة");
                render();
            };
            reader.readAsDataURL(file);
        });
        mainArea.querySelectorAll("[data-image-index]").forEach(btn => btn.addEventListener("click", e => {
            state.favoriteImages.splice(Number(e.currentTarget.dataset.imageIndex), 1);
            localStorage.setItem("quran_app_favorite_images", JSON.stringify(state.favoriteImages));
            render();
        }));
    }

    function normalizeText(text) {
        if (!text) return "";
        return text
            .toLowerCase()
            .replace(/[\u064B-\u0652]/g, "") 
            .replace(/[أإآ]/g, "ا")
            .replace(/ة/g, "ه")
            .replace(/ى/g, "ي");
    }

    function renderSearch() {
        const query = normalizeText(state.searchQuery.trim());

        if (!query) {
            mainArea.innerHTML = `
                <section class="search-page">
                    <div class="section-title">النتائج</div>
                    <div class="empty-state">
                        <p>يرجى إدخال كلمة للبحث عنها.</p>
                    </div>
                </section>
            `;
            return;
        }

        const matchedSurahs = state.quran.filter(s => {
            const name = normalizeText(s.name || s.arabicName || "");
            const english = (s.englishName || "").toLowerCase();
            return name.includes(query) || english.includes(query);
        });

        mainArea.innerHTML = `
            <section class="search-page">
                <div class="section-title">نتائج البحث عن: "${escapeHTML(state.searchQuery)}"</div>
                ${
                    matchedSurahs.length
                    ? `<div class="surah-grid">${renderSurahCards(matchedSurahs)}</div>`
                    : `<div class="empty-state"><p>لم يتم العثور على نتائج تطابق بحثك.</p></div>`
                }
            </section>
        `;

        attachSurahEvents();
    }

    function performSearch() {
        if (!searchInput) return;
        const val = searchInput.value;
        if (val.trim()) {
            state.searchQuery = val;
            navigate("search");
        }
    }

    async function loadLocalData() {
        state.loading = true;
        try {
            const quranRes = await fetch("data/quran.json").catch(() => null);
            if (quranRes && quranRes.ok) {
                const data = await quranRes.json();
                state.quran = Array.isArray(data) ? data : (data.surahs || []);
            }

            const ruqyahRes = await fetch("data/ruqyah.json").catch(() => null);
            if (ruqyahRes && ruqyahRes.ok) {
                const rData = await ruqyahRes.json();
                state.ruqyah = Array.isArray(rData) ? rData : (rData.items || []);
            }
        } catch (err) {
            console.error("Data load error:", err);
        } finally {
            state.loading = false;
        }
    }

    function makeBookmarkId(surahNum, ayahNum) {
        return `${surahNum}:${ayahNum}`;
    }

    function toggleBookmark(bookmarkId) {
        const idx = state.bookmarks.indexOf(bookmarkId);
        if (idx > -1) {
            state.bookmarks.splice(idx, 1);
            showToast("تم إزالة الآية من المفضلة");
        } else {
            state.bookmarks.push(bookmarkId);
            showToast("تم حفظ الآية في المفضلة");
        }
        localStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(state.bookmarks));
    }

    function loadBookmarks() {
        const savedImages = localStorage.getItem("quran_app_favorite_images");
        const savedLastRead = localStorage.getItem("quran_app_last_read");
        if (savedImages) {
            try { state.favoriteImages = JSON.parse(savedImages); } catch (e) { state.favoriteImages = []; }
        }
        if (savedLastRead) {
            try { state.lastRead = JSON.parse(savedLastRead); } catch (e) { state.lastRead = null; }
        }
        const saved = localStorage.getItem(STORAGE_KEYS.bookmarks);
        if (saved) {
            try {
                state.bookmarks = JSON.parse(saved);
            } catch (e) {
                state.bookmarks = [];
            }
        }
    }

    function saveLastView() {
        localStorage.setItem(STORAGE_KEYS.lastView, state.view);
    }

    function loadTheme() {
        const theme = localStorage.getItem(STORAGE_KEYS.theme) || "light";
        state.theme = theme;
        document.documentElement.setAttribute("data-theme", theme);
        document.body.classList.toggle("dark", theme === "dark");
        if (themeToggleBtn) themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
    }

    function toggleTheme() {
        state.theme = state.theme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", state.theme);
        document.body.classList.toggle("dark", state.theme === "dark");
        if (themeToggleBtn) themeToggleBtn.textContent = state.theme === "dark" ? "☀️" : "🌙";
        localStorage.setItem(STORAGE_KEYS.theme, state.theme);
    }

    function findSurah(number) {
        return state.quran.find(s => getSurahNumber(s) === Number(number));
    }

    function getSurahNumber(surah) {
        return Number(surah.number ?? surah.id ?? 0);
    }

    function getAyahs(surah) {
        return surah.ayahs ?? surah.verses ?? [];
    }

    function copyAyah(surahNumber, ayahNumber) {
        const surah = findSurah(surahNumber);
        if (!surah) return;
        const ayahs = getAyahs(surah);
        const ayah = ayahs.find(a => (a.numberInSurah ?? a.number ?? a.id) === ayahNumber);
        if (ayah && ayah.text) {
            navigator.clipboard.writeText(ayah.text).then(() => {
                showToast("تم نسخ الآية بنجاح");
            });
        }
    }

    function shareAyah(surahNumber, ayahNumber) {
        const surah = findSurah(surahNumber);
        if (!surah) return;
        const ayahs = getAyahs(surah);
        const ayah = ayahs.find(a => (a.numberInSurah ?? a.number ?? a.id) === ayahNumber);
        if (ayah && navigator.share) {
            navigator.share({
                title: APP_NAME,
                text: `${ayah.text} [سورة ${surah.name || surah.arabicName}: ${ayahNumber}]`
            }).catch(() => {});
        } else {
            copyAyah(surahNumber, ayahNumber);
        }
    }

    function openAbout() {
        if (aboutOverlay) aboutOverlay.classList.add("visible");
    }

    function closeAbout() {
        if (aboutOverlay) aboutOverlay.classList.remove("visible");
    }

    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 2500);
    }

    function scrollTop() {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function toArabicNumber(num) {
        return String(num).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
    }

    function escapeHTML(str) {
        if (typeof str !== "string") return str;
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    document.addEventListener("DOMContentLoaded", async () => {
        initElements();
        loadTheme();
        loadBookmarks();
        attachMainAreaEvents();

        if (currentYearEl) currentYearEl.textContent = new Date().getFullYear();
        if (brandHomeBtn) brandHomeBtn.addEventListener("click", () => navigate("quran"));

        
        if (navBtns) {
            navBtns.forEach(btn => {
                btn.addEventListener("click", () => {
                    const view = btn.getAttribute("data-view");
                    navigate(view);
                });
            });
        }

        
        if (searchBtn) searchBtn.addEventListener("click", performSearch);
        if (searchInput) {
            searchInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") performSearch();
            });
        }

    
        if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);
        if (aboutBtn) aboutBtn.addEventListener("click", openAbout);
        if (closeAboutBtn) closeAboutBtn.addEventListener("click", closeAbout);

        await loadLocalData();

        const savedView = localStorage.getItem(STORAGE_KEYS.lastView) || "quran";
        navigate(savedView);
    });

})();