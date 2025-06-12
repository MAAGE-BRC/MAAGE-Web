// AMD wrapper for Apache ECharts
// This module provides access to the globally loaded ECharts library

define([], function() {
  // Return the globally loaded echarts
  return window.echarts || null;
});