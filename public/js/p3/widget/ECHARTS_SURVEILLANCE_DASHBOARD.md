# ECharts Genome Surveillance Dashboard

## Overview

The Genome Surveillance Dashboard is a comprehensive suite of reusable Apache ECharts-based widgets designed for genomic epidemiological surveillance in the MAAGE web application. It replaces the legacy Dojo charting components with modern, interactive visualizations.

## Architecture

### Base Components

1. **EChartsBase.js** - Abstract base class for all ECharts widgets
   - Handles chart initialization and lifecycle
   - Provides common data loading patterns
   - Manages resize events
   - Implements MAAGE theme colors

2. **GenomeSurveillanceDashboard.js** - Main dashboard container
   - Orchestrates all chart widgets
   - Manages tabbed interface
   - Handles inter-widget communication
   - Provides filter propagation

### Chart Widgets

#### 1. EChartsTimeSeriesChart.js
- **Purpose**: Temporal surveillance of genome collections
- **Features**:
  - Line chart with area fill
  - Year-over-year trends
  - Click-to-filter by year
  - Statistical markers (average, min, max)
- **Data**: Collection year facets

#### 2. EChartsGeographicDistribution.js
- **Purpose**: Geographic distribution analysis
- **Display Modes**:
  - Bar chart (default)
  - Pie chart
- **Features**:
  - Top N countries with "Others" grouping
  - Click-to-filter by country
  - Percentage calculations
- **Data**: Isolation country facets

#### 3. EChartsHostDistribution.js
- **Purpose**: Host organism distribution
- **Display Modes**:
  - Sunburst (hierarchical, default)
  - Treemap (hierarchical)
  - Bar chart (flat)
- **Features**:
  - Two-level hierarchy (host group → host name)
  - Interactive drilling
  - Click-to-filter
- **Data**: Host group and host name facets

#### 4. EChartsLineageTreemap.js
- **Purpose**: Phylogenetic distribution visualization
- **Features**:
  - Hierarchical treemap
  - Three levels: lineage → clade → strain
  - Breadcrumb navigation
  - Size-based filtering
- **Data**: Lineage, clade, and strain facets

#### 5. EChartsAMRHeatmap.js
- **Purpose**: Antimicrobial resistance pattern analysis
- **Display Modes**:
  - Heatmap (country × antibiotic matrix)
  - Radar chart (resistance profiles by genome quality)
- **Features**:
  - Resistance percentage visualization
  - Quality-based analysis
  - No-data handling
- **Data**: AMR facets with geographic correlation

#### 6. EChartsGenomeStats.js
- **Purpose**: Summary statistics dashboard
- **Features**:
  - Total genome count
  - Quality distribution
  - Average completeness
  - Average genome size
  - Average contig count
  - AMR data availability
- **Data**: Statistical aggregations and facets

## Usage

### Basic Integration

```javascript
// In GenomeListOverview widget
require(['p3/widget/GenomeSurveillanceDashboard'], function(Dashboard) {
  var dashboard = new Dashboard({
    query: 'in(genome_id,GenomeGroup(/path/to/group))'
  });
  dashboard.placeAt(containerNode);
  dashboard.startup();
});
```

### Setting Query

```javascript
// Update dashboard with new query
dashboard.setQuery('eq(isolation_country,"USA")');

// Or set via state object
dashboard.setState({
  search: 'and(eq(host_group,"Human"),gt(collection_year,2020))'
});
```

### Event Handling

```javascript
// Listen for filter events
dashboard.on('filter-applied', function(evt) {
  console.log('Filter applied:', evt.type, evt.value, evt.query);
  // evt.type: 'year', 'country', 'host', 'lineage'
  // evt.value: selected value
  // evt.query: new query string
});
```

## API Query Patterns

All widgets use the MAAGE/BV-BRC Data API with faceted queries:

```javascript
// Time series query
query + '&facet((field,collection_year),(mincount,1),(sort,index))&limit(1)&json(nl,map)'

// Geographic query with limit
query + '&facet((field,isolation_country),(mincount,1),(limit,100))&limit(1)&json(nl,map)'

// Multiple facets for hierarchical data
query + '&facet((field,host_group))&facet((field,host_name))&limit(1)&json(nl,map)'

// Statistical aggregations
query + '&stat(field,genome_length)&stat(field,checkm_completeness)&limit(1)&json(nl,map)'
```

## Customization

### Theme Colors

Default MAAGE theme colors are defined in EChartsBase:

```javascript
themeColors: [
  '#E74C3C', // Red
  '#3498DB', // Blue
  '#2ECC71', // Green
  '#F39C12', // Orange
  '#9B59B6', // Purple
  '#1ABC9C', // Turquoise
  '#34495E', // Dark Gray
  '#E67E22', // Carrot
  '#95A5A6', // Gray
  '#16A085'  // Green Sea
]
```

### Chart Options

Each widget can be customized by overriding `chartOptions`:

```javascript
var customChart = new TimeSeriesChart({
  chartOptions: {
    title: { text: 'Custom Title' },
    xAxis: { name: 'Custom X Label' }
  }
});
```

## Performance Considerations

1. **Data Limits**: Facet queries are limited to prevent overwhelming the UI
   - Geographic: Top 15 countries
   - Host: Top 10 hosts per group
   - Lineage: Top 20 lineages

2. **Lazy Loading**: Charts only load data when visible (tab selection)

3. **Resize Handling**: Charts automatically resize with container

## Browser Compatibility

- Requires modern browsers with ES5 support
- Tested on Chrome, Firefox, Safari, Edge
- ECharts v5.4.3 is loaded globally

## Future Enhancements

1. **Export functionality**: Add chart export to PNG/SVG
2. **Real-time updates**: WebSocket integration for live data
3. **Custom filtering UI**: Advanced filter builder
4. **Map visualization**: True geographic map for country data
5. **Network graphs**: Transmission network visualization
6. **Time animation**: Animated temporal progression