# AI Agent Instructions: Implementing MAAGE Interactive Map Component

## Overview
These instructions guide you through implementing an interactive choropleth map component that visualizes genomic surveillance data from the MAAGE API. The map displays genome counts by geographic region (US states and counties) based on user-specified taxon IDs.

## Prerequisites
- Basic web server to serve static files
- Access to MAAGE API (https://www.maage-brc.org/api)
- No build tools required - this is a static HTML/JS implementation

## Implementation Steps

### 1. Project Structure Setup
Create the following directory structure:
```
project-root/
├── map-toggle.html          # Main interactive map file
├── maage_client.js          # MAAGE API client library
├── maps/                    # TopoJSON geographic data
│   ├── usa-states-albers-10m.json
│   └── usa-counties-albers-10m.json
└── geojson/                 # GeoJSON county data
    └── cb_2024_us_county_5m.geojson
```

### 2. Core HTML Structure
Create `map-toggle.html` with these key sections:

#### a. Head Section Dependencies
```html
<!-- Required external libraries via CDN -->
<script src="https://cdn.jsdelivr.net/npm/topojson-client@3"></script>
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<script src="/maage_client.js"></script>
```

#### b. Tailwind Configuration
Include custom MAAGE brand colors:
```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                maage: {
                    primary: { /* green palette */ },
                    secondary: { /* blue palette */ },
                    tertiary: { /* gold palette */ }
                }
            }
        }
    }
}
```

#### c. Main UI Components
1. **Query Controls**: Input field for taxon ID with query button
2. **View Toggle**: Buttons to switch between USA view and individual state view
3. **State Selector**: Dropdown menu for selecting individual states
4. **Map Container**: SVG container for D3.js visualization
5. **Legend**: Color scale showing genome count density levels

### 3. JavaScript Implementation

#### a. Global Variables
```javascript
let currentView = 'usa';
let selectedState = '17'; // Default to Illinois
let usaData = null;
let geoJsonCountiesData = null;
let genomeData = null;
let maageClient = null;
```

#### b. Color Scale Configuration
```javascript
const colorScale = d3.scaleQuantile()
    .domain([0, 100])
    .range(['#e8f0ec', '#b4d0c3', '#98bdac', '#6ea089', '#57856f', '#496f5d', '#324d41']);
```

#### c. MAAGE API Integration
Initialize the client and implement the query function:
```javascript
// Initialize on page load
maageClient = new MAAGEClient('https://www.maage-brc.org/api');

// Query function structure
async function queryGenomeData(taxonId) {
    // 1. Build faceted queries for state and county counts
    // 2. Use RQL syntax: and(eq(taxon_id,VALUE),eq(isolation_country,USA),facet(...))
    // 3. Process facet results to map state names to FIPS codes
    // 4. Handle both state_province and county fields
}
```

#### d. Data Processing Functions
1. **processStateFacets**: Convert API facet results to state FIPS code mapping
2. **processCountyFacets**: Extract county-level counts from facet results
3. **getVisualizationData**: Transform counts into normalized values for color scaling
4. **getStateFIPSByName**: Helper to map state names to FIPS codes

### 4. Map Rendering Implementation

#### a. USA View Rendering
- Use D3.js with no projection (data is pre-projected in Albers USA)
- Load TopoJSON data from `/maps/usa-states-albers-10m.json`
- Apply color scale based on genome counts
- Implement hover tooltips showing location name and genome count

#### b. State View Rendering
- Load GeoJSON county data from `/geojson/cb_2024_us_county_5m.geojson`
- Filter counties by selected state FIPS code
- Use Mercator projection fitted to state bounds
- Display county-level genome counts

### 5. Styling Considerations

#### a. Map Appearance
```css
.state, .county {
    stroke: #d1d5db;      /* Light gray borders for visibility */
    stroke-width: 1px;
    cursor: pointer;
    transition: all 0.2s;
}

.state:hover, .county:hover {
    stroke-width: 2.5px;
    stroke: #374151;      /* Darker on hover */
    filter: brightness(0.95);
}
```

#### b. Color Scheme for Data
- No data: `#f9fafb` (very light gray)
- Low counts: `#e8f0ec` (light green, visible against white)
- High counts: Progress through green shades to `#324d41`

### 6. API Query Details

#### RQL Query Construction
- State-level query: `and(eq(taxon_id,590),eq(isolation_country,USA),facet((field,state_province),(mincount,1)))`
- County-level query: `and(eq(taxon_id,590),eq(isolation_country,USA),ne(county,""),facet((field,county),(mincount,1)))`
- Use `accept: 'application/solr+json'` header for facet results

#### Response Processing
- Facet results come as alternating [name, count] pairs
- Map state names from API to FIPS codes for visualization
- Handle cases where county field may be empty (newer field)

### 7. User Interface Flow
1. User enters taxon ID (e.g., 590 for Salmonella)
2. Click Query button to fetch data
3. Map updates with actual genome counts
4. Toggle between USA overview and state detail views
5. Hover over regions to see specific counts

### 8. Error Handling
- Display loading spinner during API queries
- Show error messages if API fails
- Gracefully handle zero results
- Default to mock data if no query has been performed

### 9. Performance Optimization
- Cache loaded geographic data (TopoJSON/GeoJSON)
- Use faceted queries to get aggregated counts (not individual records)
- Limit API calls by fetching all needed data in parallel

### 10. Testing Recommendations
- Test with common taxon IDs: 590 (Salmonella), 1280 (Staphylococcus)
- Verify state name to FIPS mapping accuracy
- Check edge cases: states with no data, API errors
- Ensure responsive design works on different screen sizes

## Key Implementation Notes
- The map uses pre-projected Albers USA data for the national view
- County data may return many zeros as it's a newly tracked field
- Color normalization ensures relative density is shown across regions
- The implementation requires no build process - edit and reload

## Files to Request/Verify
1. `/maage_client.js` - MAAGE API client library
2. `/maps/usa-states-albers-10m.json` - State boundaries
3. `/maps/usa-counties-albers-10m.json` - County boundaries (if using for USA view)
4. `/geojson/cb_2024_us_county_5m.geojson` - County boundaries for state views

## Success Criteria
- Map displays and is interactive without errors
- Taxon ID queries return and display real genome counts
- State boundaries remain visible even with light/no data
- Toggle between USA and state views works smoothly
- Tooltips show accurate location names and counts