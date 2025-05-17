/* 酒馆昼夜切换插件 JavaScript 逻辑 */

// 动态加载边缘控制面板和设置面板 HTML
function loadPanels() {
    // 边缘控制面板 HTML
    const edgeControlsHtml = `
        <div id="tavern-edge-controls" class="collapsed">
            <button id="toggle-edge-controls">☰</button>
            <label class="day-night-switch">
                <input type="checkbox">
                <span class="day-night-slider"></span>
            </label>
            <div class="auto-switch-status">自动切换：关闭</div>
            <button class="tavern-button">设置</button>
        </div>
    `;

    // 将边缘控制面板添加到 body
    document.body.insertAdjacentHTML('beforeend', edgeControlsHtml);

    // 加载设置面板 HTML（从 settings.html 获取）
    fetch('/settings.html')
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);
            initializePanels();
        })
        .catch(error => {
            console.error('加载设置面板失败:', error);
            // 回退到内联设置面板
            const settingsHtml = `
                <div id="tavern-settings" class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>酒馆主题昼夜切换</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="settings-section">
                            <div class="settings-subtitle">日间主题</div>
                            <select name="day-theme"></select>
                        </div>
                        <div class="settings-section">
                            <div class="settings-subtitle">夜间主题</div>
                            <select name="night-theme"></select>
                        </div>
                        <div class="settings-section">
                            <div class="settings-subtitle">日间背景</div>
                            <select name="day-bg"></select>
                        </div>
                        <div class="settings-section">
                            <div class="settings-subtitle">夜间背景</div>
                            <select name="night-bg"></select>
                        </div>
                        <div class="settings-section">
                            <div class="settings-subtitle">定时切换</div>
                            <label>日间切换时间: <input type="time" name="day-time"></label>
                            <label>夜间切换时间: <input type="time" name="night-time"></label>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', settingsHtml);
            initializePanels();
        });
}

// 初始化面板和事件监听
function initializePanels() {
    // 获取 DOM 元素
    const edgeControls = document.getElementById('tavern-edge-controls');
    const toggleButton = document.getElementById('toggle-edge-controls');
    const dayNightSwitch = document.querySelector('.day-night-switch input');
    const autoSwitchStatus = document.querySelector('.auto-switch-status');
    const settingsButton = document.querySelector('.tavern-button');
    const settingsPanel = document.getElementById('tavern-settings');
    const drawerToggle = settingsPanel.querySelector('.inline-drawer-toggle');
    const drawerContent = settingsPanel.querySelector('.inline-drawer-content');
    const dayThemeSelect = document.querySelector('select[name="day-theme"]');
    const nightThemeSelect = document.querySelector('select[name="night-theme"]');
    const dayBgSelect = document.querySelector('select[name="day-bg"]');
    const nightBgSelect = document.querySelector('select[name="night-bg"]');
    const dayTimeInput = document.querySelector('input[name="day-time"]');
    const nightTimeInput = document.querySelector('input[name="night-time"]');
    
     // 初始化设置面板状态
    drawerContent.style.display = 'none';
    drawerToggle.querySelector('.inline-drawer-icon').classList.add('down');
    drawerToggle.querySelector('.inline-drawer-icon').classList.remove('up');

    // 获取可用主题和背景
    function getAvailableThemes() {
        return window.parent?.availableThemes || [
            'default-day',
            'rustic-day',
            'default-night',
            'moonlit-night'
        ];
    }

    function getAvailableBackgrounds() {
        return window.parent?.availableBackgrounds || [
            'default-day-bg',
            'tavern-day-bg',
            'default-night-bg',
            'tavern-night-bg'
        ];
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
        const savedDayTheme = localStorage.getItem('tavern-day-theme');
        const savedNightTheme = localStorage.getItem('tavern-night-theme');
        const savedDayBg = localStorage.getItem('tavern-day-bg');
        const savedNightBg = localStorage.getItem('tavern-night-bg');
        const savedDayTime = localStorage.getItem('tavern-day-time');
        const savedNightTime = localStorage.getItem('tavern-night-time');
        const savedTheme = localStorage.getItem('tavern-theme') || 'day';

        // 填充下拉菜单
        const themes = getAvailableThemes();
        const backgrounds = getAvailableBackgrounds();
        populateSelect(dayThemeSelect, themes, savedDayTheme || themes[0]);
        populateSelect(nightThemeSelect, themes, savedNightTheme || themes[2] || themes[0]);
        populateSelect(dayBgSelect, backgrounds, savedDayBg || backgrounds[0]);
        populateSelect(nightBgSelect, backgrounds, savedNightBg || backgrounds[2] || backgrounds[0]);

        if (savedDayTime) dayTimeInput.value = savedDayTime;
        if (savedNightTime) nightTimeInput.value = savedNightTime;

        // 初始化主题
        dayNightSwitch.checked = savedTheme === 'night';
        applyTheme(savedTheme);
        updateAutoSwitchStatus();
    }

    // 应用主题
    function applyTheme(theme) {
        const isNight = theme === 'night';
        const selectedTheme = isNight ? nightThemeSelect.value : dayThemeSelect.value;
        const selectedBg = isNight ? nightBgSelect.value : dayBgSelect.value;

        // 设置主题属性
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
    // 边缘面板显示/隐藏
    toggleButton.addEventListener('click', () => {
        edgeControls.classList.toggle('collapsed');
    });

    // 昼夜切换
    dayNightSwitch.addEventListener('change', () => {
        applyTheme(dayNightSwitch.checked ? 'night' : 'day');
    });

    // 设置面板抽屉切换
    drawerToggle.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        const isOpen = drawerContent.style.display === 'block';
        drawerContent.style.display = isOpen ? 'none' : 'block';
        const icon = drawerToggle.querySelector('.inline-drawer-icon');
        icon.classList.toggle('down', !isOpen);
        icon.classList.toggle('up', isOpen);
    });

    // 设置按钮显示设置面板
    settingsButton.addEventListener('click', () => {
        settingsPanel.style.display = 'block';
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
}

// 启动加载
document.addEventListener('DOMContentLoaded', loadPanels);
