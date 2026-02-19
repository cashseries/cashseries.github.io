document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('start-overlay');
    const bgm = document.getElementById('bgm');
    const musicToggle = document.getElementById('musicToggle');
    const eq = document.getElementById('eq');
    const statusText = document.getElementById('music-status');
    const trackItems = document.querySelectorAll('.track-item');

    let isBgmPlaying = false;
    let portfolioAudio = new Audio();
    let currentTrack = null;

    overlay.addEventListener('click', () => {
        overlay.classList.add('hidden');
        bgm.volume = 0.3;
        bgm.play().catch(() => console.log("Audio blocked by browser"));
        isBgmPlaying = true;
        eq.classList.add('playing');
        statusText.innerText = "BGM: ON";
    });

    musicToggle.addEventListener('click', () => {
        if (isBgmPlaying) {
            bgm.pause();
            eq.classList.remove('playing');
            statusText.innerText = "BGM: OFF";
        } else {
            bgm.play();
            eq.classList.add('playing');
            statusText.innerText = "BGM: ON";
        }
        isBgmPlaying = !isBgmPlaying;
    });

    trackItems.forEach(item => {
        item.addEventListener('click', () => {
            const src = item.getAttribute('data-src');
            const icon = item.querySelector('i');

            if (currentTrack === item) {
                if (!portfolioAudio.paused) {
                    portfolioAudio.pause();
                    item.classList.remove('playing');
                    icon.className = "fas fa-play";
                } else {
                    portfolioAudio.play();
                    item.classList.add('playing');
                    icon.className = "fas fa-pause";
                    bgm.volume = 0.05;
                }
                return;
            }

            trackItems.forEach(i => {
                i.classList.remove('active', 'playing');
                i.querySelector('i').className = "fas fa-play";
            });

            item.classList.add('active', 'playing');
            icon.className = "fas fa-pause";
            bgm.volume = 0.05;
            portfolioAudio.src = src;
            portfolioAudio.play();
            currentTrack = item;
        });
    });

    portfolioAudio.addEventListener('ended', () => {
        if (currentTrack) {
            currentTrack.classList.remove('playing');
            currentTrack.querySelector('i').className = "fas fa-play";
        }
        bgm.volume = 0.3;
    });

    const updateTime = () => {
        const now = new Date();
        const timeString = new Intl.DateTimeFormat('en-US', {
            timeZone: 'UTC',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(now);
        document.getElementById('local-time').innerText = timeString;
    };

    setInterval(updateTime, 1000);
    updateTime();

    // Slideshow for favorite games
    const gameCards = document.querySelectorAll('.g-card');
    let currentGameIndex = 0;

    // Initialize the first game as active
    gameCards[currentGameIndex].classList.add('active');

    function showNextGame() {
        gameCards[currentGameIndex].classList.remove('active');
        currentGameIndex = (currentGameIndex + 1) % gameCards.length;
        gameCards[currentGameIndex].classList.add('active');
    }

    setInterval(showNextGame, 3000); // Change game every 3 seconds

    // Scroll progress bar
    const scrollProgress = document.getElementById('scroll-progress');

    function updateScrollProgress() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / scrollHeight) * 100;
        scrollProgress.style.transform = `scaleX(${progress / 100})`;
    }

    window.addEventListener('scroll', updateScrollProgress);
});

/* ═══════════════════════════════════════════════════════════════
   REVIEWS SYSTEM
   Fetches from /.netlify/functions/get-reviews and submits
   via AJAX to Netlify Forms → submission-created function → Supabase
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    // ── Config ──────────────────────────────────────────────────
    const GET_REVIEWS_URL = '/.netlify/functions/get-reviews';
    const POLL_INTERVAL_MS = 45000; // 45 seconds

    // Basic client-side word filter (UI-level only — server does real checking)
    const CLIENT_BAD_WORDS = ['viagra', 'casino', 'porn', 'xxx'];

    // ── DOM references ──────────────────────────────────────────
    const reviewsList = document.getElementById('reviews-list');
    const reviewForm = document.getElementById('review-form');
    const submitBtn = document.getElementById('review-submit-btn');
    const submitMsg = document.getElementById('review-submit-msg');
    const reviewText = document.getElementById('review-text');
    const charCount = document.getElementById('char-count');
    const charCounter = charCount ? charCount.closest('.char-counter') : null;

    if (!reviewsList) return; // Reviews section not present

    // ── Anti-fast-bot: enable submit only after 2.5 seconds ─────
    let formReady = false;
    setTimeout(() => { formReady = true; }, 2500);

    // ── Character counter ────────────────────────────────────────
    if (reviewText && charCount) {
        reviewText.addEventListener('input', () => {
            const len = reviewText.value.length;
            charCount.textContent = len;
            if (charCounter) {
                charCounter.classList.toggle('warn', len > 650 && len <= 750);
                charCounter.classList.toggle('danger', len > 750);
            }
            updateSubmitState();
        });
    }

    // ── Enable / disable submit based on form state ──────────────
    function updateSubmitState() {
        if (!submitBtn) return;
        const hasText = reviewText && reviewText.value.trim().length >= 5;
        const hasRating = reviewForm && !!reviewForm.querySelector('input[name="rating"]:checked');
        submitBtn.disabled = !(hasText && hasRating);
    }

    if (reviewForm) {
        reviewForm.querySelectorAll('input[name="rating"]').forEach(r =>
            r.addEventListener('change', updateSubmitState)
        );
    }

    // ── Client-side word filter ──────────────────────────────────
    function containsBadWords(text) {
        const lower = text.toLowerCase();
        return CLIENT_BAD_WORDS.some(w => lower.includes(w));
    }

    // ── AJAX form submission ─────────────────────────────────────
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!formReady) {
                showMsg('Please wait a moment before submitting.', 'error');
                return;
            }

            // Honeypot check
            const honeypot = reviewForm.querySelector('input[name="bot-field"]');
            if (honeypot && honeypot.value) return; // Silently drop if bot filled it

            const text = reviewText ? reviewText.value.trim() : '';
            if (containsBadWords(text)) {
                showMsg('Your review contains prohibited content.', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.querySelector('span').textContent = 'SUBMITTING…';

            const formData = new FormData(reviewForm);

            try {
                // Post to the root page — the most standard Netlify form target
                const postUrl = '/';

                const res = await fetch(postUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams(formData).toString(),
                });

                if (res.ok) {
                    showMsg('✓ Review submitted! It will appear shortly.', 'success');
                    reviewForm.reset();
                    charCount && (charCount.textContent = '0');
                    // Refresh reviews after a short delay to allow function to process
                    setTimeout(fetchReviews, 4000);
                } else {
                    console.error(`reviews: submit failed with status ${res.status} ${res.statusText}`);
                    showMsg(`Submission failed (${res.status}). Please try again.`, 'error');
                }
            } catch (err) {
                console.error('reviews: network error', err);
                showMsg('Network error. Check your connection.', 'error');
            }

            submitBtn.querySelector('span').textContent = 'SUBMIT REVIEW';
            updateSubmitState();
        });
    }

    // ── Show toast message ───────────────────────────────────────
    function showMsg(text, type) {
        if (!submitMsg) return;
        submitMsg.textContent = text;
        submitMsg.className = `review-submit-msg ${type}`;
        submitMsg.classList.remove('hidden');
        setTimeout(() => {
            submitMsg.style.opacity = '0';
            setTimeout(() => {
                submitMsg.className = 'review-submit-msg hidden';
                submitMsg.style.opacity = '';
            }, 400);
        }, 5000);
    }

    // ── Fetch reviews from Netlify proxy ─────────────────────────
    async function fetchReviews() {
        try {
            const res = await fetch(GET_REVIEWS_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            renderReviews(Array.isArray(data) ? data : []);
        } catch (err) {
            console.warn('reviews: fetch error', err);
            // Only show error if currently showing loader (don't overwrite existing reviews)
            if (reviewsList.querySelector('.reviews-loading')) {
                reviewsList.innerHTML = '<div class="reviews-error">⚠ Failed to load reviews.</div>';
            }
        }
    }

    // ── Render review cards ──────────────────────────────────────
    function renderReviews(reviews) {
        if (!reviews.length) {
            reviewsList.innerHTML = '<div class="reviews-empty">No reviews yet — be the first!</div>';
            return;
        }

        reviewsList.innerHTML = reviews.map(r => {
            const name = escHtml(r.name || 'Anonymous');
            const text = escHtml(r.review_text || '');
            const rating = Math.min(5, Math.max(1, parseInt(r.rating, 10) || 5));
            const stars = Array.from({ length: 5 }, (_, i) =>
                `<span class="${i < rating ? 'filled' : ''}">★</span>`
            ).join('');
            const date = r.created_at
                ? new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : '';

            return `
            <div class="review-card">
                <div class="review-card-header">
                    <span class="review-card-name">${name}</span>
                    <span class="review-card-date">${date}</span>
                </div>
                <div class="stars-display">${stars}</div>
                <p class="review-card-text">${text}</p>
            </div>`;
        }).join('');
    }

    // ── HTML escape helper ───────────────────────────────────────
    function escHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ── Init: load reviews + start polling ───────────────────────
    fetchReviews();
    setInterval(fetchReviews, POLL_INTERVAL_MS);

})();
