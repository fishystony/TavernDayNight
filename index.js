import { extension_settings } from '../../../extensions.js';

const PLUGIN_NAME = 'tavern-day-night-switcher';

// 初始化设置
if (!extension_settings[PLUGIN_NAME]) {
    extension_settings[PLUGIN_NAME] = {
        day_theme: '',
        day_background: '',
        night_theme: '',
        night_background: '',
        day_start: '06:00',
        day_end: '18:00',
        auto_switch: false
    };
}

const settings = extension_settings[PLUGIN_NAME];
let currentMode = null;

// 切换到指定模式
function switchToMode(mode) {
    if (mode === 'day') {
        window.parent.triggerSlash(`/theme ${settings.day_theme}`);
        window.parent.triggerSlash(`/bg ${settings.day_background}`);
        currentMode = 'day';
    } else if (mode === 'night') {
        window.parent.triggerSlash(`/theme ${settings.night_theme}`);
        window.parent.triggerSlash(`/bg ${settings.night_background}`);
        currentMode = 'night';
    }
}

// 判断是否为日间时间
function isDayTime(currentTime, dayStart, dayEnd) {
    const [dsH, dsM] = dayStart.split(':').map(Number);
    const [deH, deM] = dayEnd.split(':').map(Number);
    const [cH, cM] = currentTime.split(':').map(Number);
    const dsMin = dsH * 60 + dsM;
    const deMin = deH * 60 + deM;
    const cMin = cH * 60 + cM;
    if (dsMin < deMin) {
        return cMin >= dsMin && cMin < deMin;
    } else {
        return cMin >= dsMin || cMin < deMin;
    }
}

// 注入边缘控制菜单
const edgeMenu = document.createElement('div');
edgeMenu.id = 'html-injector-edge-controls';
edgeMenu.innerHTML = `
    <div id="toggle-edge-controls">☰</div>
    <div id="html-injector-drag-handle">
        <div class="drag-dots">
            <div><div></div><div></div></div>
            <div><div></div><div></div></div>
        </div>
    </div>
    <button id="switch-day-night" class="html-injector-button">Switch Day/Night</button>
    <div id="auto-switch-text" style="font-size: 12px; margin-top: 10px;">
        Auto Switch: ${settings.auto_switch ? 'On' : 'Off'}
    </div>
`;
document.body.appendChild(edgeMenu);

// 切换边缘菜单显示状态
document.getElementById('toggle-edge-controls').addEventListener('click', () => {
    edgeMenu.classList.toggle('collapsed');
});

// 手动切换日夜模式
document.getElementById('switch-day-night').addEventListener('click', () => {
    switchToMode(currentMode === 'day' ? 'night' : 'day');
});

// 自动切换和状态更新
setInterval(() => {
    if (settings.auto_switch) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const isDay = isDayTime(currentTime, settings.day_start, settings.day_end);
        const expectedMode = isDay ? 'day' : 'night';
        if (currentMode !== expectedMode) {
            switchToMode(expectedMode);
        }
    }
    document.getElementById('auto-switch-text').textContent = `Auto Switch: ${settings.auto_switch ? 'On' : 'Off'}`;
}, 60000);

// 初始化状态文本
document.getElementById('auto-switch-text').textContent = `Auto Switch: ${settings.auto_switch ? 'On' : 'Off'}`;
