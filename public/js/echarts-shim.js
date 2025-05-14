// Create shim for ECharts to work with Dojo AMD
if (typeof define === 'function' && define.amd) {
  define("echarts", [], function() { 
    return window.echarts || {}; 
  });
}