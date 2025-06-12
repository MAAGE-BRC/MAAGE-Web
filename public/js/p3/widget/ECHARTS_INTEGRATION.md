# Apache ECharts Integration for GenomeListOverview Widget

This document describes the integration of Apache ECharts into the MAAGE-Web GenomeListOverview widget, replacing the legacy Dojo charting library with a modern, feature-rich charting solution.

## Overview

The integration provides:
- Modern, interactive donut charts using Apache ECharts
- Consistent theming with the MAAGE design system
- Better performance and visualization capabilities
- Responsive design with automatic resizing

## Files Created/Modified

### New Files
1. **`/public/js/echarts/echarts.js`** - AMD wrapper for the globally loaded ECharts library
2. **`/public/js/echarts/app.profile.js`** - Dojo build profile for the echarts package
3. **`/public/js/p3/widget/EChartsGenomeMetaSummary.js`** - New widget that uses ECharts for genome metadata visualization
4. **`/public/js/p3/widget/GenomeListOverviewECharts.js`** - Modified GenomeListOverview that uses the ECharts-based summary widget

### Modified Files
1. **`/public/js/release.profile.js`** - Added echarts package configuration

### Test Files
1. **`/public/test-echarts-widget.html`** - Side-by-side comparison of original vs ECharts widgets
2. **`/public/test-genome-list-overview-echarts.html`** - Full integration test of GenomeListOverviewECharts

## Architecture

### ECharts Loading
- ECharts is loaded globally via `/views/head.ejs` from `/maage/js/echarts/v5.4.3/echarts.js`
- The MAAGE theme is loaded from `/maage/js/echarts/themes/maage.js`
- An AMD wrapper at `/public/js/echarts/echarts.js` makes it available to Dojo modules

### Widget Structure
The new `EChartsGenomeMetaSummary` widget:
- Extends the existing `SummaryWidget` base class
- Maintains the same API as `GenomeMetaSummary`
- Replaces dojox/charting with ECharts for visualization
- Uses the 'maage' theme for consistent styling

## Usage

### In Existing Code
To use the ECharts version in existing code, simply replace the module reference:

```javascript
// Old way
define(['p3/widget/GenomeListOverview'], function(GenomeListOverview) {
    // ...
});

// New way
define(['p3/widget/GenomeListOverviewECharts'], function(GenomeListOverviewECharts) {
    // ... (no other changes needed)
});
```

### Chart Features
The ECharts implementation provides:
- Interactive donut charts with hover effects
- Click handling for navigation
- Responsive design
- Smooth animations
- Better label positioning
- Modern tooltips

## Building

After making changes, rebuild the client-side code:
```bash
./buildClient.sh
```

## Testing

1. Start the development server:
   ```bash
   npm start
   ```

2. Open test pages in browser:
   - http://localhost:3000/test-echarts-widget.html - Compare original vs ECharts
   - http://localhost:3000/test-genome-list-overview-echarts.html - Test full widget

## Future Enhancements

1. Add more chart types (bar charts, line charts, etc.)
2. Implement chart export functionality
3. Add more interactive features (drill-down, filtering)
4. Create ECharts versions of other summary widgets:
   - SpecialtyGeneSummary
   - AMRPanelMetaSummary
   - ReferenceGenomeSummary

## Notes

- The original widgets remain unchanged for backward compatibility
- ECharts is significantly larger than dojox/charting but provides much more functionality
- The MAAGE theme ensures visual consistency across all charts
- Click events and navigation work the same as the original implementation