define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/on",
  "dijit/_WidgetBase",
  "dijit/_WidgetsInTemplateMixin",
  "dijit/_TemplatedMixin",
  "dojo/text!./templates/GenomeListOverview.html",
  "p3/store/GenomeJsonRest",
  "./EChartVerticalBar",
  "./EChartDoughnut",
  "./EChartStackedBar",
], function (
  declare,
  lang,
  on,
  WidgetBase,
  _WidgetsInTemplateMixin,
  Templated,
  Template,
  GenomeStore,
  VerticalBar,
  Doughnut,
  StackedBar
) {
  return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
    baseClass: "GenomeListOverview",
    templateString: Template,
    state: null,
    charts: [],

    postCreate: function () {
      this.inherited(arguments);
      this.genomeStore = new GenomeStore({});
    },

    _setStateAttr: function (state) {
      this._set("state", state);

      if (this.state && this.state.search && this._started) {
        setTimeout(
          lang.hitch(this, function () {
            this.createCharts();
          }),
          100
        );
      }
    },

    startup: function () {
      this.inherited(arguments);

      if (this.state && this.state.search) {
        setTimeout(
          lang.hitch(this, function () {
            this.createCharts();
          }),
          100
        );
      }
    },

    _processFacets: function (facets) {
      if (!facets || facets.length === 0) return [];
      const normMap = {
        stool: "Stool",
        "whole blood": "Blood",
        blood: "Blood",
        urine: "Urine",
        wound: "Wound",
        unknown: "Unknown",
        na: "N/A",
        "n/a": "N/A",
      };
      const agg = {};
      for (let i = 0; i < facets.length; i += 2) {
        const name = facets[i] || "N/A",
          count = facets[i + 1] || 0;
        if (count > 0) {
          const finalName =
            normMap[name.toLowerCase()] ||
            name.charAt(0).toUpperCase() + name.slice(1);
          agg[finalName] = (agg[finalName] || 0) + count;
        }
      }
      return Object.keys(agg)
        .map((k) => ({ name: k, value: agg[k] }))
        .sort((a, b) => b.value - a.value);
    },

    _processPivotFacets: function (pivotData) {
      if (!pivotData || pivotData.length === 0)
        return { categories: [], series: [] };
      const allYears = [...new Set(pivotData.map((p) => parseInt(p.value, 10)))]
        .filter((y) => !isNaN(y))
        .sort();
      if (allYears.length === 0) return { categories: [], series: [] };
      const maxYearInCategories = allYears[allYears.length - 1];
      const startYear = maxYearInCategories - 9;
      const recentPivotData = pivotData.filter(
        (p) => parseInt(p.value, 10) >= startYear
      );
      const categories = [
        ...new Set(recentPivotData.map((p) => p.value)),
      ].sort();
      const seriesCounts = {};
      recentPivotData.forEach((yearData) => {
        if (yearData.pivot) {
          yearData.pivot.forEach((seriesData) => {
            seriesCounts[seriesData.value] =
              (seriesCounts[seriesData.value] || 0) + seriesData.count;
          });
        }
      });
      const topSeriesNames = Object.keys(seriesCounts)
        .sort((a, b) => seriesCounts[b] - seriesCounts[a])
        .slice(0, 10);
      const series = topSeriesNames.map((seriesName) => ({
        name: seriesName || "N/A",
        data: categories.map((category) => {
          const categoryData = recentPivotData.find(
            (p) => p.value === category
          );
          const seriesPoint =
            categoryData && categoryData.pivot
              ? categoryData.pivot.find((p) => p.value === seriesName)
              : null;
          return seriesPoint ? seriesPoint.count : 0;
        }),
      }));
      return { categories: categories, series: series };
    },

    createCharts: function () {
      this.charts.forEach((chart) => chart.destroy());
      this.charts = [];

      if (!this.domNode || this.domNode.offsetWidth === 0) {
        setTimeout(lang.hitch(this, this.createCharts), 200);
        return;
      }

      const baseQuery = this.state.search;
      const queryOptions = { headers: { Accept: "application/solr+json" } };

      this.genomeStore
        .query(
          `${baseQuery}&facet((field,genome_status),(mincount,1))&limit(0)`,
          queryOptions
        )
        .then(
          lang.hitch(this, (res) => {
            if (res && res.response) {
              const totalGenomes = res.response.numFound || 0;
              const metricNodes =
                this.domNode.querySelectorAll(".metric-value");
              if (metricNodes[0])
                metricNodes[0].textContent = totalGenomes.toLocaleString();

              if (
                res.facet_counts &&
                res.facet_counts.facet_fields.genome_status
              ) {
                const statusFacets =
                  res.facet_counts.facet_fields.genome_status;
                let completeCount = 0;
                for (let i = 0; i < statusFacets.length; i += 2) {
                  if (
                    statusFacets[i] &&
                    statusFacets[i].toLowerCase() === "complete"
                  ) {
                    completeCount = statusFacets[i + 1];
                    break;
                  }
                }
                if (metricNodes[1])
                  metricNodes[1].textContent = completeCount.toLocaleString();
              }
            }
          })
        );

      this.genomeStore
        .query(
          `${baseQuery}&facet((field,host_common_name),(mincount,1),(limit,1000))&limit(0)`,
          queryOptions
        )
        .then(
          lang.hitch(this, (res) => {
            if (
              res &&
              res.facet_counts &&
              res.facet_counts.facet_fields.host_common_name
            ) {
              const hostFacets = res.facet_counts.facet_fields.host_common_name;
              const uniqueHosts = hostFacets.length / 2;
              const metricNodes =
                this.domNode.querySelectorAll(".metric-value");
              if (metricNodes[2])
                metricNodes[2].textContent =
                  Math.floor(uniqueHosts).toLocaleString();
            }
          })
        );

      this.genomeStore
        .query(
          `${baseQuery}&facet((field,isolation_country),(mincount,1),(limit,1000))&limit(0)`,
          queryOptions
        )
        .then(
          lang.hitch(this, (res) => {
            if (
              res &&
              res.facet_counts &&
              res.facet_counts.facet_fields.isolation_country
            ) {
              const countryFacets =
                res.facet_counts.facet_fields.isolation_country;
              const uniqueCountries = countryFacets.length / 2;
              const metricNodes =
                this.domNode.querySelectorAll(".metric-value");
              if (metricNodes[3])
                metricNodes[3].textContent =
                  Math.floor(uniqueCountries).toLocaleString();
            }
          })
        );

      const createChart = (widgetClass, node, query) => {
        if (!node) return;
        const chart = new widgetClass({ title: "" });
        chart.placeAt(node);
        chart.startup();

        setTimeout(
          lang.hitch(this, function () {
            chart.resize();
            chart.showLoading();
            this.genomeStore.query(query, queryOptions).then(
              lang.hitch(this, (res) => {
                const field = query.match(/facet\(\(field,(\w+)\)/)[1];
                if (
                  res &&
                  res.facet_counts &&
                  res.facet_counts.facet_fields[field]
                ) {
                  const data = this._processFacets(
                    res.facet_counts.facet_fields[field]
                  );
                  chart.updateChart(data);
                }
                chart.hideLoading();
              }),
              lang.hitch(this, (err) => {
                chart.hideLoading();
              })
            );
          }),
          50
        );
        this.charts.push(chart);
      };

      const createPivotChart = (widgetClass, node, query) => {
        if (!node) return;
        const chart = new widgetClass({ title: "" });
        chart.placeAt(node);
        chart.startup();

        setTimeout(
          lang.hitch(this, function () {
            chart.resize();
            chart.showLoading();
            this.genomeStore.query(query, queryOptions).then(
              lang.hitch(this, (res) => {
                const pivotField = query.match(
                  /facet\(\(pivot,\(([^,]+),([^)]+)\)\)/
                );
                const pivotKey = `${pivotField[1]},${pivotField[2]}`;
                const pivotData = res.facet_counts.facet_pivot[pivotKey];
                if (pivotData) {
                  const data = this._processPivotFacets(pivotData);
                  chart.updateChart(data);
                }
                chart.hideLoading();
              }),
              lang.hitch(this, (err) => {
                chart.hideLoading();
              })
            );
          }),
          50
        );
        this.charts.push(chart);
      };

      if (this.statusChartNode && this.statusChartNode.parentNode) {
        const statusTitle =
          this.statusChartNode.parentNode.querySelector(".chart-title");
        if (statusTitle) statusTitle.textContent = "Genome Status Distribution";
      }

      if (this.hostChartNode && this.hostChartNode.parentNode) {
        const hostTitle =
          this.hostChartNode.parentNode.querySelector(".chart-title");
        if (hostTitle) hostTitle.textContent = "Top 10 Host Species";
      }

      if (this.serotypeChartNode && this.serotypeChartNode.parentNode) {
        const serotypeTitle =
          this.serotypeChartNode.parentNode.querySelector(".chart-title");
        if (serotypeTitle) serotypeTitle.textContent = "Top 10 Serotypes";
      }

      if (this.sourceChartNode && this.sourceChartNode.parentNode) {
        const sourceTitle =
          this.sourceChartNode.parentNode.querySelector(".chart-title");
        if (sourceTitle) sourceTitle.textContent = "Isolation Sources";
      }

      if (
        this.serotypeOverTimeChartNode &&
        this.serotypeOverTimeChartNode.parentNode
      ) {
        const timeTitle =
          this.serotypeOverTimeChartNode.parentNode.querySelector(
            ".chart-title"
          );
        if (timeTitle) timeTitle.textContent = "Serotype Trends Over Time";
      }

      if (this.countryChartNode && this.countryChartNode.parentNode) {
        const countryTitle =
          this.countryChartNode.parentNode.querySelector(".chart-title");
        if (countryTitle) countryTitle.textContent = "Top 10 Countries";
      }

      createChart(
        Doughnut,
        this.statusChartNode,
        `${baseQuery}&facet((field,genome_status),(mincount,1))&limit(0)`
      );
      createChart(
        VerticalBar,
        this.hostChartNode,
        `${baseQuery}&facet((field,host_common_name),(mincount,1),(limit,10))&limit(0)`
      );
      createChart(
        Doughnut,
        this.serotypeChartNode,
        `${baseQuery}&facet((field,serovar),(mincount,1),(limit,10))&limit(0)`
      );
      createChart(
        Doughnut,
        this.sourceChartNode,
        `${baseQuery}&facet((field,isolation_source),(mincount,1),(limit,10))&limit(0)`
      );
      createPivotChart(
        StackedBar,
        this.serotypeOverTimeChartNode,
        `${baseQuery}&facet((pivot,(collection_year,serovar)),(mincount,1))&limit(0)`
      );
      createChart(
        Doughnut,
        this.countryChartNode,
        `${baseQuery}&facet((field,isolation_country),(mincount,1),(limit,10))&limit(0)`
      );

      setTimeout(
        lang.hitch(this, function () {
          this.resize();
        }),
        300
      );
    },

    resize: function () {
      this.inherited(arguments);
      if (this.charts) {
        setTimeout(
          lang.hitch(this, function () {
            this.charts.forEach((c) => c.resize());
          }),
          100
        );
      }
    },

    destroy: function () {
      this.inherited(arguments);
      if (this.charts) this.charts.forEach((c) => c.destroy());
    },
  });
});
