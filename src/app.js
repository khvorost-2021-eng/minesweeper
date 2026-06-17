const canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
const newGameBtn = document.getElementById('newGameBtn');
const rulesBtn = document.getElementById('rulesBtn');
const rulesContainer = document.getElementById('rulesContainer');
const backToGameBtn = document.getElementById('backToGameBtn');
const difficultySelect = document.getElementById('difficultySelect');
let paragraph = document.getElementById('message');
let timerSpan = document.getElementById('timer');
let minesCounter = document.getElementById('minesCounter');

const mobileFlagBtn = document.getElementById('mobileFlagBtn');
const mobileOpenBtn = document.getElementById('mobileOpenBtn');

const revealSound = document.getElementById('revealSound');
const loseSound = document.getElementById('loseSound');
const winSound = document.getElementById('winSound');

let audioCtx = null;

function initAudioContext() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API не поддерживается');
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

document.addEventListener('click', initAudioContext, { once: true });
document.addEventListener('touchstart', initAudioContext, { once: true });

let scale = 16;
let ro = 16;
let CELL_SIZE;
let winAnimationStarted = false;
let mines;
let board = [];
let firstClick = true;
let revealed = [];
let gameOver = false;
let flagged = [];
let win = false;
let winGlow = 0;
let timerInterval = null;
let timerTime;
let elapsedBeforePause = 0;
let isPaused = false;
let particles = [];
let counter;
let selectedCell = null;
let currentLeaderboardName = 'sapermedium';
let soundEnabled = localStorage.getItem('saper_sound') !== 'false';
let masterVolume = parseFloat(localStorage.getItem('saper_volume')) || 0.8;

document.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => {
    const scrollableTargets = ['.leaderboard-list', '.rules-content', '.settings-modal-content'];
    const isScrollable = scrollableTargets.some(sel => e.target.closest(sel));
    if (!isScrollable) e.preventDefault();
}, { passive: false });

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (timerInterval !== null && !gameOver && !win && !firstClick) {
            elapsedBeforePause += (Date.now() - timerTime) / 1000;
            clearInterval(timerInterval);
            timerInterval = null;
            isPaused = true;
        }
    } else {
        if (isPaused && !gameOver && !win && !firstClick) {
            timerTime = Date.now();
            timerInterval = setInterval(timerTick, 10);
            isPaused = false;
        }
    }
});

function playSound(sound, volumeMultiplier = 1.0) {
    if (!soundEnabled || !sound) return;
    try {
        sound.volume = Math.min(1, masterVolume * volumeMultiplier);
        sound.currentTime = 0;
        sound.play().catch(() => {});
    } catch (e) {}
}

function playFlagSound(isPlacing = true) {
    if (!soundEnabled || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        
        const osc1 = audioCtx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(isPlacing ? 220 : 160, now);
        osc1.frequency.exponentialRampToValueAtTime(isPlacing ? 80 : 60, now + 0.12);
        
        const osc2 = audioCtx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(isPlacing ? 440 : 320, now);
        osc2.frequency.exponentialRampToValueAtTime(isPlacing ? 160 : 120, now + 0.08);
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.Q.setValueAtTime(0.7, now);
        
        const gain1 = audioCtx.createGain();
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.6 * masterVolume, now + 0.008);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        const gain2 = audioCtx.createGain();
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.25 * masterVolume, now + 0.005);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc1.connect(filter); filter.connect(gain1); gain1.connect(audioCtx.destination);
        osc2.connect(gain2); gain2.connect(audioCtx.destination);
        
        osc1.start(now); osc1.stop(now + 0.18);
        osc2.start(now); osc2.stop(now + 0.15);
        
        osc1.onended = () => { osc1.disconnect(); filter.disconnect(); gain1.disconnect(); };
        osc2.onended = () => { osc2.disconnect(); gain2.disconnect(); };
    } catch (e) {
        console.log('Ошибка звука флажка:', e);
    }
}

function changeDifficulty() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    const difficulty = difficultySelect.value;
    canvas.classList.remove('square', 'rectangle');

    if (difficulty === '1') {
        scale = 9; ro = 9; mines = 10;
        canvas.width = 300; canvas.height = 300;
        canvas.classList.add('square');
        currentLeaderboardName = 'sapereasy';
    } else if (difficulty === '2') {
        scale = 16; ro = 16; mines = 40;
        canvas.width = 480; canvas.height = 480;
        canvas.classList.add('square');
        currentLeaderboardName = 'sapermedium';
    } else if (difficulty === '3') {
        scale = 16; ro = 30; mines = 99;
        canvas.width = 480; canvas.height = 900;
        canvas.classList.add('rectangle');
        currentLeaderboardName = 'saperhard';
    }

    CELL_SIZE = canvas.width / scale;
    board = []; revealed = []; flagged = [];
    firstClick = true; gameOver = false; win = false;
    winGlow = 0; winAnimationStarted = false;
    elapsedBeforePause = 0; isPaused = false;
    particles = []; counter = mines;
    selectedCell = null;

    const sec = window.getTranslation ? window.getTranslation('sec') : 'с';
    minesCounter.textContent = mines;
    timerSpan.textContent = '0.00' + sec;
    paragraph.textContent = '';
    paragraph.classList.remove('lastEffect', 'winEffect');

    ctx = canvas.getContext('2d');
    initBoard(); initRevealed(); initflagged();
    draw();
    updateMobileButtons();
    getRecord();
}

difficultySelect.value = '2';
changeDifficulty();
difficultySelect.addEventListener('change', changeDifficulty);

function initRevealed() {
    for (let r = 0; r < ro; r++) {
        revealed[r] = [];
        for (let c = 0; c < scale; c++) revealed[r][c] = false;
    }
}

function initBoard() {
    for (let r = 0; r < ro; r++) {
        board[r] = [];
        for (let c = 0; c < scale; c++) board[r][c] = 0;
    }
}

function initflagged() {
    for (let r = 0; r < ro; r++) {
        flagged[r] = [];
        for (let c = 0; c < scale; c++) flagged[r][c] = false;
    }
}

function placeMines(safeRow, safeCol) {
    let minesPlaced = 0;
    while (minesPlaced < mines) {
        const r = Math.floor(Math.random() * ro);
        const c = Math.floor(Math.random() * scale);
        if ([safeRow - 1, safeRow, safeRow + 1].includes(r) && 
            [safeCol - 1, safeCol, safeCol + 1].includes(c)) continue;
        if (board[r][c] !== -1) {
            board[r][c] = -1;
            minesPlaced++;
        }
    }
}

function draw() {
    updateParticles();
    ctx.fillStyle = '#3a4a5a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 1; i < scale; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.strokeStyle = '#1a2530'; ctx.lineWidth = 2;
        ctx.stroke();
    }
    for (let i = 1; i < ro; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.strokeStyle = '#1a2530'; ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const colors = { 1:'#0000ff', 2:'#008000', 3:'#ff0000', 4:'#000080', 
                     5:'#800000', 6:'#008080', 7:'#000000', 8:'#808080' };

    for (let r = 0; r < ro; r++) {
        for (let c = 0; c < scale; c++) {
            if (revealed[r][c]) {
                ctx.fillStyle = '#8aaac0';
                ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                const x = c * CELL_SIZE + CELL_SIZE / 2;
                const y = r * CELL_SIZE + CELL_SIZE / 2;
                const value = board[r][c];
                if (value === -1) {
                    ctx.fillStyle = '#000000';
                    ctx.fillText('💣', x, y);
                } else if (value >= 1 && value <= 8) {
                    ctx.fillStyle = colors[value];
                    ctx.fillText(value.toString(), x, y);
                }
            }
            if (flagged[r][c]) {
                ctx.fillStyle = '#3a4a5a';
                ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                ctx.fillText('🚩', c * CELL_SIZE + CELL_SIZE / 2, r * CELL_SIZE + CELL_SIZE / 2);
            }
        }
    }

    drawSelection();

    if (winGlow > 0) {
        const pulse = Math.sin(Date.now() * 0.02) * 0.25 + 0.65;
        for (let r = 0; r < ro; r++) {
            for (let c = 0; c < scale; c++) {
                if (revealed[r][c] && board[r][c] !== -1) {
                    ctx.fillStyle = `rgba(255, 215, 0, ${pulse * winGlow})`;
                    ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }
    }

    checkWin();
    if (win) {
        paragraph.textContent = (window.getTranslation ? window.getTranslation('winMsg') : '🏆 Победа за') + ' 🥇';
        return;
    }

    for (let p of particles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;
}

function drawSelection() {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    if (revealed[row][col]) { selectedCell = null; return; }
    
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 0.85;
    
    ctx.fillStyle = `rgba(255, 215, 0, ${0.25 * pulse})`;
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    
    if (!win && !gameOver) {
        requestAnimationFrame(() => draw());
    }
}

function countMinesAround(r, c) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < ro && nc >= 0 && nc < scale && board[nr][nc] === -1) count++;
        }
    }
    return count;
}

function calculateAllNumbers() {
    for (let r = 0; r < ro; r++) {
        for (let c = 0; c < scale; c++) {
            if (board[r][c] !== -1) board[r][c] = countMinesAround(r, c);
        }
    }
}

function floodFill(r, c, playClick = false) {
    if (r < 0 || r >= ro || c < 0 || c >= scale) return;
    if (revealed[r][c]) return;
    revealed[r][c] = true;
    if (playClick) playSound(revealSound, 0.5);
    if (board[r][c] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                floodFill(r + dr, c + dc, false);
            }
        }
    }
}

function revealCell(r, c) {
    if (r < 0 || r >= ro || c < 0 || c >= scale) return;
    if (revealed[r][c]) return;
    revealed[r][c] = true;

    if (board[r][c] === -1) {
        if (gameOver) return;
        gameOver = true;
        stopTimer();
        playSound(loseSound);

        for (let row = 0; row < ro; row++) {
            for (let col = 0; col < scale; col++) {
                if (board[row][col] === -1) {
                    revealed[row][col] = true;
                    createExplosion(col * CELL_SIZE + CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2);
                }
            }
        }
        startParticleAnimation();
        paragraph.textContent = window.getTranslation ? window.getTranslation('loseMsg') : '💥 Вы проиграли!';
        paragraph.classList.add('lastEffect');
        canvas.classList.add('shake');
        setTimeout(() => canvas.classList.remove('shake'), 300);
        if (window.showAdOnLose) window.showAdOnLose();
    } else {
        playSound(revealSound, 0.5);
    }
}

async function checkWin() {
    for (let r = 0; r < ro; r++) {
        for (let c = 0; c < scale; c++) {
            if (board[r][c] !== -1 && !revealed[r][c]) return false;
        }
    }
    if (win) return true;

    playSound(winSound);
    stopTimer();
    win = true;
    winGlow = 1.0;

    if (!winAnimationStarted) {
        winAnimationStarted = true;
        const animateWinGlow = () => {
            if (winGlow > 0) {
                winGlow -= 0.005;
                draw();
                requestAnimationFrame(animateWinGlow);
            }
        };
        animateWinGlow();
    }

    const currentScore = parseFloat(timerSpan.textContent);
    const roundedScore = Math.floor(currentScore);
    const sec = window.getTranslation ? window.getTranslation('sec') : 'с';

    // Проверка авторизации перед отправкой рекорда
    const isAuthorized = window.isPlayerAuthorized ? window.isPlayerAuthorized() : false;
    
    if (isAuthorized && window.setLeaderboardScore) {
        await window.setLeaderboardScore(currentLeaderboardName, roundedScore);
    }
    
    paragraph.textContent = `${window.getTranslation ? window.getTranslation('winMsg') : '🏆 Победа за'} ${roundedScore}${sec}!`;

    paragraph.classList.add('winEffect');
    if (window.showAdOnWin) window.showAdOnWin();
    
    // Обновляем таблицу лидеров
    getRecord();
    
    return true;
}

function createExplosion(centerX, centerY) {
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.push({
            x: centerX, y: centerY,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            size: Math.random() * 8 + 4,
            color: `hsl(${Math.random() * 30 + 10}, 80%, 50%)`,
            alpha: 1.0
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.alpha -= 0.02;
        if (p.alpha <= 0 || p.y > canvas.height + 50) particles.splice(i, 1);
    }
}

function startParticleAnimation() {
    const animate = () => {
        if (particles.length > 0) {
            updateParticles(); draw();
            requestAnimationFrame(animate);
        }
    };
    animate();
}

function timerStarts() {
    timerInterval = setInterval(timerTick, 10);
    timerTime = Date.now();
    elapsedBeforePause = 0;
    isPaused = false;
}

function timerTick() {
    const now = Date.now();
    const totalSeconds = elapsedBeforePause + (now - timerTime) / 1000;
    const sec = window.getTranslation ? window.getTranslation('sec') : 'с';
    timerSpan.textContent = totalSeconds.toFixed(2) + sec;
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isPaused = false;
}

function getCellFromCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        col: Math.floor((clientX - rect.left) * scaleX / CELL_SIZE),
        row: Math.floor((clientY - rect.top) * scaleY / CELL_SIZE)
    };
}

function handleCanvasClick(e) {
    if (win || gameOver || isPaused) return;
    e.preventDefault();
    const { row, col } = getCellFromCoords(e.clientX, e.clientY);
    if (row < 0 || row >= ro || col < 0 || col >= scale) return;
    if (revealed[row][col]) return;

    if (e.button === 2) {
        const wasFlagged = flagged[row][col];
        playFlagSound(!wasFlagged);
        toggleFlag(row, col);
    } else {
        if (firstClick) {
            placeMines(row, col);
            firstClick = false;
            calculateAllNumbers();
            timerStarts();
        }
        if (board[row][col] === 0) floodFill(row, col, true);
        else revealCell(row, col);
    }
    draw();
}

canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    handleCanvasClick(e);
});

canvas.addEventListener('touchstart', (e) => {
    if (win || gameOver || isPaused) return;
    e.preventDefault();
    const touch = e.touches[0];
    const { row, col } = getCellFromCoords(touch.clientX, touch.clientY);
    if (row < 0 || row >= ro || col < 0 || col >= scale) return;
    if (revealed[row][col]) return;

    if (!selectedCell) {
        selectedCell = { row, col };
    } else if (selectedCell.row === row && selectedCell.col === col) {
        openSelectedCell();
        return;
    } else {
        selectedCell = { row, col };
    }
    updateMobileButtons();
    draw();
}, { passive: false });

function openSelectedCell() {
    if (!selectedCell || win || gameOver) return;
    const { row, col } = selectedCell;
    if (revealed[row][col]) {
        selectedCell = null;
        updateMobileButtons(); draw(); return;
    }
    if (firstClick) {
        placeMines(row, col);
        firstClick = false;
        calculateAllNumbers();
        timerStarts();
    }
    if (board[row][col] === 0) floodFill(row, col, true);
    else revealCell(row, col);
    selectedCell = null;
    updateMobileButtons();
    draw();
}

function flagSelectedCell() {
    if (!selectedCell || win || gameOver) return;
    const { row, col } = selectedCell;
    if (revealed[row][col]) {
        selectedCell = null;
        updateMobileButtons(); draw(); return;
    }
    const wasFlagged = flagged[row][col];
    playFlagSound(!wasFlagged);
    toggleFlag(row, col);
    updateMobileButtons();
    draw();
}

function updateMobileButtons() {
    if (!mobileFlagBtn || !mobileOpenBtn) return;
    const hasSelection = selectedCell && !revealed[selectedCell.row][selectedCell.col];
    mobileFlagBtn.disabled = !hasSelection || win || gameOver;
    mobileOpenBtn.disabled = !hasSelection || win || gameOver;
    mobileOpenBtn.classList.toggle('active-pulse', hasSelection && !win && !gameOver);
    mobileFlagBtn.classList.toggle('active-pulse', hasSelection && !win && !gameOver);
    const t = window.getTranslation || ((k) => k);
    mobileFlagBtn.textContent = '🚩 ' + (t('mobileFlag') || 'Флажок');
    mobileOpenBtn.textContent = '✓ ' + (t('mobileOpen') || 'Открыть');
}

if (mobileFlagBtn) mobileFlagBtn.addEventListener('click', flagSelectedCell);
if (mobileOpenBtn) mobileOpenBtn.addEventListener('click', openSelectedCell);

function toggleFlag(row, col) {
    if (flagged[row][col]) counter++;
    else counter--;
    flagged[row][col] = !flagged[row][col];
    minesCounter.textContent = counter;
}

// === ОБНОВЛЁННАЯ ТАБЛИЦА ЛИДЕРОВ ===
let sdkInitialized = false;

async function getRecord() {
    const list = document.getElementById('leaderboardList');
    
    // Если SDK еще не готов, показываем "Загрузка..."
    if (!sdkInitialized) {
        const t = window.getTranslation || ((k) => k);
        list.innerHTML = `<li class="empty-message">${t('loading') || 'Загрузка...'}</li>`;
        return;
    }
    
    const isAuthorized = window.isPlayerAuthorized ? window.isPlayerAuthorized() : false;
    
    try {
        // Получаем топ-10
        const leaders = await window.getLeaderboardScores(currentLeaderboardName);
        
        // Получаем позицию текущего игрока
        let playerEntry = null;
        if (isAuthorized && window.getLeaderboardPlayerEntry) {
            playerEntry = await window.getLeaderboardPlayerEntry(currentLeaderboardName);
        }
        
        renderLeaders(leaders, playerEntry, isAuthorized);
    } catch (error) {
        if (list) list.innerHTML = '<li class="empty-message" style="color: #ffaaaa;">⚠️ Ошибка</li>';
    }
}

// Подписываемся на событие готовности SDK
if (window.onSDKReady) {
    window.onSDKReady((authorized) => {
        console.log('SDK готов, авторизация:', authorized);
        sdkInitialized = true;
        // Обновляем таблицу лидеров после готовности SDK
        getRecord();
    });
}

function renderLeaders(leaders, playerEntry, isAuthorized) {
    const list = document.getElementById('leaderboardList');
    const t = window.getTranslation || ((k) => k);
    const sec = t('sec') || 'с';
    
    if (!isAuthorized) {
        // Показываем сообщение об авторизации
        list.innerHTML = `
            <li class="auth-message">
                🔐 ${t('authRequired')}
            </li>
        `;
        return;
    }
    
    if (!leaders || leaders.length === 0) {
        list.innerHTML = `<li class="empty-message">${t('noRecords') || 'Пока нет рекордов'}</li>`;
        
        // Если игрок авторизован, но ещё не в рейтинге
        if (playerEntry) {
            list.innerHTML += `
                <li class="player-position">
                    <span class="player-place">—</span>
                    <span class="player-info">${t('yourPlace')} ${playerEntry.place} ${t('place')}</span>
                    <span class="player-score">${playerEntry.score}${sec}</span>
                </li>
            `;
        }
        return;
    }
    
    // Топ-10 игроков
    const top10 = leaders.slice(0, 10);
    let html = top10.map(l => `
        <li class="leader-item">
            <span class="leader-place">${l.place}</span>
            <span class="leader-name">${l.name}</span>
            <span class="leader-score">${l.score}${sec}</span>
        </li>
    `).join('');
    
    // Позиция текущего игрока (если он не в топ-10)
    if (playerEntry && playerEntry.place > 10) {
        html += `
            <li class="player-position">
                <span class="player-place">${playerEntry.place}</span>
                <span class="player-info">${t('yourPlace')} ${playerEntry.place} ${t('place')}</span>
                <span class="player-score">${playerEntry.score}${sec}</span>
            </li>
        `;
    }
    
    list.innerHTML = html;
}

function newGame() {
    stopTimer();
    elapsedBeforePause = 0; isPaused = false;
    winGlow = 0; counter = mines;
    winAnimationStarted = false;
    gameOver = false; win = false; firstClick = true;
    selectedCell = null;
    const sec = window.getTranslation ? window.getTranslation('sec') : 'с';
    timerSpan.textContent = '0.00' + sec;
    minesCounter.textContent = mines;
    particles = [];
    initBoard(); initRevealed(); initflagged();
    paragraph.textContent = '';
    paragraph.classList.remove('lastEffect', 'winEffect');
    updateMobileButtons();
    draw();
}

getRecord();
newGame();
newGameBtn.addEventListener('click', newGame);
document.getElementById('refreshBtn').addEventListener('click', getRecord);

rulesBtn.addEventListener('click', () => {
    rulesContainer.style.display = 'flex';
    if (timerInterval !== null && !gameOver && !win && !firstClick) {
        elapsedBeforePause += (Date.now() - timerTime) / 1000;
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = true;
    }
});

backToGameBtn.addEventListener('click', () => {
    rulesContainer.style.display = 'none';
    if (isPaused && !gameOver && !win && !firstClick) {
        timerTime = Date.now();
        timerInterval = setInterval(timerTick, 10);
        isPaused = false;
    }
});

const settingsBtn = document.getElementById('settingsBtn');

const settingsModal = document.createElement('div');
settingsModal.id = 'settingsModal';
settingsModal.className = 'settings-modal';
settingsModal.style.display = 'none';
settingsModal.innerHTML = `
    <div class="settings-modal-content">
        <div class="settings-header">
            <h3 id="settingsTitle">⚙️ Настройки</h3>
            <button id="closeSettingsBtn" class="settings-close-icon" aria-label="Close">✕</button>
        </div>
        <div class="settings-body">
            <div class="settings-row">
                <label id="langLabel" class="settings-label">🌐 Язык</label>
                <select id="langSelect" class="settings-select">
                    <option value="ru">🇷🇺 Русский</option>
                    <option value="en">🇬🇧 English</option>
                </select>
            </div>
            <div class="settings-divider"></div>
            <div class="settings-row">
                <label id="soundLabel" class="settings-label">🔈 Звуки</label>
                <label class="settings-toggle">
                    <input type="checkbox" id="soundToggle" ${soundEnabled ? 'checked' : ''}>
                    <span class="settings-toggle-slider"></span>
                </label>
            </div>
            <div class="settings-divider"></div>
            <div class="settings-row settings-row-vertical">
                <div class="settings-label-row">
                    <label id="volumeLabel" class="settings-label">🔊 Громкость</label>
                    <span class="settings-value" id="volumeValue">${Math.round(masterVolume * 100)}%</span>
                </div>
                <input type="range" id="volumeSlider" class="settings-slider" 
                       min="0" max="100" value="${Math.round(masterVolume * 100)}">
            </div>
        </div>
    </div>
`;
document.body.appendChild(settingsModal);

function updateSliderFill(value) {
    const slider = document.getElementById('volumeSlider');
    if (slider) slider.style.setProperty('--volume-percent', value + '%');
    const display = document.getElementById('volumeValue');
    if (display) display.textContent = value + '%';
}
updateSliderFill(Math.round(masterVolume * 100));

if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        const langSelect = document.getElementById('langSelect');
        if (langSelect) langSelect.value = window.getCurrentLang ? window.getCurrentLang() : 'ru';
        settingsModal.style.display = 'flex';
    });
}

document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.style.display = 'none';
});

document.getElementById('langSelect').addEventListener('change', (e) => {
    if (window.applyTranslations) window.applyTranslations(e.target.value);
    updateAllTexts();
});

document.getElementById('soundToggle').addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
    localStorage.setItem('saper_sound', soundEnabled);
});

document.getElementById('volumeSlider').addEventListener('input', (e) => {
    updateSliderFill(e.target.value);
});

document.getElementById('volumeSlider').addEventListener('change', (e) => {
    masterVolume = parseInt(e.target.value) / 100;
    localStorage.setItem('saper_volume', masterVolume);
    updateSliderFill(e.target.value);
    playFlagSound(true);
});

function updateAllTexts() {
    const t = window.getTranslation || ((k) => k);
    newGameBtn.textContent = '🔄 ' + t('newGame');
    rulesBtn.textContent = '📋 ' + t('rules');
    document.getElementById('refreshBtn').textContent = '🔄 ' + t('refresh');
    const backText = backToGameBtn.querySelector('.back-text');
    if (backText) backText.textContent = t('back');
    
    document.getElementById('gameTitle').textContent = '💣 ' + t('title');
    const rulesTitle = document.getElementById('rulesTitle');
    if (rulesTitle) rulesTitle.textContent = t('rulesTitle');
    document.getElementById('leaderboardTitle').textContent = t('leaderboardTitle');
    
    document.getElementById('optEasy').textContent = t('optEasy');
    document.getElementById('optMedium').textContent = t('optMedium');
    document.getElementById('optHard').textContent = t('optHard');
    
    const settingsTitle = document.getElementById('settingsTitle');
    if (settingsTitle) settingsTitle.textContent = '⚙️ ' + t('settings');
    const langLabel = document.getElementById('langLabel');
    if (langLabel) langLabel.textContent = '🌐 ' + t('language');
    const soundLabel = document.getElementById('soundLabel');
    if (soundLabel) soundLabel.textContent = '🔈 ' + t('sound');
    const volumeLabel = document.getElementById('volumeLabel');
    if (volumeLabel) volumeLabel.textContent = '🔊 ' + (t('volume') || 'Громкость');
    
    // Обновляем правило об авторизации
    const rule8 = document.getElementById('rule8');
    if (rule8) rule8.innerHTML = t('rule8');
    
    updateMobileButtons();
    getRecord();
}

window.updateAllTexts = updateAllTexts;
setTimeout(updateAllTexts, 500);

document.addEventListener('contextmenu', (e) => e.preventDefault());