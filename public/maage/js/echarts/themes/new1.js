// MAAGE ECharts Theme Collection
// Multiple theme variations for different use cases

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['exports', 'echarts'], factory);
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        factory(exports, require('echarts'));
    } else {
        factory({}, root.echarts);
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

    // ========================================================================
    // THEME HELPERS
    // ========================================================================

    const lightThemeBase = {
        backgroundColor: '#ffffff',
        textStyle: {},
        title: {
            textStyle: { color: '#212529' },
            subtextStyle: { color: '#495057' }
        },
        line: {
            itemStyle: { borderWidth: 1 },
            lineStyle: { width: 2 },
            symbolSize: 4,
            symbol: 'emptyCircle',
            smooth: false
        },
        radar: {
            itemStyle: { borderWidth: 1 },
            lineStyle: { width: 2 },
            symbolSize: 4,
            symbol: 'emptyCircle',
            smooth: false
        },
        bar: {
            itemStyle: { barBorderWidth: '0', barBorderColor: '#cccccc' }
        },
        pie: {
            itemStyle: { borderWidth: '0', borderColor: '#cccccc' }
        },
        categoryAxis: {
            axisLine: { show: true, lineStyle: { color: '#6E7079' } },
            axisTick: { show: true, lineStyle: { color: '#6E7079' } },
            axisLabel: { show: true, color: '#6E7079' },
            splitLine: { show: false, lineStyle: { color: ['#E0E6F1'] } }
        },
        valueAxis: {
            axisLine: { show: false, lineStyle: { color: '#6E7079' } },
            axisTick: { show: false, lineStyle: { color: '#6E7079' } },
            axisLabel: { show: true, color: '#6E7079' },
            splitLine: { show: true, lineStyle: { color: ['#E0E6F1'] } }
        },
        legend: {
            textStyle: { color: '#364144' }
        },
        tooltip: {
            backgroundColor: '#ffffff',
            borderColor: '#dee2e6',
            textStyle: { color: '#212529' }
        }
    };

    const darkThemeBase = {
        backgroundColor: '#111828', // gray-cool-900
        textStyle: { color: '#f3f4f6' }, // gray-cool-100
        title: {
            textStyle: { color: '#f9fafb' }, // gray-cool-50
            subtextStyle: { color: '#d0d5dc' } // gray-cool-300
        },
        line: {
            itemStyle: { borderWidth: 1 },
            lineStyle: { width: 2 },
            symbolSize: 4,
            symbol: 'circle',
            smooth: false
        },
        radar: {
            itemStyle: { borderWidth: 1 },
            lineStyle: { width: 2 },
            symbolSize: 4,
            symbol: 'circle',
            smooth: false
        },
        bar: {
            itemStyle: { barBorderWidth: '0', barBorderColor: '#495465' }
        },
        pie: {
            itemStyle: { borderWidth: '0', borderColor: '#495465' }
        },
        categoryAxis: {
            axisLine: { show: true, lineStyle: { color: '#495465' } },
            axisTick: { show: true, lineStyle: { color: '#495465' } },
            axisLabel: { show: true, color: '#9aa3b1' },
            splitLine: { show: false, lineStyle: { color: ['#364153'] } }
        },
        valueAxis: {
            axisLine: { show: false, lineStyle: { color: '#495465' } },
            axisTick: { show: false, lineStyle: { color: '#495465' } },
            axisLabel: { show: true, color: '#9aa3b1' },
            splitLine: { show: true, lineStyle: { color: ['#364153'] } }
        },
        legend: {
            textStyle: { color: '#d0d5dc' }
        },
        tooltip: {
            backgroundColor: '#1e2938', // gray-cool-800
            borderColor: '#495465',
            textStyle: { color: '#f3f4f6' }
        }
    };


    // ========================================================================
    // PRE-EXISTING THEMES (FROM UPLOAD)
    // ========================================================================

    // 1. Dark Mode Theme - Using dark variants and inverted colors
    echarts.registerTheme('maage-dark', {
        "color": [
            "#83a893", // success-dark-700
            "#5899b1", // info-dark-600
            "#bb9d4e", // warning-dark-600
            "#b0aecb", // quaternary-400
            "#c36d6c", // error-dark-600
            "#a0c1cf", // secondary-300
            "#f4e4c2", // tertiary-300
            "#cbc9de", // quaternary-300
            "#e6bebb"  // quinary-300
        ],
        "backgroundColor": "#1e2938", // gray-cool-800
        "textStyle": { "color": "#f3f4f6" },
        "title": {
            "textStyle": { "color": "#f9fafb" },
            "subtextStyle": { "color": "#d0d5dc" }
        },
        "line": { "itemStyle": { "borderWidth": 1 }, "lineStyle": { "width": 2 }, "symbolSize": 4, "symbol": "circle", "smooth": false },
        "radar": { "itemStyle": { "borderWidth": 1 }, "lineStyle": { "width": 2 }, "symbolSize": 4, "symbol": "circle", "smooth": false },
        "bar": { "itemStyle": { "barBorderWidth": "0", "barBorderColor": "#495465" } },
        "pie": { "itemStyle": { "borderWidth": "0", "borderColor": "#495465" } },
        "categoryAxis": { "axisLine": { "show": true, "lineStyle": { "color": "#495465" } }, "axisTick": { "show": true, "lineStyle": { "color": "#495465" } }, "axisLabel": { "show": true, "color": "#9aa3b1" }, "splitLine": { "show": false, "lineStyle": { "color": ["#364153"] } } },
        "valueAxis": { "axisLine": { "show": false, "lineStyle": { "color": "#495465" } }, "axisTick": { "show": false, "lineStyle": { "color": "#495465" } }, "axisLabel": { "show": true, "color": "#9aa3b1" }, "splitLine": { "show": true, "lineStyle": { "color": ["#364153"] } } },
        "legend": { "textStyle": { "color": "#d0d5dc" } },
        "tooltip": { "backgroundColor": "#111828", "borderColor": "#495465", "textStyle": { "color": "#f3f4f6" } }
    });

    // 2. Semantic Theme - Using success/warning/error/info colors
    echarts.registerTheme('maage-semantic', {
        "color": ["#578e6f", "#4889a8", "#d29b2d", "#bb4448", "#98bdac", "#5f94ab", "#e7c788", "#9a96bb", "#c56e6e"],
        "backgroundColor": "#ffffff", "textStyle": {},
        "title": { "textStyle": { "color": "#212529" }, "subtextStyle": { "color": "#495057" } },
        "line": { "itemStyle": { "borderWidth": 1 }, "lineStyle": { "width": 2 }, "symbolSize": 4, "symbol": "emptyCircle", "smooth": false },
        "categoryAxis": { "axisLine": { "show": true, "lineStyle": { "color": "#6E7079" } }, "axisTick": { "show": true, "lineStyle": { "color": "#6E7079" } }, "axisLabel": { "show": true, "color": "#6E7079" }, "splitLine": { "show": false, "lineStyle": { "color": ["#E0E6F1"] } } },
        "valueAxis": { "axisLine": { "show": false, "lineStyle": { "color": "#6E7079" } }, "axisTick": { "show": false, "lineStyle": { "color": "#6E7079" } }, "axisLabel": { "show": true, "color": "#6E7079" }, "splitLine": { "show": true, "lineStyle": { "color": ["#E0E6F1"] } } },
        "legend": { "textStyle": { "color": "#364144" } }
    });

    // ... other pre-existing themes from the file ...

    // ========================================================================
    // MONOCHROMATIC THEMES
    // ========================================================================

    // Primary (Light)
    echarts.registerTheme('maage-mono-primary', { ...lightThemeBase, color: ['#324d41', '#3c5d4e', '#496f5d', '#57856f', '#6ea089', '#98bdac', '#b4d0c3', '#d6e5de'] });
    // Primary (Dark)
    echarts.registerTheme('maage-mono-primary-dark', { ...darkThemeBase, color: ['#d6e5de', '#b4d0c3', '#98bdac', '#6ea089', '#57856f', '#496f5d', '#3c5d4e', '#324d41'] });

    // Secondary (Light)
    echarts.registerTheme('maage-mono-secondary', { ...lightThemeBase, color: ['#2e4a56', '#365663', '#406777', '#467386', '#5f94ab', '#87afc0', '#a0c1cf', '#c1d8e1'] });
    // Secondary (Dark)
    echarts.registerTheme('maage-mono-secondary-dark', { ...darkThemeBase, color: ['#c1d8e1', '#a0c1cf', '#87afc0', '#5f94ab', '#467386', '#406777', '#365663', '#2e4a56'] });

    // Tertiary (Light)
    echarts.registerTheme('maage-mono-tertiary', { ...lightThemeBase, color: ['#946729', '#bb8335', '#d29c4b', '#dab46c', '#e7c788', '#edd5a6', '#f4e4c2', '#f8edd8'] });
    // Tertiary (Dark)
    echarts.registerTheme('maage-mono-tertiary-dark', { ...darkThemeBase, color: ['#f8edd8', '#f4e4c2', '#edd5a6', '#e7c788', '#dab46c', '#d29c4b', '#bb8335', '#946729'] });

    // Quaternary (Light)
    echarts.registerTheme('maage-mono-quaternary', { ...lightThemeBase, color: ['#48435b', '#585171', '#6c638c', '#847ba7', '#9a96bb', '#b0aecb', '#cbc9de', '#dfdfec'] });
    // Quaternary (Dark)
    echarts.registerTheme('maage-mono-quaternary-dark', { ...darkThemeBase, color: ['#dfdfec', '#cbc9de', '#b0aecb', '#9a96bb', '#847ba7', '#6c638c', '#585171', '#48435b'] });

    // Quinary (Light)
    echarts.registerTheme('maage-mono-quinary', { ...lightThemeBase, color: ['#6c323a', '#7b363d', '#923e44', '#ab4e52', '#c56e6e', '#d79895', '#e6bebb', '#f1dbda'] });
    // Quinary (Dark)
    echarts.registerTheme('maage-mono-quinary-dark', { ...darkThemeBase, color: ['#f1dbda', '#e6bebb', '#d79895', '#c56e6e', '#ab4e52', '#923e44', '#7b363d', '#6c323a'] });


    // ========================================================================
    // GRADIENT THEMES
    // ========================================================================

    // Primary -> Secondary (Light)
    echarts.registerTheme('maage-gradient-p-s', { ...lightThemeBase, color: ['#57856f', '#6ea089', '#98bdac', '#b4d0c3', '#a0c1cf', '#87afc0', '#5f94ab', '#467386'] });
    // Primary -> Secondary (Dark)
    echarts.registerTheme('maage-gradient-p-s-dark', { ...darkThemeBase, color: ['#b4d0c3', '#98bdac', '#6ea089', '#57856f', '#467386', '#5f94ab', '#87afc0', '#a0c1cf'] });

    // Primary -> Tertiary (Light)
    echarts.registerTheme('maage-gradient-p-t', { ...lightThemeBase, color: ['#57856f', '#6ea089', '#98bdac', '#b4d0c3', '#f4e4c2', '#edd5a6', '#e7c788', '#dab46c'] });
    // Primary -> Tertiary (Dark)
    echarts.registerTheme('maage-gradient-p-t-dark', { ...darkThemeBase, color: ['#b4d0c3', '#98bdac', '#6ea089', '#57856f', '#dab46c', '#e7c788', '#edd5a6', '#f4e4c2'] });

    // Secondary -> Tertiary (Light)
    echarts.registerTheme('maage-gradient-s-t', { ...lightThemeBase, color: ['#5f94ab', '#87afc0', '#a0c1cf', '#c1d8e1', '#f4e4c2', '#edd5a6', '#e7c788', '#dab46c'] });
    // Secondary -> Tertiary (Dark)
    echarts.registerTheme('maage-gradient-s-t-dark', { ...darkThemeBase, color: ['#c1d8e1', '#a0c1cf', '#87afc0', '#5f94ab', '#dab46c', '#e7c788', '#edd5a6', '#f4e4c2'] });

    // Tertiary -> Quinary (Light)
    echarts.registerTheme('maage-gradient-t-qn', { ...lightThemeBase, color: ['#dab46c', '#e7c788', '#edd5a6', '#f4e4c2', '#e6bebb', '#d79895', '#c56e6e', '#ab4e52'] });
    // Tertiary -> Quinary (Dark)
    echarts.registerTheme('maage-gradient-t-qn-dark', { ...darkThemeBase, color: ['#f4e4c2', '#edd5a6', '#e7c788', '#dab46c', '#ab4e52', '#c56e6e', '#d79895', '#e6bebb'] });

    // Secondary -> Quinary (Light)
    echarts.registerTheme('maage-gradient-s-qn', { ...lightThemeBase, color: ['#5f94ab', '#87afc0', '#a0c1cf', '#c1d8e1', '#e6bebb', '#d79895', '#c56e6e', '#ab4e52'] });
    // Secondary -> Quinary (Dark)
    echarts.registerTheme('maage-gradient-s-qn-dark', { ...darkThemeBase, color: ['#c1d8e1', '#a0c1cf', '#87afc0', '#5f94ab', '#ab4e52', '#c56e6e', '#d79895', '#e6bebb'] });
    
    // Primary -> Tertiary -> Quinary (Light)
    echarts.registerTheme('maage-gradient-p-t-qn', { ...lightThemeBase, color: ['#6ea089', '#98bdac', '#b4d0c3', '#e7c788', '#edd5a6', '#f4e4c2', '#d79895', '#c56e6e', '#ab4e52'] });
    // Primary -> Tertiary -> Quinary (Dark)
    echarts.registerTheme('maage-gradient-p-t-qn-dark', { ...darkThemeBase, color: ['#b4d0c3', '#98bdac', '#6ea089', '#f4e4c2', '#edd5a6', '#e7c788', '#ab4e52', '#c56e6e', '#d79895'] });


    // ========================================================================
    // MUTED & DISTINCT THEMES
    // ========================================================================
    
    // Muted (Light)
    echarts.registerTheme('maage-muted', {
        ...lightThemeBase,
        color: [
            '#98bdac', '#a0c1cf', '#edd5a6', '#b0aecb', '#d79895', '#9aa3b1', 
            '#b2b1a9', '#afc9b8', '#e6c76c', '#da8180', '#a0c5d5', '#d6e5de', 
            '#c1d8e1', '#f4e4c2', '#cbc9de', '#e6bebb', '#d0d5dc', '#ccccc7', 
            '#cfe0d4', '#efdea1', '#f3d3d2', '#c6dee7'
        ]
    });

    // Muted (Dark)
    echarts.registerTheme('maage-muted-dark', {
        ...darkThemeBase,
        color: [
            '#83a893', '#85b9ce', '#d5b974', '#b0aecb', '#d89995', '#9aa3b1',
            '#b2b1a9', '#a8c3b0', '#bb9d4e', '#c36d6c', '#5899b1', '#5e8d75',
            '#b4d7e6', '#e9d5a3', '#cbc9de', '#ebc6c3', '#d0d5dc', '#9a988e',
            '#cfe0d4', '#f6f0d0', '#f8e9e7', '#a0c1cf'
        ]
    });


    // ========================================================================
    // EXPORTS
    // ========================================================================

    // Export theme names for easy reference
    exports.maageThemes = [
        // Original themes
        'maage-dark',
        'maage-semantic',
        'maage-monochrome-cool',
        'maage-high-contrast',
        'maage-warm',
        'maage-cool',
        // Monochromatic
        'maage-mono-primary',
        'maage-mono-primary-dark',
        'maage-mono-secondary',
        'maage-mono-secondary-dark',
        'maage-mono-tertiary',
        'maage-mono-tertiary-dark',
        'maage-mono-quaternary',
        'maage-mono-quaternary-dark',
        'maage-mono-quinary',
        'maage-mono-quinary-dark',
        // Gradients
        'maage-gradient-p-s',
        'maage-gradient-p-s-dark',
        'maage-gradient-p-t',
        'mage-gradient-p-t-dark',
        'maage-gradient-s-t',
        'maage-gradient-s-t-dark',
        'maage-gradient-t-qn',
        'maage-gradient-t-qn-dark',
        'maage-gradient-s-qn',
        'maage-gradient-s-qn-dark',
        'maage-gradient-p-t-qn',
        'maage-gradient-p-t-qn-dark',
        // Muted
        'maage-muted',
        'maage-muted-dark',
    ];
}));
