define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/request',
    './EChart'
], function (
    declare,
    lang,
    request,
    EChart
) {
    return declare([EChart], {
        baseClass: 'EChartMap',
        mapName: 'US_Counties',
        geoJson: null, // Property to store the loaded map geometry

        postCreate: function () {
            this.inherited(arguments);
            this.loadMapData('/maage/us-atlas/counties-albers-10m.json');
        },

        loadMapData: function (jsonUrl) {
            if (typeof topojson == 'undefined') {
                console.error("TopoJSON client not loaded. Please include it via a <script> tag.");
                return;
            }

            this.showLoading();
            request.get(jsonUrl, {
                handleAs: 'json'
            }).then(lang.hitch(this, function (us) {
                // Convert TopoJSON and store it on the widget instance
                this.geoJson = topojson.feature(us, us.objects.counties);
                
                // Register the map with ECharts
                echarts.registerMap(this.mapName, this.geoJson);
                
                this.chart.hideLoading();
                this.updateChart(); // Render the map with default/empty data

            }), lang.hitch(this, function (err) {
                this.chart.hideLoading();
                console.error("Failed to load map data: ", err);
                this.chart.setOption({ title: { text: 'Error: Could not load map topology.' } });
            }));
        },
        
        /**
         * Updates the chart with map-specific data.
         * @param {Array} data - Array of objects, e.g. [{name: 'Cook', value: 500}, ...]
         */
        updateChart: function (data) {
            if (!this.chart || !this.geoJson) { 
                // Don't try to render until the geoJson is loaded
                return; 
            }

            // If no data is passed, use simulated data for demonstration.
            if (!data) {
                data = [];
                if (this.geoJson.features) {
                    this.geoJson.features.forEach(function (feature) {
                        data.push({
                            name: feature.properties.name,
                            value: Math.round(Math.random() * 1000)
                        });
                    });
                }
            }

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
                        if (!params.data) { return params.name; }
                        return params.seriesName + '<br/>' + params.name + ': ' + params.value;
                    }
                },
                visualMap: {
                    left: 'right',
                    min: 0,
                    max: 1000,
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

            this.chart.setOption(option, true);
        }
    });
});
