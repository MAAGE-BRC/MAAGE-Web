// MAAGE ECharts Theme Collection
// Multiple theme variations for different use cases

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'echarts'], factory);
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        // CommonJS
        factory(exports, require('echarts'));
    } else {
        // Browser globals
        factory(root, root.echarts);
    }
}(this, function (exports, echarts) {
    var log = function (msg) {
        if (typeof console !== 'undefined') {
            console && console.error && console.error(msg);
        }
    };
    if (!echarts) {
        log('ECharts is not Loaded');
        return;
    }

    const allThemes = {};

    // ========================================================================
    // THEME HELPERS
    // ========================================================================

    const lightThemeBase = {
        backgroundColor: '#ffffff',
        textStyle: {},
        title: { textStyle: { color: '#212529' }, subtextStyle: { color: '#495057' } },
        line: { itemStyle: { borderWidth: 1 }, lineStyle: { width: 2 }, symbolSize: 4, symbol: 'emptyCircle', smooth: false },
        radar: { itemStyle: { borderWidth: 1 }, lineStyle: { width: 2 }, symbolSize: 4, symbol: 'emptyCircle', smooth: false },
        bar: { itemStyle: { barBorderWidth: '0', barBorderColor: '#cccccc' } },
        pie: { itemStyle: { borderWidth: '0', borderColor: '#cccccc' } },
        categoryAxis: { axisLine: { show: true, lineStyle: { color: '#6E7079' } }, axisTick: { show: true, lineStyle: { color: '#6E7079' } }, axisLabel: { show: true, color: '#6E7079' }, splitLine: { show: false, lineStyle: { color: ['#E0E6F1'] } } },
        valueAxis: { axisLine: { show: false, lineStyle: { color: '#6E7079' } }, axisTick: { show: false, lineStyle: { color: '#6E7079' } }, axisLabel: { show: true, color: '#6E7079' }, splitLine: { show: true, lineStyle: { color: ['#E0E6F1'] } } },
        legend: { textStyle: { color: '#364144' } },
        tooltip: { backgroundColor: '#ffffff', borderColor: '#dee2e6', textStyle: { color: '#212529' } }
    };

    const darkThemeBase = {
        backgroundColor: '#111828',
        textStyle: { color: '#f3f4f6' },
        title: { textStyle: { color: '#f9fafb' }, subtextStyle: { color: '#d0d5dc' } },
        line: { itemStyle: { borderWidth: 1 }, lineStyle: { width: 2 }, symbolSize: 4, symbol: 'circle', smooth: false },
        radar: { itemStyle: { borderWidth: 1 }, lineStyle: { width: 2 }, symbolSize: 4, symbol: 'circle', smooth: false },
        bar: { itemStyle: { barBorderWidth: '0', barBorderColor: '#495465' } },
        pie: { itemStyle: { borderWidth: '0', borderColor: '#495465' } },
        categoryAxis: { axisLine: { show: true, lineStyle: { color: '#495465' } }, axisTick: { show: true, lineStyle: { color: '#495465' } }, axisLabel: { show: true, color: '#9aa3b1' }, splitLine: { show: false, lineStyle: { color: ['#364153'] } } },
        valueAxis: { axisLine: { show: false, lineStyle: { color: '#495465' } }, axisTick: { show: false, lineStyle: { color: '#495465' } }, axisLabel: { show: true, color: '#9aa3b1' }, splitLine: { show: true, lineStyle: { color: ['#364153'] } } },
        legend: { textStyle: { color: '#d0d5dc' } },
        tooltip: { backgroundColor: '#1e2938', borderColor: '#495465', textStyle: { color: '#f3f4f6' } }
    };

    // ========================================================================
    // THEME DEFINITIONS
    // ========================================================================

    // PRE-EXISTING THEMES
    allThemes['maage-dark'] = { ...darkThemeBase, color: ["#83a893", "#5899b1", "#bb9d4e", "#b0aecb", "#c36d6c", "#a0c1cf", "#f4e4c2", "#cbc9de", "#e6bebb"], backgroundColor: "#1e2938" };
    allThemes['maage-semantic'] = { ...lightThemeBase, color: ["#578e6f", "#4889a8", "#d29b2d", "#bb4448", "#98bdac", "#5f94ab", "#e7c788", "#9a96bb", "#c56e6e"] };
    allThemes['maage-monochrome-cool'] = { ...lightThemeBase, color: ["#495465", "#687182", "#9aa3b1", "#d0d5dc", "#364153", "#1e2938", "#495465", "#687182", "#9aa3b1"], backgroundColor: '#f9fafb' };
    allThemes['maage-high-contrast'] = { ...lightThemeBase, color: ["#1e2938", "#bb4448", "#d29b2d", "#4889a8", "#578e6f", "#6c638c", "#923e44", "#406777", "#496f5d"], backgroundColor: '#ffffff'};
    allThemes['maage-warm'] = { ...lightThemeBase, color: ["#e7c788", "#c56e6e", "#d29b2d", "#edd5a6", "#d79895", "#e6c76c", "#f4e4c2", "#e6bebb", "#dbac3b"], backgroundColor: '#fdfaf2' };
    allThemes['maage-cool'] = { ...lightThemeBase, color: ["#5f94ab", "#98bdac", "#4889a8", "#87afc0", "#b4d0c3", "#609ab4", "#a0c1cf", "#6ea089", "#a0c5d5"], backgroundColor: '#f4f8fa' };
    
    // MONOCHROMATIC THEMES
    allThemes['maage-mono-primary'] = { ...lightThemeBase, color: ['#324d41', '#3c5d4e', '#496f5d', '#57856f', '#6ea089', '#98bdac', '#b4d0c3', '#d6e5de'] };
    allThemes['maage-mono-primary-dark'] = { ...darkThemeBase, color: ['#d6e5de', '#b4d0c3', '#98bdac', '#6ea089', '#57856f', '#496f5d', '#3c5d4e', '#324d41'] };
    allThemes['maage-mono-secondary'] = { ...lightThemeBase, color: ['#2e4a56', '#365663', '#406777', '#467386', '#5f94ab', '#87afc0', '#a0c1cf', '#c1d8e1'] };
    allThemes['maage-mono-secondary-dark'] = { ...darkThemeBase, color: ['#c1d8e1', '#a0c1cf', '#87afc0', '#5f94ab', '#467386', '#406777', '#365663', '#2e4a56'] };
    allThemes['maage-mono-tertiary'] = { ...lightThemeBase, color: ['#946729', '#bb8335', '#d29c4b', '#dab46c', '#e7c788', '#edd5a6', '#f4e4c2', '#f8edd8'] };
    allThemes['maage-mono-tertiary-dark'] = { ...darkThemeBase, color: ['#f8edd8', '#f4e4c2', '#edd5a6', '#e7c788', '#dab46c', '#d29c4b', '#bb8335', '#946729'] };
    allThemes['maage-mono-quaternary'] = { ...lightThemeBase, color: ['#48435b', '#585171', '#6c638c', '#847ba7', '#9a96bb', '#b0aecb', '#cbc9de', '#dfdfec'] };
    allThemes['maage-mono-quaternary-dark'] = { ...darkThemeBase, color: ['#dfdfec', '#cbc9de', '#b0aecb', '#9a96bb', '#847ba7', '#6c638c', '#585171', '#48435b'] };
    allThemes['maage-mono-quinary'] = { ...lightThemeBase, color: ['#6c323a', '#7b363d', '#923e44', '#ab4e52', '#c56e6e', '#d79895', '#e6bebb', '#f1dbda'] };
    allThemes['maage-mono-quinary-dark'] = { ...darkThemeBase, color: ['#f1dbda', '#e6bebb', '#d79895', '#c56e6e', '#ab4e52', '#923e44', '#7b363d', '#6c323a'] };
    
    // GRADIENT THEMES
    allThemes['maage-gradient-p-s'] = { ...lightThemeBase, color: ['#57856f', '#6ea089', '#98bdac', '#b4d0c3', '#a0c1cf', '#87afc0', '#5f94ab', '#467386'] };
    allThemes['maage-gradient-p-s-dark'] = { ...darkThemeBase, color: ['#b4d0c3', '#98bdac', '#6ea089', '#57856f', '#467386', '#5f94ab', '#87afc0', '#a0c1cf'] };
    allThemes['maage-gradient-p-t'] = { ...lightThemeBase, color: ['#57856f', '#6ea089', '#98bdac', '#b4d0c3', '#f4e4c2', '#edd5a6', '#e7c788', '#dab46c'] };
    allThemes['maage-gradient-p-t-dark'] = { ...darkThemeBase, color: ['#b4d0c3', '#98bdac', '#6ea089', '#57856f', '#dab46c', '#e7c788', '#edd5a6', '#f4e4c2'] };
    allThemes['maage-gradient-s-t'] = { ...lightThemeBase, color: ['#5f94ab', '#87afc0', '#a0c1cf', '#c1d8e1', '#f4e4c2', '#edd5a6', '#e7c788', '#dab46c'] };
    allThemes['maage-gradient-s-t-dark'] = { ...darkThemeBase, color: ['#c1d8e1', '#a0c1cf', '#87afc0', '#5f94ab', '#dab46c', '#e7c788', '#edd5a6', '#f4e4c2'] };
    allThemes['maage-gradient-t-qn'] = { ...lightThemeBase, color: ['#dab46c', '#e7c788', '#edd5a6', '#f4e4c2', '#e6bebb', '#d79895', '#c56e6e', '#ab4e52'] };
    allThemes['maage-gradient-t-qn-dark'] = { ...darkThemeBase, color: ['#f4e4c2', '#edd5a6', '#e7c788', '#dab46c', '#ab4e52', '#c56e6e', '#d79895', '#e6bebb'] };
    allThemes['maage-gradient-s-qn'] = { ...lightThemeBase, color: ['#5f94ab', '#87afc0', '#a0c1cf', '#c1d8e1', '#e6bebb', '#d79895', '#c56e6e', '#ab4e52'] };
    allThemes['maage-gradient-s-qn-dark'] = { ...darkThemeBase, color: ['#c1d8e1', '#a0c1cf', '#87afc0', '#5f94ab', '#ab4e52', '#c56e6e', '#d79895', '#e6bebb'] };
    allThemes['maage-gradient-p-t-qn'] = { ...lightThemeBase, color: ['#6ea089', '#98bdac', '#b4d0c3', '#e7c788', '#edd5a6', '#f4e4c2', '#d79895', '#c56e6e', '#ab4e52'] };
    allThemes['maage-gradient-p-t-qn-dark'] = { ...darkThemeBase, color: ['#b4d0c3', '#98bdac', '#6ea089', '#f4e4c2', '#edd5a6', '#e7c788', '#ab4e52', '#c56e6e', '#d79895'] };
    
    // MUTED & DISTINCT THEMES
    allThemes['maage-muted'] = { ...lightThemeBase, color: ['#98bdac', '#a0c1cf', '#edd5a6', '#b0aecb', '#d79895', '#9aa3b1', '#b2b1a9', '#afc9b8', '#e6c76c', '#da8180', '#a0c5d5', '#d6e5de', '#c1d8e1', '#f4e4c2', '#cbc9de', '#e6bebb', '#d0d5dc', '#ccccc7', '#cfe0d4', '#efdea1', '#f3d3d2', '#c6dee7'] };
    allThemes['maage-muted-dark'] = { ...darkThemeBase, color: ['#83a893', '#85b9ce', '#d5b974', '#b0aecb', '#d89995', '#9aa3b1', '#b2b1a9', '#a8c3b0', '#bb9d4e', '#c36d6c', '#5899b1', '#5e8d75', '#b4d7e6', '#e9d5a3', '#cbc9de', '#ebc6c3', '#d0d5dc', '#9a988e', '#cfe0d4', '#f6f0d0', '#f8e9e7', '#a0c1cf'] };

    // ========================================================================
    // REGISTRATION & EXPORTS
    // ========================================================================
    
    // Register all the themes with ECharts
    for (const themeName in allThemes) {
        if (allThemes.hasOwnProperty(themeName)) {
            echarts.registerTheme(themeName, allThemes[themeName]);
        }
    }
    
    // The 'exports' object will be the window object in a browser context,
    // making these variables globally accessible.
    exports.maageThemeObjects = allThemes;
    exports.maageThemes = Object.keys(allThemes);

}));
