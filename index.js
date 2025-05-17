// 最小测试版 index.js
jQuery(async () => {
    console.log("酒馆主题昼夜切换插件尝试加载");
    
    // 设置一个可见的指示器
    const indicator = document.createElement('div');
    indicator.id = 'tavern-switch-test-indicator';
    indicator.style.cssText = 'position:fixed;top:10px;right:10px;padding:5px;background:red;color:white;z-index:9999;';
    indicator.textContent = '酒馆主题插件已加载';
    document.body.appendChild(indicator);
    
    // 尝试加载CSS
    try {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = '/scripts/extensions/third-party/tavern-day-night-switch/style.css';
        document.head.appendChild(link);
    } catch(e) {
        console.error('CSS加载失败', e);
    }
    
    // 简单的边缘面板
    const panel = document.createElement('div');
    panel.id = 'tavern-simple-panel';
    panel.style.cssText = 'position:fixed;right:0;top:20vh;z-index:9999;background:rgba(0,0,0,0.7);padding:10px;color:white;';
    panel.innerHTML = '<div>酒馆主题切换</div><button id="tavern-test-btn">测试按钮</button>';
    document.body.appendChild(panel);
    
    // 添加按钮点击事件
    document.getElementById('tavern-test-btn').addEventListener('click', () => {
        alert('酒馆主题切换插件测试按钮点击成功');
    });
    
    // 注册扩展设置
    if (!window.extension_settings) window.extension_settings = {};
    window.extension_settings['tavern-day-night-switch'] = {
        enabled: true,
        version: '1.0.0-test'
    };
    
    // 设置全局变量以便于调试
    window.tavernDayNightSwitch = {
        loaded: true,
        testFunction: () => alert('测试函数调用成功')
    };
});
