import { getContext, getApiUrl, extension_settings, saveSettingsDebounced } from "../../extensions.js";
import { eventSource, event_types, getCurrentChatId } from "../../../script.js";

// 插件名称
const extensionName = "tavern-day-night-switch";
// 各种可能的扩展设置路径
const possiblePaths = [
    `/scripts/extensions/third-party/${extensionName}`,
    `./extensions/third-party/${extensionName}`,
    `../extensions/third-party/${extensionName}`,
    `../../extensions/third-party/${extensionName}`,
    `/scripts/extensions/${extensionName}`,
    `./extensions/${extensionName}`,
    `/extensions/third-party/${extensionName}`
];

// 尝试不同的路径并记录日志
async function findWorkingPath() {
    for (const path of possiblePaths) {
        try {
            const response = await fetch(`${path}/style.css`);
            if (response.ok) {
                console.log(`找到有效路径: ${path}`);
                return path;
            }
        } catch (e) {
            console.log(`路径 ${path} 无效`);
        }
    }
    console.error('无法找到有效的扩展路径');
    return possiblePaths[0]; // 默认返回第一个
}

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
    if (typeof saveSettingsDebounced === 'function') {
        saveSettingsDebounced();
    } else {
        console.warn('saveSettingsDebounced 不可用');
    }
    updateEdgeControlsUI();
}

// 切换边缘控制面板
function toggleEdgeControls() {
    console.log('切换边缘控制面板');
    const controls = document.getElementById('tavern-switch-edge-controls');
    if (controls) {
        controls.classList.toggle('collapsed');
        console.log('切换后状态:', controls.classList.contains('collapsed') ? '收起' : '展开');
    } else {
        console.error('找不到边缘控制面板元素');
    }
}

// 切换边缘控制面板的位置
function toggleControlsPosition() {
    console.log('切换边缘控制面板位置');
    const controls = document.getElementById('tavern-switch-edge-controls');
    if (controls) {
        controls.classList.toggle('left-side');
        extension_settings[extensionName].position = controls.classList.contains('left-side') ? 'left' : 'right';
        console.log('新位置:', extension_settings[extensionName].position);
        saveSettings();
    } else {
        console.error('找不到边缘控制面板元素');
    }
}

// 获取当前的主题和背景列表
async function getThemesAndBackgrounds() {
    console.log('获取主题和背景列表');
    try {
        // 获取主题列表
        console.log('尝试获取主题列表');
        const themesResponse = await fetch('/api/themes/get');
        if (!themesResponse.ok) {
            throw new Error(`获取主题失败: ${themesResponse.status}`);
        }
        const themes = await themesResponse.json();
        console.log(`获取到 ${themes.length} 个主题`);
        
        // 获取背景列表
        console.log('尝试获取背景列表');
        const backgroundsResponse = await fetch('/api/backgrounds/all');
        if (!backgroundsResponse.ok) {
            throw new Error(`获取背景失败: ${backgroundsResponse.status}`);
        }
        const backgrounds = await backgroundsResponse.json();
        console.log(`获取到 ${backgrounds.length} 个背景`);
        
        return { themes, backgrounds };
    } catch (error) {
        console.error('获取主题和背景失败:', error);
        // 返回空列表而不是抛出错误
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
    console.log(`切换到${isDayMode ? '日间' : '夜间'}模式`);
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
    console.log('手动切换日/夜模式');
    // 检查当前是日间还是夜间
    const settings = extension_settings[extensionName];
    const currentTheme = document.getElementById('main_api')?.getAttribute('theme_url') || '';
    
    const isDayModeActive = currentTheme === settings.dayTheme;
    console.log(`当前主题: ${currentTheme}, 日间主题: ${settings.dayTheme}, 当前是日间模式: ${isDayModeActive}`);
    
    // 切换到相反的模式
    switchDayNightMode(!isDayModeActive);
}

// 根据当前时间自动切换主题
function checkAndSwitchByTime() {
    console.log('检查时间并自动切换主题');
    const settings = extension_settings[extensionName];
    
    if (!settings.autoSwitch) {
        console.log('自动切换已禁用，跳过');
        return;
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    console.log(`当前时间: ${currentHour}点, 日间时段: ${settings.dayStart}-${settings.dayEnd}点`);
    
    // 检查当前时间是否在白天范围内
    const isDayTime = currentHour >= settings.dayStart && currentHour < settings.dayEnd;
    console.log(`当前${isDayTime ? '是' : '不是'}白天时段`);
    
    // 应用相应的主题和背景
    switchDayNightMode(isDayTime);
}

// 更新边缘控制面板UI
function updateEdgeControlsUI(isDayMode = null) {
    console.log('更新边缘控制面板UI');
    const settings = extension_settings[extensionName];
    const toggleSwitch = document.getElementById('tavern-auto-switch-toggle');
    const autoSwitchStatus = document.getElementById('tavern-auto-switch-status');
    const dayNightIcon = document.getElementById('tavern-day-night-icon');
    
    if (toggleSwitch) {
        toggleSwitch.checked = settings.autoSwitch;
        console.log(`设置自动切换开关状态: ${settings.autoSwitch}`);
    } else {
        console.warn('找不到自动切换开关元素');
    }
    
    if (autoSwitchStatus) {
        autoSwitchStatus.textContent = settings.autoSwitch ? '开启' : '关闭';
        console.log(`设置自动切换状态文本: ${settings.autoSwitch ? '开启' : '关闭'}`);
    } else {
        console.warn('找不到自动切换状态元素');
    }
    
    // 如果没有指定日/夜模式，则尝试检测当前的主题
    if (isDayMode === null) {
        const currentTheme = document.getElementById('main_api')?.getAttribute('theme_url') || '';
        isDayMode = currentTheme === settings.dayTheme;
        console.log(`检测当前模式: ${isDayMode ? '日间' : '夜间'} (主题: ${currentTheme})`);
    }
    
    if (dayNightIcon) {
        console.log(`更新日/夜图标为: ${isDayMode ? '日间' : '夜间'}模式`);
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
    } else {
        console.warn('找不到日/夜图标元素');
    }
}

// 初始化边缘控制面板
function initEdgeControls() {
    console.log('初始化边缘控制面板');
    
    // 检查是否已存在
    const existingControls = document.getElementById('tavern-switch-edge-controls');
    if (existingControls) {
        console.log('边缘控制面板已存在，移除旧面板');
        existingControls.remove();
    }
    
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
        const settingsTab = document.querySelector('#extensions_settings');
        if (settingsTab) {
            settingsTab.click();
            console.log('已点击设置标签');
        } else {
            console.error('找不到设置标签');
        }
        
        // 打开本扩展的设置
        setTimeout(() => {
            const settingsToggle = document.querySelector(`.inline-drawer-toggle[data-name="${extensionName}"]`);
            if (settingsToggle && !settingsToggle.classList.contains('open')) {
                settingsToggle.click();
                console.log('已点击本扩展的设置');
            } else {
                console.warn('找不到本扩展的设置或已经打开');
            }
        }, 500);
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
    console.log('边缘控制面板已添加到DOM');
    
    // 检查面板是否可见
    setTimeout(() => {
        const panel = document.getElementById('tavern-switch-edge-controls');
        if (panel) {
            const styles = window.getComputedStyle(panel);
            console.log('边缘控制面板可见性检查:', {
                display: styles.display,
                visibility: styles.visibility,
                opacity: styles.opacity,
                position: styles.position,
                right: styles.right,
                zIndex: styles.zIndex
            });
        } else {
            console.error('无法找到刚创建的边缘控制面板');
        }
    }, 500);
    
    // 更新UI显示
    updateEdgeControlsUI();
}

// 直接添加内联CSS到页面
function addInlineCSS() {
    console.log('添加内联CSS');
    const style = document.createElement('style');
    style.textContent = `
    /* 通用变量 */
    :root {
        --tavern-theme-blur-tint: rgba(22, 11, 18, 0.73);
        --tavern-theme-body-color: rgba(220, 220, 210, 1);
        --tavern-theme-border-color: rgba(217, 90, 157, 0.5);
        --tavern-theme-button-bg: rgba(74, 74, 74, 0.5);
        --tavern-theme-button-hover-bg: rgba(90, 90, 90, 0.7);
        --tavern-theme-blur-strength: 6px;
    }

    /* 边缘控制面板样式 */
    .tavern-switch-edge-controls {
        position: fixed;
        right: 0;
        top: 20vh;
        transition: all 0.3s ease-in-out;
        background-color: var(--tavern-theme-blur-tint);
        border: 1px solid var(--tavern-theme-border-color);
        border-radius: 10px 0 0 10px;
        padding: 10px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 120px;
        color: var(--tavern-theme-body-color);
        backdrop-filter: blur(var(--tavern-theme-blur-strength));
        transform: translateX(0);
    }

    .tavern-switch-edge-controls.left-side {
        right: auto;
        left: 0;
        border-radius: 0 10px 10px 0;
    }

    .tavern-switch-edge-controls.collapsed {
        transform: translateX(100%);
    }

    .tavern-switch-edge-controls.left-side.collapsed {
        transform: translateX(-100%);
    }

    .tavern-switch-edge-controls #toggle-edge-controls {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 60px;
        background-color: var(--tavern-theme-blur-tint);
        color: var(--tavern-theme-body-color);
        border: 1px solid var(--tavern-theme-border-color);
        cursor: pointer;
        padding: 5px;
        user-select: none;
        font-size: 12px;
        text-align: center;
        z-index: 1;
        transition: all 0.3s ease-in-out;
    }

    /* 默认（右侧面板）的toggle按钮样式 */
    .tavern-switch-edge-controls:not(.left-side) #toggle-edge-controls {
        left: -20px;
        right: auto;
        border-radius: 5px 0 0 5px;
    }

    /* 左侧面板的toggle按钮样式 */
    .tavern-switch-edge-controls.left-side #toggle-edge-controls {
        left: auto;
        right: -20px;
        border-radius: 0 5px 5px 0;
    }

    /* 确保收起状态下按钮仍然可见 */
    .tavern-switch-edge-controls.collapsed #toggle-edge-controls {
        transform: translateY(-50%);
    }

    /* 开关样式 */
    .tavern-switch-switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 24px;
    }

    .tavern-switch-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .tavern-switch-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(128, 128, 128, 0.3);
        transition: .2s;
        border-radius: 24px;
    }

    .tavern-switch-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: var(--tavern-theme-body-color);
        transition: .2s;
        border-radius: 50%;
    }

    .tavern-switch-switch input:checked + .tavern-switch-slider {
        background-color: var(--tavern-theme-border-color);
    }

    .tavern-switch-switch input:checked + .tavern-switch-slider:before {
        transform: translateX(26px);
    }

    /* 按钮样式 */
    .tavern-switch-button {
        font-size: 14px;
        padding: 5px 10px;
        margin-top: 10px;
        width: 100%;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        background-color: var(--tavern-theme-button-bg);
        color: var(--tavern-theme-body-color);
        border: 1px solid var(--tavern-theme-border-color);
        border-radius: 5px;
        transition: background-color 0.3s, color 0.3s;
    }

    .tavern-switch-button:hover {
        background-color: var(--tavern-theme-button-hover-bg);
    }

    /* 拖拽句柄样式 */
    .tavern-switch-drag-handle {
        width: 100%;
        height: 20px;
        background-color: var(--tavern-theme-border-color);
        cursor: ns-resize;
        margin-bottom: 10px;
        border-radius: 5px 5px 0 0;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .tavern-switch-drag-handle .drag-dots {
        display: flex;
        justify-content: space-between;
        width: 20px;
        height: 15px;
    }

    .tavern-switch-drag-handle .drag-dots > div {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .tavern-switch-drag-handle .drag-dots > div > div {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background-color: var(--tavern-theme-body-color);
    }

    .tavern-switch-drag-handle:hover .drag-dots > div > div {
        background-color: var(--tavern-theme-button-hover-bg);
    }

    /* 内容区域样式 */
    .tavern-switch-content {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    /* 自动切换行样式 */
    .tavern-switch-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        margin: 8px 0;
    }

    /* 日/夜图标样式 */
    .tavern-day-night-icon {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
        transition: all 0.3s ease;
    }

    .tavern-day-night-icon svg {
        width: 30px;
        height: 30px;
        fill: var(--tavern-theme-body-color);
    }

    .tavern-day-night-icon.day-mode svg {
        fill: #FFD700; /* 金色 - 太阳 */
    }

    .tavern-day-night-icon.night-mode svg {
        fill: #C0C0C0; /* 银色 - 月亮 */
    }

    /* 设置页面样式 */
    .tavern-switch-settings {
        margin: 10px 0;
        padding: 0 10px;
    }

    .tavern-settings-section {
        margin-bottom: 20px;
        border-bottom: 1px solid rgba(128, 128, 128, 0.3);
        padding-bottom: 15px;
    }

    .tavern-settings-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
    }

    .tavern-settings-section h4 {
        margin-top: 0;
        margin-bottom: 10px;
        color: var(--tavern-theme-body-color);
    }

    .tavern-settings-row {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
    }

    .tavern-settings-row label {
        flex: 1;
        margin-right: 10px;
    }

    .tavern-settings-row input[type="number"] {
        width: 60px;
        padding: 5px;
        background-color: rgba(0, 0, 0, 0.2);
        border: 1px solid var(--tavern-theme-border-color);
        color: var(--tavern-theme-body-color);
        border-radius: 3px;
    }

    .tavern-select {
        min-width: 150px;
        padding: 5px;
        background-color: rgba(0, 0, 0, 0.2);
        border: 1px solid var(--tavern-theme-border-color);
        color: var(--tavern-theme-body-color);
        border-radius: 3px;
    }

    .tavern-settings-note {
        font-size: 12px;
        color: #888;
        margin-top: 5px;
        margin-bottom: 10px;
    }

    /* 响应式设计 */
    @media (max-width: 1000px) {
        .tavern-switch-edge-controls {
            font-size: 12px;
            min-width: 100px;
        }
        
        .tavern-switch-button {
            font-size: 12px;
            padding: 6px 10px;
        }
        
        .tavern-switch-switch {
            width: 40px;
            height: 22px;
        }
        
        .tavern-switch-slider:before {
            height: 16px;
            width: 16px;
        }
        
        .tavern-switch-switch input:checked + .tavern-switch-slider:before {
            transform: translateX(18px);
        }
    }

    @media (max-width: 768px) {
        .tavern-settings-row {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .tavern-settings-row label {
            margin-bottom: 5px;
        }
        
        .tavern-select {
            width: 100%;
        }
    }
    `;
    document.head.appendChild(style);
    console.log('内联CSS已添加');
}

// 添加内联设置HTML
function addInlineSettingsHTML() {
    console.log('添加内联设置HTML');
    const settingsHTML = `
    <div id="tavern-day-night-switch" class="extension-settings">
      <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header" data-name="tavern-day-night-switch">
          <b>酒馆主题昼夜切换</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
          <div class="tavern-switch-settings">
            <!-- 日间设置 -->
            <div class="tavern-settings-section">
              <h4>日间设置</h4>
              <div class="tavern-settings-row">
                <label for="tavern-day-theme">日间主题:</label>
                <select id="tavern-day-theme" class="tavern-select">
                  <option value="">默认</option>
                  <!-- 主题选项将动态添加 -->
                </select>
              </div>
              <div class="tavern-settings-row">
                <label for="tavern-day-background">日间背景:</label>
                <select id="tavern-day-background" class="tavern-select">
                  <option value="">默认</option>
                  <!-- 背景选项将动态添加 -->
                </select>
              </div>
              <div class="tavern-settings-row">
                <input id="tavern-apply-day" type="button" class="menu_button" value="立即应用日间设置" />
              </div>
            </div>
            
            <!-- 夜间设置 -->
            <div class="tavern-settings-section">
              <h4>夜间设置</h4>
              <div class="tavern-settings-row">
                <label for="tavern-night-theme">夜间主题:</label>
                <select id="tavern-night-theme" class="tavern-select">
                  <option value="">默认</option>
                  <!-- 主题选项将动态添加 -->
                </select>
              </div>
              <div class="tavern-settings-row">
                <label for="tavern-night-background">夜间背景:</label>
                <select id="tavern-night-background" class="tavern-select">
                  <option value="">默认</option>
                  <!-- 背景选项将动态添加 -->
                </select>
              </div>
              <div class="tavern-settings-row">
                <input id="tavern-apply-night" type="button" class="menu_button" value="立即应用夜间设置" />
              </div>
            </div>
            
            <!-- 自动切换设置 -->
            <div class="tavern-settings-section">
              <h4>自动切换设置</h4>
              <div class="tavern-settings-row">
                <label for="tavern-auto-switch">启用自动切换:</label>
                <input type="checkbox" id="tavern-auto-switch" />
              </div>
              <div class="tavern-settings-row">
                <label for="tavern-day-start">日间开始时间 (24小时制):</label>
                <input type="number" id="tavern-day-start" min="0" max="23" value="6" />
              </div>
              <div class="tavern-settings-row">
                <label for="tavern-day-end">日间结束时间 (24小时制):</label>
                <input type="number" id="tavern-day-end" min="0" max="23" value="18" />
              </div>
              <div class="tavern-settings-note">
                注: 当现实时间处于日间开始和结束时间之间时，将自动应用日间设置；否则应用夜间设置。
              </div>
            </div>
            
            <!-- 刷新按钮 -->
            <div class="tavern-settings-section">
              <div class="tavern-settings-row">
                <input id="tavern-refresh-lists" type="button" class="menu_button" value="刷新列表" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;
    
    // 尝试添加到可能的设置容器
    const containers = [
        document.getElementById('extensions_settings2'),
        document.getElementById('extensions_settings'),
        document.querySelector('.extensions_settings'),
        document.querySelector('#settings_pane'),
    ];
    
    let addedToContainer = false;
    for (const container of containers) {
        if (container) {
            $(container).append(settingsHTML);
            console.log('设置HTML已添加到容器:', container.id || container.className);
            addedToContainer = true;
            break;
        }
    }
    
    if (!addedToContainer) {
        console.error('无法找到任何设置容器，将添加到body');
        $('body').append(settingsHTML);
    }
}

// 初始化设置HTML
async function initSettingsHTML() {
    console.log('初始化设置HTML');
    try {
        const { themes, backgrounds } = await getThemesAndBackgrounds();
        const settings = extension_settings[extensionName];
        
        // 更新主题下拉菜单
        const dayThemeSelect = document.getElementById('tavern-day-theme');
        const nightThemeSelect = document.getElementById('tavern-night-theme');
        
        if (dayThemeSelect && nightThemeSelect) {
            console.log('找到主题选择下拉菜单，正在更新选项');
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
            console.log(`已添加 ${themes.length} 个主题选项`);
        } else {
            console.warn('未找到主题选择下拉菜单');
        }
        
        // 更新背景下拉菜单
        const dayBgSelect = document.getElementById('tavern-day-background');
        const nightBgSelect = document.getElementById('tavern-night-background');
        
        if (dayBgSelect && nightBgSelect) {
            console.log('找到背景选择下拉菜单，正在更新选项');
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
            console.log(`已添加 ${backgrounds.length} 个背景选项`);
        } else {
            console.warn('未找到背景选择下拉菜单');
        }
        
        // 设置时间选择器的值
        const dayStartInput = document.getElementById('tavern-day-start');
        const dayEndInput = document.getElementById('tavern-day-end');
        
        if (dayStartInput && dayEndInput) {
            console.log('找到时间输入框，正在设置值');
            dayStartInput.value = settings.dayStart;
            dayEndInput.value = settings.dayEnd;
        } else {
            console.warn('未找到时间输入框');
        }
        
        // 设置自动切换开关
        const autoSwitchCheckbox = document.getElementById('tavern-auto-switch');
        if (autoSwitchCheckbox) {
            console.log('找到自动切换复选框，正在设置值');
            autoSwitchCheckbox.checked = settings.autoSwitch;
        } else {
            console.warn('未找到自动切换复选框');
        }
        
        console.log('设置HTML初始化完成');
    } catch (error) {
        console.error('初始化设置HTML失败:', error);
    }
}

// 绑定设置页面的事件
function bindSettingsEvents() {
    console.log('绑定设置页面事件');
    
    // 主题选择变更
    const dayTheme = document.getElementById('tavern-day-theme');
    if (dayTheme) {
        dayTheme.addEventListener('change', function() {
            console.log(`日间主题变更: ${this.value}`);
            extension_settings[extensionName].dayTheme = this.value;
            saveSettings();
        });
    } else {
        console.warn('未找到日间主题选择元素');
    }
    
    const nightTheme = document.getElementById('tavern-night-theme');
    if (nightTheme) {
        nightTheme.addEventListener('change', function() {
            console.log(`夜间主题变更: ${this.value}`);
            extension_settings[extensionName].nightTheme = this.value;
            saveSettings();
        });
    } else {
        console.warn('未找到夜间主题选择元素');
    }
    
    // 背景选择变更
    const dayBg = document.getElementById('tavern-day-background');
    if (dayBg) {
        dayBg.addEventListener('change', function() {
            console.log(`日间背景变更: ${this.value}`);
            extension_settings[extensionName].dayBackground = this.value;
            saveSettings();
        });
    } else {
        console.warn('未找到日间背景选择元素');
    }
    
    const nightBg = document.getElementById('tavern-night-background');
    if (nightBg) {
        nightBg.addEventListener('change', function() {
            console.log(`夜间背景变更: ${this.value}`);
            extension_settings[extensionName].nightBackground = this.value;
            saveSettings();
        });
    } else {
        console.warn('未找到夜间背景选择元素');
    }
    
    // 时间设置变更
    const dayStart = document.getElementById('tavern-day-start');
    if (dayStart) {
        dayStart.addEventListener('change', function() {
            const value = parseInt(this.value);
            if (!isNaN(value) && value >= 0 && value <= 23) {
                console.log(`日间开始时间变更: ${value}`);
                extension_settings[extensionName].dayStart = value;
                saveSettings();
            } else {
                console.warn(`无效的日间开始时间: ${this.value}`);
                this.value = extension_settings[extensionName].dayStart;
            }
        });
    } else {
        console.warn('未找到日间开始时间输入元素');
    }
    
    const dayEnd = document.getElementById('tavern-day-end');
    if (dayEnd) {
        dayEnd.addEventListener('change', function() {
            const value = parseInt(this.value);
            if (!isNaN(value) && value >= 0 && value <= 23) {
                console.log(`日间结束时间变更: ${value}`);
                extension_settings[extensionName].dayEnd = value;
                saveSettings();
            } else {
                console.warn(`无效的日间结束时间: ${this.value}`);
                this.value = extension_settings[extensionName].dayEnd;
            }
        });
    } else {
        console.warn('未找到日间结束时间输入元素');
    }
    
    // 自动切换开关变更
    const autoSwitch = document.getElementById('tavern-auto-switch');
    if (autoSwitch) {
        autoSwitch.addEventListener('change', function() {
            console.log(`自动切换状态变更: ${this.checked}`);
            extension_settings[extensionName].autoSwitch = this.checked;
            saveSettings();
            
            // 如果开启了自动切换，立即执行一次时间检查
            if (this.checked) {
                checkAndSwitchByTime();
            }
        });
    } else {
        console.warn('未找到自动切换开关元素');
    }
    
    // 刷新主题和背景列表按钮
    const refreshLists = document.getElementById('tavern-refresh-lists');
    if (refreshLists) {
        refreshLists.addEventListener('click', async function() {
            console.log('点击刷新列表按钮');
            this.disabled = true;
            this.value = '刷新中...';
            try {
                await initSettingsHTML();
                this.value = '刷新成功';
                setTimeout(() => {
                    this.disabled = false;
                    this.value = '刷新列表';
                }, 1000);
            } catch (error) {
                console.error('刷新列表失败:', error);
                this.value = '刷新失败';
                setTimeout(() => {
                    this.disabled = false;
                    this.value = '刷新列表';
                }, 1000);
            }
        });
    } else {
        console.warn('未找到刷新列表按钮元素');
    }
    
    // 立即应用白天设置
    const applyDay = document.getElementById('tavern-apply-day');
    if (applyDay) {
        applyDay.addEventListener('click', function() {
            console.log('点击立即应用日间设置按钮');
            switchDayNightMode(true);
            this.value = '已应用';
            setTimeout(() => {
                this.value = '立即应用日间设置';
            }, 1000);
        });
    } else {
        console.warn('未找到立即应用日间设置按钮元素');
    }
    
    // 立即应用夜晚设置
    const applyNight = document.getElementById('tavern-apply-night');
    if (applyNight) {
        applyNight.addEventListener('click', function() {
            console.log('点击立即应用夜间设置按钮');
            switchDayNightMode(false);
            this.value = '已应用';
            setTimeout(() => {
                this.value = '立即应用夜间设置';
            }, 1000);
        });
    } else {
        console.warn('未找到立即应用夜间设置按钮元素');
    }
    
    console.log('设置页面事件绑定完成');
}

// 检查CSS是否加载和应用
function checkCssLoading() {
    console.log('检查CSS加载状态');
    
    // 创建测试元素
    const testElement = document.createElement('div');
    testElement.id = 'tavern-css-test-element';
    testElement.classList.add('tavern-switch-edge-controls'); // 使用你的一个主要类
    testElement.style.cssText = 'position:fixed;top:5px;left:5px;width:20px;height:20px;z-index:9999;';
    document.body.appendChild(testElement);
    
    // 检查样式
    setTimeout(() => {
        if (testElement) {
            const styles = window.getComputedStyle(testElement);
            const hasStyles = styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                           styles.borderColor !== 'rgb(0, 0, 0)';
                           
            console.log('CSS测试元素样式:', {
                backgroundColor: styles.backgroundColor,
                borderColor: styles.borderColor,
                cssLoaded: hasStyles
            });
            
            // 如果没有样式，强制使用内联CSS
            if (!hasStyles) {
                console.warn('CSS似乎未被正确加载，应用内联样式');
                addInlineCSS();
            }
            
            // 删除测试元素
            testElement.remove();
        }
    }, 1000);
}

// 在 SillyTavern 中注册扩展
jQuery(async () => {
    console.log('酒馆主题昼夜切换插件正在加载...');
    
    // 找到有效的扩展路径
    const extensionPath = await findWorkingPath();
    console.log('使用扩展路径:', extensionPath);
    
    try {
        // 加载 CSS
        console.log('尝试加载CSS文件');
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.type = 'text/css';
        cssLink.href = `${extensionPath}/style.css`;
        cssLink.onload = () => console.log('CSS文件加载成功');
        cssLink.onerror = (e) => {
            console.error('CSS文件加载失败:', e);
            console.log('将应用内联CSS');
            addInlineCSS();
        };
        document.head.appendChild(cssLink);
        
        // 检查CSS是否正确加载
        setTimeout(checkCssLoading, 2000);
        
        try {
            // 尝试加载设置 HTML
            console.log('尝试加载设置HTML文件');
            const response = await fetch(`${extensionPath}/settings.html`);
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            const settingsHtml = await response.text();
            console.log('设置HTML加载成功');
            
            // 查找合适的设置容器
            const containers = ['#extensions_settings2', '#extensions_settings', '.extensions_settings'];
            let addedToContainer = false;
            
            for (const selector of containers) {
                const container = document.querySelector(selector);
                if (container) {
                    console.log(`找到设置容器: ${selector}`);
                    $(container).append(settingsHtml);
                    addedToContainer = true;
                    break;
                }
            }
            
            if (!addedToContainer) {
                console.warn('未找到任何设置容器，将直接添加内联HTML');
                addInlineSettingsHTML();
            }
        } catch (htmlError) {
            console.error('加载设置HTML失败:', htmlError);
            console.log('将添加内联设置HTML');
            addInlineSettingsHTML();
        }
        
        // 初始化设置 HTML
        console.log('初始化设置HTML');
        await initSettingsHTML();
        
        // 绑定设置页面的事件
        console.log('绑定设置页面事件');
        bindSettingsEvents();
        
        // 初始化边缘控制面板
        console.log('初始化边缘控制面板');
        initEdgeControls();
        
        // 如果启用了自动切换，开始自动切换
        if (extension_settings[extensionName].autoSwitch) {
            console.log('自动切换已启用，执行初始检查');
            // 首次检查
            checkAndSwitchByTime();
            
            // 设置定时器，每分钟检查一次
            console.log('设置自动切换定时器 (每分钟)');
            setInterval(checkAndSwitchByTime, 60000);
        }
        
        // 监听 ST 页面加载完成事件，防止主题被重置
        console.log('设置文档就绪事件监听器');
        $(document).on('ready', function() {
            console.log('文档已就绪，将延迟检查自动切换');
            // 给页面完全加载一点时间
            setTimeout(() => {
                if (extension_settings[extensionName].autoSwitch) {
                    console.log('页面加载完成后，执行自动切换检查');
                    checkAndSwitchByTime();
                }
            }, 1000);
        });
        
        // 安全措施：稍后再次尝试初始化UI部分，以防首次尝试不成功
        setTimeout(() => {
            console.log('延迟再次尝试初始化UI (安全措施)');
            if (!document.getElementById('tavern-switch-edge-controls')) {
                console.log('未找到边缘控制面板，重新初始化');
                initEdgeControls();
            }
            
            const settingsSection = document.querySelector('.tavern-switch-settings');
            if (!settingsSection) {
                console.log('未找到设置面板，重新添加');
                addInlineSettingsHTML();
                setTimeout(bindSettingsEvents, 500);
            }
        }, 5000);
        
        console.log('酒馆主题昼夜切换插件加载完成');
    } catch (error) {
        console.error('酒馆主题昼夜切换插件加载失败:', error);
    }
});
