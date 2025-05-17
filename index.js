import { getContext, getApiUrl, extension_settings, saveSettingsDebounced } from "../../extensions.js";
import { eventSource, event_types, getCurrentChatId } from "../../../script.js";

// 插件名称
const extensionName = "tavern-day-night-switch";
// 扩展设置路径
const extensionPath = `/scripts/extensions/third-party/${extensionName}`;

// 默认设置
const defaultSettings = {
    enabled: true,
    autoSwitch: false,
    dayStart: 6, // 6:00 AM
    dayEnd: 18,  // 6:00 PM
    dayTheme: "",
    dayBackground: "",
    nightTheme: "",
    nightBackground: "",
    position: "right", // 'right' or 'left'
};

// 确保扩展设置存在
if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = {};
}

// 合并默认设置
Object.assign(extension_settings[extensionName], defaultSettings, extension_settings[extensionName]);

// 保存设置
function saveSettings() {
    saveSettingsDebounced();
    updateEdgeControlsUI();
}

// 切换边缘控制面板
function toggleEdgeControls() {
    const controls = document.getElementById('tavern-switch-edge-controls');
    if (controls) {
        controls.classList.toggle('collapsed');
    }
}

// 切换边缘控制面板的位置
function toggleControlsPosition() {
    const controls = document.getElementById('tavern-switch-edge-controls');
    if (controls) {
        controls.classList.toggle('left-side');
        extension_settings[extensionName].position = controls.classList.contains('left-side') ? 'left' : 'right';
        saveSettings();
    }
}

// 获取当前的主题和背景列表
async function getThemesAndBackgrounds() {
    try {
        // 获取主题列表
        const themesResponse = await fetch('/api/themes/get');
        const themes = await themesResponse.json();
        
        // 获取背景列表
        const backgroundsResponse = await fetch('/api/backgrounds/all');
        const backgrounds = await backgroundsResponse.json();
        
        return { themes, backgrounds };
    } catch (error) {
        console.error('获取主题和背景失败:', error);
        return { themes: [], backgrounds: [] };
    }
}

// 应用主题和背景
function applyThemeAndBackground(theme, background) {
    if (theme) {
        console.log(`切换主题到: ${theme}`);
        if (typeof window.switchTheme === 'function') {
            window.switchTheme(theme);
        } else {
            console.warn('switchTheme函数不可用');
        }
    }
    
    if (background) {
        console.log(`切换背景到: ${background}`);
        if (typeof window.changeMainBG === 'function') {
            window.changeMainBG(background);
        } else {
            console.warn('changeMainBG函数不可用');
        }
    }
}

// 根据白天/黑夜切换主题和背景
function switchDayNightMode(isDayMode) {
    const settings = extension_settings[extensionName];
    
    if (isDayMode) {
        // 应用日间主题和背景
        applyThemeAndBackground(settings.dayTheme, settings.dayBackground);
        // 更新UI显示日间模式
        updateEdgeControlsUI(true);
    } else {
        // 应用夜间主题和背景
        applyThemeAndBackground(settings.nightTheme, settings.nightBackground);
        // 更新UI显示夜间模式
        updateEdgeControlsUI(false);
    }
}

// 手动切换主题
function toggleDayNightMode() {
    // 检查当前是日间还是夜间
    const settings = extension_settings[extensionName];
    const currentTheme = document.getElementById('main_api')?.getAttribute('theme_url') || '';
    
    const isDayModeActive = currentTheme === settings.dayTheme;
    
    // 切换到相反的模式
    switchDayNightMode(!isDayModeActive);
}

// 根据当前时间自动切换主题
function checkAndSwitchByTime() {
    const settings = extension_settings[extensionName];
    
    if (!settings.autoSwitch) return;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // 检查当前时间是否在白天范围内
    const isDayTime = currentHour >= settings.dayStart && currentHour < settings.dayEnd;
    
    // 应用相应的主题和背景
    switchDayNightMode(isDayTime);
}

// 更新边缘控制面板UI
function updateEdgeControlsUI(isDayMode = null) {
    const settings = extension_settings[extensionName];
    const toggleSwitch = document.getElementById('tavern-auto-switch-toggle');
    const autoSwitchStatus = document.getElementById('tavern-auto-switch-status');
    const dayNightIcon = document.getElementById('tavern-day-night-icon');
    
    if (toggleSwitch) {
        toggleSwitch.checked = settings.autoSwitch;
    }
    
    if (autoSwitchStatus) {
        autoSwitchStatus.textContent = settings.autoSwitch ? '开启' : '关闭';
    }
    
    // 如果没有指定日/夜模式，则尝试检测当前的主题
    if (isDayMode === null) {
        const currentTheme = document.getElementById('main_api')?.getAttribute('theme_url') || '';
        isDayMode = currentTheme === settings.dayTheme;
    }
    
    if (dayNightIcon) {
        // 更新图标和样式以反映当前模式
        if (isDayMode) {
            dayNightIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M361.5 1.2c5 2.1 8.6 6.6 9.6 11.9L391 121l107.9 19.8c5.3 1 9.8 4.6 11.9 9.6s1.5 10.7-1.6 15.2L446.9 256l62.3 90.3c3.1 4.5 3.7 10.2 1.6 15.2s-6.6 8.6-11.9 9.6L391 391 371.1 498.9c-1 5.3-4.6 9.8-9.6 11.9s-10.7 1.5-15.2-1.6L256 446.9l-90.3 62.3c-4.5 3.1-10.2 3.7-15.2 1.6s-8.6-6.6-9.6-11.9L121 391 13.1 371.1c-5.3-1-9.8-4.6-11.9-9.6s-1.5-10.7 1.6-15.2L65.1 256 2.8 165.7c-3.1-4.5-3.7-10.2-1.6-15.2s6.6-8.6 11.9-9.6L121 121 140.9 13.1c1-5.3 4.6-9.8 9.6-11.9s10.7-1.5 15.2 1.6L256 65.1 346.3 2.8c4.5-3.1 10.2-3.7 15.2-1.6z"/></svg>';
            dayNightIcon.classList.add('day-mode');
            dayNightIcon.classList.remove('night-mode');
        } else {
            dayNightIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"/></svg>';
            dayNightIcon.classList.add('night-mode');
            dayNightIcon.classList.remove('day-mode');
        }
    }
}

// 初始化边缘控制面板
function initEdgeControls() {
    const edgeControls = document.createElement('div');
    edgeControls.id = 'tavern-switch-edge-controls';
    edgeControls.classList.add('tavern-switch-edge-controls');
    
    // 设置初始位置
    if (extension_settings[extensionName].position === 'left') {
        edgeControls.classList.add('left-side');
    }
    
    // 创建切换按钮
    const toggleButton = document.createElement('div');
    toggleButton.id = 'toggle-edge-controls';
    toggleButton.textContent = '主题切换';
    toggleButton.addEventListener('click', toggleEdgeControls);
    
    // 创建拖拽句柄
    const dragHandle = document.createElement('div');
    dragHandle.id = 'tavern-switch-drag-handle';
    dragHandle.classList.add('tavern-switch-drag-handle');
    dragHandle.innerHTML = `
        <div class="drag-dots">
            <div><div></div><div></div><div></div></div>
            <div><div></div><div></div><div></div></div>
        </div>
    `;
    dragHandle.addEventListener('dblclick', toggleControlsPosition);
    
    // 创建内容
    const content = document.createElement('div');
    content.classList.add('tavern-switch-content');
    
    // 创建日夜切换按钮
    const dayNightButton = document.createElement('button');
    dayNightButton.classList.add('tavern-switch-button');
    dayNightButton.id = 'tavern-day-night-toggle';
    dayNightButton.innerHTML = '切换日/夜';
    dayNightButton.addEventListener('click', toggleDayNightMode);
    
    // 日/夜图标
    const dayNightIcon = document.createElement('div');
    dayNightIcon.id = 'tavern-day-night-icon';
    dayNightIcon.classList.add('tavern-day-night-icon');
    
    // 自动切换开关
    const autoSwitchContainer = document.createElement('div');
    autoSwitchContainer.classList.add('tavern-switch-row');
    
    const autoSwitchLabel = document.createElement('span');
    autoSwitchLabel.textContent = '自动切换：';
    
    const autoSwitchStatus = document.createElement('span');
    autoSwitchStatus.id = 'tavern-auto-switch-status';
    autoSwitchStatus.textContent = extension_settings[extensionName].autoSwitch ? '开启' : '关闭';
    
    const autoSwitchToggle = document.createElement('label');
    autoSwitchToggle.classList.add('tavern-switch-switch');
    
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.id = 'tavern-auto-switch-toggle';
    toggleInput.checked = extension_settings[extensionName].autoSwitch;
    toggleInput.addEventListener('change', () => {
        extension_settings[extensionName].autoSwitch = toggleInput.checked;
        saveSettings();
        // 如果开启了自动切换，立即执行一次时间检查
        if (toggleInput.checked) {
            checkAndSwitchByTime();
        }
    });
    
    const toggleSlider = document.createElement('span');
    toggleSlider.classList.add('tavern-switch-slider');
    
    autoSwitchToggle.appendChild(toggleInput);
    autoSwitchToggle.appendChild(toggleSlider);
    
    // 设置按钮
    const settingsButton = document.createElement('button');
    settingsButton.classList.add('tavern-switch-button');
    settingsButton.innerHTML = '设置';
    settingsButton.addEventListener('click', () => {
        // 打开设置标签
        document.querySelector('#extensions_settings').click();
        // 打开本扩展的设置
        const settingsToggle = document.querySelector(`.inline-drawer-toggle[data-name="${extensionName}"]`);
        if (settingsToggle && !settingsToggle.classList.contains('open')) {
            settingsToggle.click();
        }
    });
    
    // 组装组件
    autoSwitchContainer.appendChild(autoSwitchLabel);
    autoSwitchContainer.appendChild(autoSwitchStatus);
    autoSwitchContainer.appendChild(autoSwitchToggle);
    
    content.appendChild(dayNightIcon);
    content.appendChild(dayNightButton);
    content.appendChild(autoSwitchContainer);
    content.appendChild(settingsButton);
    
    edgeControls.appendChild(toggleButton);
    edgeControls.appendChild(dragHandle);
    edgeControls.appendChild(content);
    
    document.body.appendChild(edgeControls);
    
    // 更新UI显示
    updateEdgeControlsUI();
}

// 初始化设置HTML
async function initSettingsHTML() {
    const { themes, backgrounds } = await getThemesAndBackgrounds();
    
    const settings = extension_settings[extensionName];
    
    // 更新主题下拉菜单
    const dayThemeSelect = document.getElementById('tavern-day-theme');
    const nightThemeSelect = document.getElementById('tavern-night-theme');
    
    if (dayThemeSelect && nightThemeSelect) {
        // 清空现有选项
        dayThemeSelect.innerHTML = '<option value="">默认</option>';
        nightThemeSelect.innerHTML = '<option value="">默认</option>';
        
        // 添加主题选项
        themes.forEach(theme => {
            const themeName = theme.replace('.css', '');
            
            const dayOption = document.createElement('option');
            dayOption.value = theme;
            dayOption.textContent = themeName;
            dayOption.selected = theme === settings.dayTheme;
            dayThemeSelect.appendChild(dayOption);
            
            const nightOption = document.createElement('option');
            nightOption.value = theme;
            nightOption.textContent = themeName;
            nightOption.selected = theme === settings.nightTheme;
            nightThemeSelect.appendChild(nightOption);
        });
    }
    
    // 更新背景下拉菜单
    const dayBgSelect = document.getElementById('tavern-day-background');
    const nightBgSelect = document.getElementById('tavern-night-background');
    
    if (dayBgSelect && nightBgSelect) {
        // 清空现有选项
        dayBgSelect.innerHTML = '<option value="">默认</option>';
        nightBgSelect.innerHTML = '<option value="">默认</option>';
        
        // 添加背景选项
        backgrounds.forEach(bg => {
            const dayOption = document.createElement('option');
            dayOption.value = bg;
            dayOption.textContent = bg;
            dayOption.selected = bg === settings.dayBackground;
            dayBgSelect.appendChild(dayOption);
            
            const nightOption = document.createElement('option');
            nightOption.value = bg;
            nightOption.textContent = bg;
            nightOption.selected = bg === settings.nightBackground;
            nightBgSelect.appendChild(nightOption);
        });
    }
    
    // 设置时间选择器的值
    const dayStartInput = document.getElementById('tavern-day-start');
    const dayEndInput = document.getElementById('tavern-day-end');
    
    if (dayStartInput && dayEndInput) {
        dayStartInput.value = settings.dayStart;
        dayEndInput.value = settings.dayEnd;
    }
    
    // 设置自动切换开关
    const autoSwitchCheckbox = document.getElementById('tavern-auto-switch');
    if (autoSwitchCheckbox) {
        autoSwitchCheckbox.checked = settings.autoSwitch;
    }
}

// 绑定设置页面的事件
function bindSettingsEvents() {
    // 主题选择变更
    document.getElementById('tavern-day-theme')?.addEventListener('change', function() {
        extension_settings[extensionName].dayTheme = this.value;
        saveSettings();
    });
    
    document.getElementById('tavern-night-theme')?.addEventListener('change', function() {
        extension_settings[extensionName].nightTheme = this.value;
        saveSettings();
    });
    
    // 背景选择变更
    document.getElementById('tavern-day-background')?.addEventListener('change', function() {
        extension_settings[extensionName].dayBackground = this.value;
        saveSettings();
    });
    
    document.getElementById('tavern-night-background')?.addEventListener('change', function() {
        extension_settings[extensionName].nightBackground = this.value;
        saveSettings();
    });
    
    // 时间设置变更
    document.getElementById('tavern-day-start')?.addEventListener('change', function() {
        const value = parseInt(this.value);
        if (!isNaN(value) && value >= 0 && value <= 23) {
            extension_settings[extensionName].dayStart = value;
            saveSettings();
        }
    });
    
    document.getElementById('tavern-day-end')?.addEventListener('change', function() {
        const value = parseInt(this.value);
        if (!isNaN(value) && value >= 0 && value <= 23) {
            extension_settings[extensionName].dayEnd = value;
            saveSettings();
        }
    });
    
    // 自动切换开关变更
    document.getElementById('tavern-auto-switch')?.addEventListener('change', function() {
        extension_settings[extensionName].autoSwitch = this.checked;
        saveSettings();
        
        // 如果开启了自动切换，立即执行一次时间检查
        if (this.checked) {
            checkAndSwitchByTime();
        }
    });
    
    // 刷新主题和背景列表按钮
    document.getElementById('tavern-refresh-lists')?.addEventListener('click', async function() {
        this.disabled = true;
        this.value = '刷新中...';
        await initSettingsHTML();
        this.disabled = false;
        this.value = '刷新列表';
    });
    
    // 立即应用白天设置
    document.getElementById('tavern-apply-day')?.addEventListener('click', function() {
        switchDayNightMode(true);
    });
    
    // 立即应用夜晚设置
    document.getElementById('tavern-apply-night')?.addEventListener('click', function() {
        switchDayNightMode(false);
    });
}

// 在 SillyTavern 中注册扩展
jQuery(async () => {
    // 加载 CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.type = 'text/css';
    cssLink.href = `${extensionPath}/style.css`;
    document.head.appendChild(cssLink);
    
    // 加载设置 HTML
    const settingsHtml = await fetch(`${extensionPath}/settings.html`).then(r => r.text());
    
    // 添加设置 HTML 到设置面板
    $('#extensions_settings2').append(settingsHtml);
    
    // 初始化设置 HTML
    await initSettingsHTML();
    
    // 绑定设置页面的事件
    bindSettingsEvents();
    
    // 初始化边缘控制面板
    initEdgeControls();
    
    // 如果启用了自动切换，开始自动切换
    if (extension_settings[extensionName].autoSwitch) {
        // 首次检查
        checkAndSwitchByTime();
        
        // 设置定时器，每分钟检查一次
        setInterval(checkAndSwitchByTime, 60000);
    }
    
    // 监听 ST 页面加载完成事件，防止主题被重置
    $(document).on('ready', function() {
        // 给页面完全加载一点时间
        setTimeout(() => {
            if (extension_settings[extensionName].autoSwitch) {
                checkAndSwitchByTime();
            }
        }, 1000);
    });
    
    console.log(`酒馆主题昼夜切换插件已加载`);
});
