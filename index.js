/* 酒馆昼夜切换插件 JavaScript 逻辑 */

// 初始化状态
const edgeControls = document.getElementById('tavern-edge-controls');
const toggleButton = document.getElementById('toggle-edge-controls');
const dayNightSwitch = document.querySelector('.day-night-switch input');
const autoSwitchStatus = document.querySelector('.auto-switch-status');
const settingsButton = document.querySelector('.tavern-button');
const settingsPanel = document.getElementById('tavern-settings');
const closeSettingsButton = document.getElementById('tavern-close-settings');
const panelColorInput = document.getElementById('panel-color');
const textColorInput = document.getElementById('text-color');
const buttonColorInput = document.getElementById('button-color');
const dayThemeSelect = document.querySelector('select[name="day-theme"]');
const nightThemeSelect = document.querySelector('select[name="night-theme"]');
const dayBgSelect = document.querySelector('select[name="day-bg"]');
const nightBgSelect = document.querySelector('select[name="night-bg"]');
const dayTimeInput = document.querySelector('input[name="day-time"]');
const nightTimeInput = document.querySelector('input[name="night-time"]');

// 获取可用主题和背景（模拟从父窗口或配置文件获取）
function getAvailableThemes() {
    // 假设从父窗口或全局对象获取主题列表
    const themes = window.parent?.availableThemes || [
        'default-day',
        'rustic-day',
        'default-night',
        'moonlit-night'
    ];
    return themes;
}

function getAvailableBackgrounds() {
    // 假设从父窗口或全局对象获取背景列表
    const backgrounds = window.parent?.availableBackgrounds || [
        'default-day-bg',
        'tavern-day-bg',
        'default-night-bg',
        'tavern-night-bg'
    ];
    return backgrounds;
}

// 动态填充下拉菜单
function populateSelect(selectElement, options, selectedValue) {
    selectElement.innerHTML = '';
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        if (option === selectedValue) opt.selected = true;
        selectElement.appendChild(opt);
    });
}

// 加载保存的设置
function loadSettings() {
    const savedPanelColor = localStorage.getItem('tavern-panel-color');
    const savedTextColor = localStorage.getItem('tavern-text-color');
    const savedButtonColor = localStorage.getItem('tavern-button-color');
    const savedDayTheme = localStorage.getItem('tavern-day-theme');
    const savedNightTheme = localStorage.getItem('tavern-night-theme');
    const savedDayBg = localStorage.getItem('tavern-day-bg');
    const savedNightBg = localStorage.getItem('tavern-night-bg');
    const savedDayTime = localStorage.getItem('tavern-day-time');
    const savedNightTime = localStorage.getItem('tavern-night-time');
    const savedTheme = localStorage.getItem('tavern-theme') || 'day';

    // 动态填充下拉菜单
    const themes = getAvailableThemes();
    const backgrounds = getAvailableBackgrounds();
    populateSelect(dayThemeSelect, themes, savedDayTheme || themes[0]);
    populateSelect(nightThemeSelect, themes, savedNightTheme || themes[2] || themes[0]);
    populateSelect(dayBgSelect, backgrounds, savedDayBg || backgrounds[0]);
    populateSelect(nightBgSelect, backgrounds, savedNightBg || backgrounds[2] || backgrounds[0]);

    if (savedPanelColor) {
        document.documentElement.style.setProperty('--tavern-blur-tint', savedPanelColor);
        panelColorInput.value = savedPanelColor;
    }
    if (savedTextColor) {
        document.documentElement.style.setProperty('--tavern-body-color', savedTextColor);
        textColorInput.value = savedTextColor;
    }
    if (savedButtonColor) {
        document.documentElement.style.setProperty('--tavern-button-bg', savedButtonColor);
        document.documentElement.style.setProperty('--tavern-button-hover-bg', adjustColor(savedButtonColor, -20));
        buttonColorInput.value = savedButtonColor;
    }
    if (savedDayTime) dayTimeInput.value = savedDayTime;
    if (savedNightTime) nightTimeInput.value = savedNightTime;

    // 初始化主题
    dayNightSwitch.checked = savedTheme === 'night';
    applyTheme(savedTheme);
    updateAutoSwitchStatus();
}

// 调整颜色亮度（用于按钮悬停效果）
function adjustColor(hex, amount) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `#${Math.min(255, Math.max(0, r + amount)).toString(16).padStart(2, '0')}${Math.min(255, Math.max(0, g + amount)).toString(16).padStart(2, '0')}${Math.min(255, Math.max(0, b + amount)).toString(16).padStart(2, '0')}`;
}

// 应用主题
function applyTheme(theme) {
    const isNight = theme === 'night';
    const selectedTheme = isNight ? nightThemeSelect.value : dayThemeSelect.value;
    const selectedBg = isNight ? nightBgSelect.value : dayBgSelect.value;

    // 应用主题（假设主题通过类或外部系统处理）
    document.body.setAttribute('data-theme', theme);

    // 触发主题和背景切换
    setTimeout(() => {
        if (typeof window.parent.triggerSlash === 'function') {
            window.parent.triggerSlash(`/theme ${selectedTheme}`);
            window.parent.triggerSlash(`/bg ${selectedBg}`);
        } else if (typeof triggerSlash === 'function') {
            triggerSlash(`/theme ${selectedTheme}`);
            triggerSlash(`/bg ${selectedBg}`);
        } else {
            console.warn('triggerSlash 函数未找到');
        }
    }, 100);

    // 保存主题
    localStorage.setItem('tavern-theme', theme);
}

// 更新自动切换状态文本
function updateAutoSwitchStatus() {
    const isAutoSwitchEnabled = dayTimeInput.value && nightTimeInput.value;
    autoSwitchStatus.textContent = `自动切换：${isAutoSwitchEnabled ? '开启' : '关闭'}`;
}

// 定时切换逻辑
function setupAutoSwitch() {
    setInterval(() => {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const dayTime = dayTimeInput.value;
        const nightTime = nightTimeInput.value;

        if (dayTime && currentTime === dayTime) {
            dayNightSwitch.checked = false;
            applyTheme('day');
        } else if (nightTime && currentTime === nightTime) {
            dayNightSwitch.checked = true;
            applyTheme('night');
        }
    }, 60000); // 每分钟检查一次
}

// 事件监听
// 面板显示/隐藏
toggleButton.addEventListener('click', () => {
    edgeControls.classList.toggle('collapsed');
});

// 昼夜切换
dayNightSwitch.addEventListener('change', () => {
    applyTheme(dayNightSwitch.checked ? 'night' : 'day');
});

// 设置面板显示/隐藏
settingsButton.addEventListener('click', () => {
    settingsPanel.style.display = 'block';
});
closeSettingsButton.addEventListener('click', () => {
    settingsPanel.style.display = 'none';
});

// 配色选择器
panelColorInput.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--tavern-blur-tint', e.target.value);
    localStorage.setItem('tavern-panel-color', e.target.value);
});
textColorInput.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--tavern-body-color', e.target.value);
    localStorage.setItem('tavern-text-color', e.target.value);
});
buttonColorInput.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--tavern-button-bg', e.target.value);
    document.documentElement.style.setProperty('--tavern-button-hover-bg', adjustColor(e.target.value, -20));
    localStorage.setItem('tavern-button-color', e.target.value);
});

// 主题和背景选择
dayThemeSelect.addEventListener('change', () => {
    localStorage.setItem('tavern-day-theme', dayThemeSelect.value);
    if (!dayNightSwitch.checked) applyTheme('day');
});
nightThemeSelect.addEventListener('change', () => {
    localStorage.setItem('tavern-night-theme', nightThemeSelect.value);
    if (dayNightSwitch.checked) applyTheme('night');
});
dayBgSelect.addEventListener('change', () => {
    localStorage.setItem('tavern-day-bg', dayBgSelect.value);
    if (!dayNightSwitch.checked) applyTheme('day');
});
nightBgSelect.addEventListener('change', () => {
    localStorage.setItem('tavern-night-bg', nightBgSelect.value);
    if (dayNightSwitch.checked) applyTheme('night');
});

// 定时切换设置
dayTimeInput.addEventListener('change', () => {
    localStorage.setItem('tavern-day-time', dayTimeInput.value);
    updateAutoSwitchStatus();
});
nightTimeInput.addEventListener('change', () => {
    localStorage.setItem('tavern-night-time', nightTimeInput.value);
    updateAutoSwitchStatus();
});

// 初始化
loadSettings();
setupAutoSwitch();