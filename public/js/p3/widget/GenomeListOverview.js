define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request',
    './EChart'
    // Note: 'echarts' is a dependency of the base EChart widget.
    // The topojson library is loaded globally and does not need to be in the define block.
], function (
    declare,
    lang,
    request,
    EChart
) {
    return declare([EChart], {


        postCreate: function () {
            this.inherited(arguments);
        },

        updateChart: function (data) {
            if (!this.chart) { return; }

            const option = {
                title: {
                    text: this.title,
                    subtext: 'Data from MAAGE',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    showDelay: 0,
                    transitionDuration: 0.2,
                    formatter: function (params) {
                        return params.seriesName + '<br/>' + params.name + ': ' + params.value;
                    }
                },
                visualMap: {
                    left: 'right',
                    min: 0,
                    max: 1000, // This should be dynamic based on the data in a real implementation
                    inRange: {
                        color: ['#f3f7f5', '#d6e5de', '#b4d0c3', '#98bdac', '#6ea089', '#57856f', '#496f5d']
                    },
                    text: ['High', 'Low'],
                    calculable: true
                },
                series: [
                    {
                        name: 'Surveillance Count',
                        type: 'map',
                        roam: true,
                        map: this.mapName,
                        emphasis: {
                            label: {
                                show: true
                            }
                        },
                        data: data
                    }
                ]
            };

            this.chart.setOption(option, true); // `true` clears the previous options
        }
    });
});
