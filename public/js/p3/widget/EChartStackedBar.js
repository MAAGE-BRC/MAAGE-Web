define([
    'dojo/_base/declare',
    './EChart'
], function (
    declare,
    EChart
) {
    return declare([EChart], {
        baseClass: 'EChartStackedBar',

        /**
         * Updates the chart with data formatted for a stacked bar chart.
         * @param {object} data - An object with 'categories' and 'series' arrays.
         * data.categories: ['2020', '2021', '2022']
         * data.series: [{name: 'Series A', data: [10, 20, 30]}, {name: 'Series B', data: [15, 25, 35]}]
         */
        updateChart: function (data) {
            if (!this.chart || !data || !data.series) {
                this.chart.clear(); // Clear the chart if data is invalid
                return;
            }

            const chartSeries = data.series.map(s => ({
                name: s.name,
                type: 'bar',
                stack: 'total',
                emphasis: {
                    focus: 'series'
                },
                data: s.data
            }));

            const option = {
                title: {
                    text: this.title,
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow' // Use 'shadow' for better tooltip display in stacked charts
                    }
                },
                legend: {
                    type: 'scroll', // Allow legend to scroll if there are many items
                    bottom: 10
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '15%', // Increase bottom margin to accommodate legend
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: data.categories
                },
                yAxis: {
                    type: 'value'
                },
                series: chartSeries
            };

            this.chart.setOption(option);
        }
    });
});
