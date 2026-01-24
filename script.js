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
