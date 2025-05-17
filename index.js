/* 酒馆昼夜切换插件 JavaScript 逻辑 */
const extensionName = "TavernDayNight";
const extensionWebPath = `/scripts/extensions/third-party/${extensionName}`;

jQuery(async () => {
    // 加载 CSS
    $('head').append(`<link rel="stylesheet" type="text/css" href="${extensionWebPath}/index.css">`);

    // 加载边缘控制面板 HTML
    const edgeControlsHtml = `
        <div id="tavern-edge-controls">
            <label class="day-night-switch">
                <input type="checkbox">
                <span class="day-night-slider"></span>
            </label>
            <div class="auto-switch-status">自动切换：关闭</div>
        </div>
    `;
    $('body').append(edgeControlsHtml);

    // 加载设置面板 HTML
    try {
        const settingsHtml = await $.get(`${extensionWebPath}/settings.html`);
        $("#extensions_settings2").append(settingsHtml);
    } catch (error) {
        console.error('加载设置面板失败:', error);
        // 回退到直接插入 body
        const fallbackHtml = await $.get(`${extensionWebPath}/settings.html`);
        $('body').append(fallbackHtml);
    }

    // 初始化面板
    initializePanels();

    function initializePanels() {
        // 获取 DOM 元素
        const edgeControls = document.getElementById('tavern-edge-controls');
        const dayNightSwitch = document.querySelector('.day-night-switch input');
        const autoSwitchStatus = document.querySelector('.auto-switch-status');
        const settingsPanel = document.getElementById('tavern-settings');
        const drawerToggle = settingsPanel.querySelector('.inline-drawer-toggle');
        const drawerContent = settingsPanel.querySelector('.inline-drawer-content');
        const dayThemeSelect = document.querySelector('select[name="day-theme"]');
        const nightThemeSelect = document.querySelector('select[name="night-theme"]');
        const dayBgSelect = document.querySelector('select[name="day-bg"]');
        const nightBgSelect = document.querySelector('select[name="night-bg"]');
        const dayTimeInput = document.querySelector('input[name="day-time"]');
        const nightTimeInput = document.querySelector('input[name="night-time"]');

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
        // 昼夜切换
        dayNightSwitch.addEventListener('change', () => {
            applyTheme(dayNightSwitch.checked ? 'night' : 'day');
        });

        // 设置面板抽屉切换
        drawerToggle.addEventListener('click', () => {
            const isOpen = drawerContent.style.display === 'block';
            drawerContent.style.display = isOpen ? 'none' : 'block';
            drawerToggle.querySelector('.inline-drawer-icon').classList.toggle('down', !isOpen);
            drawerToggle.querySelector('.inline-drawer-icon').classList.toggle('up', isOpen);
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

    console.log("✅ 酒馆昼夜切换插件已加载");
});
