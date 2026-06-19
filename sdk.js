let ysdk = null;
let lb = null;
let currentLang = 'ru';
let isAuthorized = false;
let sdkReadyCallbacks = [];
let gameplayStarted = false;

const translations = {
    ru: {
        title: "Сапёр: Классика",
        rulesTitle: "📋 Правила игры «Сапёр: Классика»",
        leaderboardTitle: "🏆 Мировые рекорды",
        recordsTitle: "🏆 Мировые рекорды",
        optEasy: "Лёгкий",
        optMedium: "Средний",
        optHard: "Сложный",
        newGame: "Новая игра",
        rules: "Правила",
        settings: "Настройки",
        records: "Рекорды",
        language: "Язык",
        sound: "Звук",
        close: "Закрыть",
        refresh: "Обновить",
        back: "Назад к игре",
        sec: "с",
        volume: "Громкость",
        more: "Дополнительно",
        winMsg: "🏆 Победа за",
        loseMsg: "💥 Вы проиграли!",
        noRecords: "Пока нет рекордов",
        loading: "Загрузка...",
        mobileFlag: "Флажок",
        mobileUnflag: "Снять флажок",
        mobileOpen: "Открыть",
        authRequired: "Авторизуйтесь в Яндексе, чтобы участвовать в рейтинге",
        yourPlace: "Вы на",
        place: "месте",
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
        title: "Minesweeper: Classic",
        rulesTitle: "📋 Minesweeper: Classic Rules",
        leaderboardTitle: "🏆 World Records",
        recordsTitle: "🏆 World Records",
        optEasy: "Easy",
        optMedium: "Medium",
        optHard: "Hard",
        newGame: "New Game",
        rules: "Rules",
        settings: "Settings",
        records: "Records",
        language: "Language",
        sound: "Sound",
        close: "Close",
        refresh: "Refresh",
        back: "Back to game",
        sec: "s",
        volume: "Volume",
        more: "More",
        winMsg: "🏆 Won in",
        loseMsg: "💥 Game Over!",
        noRecords: "No records yet",
        loading: "Loading...",
        mobileFlag: "Flag",
        mobileUnflag: "Remove flag",
        mobileOpen: "Open",
        authRequired: "Sign in to Yandex to participate in the leaderboard",
        yourPlace: "You are at",
        place: "place",
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
    try { localStorage.setItem('saper_lang', lang); } catch(e) {}
    document.documentElement.lang = lang;
    document.title = translations[lang].title;
    if (typeof window.updateAllTexts === 'function') {
        window.updateAllTexts();
    }
}

window.applyTranslations = applyTranslations;

window.onSDKReady = function(callback) {
    if (ysdk !== null || window.sdkFailed) {
        callback(isAuthorized);
    } else {
        sdkReadyCallbacks.push(callback);
    }
};

// ============================================
// 🎮 GAMEPLAY API — разметка геймплея
// ============================================
window.startGameplay = function() {
    if (!ysdk || gameplayStarted) return;
    try {
        if (ysdk.features && ysdk.features.GameplayAPI) {
            ysdk.features.GameplayAPI.start();
            gameplayStarted = true;
        }
    } catch (e) {}
};

window.stopGameplay = function() {
    if (!ysdk || !gameplayStarted) return;
    try {
        if (ysdk.features && ysdk.features.GameplayAPI) {
            ysdk.features.GameplayAPI.stop();
            gameplayStarted = false;
        }
    } catch (e) {}
};

// ============================================
// 🚀 СКРЫТИЕ ПРЕЛОАДЕРА + ВЫЗОВ LoadingAPI.ready()
// ============================================
function hidePreloader() {
    var preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.classList.add('hidden');
        setTimeout(function() {
            preloader.remove();
        }, 500);
    }
}

function callGameReady() {
    try {
        if (ysdk && ysdk.features && ysdk.features.LoadingAPI) {
            ysdk.features.LoadingAPI.ready();
            console.log('LoadingAPI.ready() вызван');
        }
    } catch (e) {
        console.error('LoadingAPI.ready error:', e);
    }
}

async function checkAuthorization() {
    if (!ysdk) return false;
    try {
        var player = await ysdk.getPlayer({ scopes: false });
        var mode = player.getMode();
        if (mode !== 'lite') {
            return true;
        }
        try {
            var data = await ysdk.player.getData();
            if (data && (data.uid || data.publicName || data.name)) {
                return true;
            }
        } catch (e) {}
        return false;
    } catch (e) {
        try {
            var data = await ysdk.player.getData();
            return !!(data && (data.uid || data.publicName));
        } catch (e2) {
            return false;
        }
    }
}

async function initSDK() {
    if (typeof YaGames === 'undefined') {
        console.warn('YaGames SDK не найден, работаем в оффлайн-режиме');
        window.sdkFailed = true;
        applyTranslations(localStorage.getItem('saper_lang') || 'ru');
        sdkReadyCallbacks.forEach(function(callback) { callback(false); });
        sdkReadyCallbacks = [];
        hidePreloader();
        callGameReady();
        return;
    }

    try {
        ysdk = await YaGames.init();
        window.ysdk = ysdk;
        console.log('SDK инициализирован');

        isAuthorized = await checkAuthorization();
        console.log('Авторизация:', isAuthorized ? 'Да' : 'Нет');

        var savedLang = localStorage.getItem('saper_lang');
        var detectedLang = savedLang;
        if (!detectedLang) {
            try {
                detectedLang = ysdk.environment.i18n.lang;
                if (detectedLang === 'ru' || detectedLang === 'be' || detectedLang === 'kk') {
                    detectedLang = 'ru';
                } else {
                    detectedLang = 'en';
                }
            } catch (e) {
                detectedLang = 'ru';
            }
        }
        applyTranslations(detectedLang);

        await loadPlayerName();

        try {
            lb = await ysdk.getLeaderboards();
            console.log('Лидерборды инициализированы');
        } catch (e) {
            console.log('Лидерборды недоступны:', e);
            lb = null;
        }

        sdkReadyCallbacks.forEach(function(callback) { callback(isAuthorized); });
        sdkReadyCallbacks = [];

        var loseCount = 0;
        window.showAdOnLose = function() {
            loseCount++;
            if (loseCount >= 2) {
                try {
                    window.stopGameplay();
                    ysdk.adv.showFullscreenAdv({
                        callbacks: {
                            onClose: function() { loseCount = 0; },
                            onError: function() { loseCount = 0; }
                        }
                    });
                } catch (e) {}
            }
        };

        var winCount = 0;
        window.showAdOnWin = function() {
            winCount++;
            if (winCount >= 3) {
                try {
                    window.stopGameplay();
                    ysdk.adv.showFullscreenAdv({
                        callbacks: {
                            onClose: function() { winCount = 0; },
                            onError: function() { winCount = 0; }
                        }
                    });
                } catch (e) {}
            }
        };

        hidePreloader();
        callGameReady();

    } catch (err) {
        console.error('Ошибка инициализации SDK:', err);
        window.sdkFailed = true;
        isAuthorized = false;
        applyTranslations(localStorage.getItem('saper_lang') || 'ru');
        sdkReadyCallbacks.forEach(function(callback) { callback(false); });
        sdkReadyCallbacks = [];
        hidePreloader();
        callGameReady();
    }
}

async function loadPlayerName() {
    try {
        if (!ysdk) return;
        var player = await ysdk.getPlayer({ scopes: false });
        var mode = player.getMode();
        if (mode !== 'lite') {
            var data = await ysdk.player.getData();
            if (data && data.name && data.name.trim() !== '') {
                window.playerName = data.name;
                return;
            }
        }
    } catch (e) {}
    try {
        window.playerName = localStorage.getItem('minesweeper_playerName') || null;
    } catch (e) {
        window.playerName = null;
    }
}

function savePlayerName(name) {
    window.playerName = name;
    try {
        localStorage.setItem('minesweeper_playerName', name);
        if (ysdk) ysdk.player.setData({ name: name }).catch(function() {});
    } catch (e) {}
}

window.setLeaderboardScore = async function(leaderboardName, score) {
    if (!isAuthorized || !lb) return false;
    try {
        await lb.setLeaderboardScore(leaderboardName, score);
        return true;
    } catch (e) {
        console.error('Ошибка отправки рекорда:', e);
        return false;
    }
};

window.getLeaderboardScores = async function(leaderboardName) {
    if (!lb) return [];
    try {
        var data = await lb.getLeaderboardEntries(leaderboardName, {
            quantityTop: 10,
            quantityAround: 0
        });
        return data.entries.map(function(e, index) {
            return {
                place: index + 1,
                name: e.player.publicName || 'Игрок',
                score: e.score
            };
        });
    } catch (e) {
        console.error('Ошибка получения рекордов:', e);
        return [];
    }
};

window.getLeaderboardPlayerEntry = async function(leaderboardName) {
    if (!isAuthorized || !lb) return null;
    try {
        var entry = await lb.getLeaderboardPlayerEntry(leaderboardName);
        return { place: entry.rank, score: entry.score };
    } catch (e) {
        return null;
    }
};

window.isPlayerAuthorized = function() {
    return isAuthorized;
};

window.getCurrentLang = function() {
    return currentLang;
};

window.getTranslation = function(key) {
    return (translations[currentLang] && translations[currentLang][key]) ||
           (translations.ru && translations.ru[key]) ||
           key;
};

window.requestAuthorization = async function() {
    if (!ysdk) return false;
    try {
        await ysdk.auth.openAuthDialog();
        isAuthorized = await checkAuthorization();
        return isAuthorized;
    } catch (e) {
        console.error('Ошибка авторизации:', e);
        return false;
    }
};

initSDK();