import { LitElement, html } from 'lit';
import { extension_settings } from '../../../extensions.js';

// 插件名称
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

// 设置界面自定义元素
class TavernDayNightSettings extends LitElement {
    createRenderRoot() {
        return this;
    }

    render() {
        return html`
            <div class="tavern-day-night-settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>酒馆主题昼夜切换</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="tavern-day-night-block">
                            <div class="settings-item">
                                <label for="day_theme">日间主题:</label>
                                <input type="text" id="day_theme" placeholder="输入日间主题名称">
                            </div>
                            <div class="settings-item">
                                <label for="day_background">日间背景:</label>
                                <input type="text" id="day_background" placeholder="输入日间背景名称">
                            </div>
                            <div class="settings-item">
                                <label for="night_theme">夜间主题:</label>
                                <input type="text" id="night_theme" placeholder="输入夜间主题名称">
                            </div>
                            <div class="settings-item">
                                <label for="night_background">夜间背景:</label>
                                <input type="text" id="night_background" placeholder="输入夜间背景名称">
                            </div>
                            <div class="settings-item">
                                <label for="day_start">日间开始时间:</label>
                                <input type="time" id="day_start" value="06:00">
                            </div>
                            <div class="settings-item">
                                <label for="day_end">日间结束时间:</label>
                                <input type="time" id="day_end" value="18:00">
                            </div>
                            <div class="settings-item">
                                <input type="checkbox" id="auto_switch">
                                <label for="auto_switch">自动切换</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('tavern-day-night-settings', TavernDayNightSettings);

// 边缘控制面板自定义元素
class TavernDayNightEdgeControls extends LitElement {
    createRenderRoot() {
        return this;
    }

    constructor() {
        super();
        this.classList.add('right-side');
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('mousemove', this.handleDragMove.bind(this));
        document.addEventListener('mouseup', this.handleDragEnd.bind(this));
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('mousemove', this.handleDragMove.bind(this));
        document.removeEventListener('mouseup', this.handleDragEnd.bind(this));
    }

    render() {
        const isCollapsed = this.classList.contains('collapsed');
        return html`
            <div id="html-injector-drag-handle" @mousedown=${this.handleDragStart}>
                <div class="drag-dots">
                    ${Array.from({ length: 3 }).map(() => html`
                        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 15px;">
                            ${Array.from({ length: 2 }).map(() => html`
                                <div style="width: 4px; height: 4px; border-radius: 50%; background-color: var(--smart-theme-body-color);"></div>
                            `)}
                        </div>
                    `)}
                </div>
            </div>
            <button id="switch-day-night" class="html-injector-button">Switch Day/Night</button>
            <div id="auto-switch-text" style="font-size: 12px; margin-top: 10px;">
                Auto Switch: ${settings.auto_switch ? 'On' : 'Off'}
            </div>
            <button id="toggle-edge-controls" class="toggle-button" @click=${this.handleToggleEdgeControls}>
                ${isCollapsed ? '<<' : '>>'}
            </button>
        `;
    }

    handleDragStart(e) {
        this.isDragging = true;
        this.startY = e.clientY;
        this.startTop = this.getBoundingClientRect().top;
        e.preventDefault();
    }

    handleDragMove(e) {
        if (!this.isDragging) return;
        let newTop = this.startTop + (e.clientY - this.startY);
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - this.offsetHeight));
        this.style.top = `${newTop}px`;
    }

    handleDragEnd() {
        this.isDragging = false;
    }

    handleToggleEdgeControls() {
        const isCollapsed = this.classList.toggle('collapsed');
        const isLeft = this.classList.contains('left-side');
        if (isLeft) {
            this.style.left = isCollapsed ? '-100px' : '0';
            this.style.right = 'auto';
        } else {
            this.style.right = isCollapsed ? '-100px' : '0';
            this.style.left = 'auto';
        }
        this.requestUpdate();
    }
}

customElements.define('tavern-day-night-edge-controls', TavernDayNightEdgeControls);

// 初始化插件
function initPlugin() {
    // 注入设置界面
    const settingsContainer = document.createElement('tavern-day-night-settings');
    settingsContainer.id = 'tavern-day-night-settings-container';
    settingsContainer.className = 'extension_container';
    const settingsRoot = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (settingsRoot) {
        settingsRoot.appendChild(settingsContainer);
        console.log('[Tavern Day-Night Switcher] Settings UI loaded');
    } else {
        console.error('[Tavern Day-Night Switcher] Settings container not found');
    }

    // 注入边缘控制面板
    const edgeControls = document.createElement('tavern-day-night-edge-controls');
    edgeControls.id = 'html-injector-edge-controls';
    document.body.appendChild(edgeControls);

    // 手动切换事件
    edgeControls.addEventListener('click', (e) => {
        if (e.target.id === 'switch-day-night') {
            switchToMode(currentMode === 'day' ? 'night' : 'day');
        }
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
        const autoSwitchText = edgeControls.querySelector('#auto-switch-text');
        if (autoSwitchText) {
            autoSwitchText.textContent = `Auto Switch: ${settings.auto_switch ? 'On' : 'Off'}`;
        }
    }, 60000);

    // 初始化状态文本
    const autoSwitchText = edgeControls.querySelector('#auto-switch-text');
    if (autoSwitchText) {
        autoSwitchText.textContent = `Auto Switch: ${settings.auto_switch ? 'On' : 'Off'}`;
    }
}

// 执行初始化
jQuery(() => {
    initPlugin();
});
