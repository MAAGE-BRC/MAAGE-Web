define([], function() {
  // MAAGE ECharts Theme
  var theme = {
    // Color palette
    color: [
      '#3B82F6', // Blue
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#F97316', // Orange
      '#EC4899', // Pink
      '#14B8A6', // Teal
      '#6366F1'  // Indigo
    ],
    
    // Background color
    backgroundColor: 'transparent',
    
    // Text styles
    textStyle: {
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      fontSize: 12,
      color: '#111827'
    },
    
    // Title styles
    title: {
      textStyle: {
        fontSize: 16,
        fontWeight: 600,
        color: '#111827'
      },
      subtextStyle: {
        fontSize: 12,
        color: '#6B7280'
      }
    },
    
    // Legend styles
    legend: {
      textStyle: {
        fontSize: 12,
        color: '#374151'
      },
      itemGap: 15,
      itemWidth: 20,
      itemHeight: 12
    },
    
    // Tooltip styles
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      textStyle: {
        fontSize: 12,
        color: '#111827'
      },
      extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);'
    },
    
    // Axis styles
    categoryAxis: {
      axisLine: {
        show: true,
        lineStyle: {
          color: '#E5E7EB'
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#6B7280',
        fontSize: 11
      },
      splitLine: {
        show: false
      }
    },
    
    valueAxis: {
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#6B7280',
        fontSize: 11
      },
      splitLine: {
        lineStyle: {
          color: '#F3F4F6',
          type: 'dashed'
        }
      }
    },
    
    // Bar series
    bar: {
      itemStyle: {
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.1)'
        }
      }
    },
    
    // Pie series
    pie: {
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        fontSize: 12,
        color: '#374151'
      },
      labelLine: {
        lineStyle: {
          color: '#D1D5DB'
        }
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(0,0,0,0.2)'
        }
      }
    },
    
    // Line series
    line: {
      smooth: true,
      symbolSize: 8,
      lineStyle: {
        width: 3
      },
      emphasis: {
        scale: true
      }
    },
    
    // Grid
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    }
  };
  
  return theme;
});