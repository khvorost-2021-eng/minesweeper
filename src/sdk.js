let ysdk = null;
let lb = null;
let currentLang = 'ru';
let isAuthorized = false;
let sdkReadyCallbacks = [];

const translations = {
    ru: {
        title: "Сапёр",
        rulesTitle: "📋 Правила игры «Сапёр»",
        leaderboardTitle: "🏆 Мировые рекорды",
        recordsTitle: "🏆 Мировые рекорды",
        optEasy: "Лёгкий", optMedium: "Средний", optHard: "Сложный",
        newGame: "Новая игра", rules: "Правила", settings: "Настройки", records: "Рекорды",
        language: "Язык", sound: "Звук", close: "Закрыть", refresh: "Обновить",
        back: "Назад к игре", sec: "с", volume: "Громкость",
        winMsg: "🏆 Победа за", loseMsg: "💥 Вы проиграли!",
        noRecords: "Пока нет рекордов", loading: "Загрузка...",
        mobileFlag: "Флажок", mobileUnflag: "Снять флажок", mobileOpen: "Открыть",
        authRequired: "Авторизуйтесь в Яндексе, чтобы участвовать в рейтинге",
        yourPlace: "Вы на", place: "месте",
        rule1: "🖱️ <strong>Левый клик</strong> — открыть ячейку",
        rule2: "🚩 <strong>Правый клик</strong> — поставить/убрать флажок",
        rule3: "📱 <strong>На телефоне:</strong> выделите клетку, затем используйте кнопки",
        rule4: "🔢 Цифра показывает количество мин вокруг",
        rule5: "💥 Если открыть мину — поражение",
        rule6: "🏆 Откройте все безопасные ячейки для победы",
        rule7: "🛡️ Первый клик всегда безопасный",
        rule8: "🚫 На клетку с флажком нельзя нажать — сначала снимите его",
        rule9: "🔐 <strong>Авторизуйтесь в Яндексе</strong>, чтобы сохранять рекорды",
        rulesGoal: "🎯 Цель: открыть все ячейки без мин как можно быстрее!"
    },
    en: {
        title: "Minesweeper",
        rulesTitle: "📋 Minesweeper Rules",
        leaderboardTitle: "🏆 World Records",
        recordsTitle: "🏆 World Records",
        optEasy: "Easy", optMedium: "Medium", optHard: "Hard",
        newGame: "New Game", rules: "Rules", settings: "Settings", records: "Records",
        language: "Language", sound: "Sound", close: "Close", refresh: "Refresh",
        back: "Back to game", sec: "s", volume: "Volume",
        winMsg: "🏆 Won in", loseMsg: "💥 Game Over!",
        noRecords: "No records yet", loading: "Loading...",
        mobileFlag: "Flag", mobileUnflag: "Remove flag", mobileOpen: "Open",
        authRequired: "Sign in to Yandex to participate in the leaderboard",
        yourPlace: "You are at", place: "place",
        rule1: "🖱️ <strong>Left click</strong> — reveal cell",
        rule2: "🚩 <strong>Right click</strong> — place/remove flag",
        rule3: "📱 <strong>On mobile:</strong> select cell, then use buttons",
        rule4: "🔢 Number shows mines around",
        rule5: "💥 Hitting a mine = game over",
        rule6: "🏆 Reveal all safe cells to win",
        rule7: "🛡️ First click is always safe",
        rule8: "🚫 Can't open flagged cell — remove flag first",
        rule9: "🔐 <strong>Sign in to Yandex</strong> to save records",
        rulesGoal: "🎯 Goal: reveal all safe cells as fast as possible!"
    }
};

function applyTranslations(lang) {
    currentLang = lang;
    localStorage.setItem('saper_lang', lang);
    document.documentElement.lang = lang;
    document.title = translations[lang].title;
    if (typeof window.updateAllTexts === 'function') {
        window.updateAllTexts();
    }
}
window.applyTranslations = applyTranslations;

window.onSDKReady = function(callback) {
    if (ysdk && typeof isAuthorized !== 'undefined') {
        callback(isAuthorized);
    } else {
        sdkReadyCallbacks.push(callback);
    }
};

async function initSDK() {
    try {
        ysdk = await YaGames.init();
        console.log('SDK готов');
        window.ysdk = ysdk;

        try {
            const player = await ysdk.player.getData();
            isAuthorized = !!(player && player.uid);
            console.log('Авторизация:', isAuthorized ? 'Да' : 'Нет');
        } catch (e) {
            isAuthorized = false;
        }

        const savedLang = localStorage.getItem('saper_lang');
        let detectedLang = savedLang;
        if (!detectedLang) {
            detectedLang = ysdk.environment.i18n.lang;
            detectedLang = (detectedLang === 'ru' || detectedLang === 'be' || detectedLang === 'kk') ? 'ru' : 'en';
        }
        applyTranslations(detectedLang);

        await loadPlayerName();

        if (ysdk.features && ysdk.features.LoadingAPI) {
            ysdk.features.LoadingAPI.ready();
        }
        ysdk.dispatchEvent('game_ready');

        try {
            lb = await ysdk.getLeaderboards();
            console.log('Лидерборды инициализированы');
        } catch (e) {
            console.log('Лидерборды недоступны:', e);
        }

        sdkReadyCallbacks.forEach(callback => callback(isAuthorized));
        sdkReadyCallbacks = [];

        let loseCount = 0;
        window.showAdOnLose = function() {
            loseCount++;
            if (loseCount >= 2) {
                ysdk.adv.showFullscreenAdv({
                    callbacks: { onClose: () => { loseCount = 0; }, onError: () => { loseCount = 0; } }
                });
            }
        };

        let winCount = 0;
        window.showAdOnWin = function() {
            winCount++;
            if (winCount >= 3) {
                ysdk.adv.showFullscreenAdv({
                    callbacks: { onClose: () => { winCount = 0; }, onError: () => { winCount = 0; } }
                });
            }
        };
    } catch (err) {
        console.log('SDK не загрузился:', err);
        isAuthorized = false;
        applyTranslations('ru');
        sdkReadyCallbacks.forEach(callback => callback(false));
        sdkReadyCallbacks = [];
    }
}

async function loadPlayerName() {
    try {
        const player = await ysdk.player.getData();
        if (player && player.name && player.name.trim() !== '') {
            window.playerName = player.name;
            return;
        }
    } catch (e) {}
    window.playerName = localStorage.getItem('minesweeper_playerName') || null;
}

function savePlayerName(name) {
    window.playerName = name;
    try {
        localStorage.setItem('minesweeper_playerName', name);
        if (ysdk) ysdk.player.setData({ name: name }).catch(() => {});
    } catch (e) {}
}

window.setLeaderboardScore = async function(leaderboardName, score) {
    if (!isAuthorized) return false;
    if (lb) {
        try {
            await lb.setLeaderboardScore(leaderboardName, score);
            return true;
        } catch (e) { 
            console.error('Ошибка отправки рекорда:', e);
            return false;
        }
    }
    return false;
};

window.getLeaderboardScores = async function(leaderboardName) {
    if (lb) {
        try {
            const data = await lb.getLeaderboardEntries(leaderboardName, { 
                quantityTop: 10, quantityAround: 0 
            });
            return data.entries.map((e, index) => ({
                place: index + 1,
                name: e.player.publicName || 'Игрок',
                score: e.score
            }));
        } catch (e) { 
            return []; 
        }
    }
    return [];
};

window.getLeaderboardPlayerEntry = async function(leaderboardName) {
    if (!isAuthorized || !lb) return null;
    try {
        const entry = await lb.getLeaderboardPlayerEntry(leaderboardName);
        return { place: entry.rank, score: entry.score };
    } catch (e) {
        return null;
    }
};

window.isPlayerAuthorized = function() { return isAuthorized; };
window.getCurrentLang = () => currentLang;
window.getTranslation = (key) => translations[currentLang][key] || translations.ru[key];

initSDK();