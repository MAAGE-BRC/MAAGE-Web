(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'echarts'], factory);
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        // CommonJS
        factory(exports, require('echarts'));
    } else {
        // Browser globals
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
    echarts.registerTheme('maage', {
        "color": [
            "#98bdac",
            "#5f94ab",
            "#e7c788",
            "#c56e6e",
            "#9a96bb",
            "#6f8091",
            "#c18b9a",
            "#8b9ba9",
            "#bda48a",
            "#9aa89f",
            '#687182'
        ],
        "backgroundColor": "#f8f9fa",
        "textStyle": {},
        "title": {
            "textStyle": {
                "color": "#212529"
            },
            "subtextStyle": {
                "color": "#495057"
            }
        },
        "line": {
            "itemStyle": {
                "borderWidth": 1
            },
            "lineStyle": {
                "width": 2
            },
            "symbolSize": 4,
            "symbol": "emptyCircle",
            "smooth": false
        },
        "radar": {
            "itemStyle": {
                "borderWidth": 1
            },
            "lineStyle": {
                "width": 2
            },
            "symbolSize": 4,
            "symbol": "emptyCircle",
            "smooth": false
        },
        "bar": {
            "itemStyle": {
                "barBorderWidth": "0",
                "barBorderColor": "#ccc"
            }
        },
        "pie": {
            "itemStyle": {
                "borderWidth": "0",
                "borderColor": "#ccc"
            }
        },
        "scatter": {
            "itemStyle": {
                "borderWidth": "0",
                "borderColor": "#ccc"
            }
        },
        "boxplot": {
            "itemStyle": {
                "borderWidth": "0",
                "borderColor": "#ccc"
            }
        },
        "parallel": {
            "itemStyle": {
                "borderWidth": "0",
                "borderColor": "#ccc"
            }
        },
        "sankey": {
            "itemStyle": {
                "borderWidth": "0",
                "borderColor": "#ccc"
            }
        },
        "funnel": {
            "itemStyle": {
                "borderWidth": "0",
                "borderColor": "#ccc"
            }
        },
        "gauge": {
            "itemStyle": {
                "borderWidth": "0",
                "borderColor": "#ccc"
            }
        },
        "candlestick": {
            "itemStyle": {
                "color": "#eb5454",
                "color0": "#47b262",
                "borderColor": "#eb5454",
                "borderColor0": "#47b262",
                "borderWidth": 1
            }
        },
        "graph": {
            "itemStyle": {
                "borderWidth": "0",
                "borderColor": "#ccc"
            },
            "lineStyle": {
                "width": 1,
                "color": "#aaa"
            },
            "symbolSize": 4,
            "symbol": "emptyCircle",
            "smooth": false,
            "color": [
                "#98bdac",
                "#5f94ab",
                "#e7c788",
                "#d6e5de",
                "#a0c1cf",
                "#f4e4c2",
                "#57856f",
                "#406777",
                "#dab46c"
            ],
            "label": {
                "color": "#eee"
            }
        },
        "map": {
            "itemStyle": {
                "areaColor": "#eee",
                "borderColor": "#444",
                "borderWidth": 0.5
            },
            "label": {
                "color": "#000"
            },
            "emphasis": {
                "itemStyle": {
                    "areaColor": "rgba(255,215,0,0.8)",
                    "borderColor": "#444",
                    "borderWidth": 1
                },
                "label": {
                    "color": "rgb(100,0,0)"
                }
            }
        },
        "geo": {
            "itemStyle": {
                "areaColor": "#eee",
                "borderColor": "#444",
                "borderWidth": 0.5
            },
            "label": {
                "color": "#000"
            },
            "emphasis": {
                "itemStyle": {
                    "areaColor": "rgba(255,215,0,0.8)",
                    "borderColor": "#444",
                    "borderWidth": 1
                },
                "label": {
                    "color": "rgb(100,0,0)"
                }
            }
        },
        "categoryAxis": {
            "axisLine": {
                "show": true,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisTick": {
                "show": true,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisLabel": {
                "show": true,
                "color": "#6E7079"
            },
            "splitLine": {
                "show": false,
                "lineStyle": {
                    "color": [
                        "#E0E6F1"
                    ]
                }
            },
            "splitArea": {
                "show": false,
                "areaStyle": {
                    "color": [
                        "rgba(250,250,250,0.2)",
                        "rgba(210,219,238,0.2)"
                    ]
                }
            }
        },
        "valueAxis": {
            "axisLine": {
                "show": false,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisTick": {
                "show": false,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisLabel": {
                "show": true,
                "color": "#6E7079"
            },
            "splitLine": {
                "show": true,
                "lineStyle": {
                    "color": [
                        "#E0E6F1"
                    ]
                }
            },
            "splitArea": {
                "show": false,
                "areaStyle": {
                    "color": [
                        "rgba(250,250,250,0.2)",
                        "rgba(210,219,238,0.2)"
                    ]
                }
            }
        },
        "logAxis": {
            "axisLine": {
                "show": false,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisTick": {
                "show": false,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisLabel": {
                "show": true,
                "color": "#6E7079"
            },
            "splitLine": {
                "show": true,
                "lineStyle": {
                    "color": [
                        "#E0E6F1"
                    ]
                }
            },
            "splitArea": {
                "show": false,
                "areaStyle": {
                    "color": [
                        "rgba(250,250,250,0.2)",
                        "rgba(210,219,238,0.2)"
                    ]
                }
            }
        },
        "timeAxis": {
            "axisLine": {
                "show": true,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisTick": {
                "show": true,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisLabel": {
                "show": true,
                "color": "#6E7079"
            },
            "splitLine": {
                "show": false,
                "lineStyle": {
                    "color": [
                        "#E0E6F1"
                    ]
                }
            },
            "splitArea": {
                "show": false,
                "areaStyle": {
                    "color": [
                        "rgba(250,250,250,0.2)",
                        "rgba(210,219,238,0.2)"
                    ]
                }
            }
        },
        "toolbox": {
            "iconStyle": {
                "borderColor": "#999"
            },
            "emphasis": {
                "iconStyle": {
                    "borderColor": "#666"
                }
            }
        },
        "legend": {
            "textStyle": {
                "color": "#333"
            }
        },
        "tooltip": {
            "axisPointer": {
                "lineStyle": {
                    "color": "#ccc",
                    "width": 1
                },
                "crossStyle": {
                    "color": "#ccc",
                    "width": 1
                }
            }
        },
        "timeline": {
            "lineStyle": {
                "color": "#DAE1F5",
                "width": 2
            },
            "itemStyle": {
                "color": "#A4B1D7",
                "borderWidth": 1
            },
            "controlStyle": {
                "color": "#A4B1D7",
                "borderColor": "#A4B1D7",
                "borderWidth": 1
            },
            "checkpointStyle": {
                "color": "#316bf3",
                "borderColor": "fff"
            },
            "label": {
                "color": "#A4B1D7"
            },
            "emphasis": {
                "itemStyle": {
                    "color": "#FFF"
                },
                "controlStyle": {
                    "color": "#A4B1D7",
                    "borderColor": "#A4B1D7",
                    "borderWidth": 1
                },
                "label": {
                    "color": "#A4B1D7"
                }
            }
        },
        "visualMap": {
            "color": [
                "#496f5d",
                "#6ea089",
                "#b4d0c3",
                "#ecf3f0",
                "#3c5d4e"
            ]
        },
        "dataZoom": {
            "handleSize": "undefined%",
            "textStyle": {}
        },
        "markPoint": {
            "label": {
                "color": "#eee"
            },
            "emphasis": {
                "label": {
                    "color": "#eee"
                }
            }
        }
    });
}));
