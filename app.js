let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
const newGameBtn = document.getElementById('newGameBtn');
let scale = 16;
const CELL_SIZE = canvas.width/scale;
let paragraph = document.getElementById('message');
const pause = document.getElementById('pauseBtn');
const bgMusic = document.getElementById('bgMusic');
let timerSpan = document.getElementById('timer');
let minesCounter = document.getElementById('minesCounter');
const rulesBtn = document.getElementById('rulesBtn');
const wrapper = document.getElementById('wrapper');
let winAnimationStarted = false;
let mines = 40;
let board = [];
let firstClick = true;
let revealed = [];
let gameOver = false;
let flagged = [];
let win = false;
let winGlow = 0;

function initRevealed(){
    for (let r = 0; r < scale; r++) {
        revealed[r] = [];
        for (let c = 0; c < scale; c++) {
            revealed[r][c] = false;
        }
    }    
}

function initBoard(){
    for (let r = 0; r < scale; r++) {
        board[r] = [];
        for (let c = 0; c < scale; c++) {
            board[r][c] = 0;
        }
    }
}
function placeMines(row, col) {
    let minesPlaced = 0;
    while (minesPlaced < mines) {
        let r = Math.floor(Math.random() * scale);
        let c = Math.floor(Math.random() * scale);
        if([row-1, row, row+1].includes(r) && [col-1, col, col+1].includes(c)){
            continue;
        }
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
        ctx.strokeStyle = '#1a2530';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    for (let i = 1; i < scale; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.strokeStyle = '#1a2530';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < scale; r++) {
        for (let c = 0; c < scale; c++) {
            if (revealed[r][c]) {
                drawSquers(r, c);

                const x = c * CELL_SIZE + CELL_SIZE / 2;
                const y = r * CELL_SIZE + CELL_SIZE / 2;
                const value = board[r][c];

                if (value === -1) {
                    ctx.fillStyle = '#000000';
                    ctx.fillText('💣', x, y);
                } else if (value === 1) {
                    ctx.fillStyle = '#0000ff';
                    ctx.fillText('1', x, y);
                } else if (value === 2) {
                    ctx.fillStyle = '#008000';
                    ctx.fillText('2', x, y);
                } else if (value === 3) {
                    ctx.fillStyle = '#ff0000';
                    ctx.fillText('3', x, y);
                } else if (value === 4) {
                    ctx.fillStyle = '#000080';
                    ctx.fillText('4', x, y);
                } else if (value === 5) {
                    ctx.fillStyle = '#800000';
                    ctx.fillText('5', x, y);
                } else if (value === 6) {
                    ctx.fillStyle = '#008080';
                    ctx.fillText('6', x, y);
                } else if (value === 7) {
                    ctx.fillStyle = '#000000';
                    ctx.fillText('7', x, y);
                } else if (value === 8) {
                    ctx.fillStyle = '#808080';
                    ctx.fillText('8', x, y);
                }
            }
            if(flagged[r][c]){
                ctx.fillStyle = '#3a4a5a';
                ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                drawFlags(r, c);
            }
        }
    }

    // Блок свечения (без вызова анимаций!)
    if (winGlow > 0) {
        const pulse = Math.sin(Date.now() * 0.02) * 0.25 + 0.65;
        for (let r = 0; r < scale; r++) {
            for (let c = 0; c < scale; c++) {
                if (revealed[r][c] && board[r][c] !== -1) {
                    ctx.fillStyle = `rgba(255, 215, 0, ${pulse * winGlow})`;
                    ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }
    }

    checkWin();
    if(win){
        paragraph.textContent='Вы выиграли🥇';
        return;
    }
    for (let p of particles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;    
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;
}

function floodFill(r, c) {
    // Проверка границ
    if (r < 0 || r >= scale || c < 0 || c >= scale) return;
    
    // Уже открыта — выходим
    if (revealed[r][c]) return;
    
    // Открываем ячейку
    revealed[r][c] = true;
    
    // Если это 0 — открываем соседей
    if (board[r][c] === 0) {
        floodFill(r - 1, c - 1);
        floodFill(r - 1, c);
        floodFill(r - 1, c + 1);
        floodFill(r, c - 1);
        floodFill(r, c + 1);
        floodFill(r + 1, c - 1);
        floodFill(r + 1, c);
        floodFill(r + 1, c + 1);
    }
}

function drawSquers(row, col) {
    ctx.fillStyle = '#8aaac0';
    ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
}

function drawFlags(row, col){
    ctx.fillText('🚩', col*CELL_SIZE+CELL_SIZE/2, row*CELL_SIZE+CELL_SIZE/2)
}

function countMinesAround(r, c) {
    let count = 0;
    
    if (r > 0 && c > 0 && board[r-1][c-1] === -1) count++;
    if (r > 0 && board[r-1][c] === -1) count++;
    if (r > 0 && c < scale-1 && board[r-1][c+1] === -1) count++;
    if (c > 0 && board[r][c-1] === -1) count++;
    if (c < scale-1 && board[r][c+1] === -1) count++;
    if (r < scale-1 && c > 0 && board[r+1][c-1] === -1) count++;
    if (r < scale-1 && board[r+1][c] === -1) count++;
    if (r < scale-1 && c < scale-1 && board[r+1][c+1] === -1) count++;
    
    return count;
}

function calculateAllNumbers() {
    for (let r = 0; r < scale; r++) {
        for (let c = 0; c < scale; c++) {
            if (board[r][c] !== -1) {
                board[r][c] = countMinesAround(r, c);
            }
        }
    }
}

function revealCell(r, c) {
    if (r < 0 || r >= scale || c < 0 || c >= scale) return;
    if (revealed[r][c]) return;
    
    revealed[r][c] = true;
    
    if (board[r][c] === -1) {
        gameOver = true;
        stopTimer();
        const lose = new Audio('music/lose.mp3');
        lose.play();
        
        // Показать ВСЕ мины
        for (let row = 0; row < scale; row++) {
            for (let col = 0; col < scale; col++) {
                if (board[row][col] === -1) {
                    revealed[row][col] = true;
                    const x = col * CELL_SIZE + CELL_SIZE / 2;
                    const y = row * CELL_SIZE + CELL_SIZE / 2;
                    createExplosion(x, y);
                    
                }
            }
        }
        startParticleAnimation();
        // Анимация и сообщение
        paragraph.textContent = '💥 Вы проиграли!';
        paragraph.classList.add('lastEffect');
        
        // Тряска canvas
        canvas.classList.add('shake');
        setTimeout(() => canvas.classList.remove('shake'), 300);
    }
}

function initflagged(){
    for (let r = 0; r < scale; r++) {
        flagged[r] = [];
        for (let c = 0; c < scale; c++) {
            flagged[r][c] = false;
        }
    }    
}

async function checkWin() {
    for (let r = 0; r < scale; r++) {
        for (let c = 0; c < scale; c++) {
            if (board[r][c] !== -1 && !revealed[r][c]) {
                return false;
            }
        }
    }
    
    // Если уже победили — не запускаем повторно
    if (win) return true;
    
    const winSound = new Audio('music/win.mp3');
    winSound.play();
    stopTimer();
    win = true;
    winGlow = 1.0;

    // Запускаем анимацию ТОЛЬКО ОДИН РАЗ
    if (!winAnimationStarted) {
        winAnimationStarted = true;
        function animateWinGlow() {
            if (winGlow > 0) {
                winGlow -= 0.003;
                draw();
                requestAnimationFrame(animateWinGlow, 30);
            }
        }
        animateWinGlow();
    }
    
    const currentScore = parseFloat(timerSpan.textContent);
    const roundedScore = Math.floor(currentScore);
    
    // 1. Получаем текущие рекорды с сервера
    try {
        const response = await fetch(url);
        const leaders = await response.json();
        leaders.sort((a, b) => a.score - b.score);
        
        // 2. Проверяем, входит ли наш результат в топ-5
        const isTop5 = leaders.length < 5 || roundedScore < leaders[4]?.score;
        
        if (isTop5) {
            // 3. Входит в топ — запрашиваем имя
            const playerName = prompt(`Поздравляем! Вы попали в топ-5! (${roundedScore} сек). Введите ваше имя:`);
            if (playerName && playerName.trim() !== '') {
                await sendRecord(playerName.trim(), roundedScore);
            }
        } else {
            // 4. Не входит в топ — просто поздравляем
            paragraph.textContent = `🏆 Вы победили за ${roundedScore} сек!`;
        }
    } catch (error) {
        console.error('Ошибка при проверке рекорда:', error);
        paragraph.textContent = '🏆 Вы победили! (Ошибка сети)';
    }
    
    paragraph.classList.add('winEffect');
    return true;
}

let particles = [];

function createExplosion(centerX, centerY) {
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 8 + 4,
            color: `hsl(${Math.random() * 30 + 10}, 80%, 50%)`, // красно-оранжевые
            alpha: 1.0
        });
    }
}

function updateParticles() { 
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // гравитация
        p.alpha -= 0.02;
        
        if (p.alpha <= 0 || p.y > canvas.height + 50) {
            particles.splice(i, 1);
        }
    }
}

function startParticleAnimation() {
    function animate() {
        if (particles.length > 0) {
            updateParticles();
            draw();
            requestAnimationFrame(animate);
        }
    }
    animate();
}
let timerInterval = null;
let timerTime;
function timerStarts(){
    timerInterval = setInterval(timerTick, 10);
    timerTime=Date.now();
}

function timerTick(){
    const now = Date.now();
    const elaspsedSecond=(now-timerTime)/1000;
    timerSpan.textContent=elaspsedSecond.toFixed(2)+'c';
}

function stopTimer(){
    if(timerInterval!==null){
        clearInterval(timerInterval);
        timerInterval=null;
    }
}

const canvasClickHandler = (e) => {
    if(win)return;
    if(gameOver)return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX-rect.left)*scaleX;
    const canvasY = (e.clientY-rect.top)*scaleY

    const col = Math.floor(canvasX / CELL_SIZE)
    const row = Math.floor(canvasY / CELL_SIZE);
    if(flagged[row][col])return;
    if(revealed[row][col])return;
    if(firstClick){
        placeMines(row, col);
        firstClick = false;
        calculateAllNumbers();
        timerStarts();
        bgMusic.play();
    }
    if (board[row][col] === 0) {
        floodFill(row, col);
    } else {
        revealCell(row, col);
    }
    draw();
};

let counter = mines;
function toggleFlag(row, col){
    const tickFlag = new Audio('music/addFlag.mp3');
    tickFlag.play();
    if(flagged[row][col])counter++;
    else if(!flagged[row][col])counter--;
    flagged[row][col] = !flagged[row][col];
    minesCounter.textContent = counter;
}

const canvasContextMenuHandler = (e) => {
    e.preventDefault();
    if(win)return;
    if (gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    
    const col = Math.floor(canvasX / CELL_SIZE);
    const row = Math.floor(canvasY / CELL_SIZE);
    
    if (revealed[row][col]) return;
    
    toggleFlag(row, col);
    draw();
};

canvas.addEventListener('click', canvasClickHandler);
canvas.addEventListener('contextmenu', canvasContextMenuHandler);

const url = 'https://69db4051560857310a076f65.mockapi.io/leaders';
async function getRecord() {
    try {
        const response = await fetch(url);
        const data = await response.json();
        renderLeaders(data);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
}

async function sendRecord(name, score) {
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, score })
        });
        getRecord(); // обновить таблицу после отправки
    } catch (error) {
        console.error('Ошибка отправки:', error);
    }
}

function renderLeaders(leaders) {
    const list = document.getElementById('leaderboardList');
    if (!leaders || leaders.length === 0) {
        list.innerHTML = '<li class="empty-message">Пока нет рекордов</li>';
        return;
    }
    
    // Сортировка по времени (лучшие сверху)
    leaders.sort((a, b) => a.score - b.score);
    const top5 = leaders.slice(0, 5);
    
    list.innerHTML = top5.map(l => 
        `<li><span class="leader-name">${l.name}</span><span class="leader-score">${l.score}с</span></li>`
    ).join('');
}

function newGame() {
    // Остановить старый таймер
    stopTimer();
    winGlow = 0;
    counter = mines;
    // Сбросить состояние
    winAnimationStarted = false;
    gameOver = false;
    win = false;
    firstClick = true;
    timerSpan.textContent = '0.00с';
    minesCounter.textContent = mines;
    // Очистить частицы
    particles = [];
    
    // Пересоздать массивы
    initBoard();
    initRevealed();
    initflagged();
    
    // Очистить сообщение
    paragraph.textContent = '';
    paragraph.classList.remove('lastEffect', 'winEffect');
    
    draw();
}

getRecord();
newGame();
newGameBtn.addEventListener('click', newGame);
document.getElementById('refreshBtn').addEventListener('click', getRecord);

const gameHTML = wrapper.innerHTML;

// HTML для правил
const rulesHTML = `
    <div class="rules-container">
        <h2>📋 Правила игры «Сапёр»</h2>
        <ul>
            <li><strong>Левый клик</strong> — открыть ячейку</li>
            <li><strong>Правый клик</strong> — поставить/убрать флажок 🚩</li>
            <li>Цифра в ячейке показывает, сколько мин вокруг ячейки</li>
            <li>Если открыть мину — 💥 поражение</li>
            <li>Открыть все безопасные ячейки — 🏆 победа</li>
            <li>Первый клик всегда безопасный</li>
            <li>Счётчик 🚩 показывает оставшиеся мины</li>
            <li>Ставьте флажки в места, где по вашему мнению стоит мина. Всего 40 мин</li>
        </ul>
        <p><em>Цель: открыть все ячейки без мин как можно быстрее!</em></p>
        <button id="backToGameBtn" class="back-btn">◀ Назад к игре</button>
    </div>
`;
rulesBtn.addEventListener('click', rulesPage);
function rulesPage(){
    wrapper.classList.add('fade-out');
    
    setTimeout(() => {
        wrapper.innerHTML = rulesHTML;
        wrapper.classList.remove('fade-out');
        wrapper.classList.add('fade-in');
        
        document.getElementById('backToGameBtn').addEventListener('click', () => {
            wrapper.classList.add('fade-out');
            
            setTimeout(() => {
                // Восстанавливаем игру
                wrapper.innerHTML = gameHTML;
                wrapper.classList.remove('fade-out');
                wrapper.classList.add('fade-in');
                
                // 🔥 ВАЖНО: Заново запускаем игру без перезагрузки!
                restartGame();
            }, 300);
        });
    }, 300);
}

function restartGame() {
    // Заново получаем все DOM-элементы
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    paragraph = document.getElementById('message');
    timerSpan = document.getElementById('timer');
    minesCounter = document.getElementById('minesCounter');
    
    const rulesBtnNew = document.getElementById('rulesBtn');
    if (rulesBtnNew) {
        rulesBtnNew.removeEventListener('click', rulesPage);
        rulesBtnNew.addEventListener('click', rulesPage);
    }
    
    const newGameBtnNew = document.getElementById('newGameBtn');
    if (newGameBtnNew) {
        newGameBtnNew.removeEventListener('click', newGame);
        newGameBtnNew.addEventListener('click', newGame);
    }
    
    const refreshBtnNew = document.getElementById('refreshBtn');
    if (refreshBtnNew) {
        refreshBtnNew.removeEventListener('click', getRecord);
        refreshBtnNew.addEventListener('click', getRecord);
    }
    
    canvas.removeEventListener('click', canvasClickHandler);
    canvas.removeEventListener('contextmenu', canvasContextMenuHandler);
    canvas.addEventListener('click', canvasClickHandler);
    canvas.addEventListener('contextmenu', canvasContextMenuHandler);
    
    stopTimer();
    
    winGlow = 0;
    counter = mines;
    winAnimationStarted = false;
    gameOver = false;
    win = false;
    firstClick = true;
    timerSpan.textContent = '0.00с';
    minesCounter.textContent = mines;
    
    particles = [];
    
    initBoard();
    initRevealed();
    initflagged();
    
    paragraph.textContent = '';
    paragraph.classList.remove('lastEffect', 'winEffect');
    
    draw();
}
// Запуск музыки при первом клике
let musicStarted = false;
document.addEventListener('click', () => {
    if (!musicStarted) {
        bgMusic.volume = 0.4;
        bgMusic.play().catch(() => {});
        musicStarted = true;
    }
}, { once: false });