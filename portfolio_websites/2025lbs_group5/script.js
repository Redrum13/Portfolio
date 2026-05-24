// Initialize the map view
const map = L.map("map").setView([47.8135, 13.055], 15);

// Add base map layer
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19,
}).addTo(map);

// Load district boundary layer
let defaultBoundaryLayer = null;
fetch("geojsons/stadtteil_Schallmoos_und_Neustadt.geojson")
  .then((res) => res.json())
  .then((data) => {
    defaultBoundaryLayer = L.geoJSON(data, {
      style: {
        color: "#333",
        weight: 0,
        fillOpacity: 0.3,
      },
    }).addTo(map);
  })
  .catch((err) => console.error("Failed to load default boundary:", err));

// Load default road network layer
let defaultRoadLayer = null;
fetch("geojsons/GIP_Link.geojson")
  .then((res) => res.json())
  .then((data) => {
    defaultRoadLayer = L.geoJSON(data, {
      style: {
        color: "black",
        weight: 1,
        fillOpacity: 0.6,
      },
    }).addTo(map);
  })
  .catch((err) => console.error("Failed to load default roadnet:", err));

// Current displayed layers
let currentLayers = [];

// Chart setup variables
let chartData = [];
let currentChartType = null;

// D3 Chart Configuration
const chartConfig = {
  width: 280,
  height: 200,
  margin: { top: 20, right: 20, bottom: 60, left: 60 }
};

const chartWidth = chartConfig.width - chartConfig.margin.left - chartConfig.margin.right;
const chartHeight = chartConfig.height - chartConfig.margin.top - chartConfig.margin.bottom;

// Initialize chart
function initializeChart() {
  const svg = d3.select("#statistics-chart");
  
  // Clear any existing content
  svg.selectAll("*").remove();
  
  // Create main group
  const g = svg.append("g")
    .attr("transform", `translate(${chartConfig.margin.left},${chartConfig.margin.top})`);
  
  // Create scales
  window.xScale = d3.scaleBand()
    .range([0, chartWidth])
    .padding(0.2);
  
  window.yScale = d3.scaleLinear()
    .range([chartHeight, 0]);
  
  // Create axes groups
  window.xAxisGroup = g.append("g")
    .attr("transform", `translate(0,${chartHeight})`);
  
  window.yAxisGroup = g.append("g");
  
  // Add axis labels
  g.append("text")
    .attr("transform", `translate(${chartWidth/2},${chartHeight + 50})`)
    .style("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Categories");
  
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - chartConfig.margin.left)
    .attr("x", 0 - (chartHeight / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Count");
  
  // Create bars group
  window.barsGroup = g.append("g").attr("class", "bars");
}

// Manual chart data configuration
const manualChartData = {
  "Oneway": [
    { category: 'Correct', count: 75, color: '#28a745' },
    { category: 'Missing', count: 1, color: '#ffc107' },
    { category: 'Mismatch', count: 2, color: '#dc3545' }
  ],
  "Maxspeed": [
    { category: 'Correct', count: 88, color: '#28a745' },
    { category: 'Missing', count: 1, color: '#ffc107' },
    { category: 'Mismatch', count: 2, color: '#dc3545' }
  ],
  "Other": [
    { category: 'Correct', count: 3, color: '#28a745' },
    { category: 'Missing', count: 3, color: '#ffc107' },
    { category: 'Mismatch', count: 12, color: '#dc3545' }
  ]
};

// Function to get manual chart data
function getManualChartData(layerType) {
  return manualChartData[layerType] || [
    { category: 'No Data', count: 0, color: '#6c757d' }
  ];
}

// Function to update the chart
function updateChart(data, layerType) {
  // Show chart container
  const chartContainer = document.getElementById('chart-container');
  if (chartContainer) {
    chartContainer.style.display = 'block';
  }
  
  // Update title
  const chartTitle = document.getElementById('chart-title');
  if (chartTitle) {
    chartTitle.textContent = `${layerType} Statistics`;
  }
  
  // Filter out categories with 0 count for cleaner display
  const filteredData = data.filter(d => d.count > 0);
  
  if (filteredData.length === 0) {
    // Hide chart if no data
    if (chartContainer) {
      chartContainer.style.display = 'none';
    }
    return;
  }
  
  // Update scales
  xScale.domain(filteredData.map(d => d.category));
  yScale.domain([0, d3.max(filteredData, d => d.count)]);
  
  // Update axes
  xAxisGroup.transition().duration(750)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("class", "axis-text");
  
  yAxisGroup.transition().duration(750)
    .call(d3.axisLeft(yScale).ticks(5))
    .selectAll("text")
    .attr("class", "axis-text");
  
  // Bind data to bars
  const bars = barsGroup.selectAll(".chart-bar")
    .data(filteredData, d => d.category);
  
  // Remove old bars
  bars.exit()
    .transition().duration(500)
    .attr("height", 0)
    .attr("y", chartHeight)
    .remove();
  
  // Add new bars
  const newBars = bars.enter()
    .append("rect")
    .attr("class", "chart-bar")
    .attr("x", d => xScale(d.category))
    .attr("width", xScale.bandwidth())
    .attr("y", chartHeight)
    .attr("height", 0)
    .attr("fill", d => d.color);
  
  // Update all bars
  bars.merge(newBars)
    .transition().duration(750)
    .attr("x", d => xScale(d.category))
    .attr("width", xScale.bandwidth())
    .attr("y", d => yScale(d.count))
    .attr("height", d => chartHeight - yScale(d.count))
    .attr("fill", d => d.color);
  
  // Add/update value labels
  const labels = barsGroup.selectAll(".value-label")
    .data(filteredData, d => d.category);
  
  labels.exit().remove();
  
  const newLabels = labels.enter()
    .append("text")
    .attr("class", "value-label")
    .attr("text-anchor", "middle");
  
  labels.merge(newLabels)
    .transition().duration(750)
    .attr("x", d => xScale(d.category) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d.count) + 15)
    .text(d => d.count);
}

// Icon size scale according to zoom level
const zoomIconSizes = {
  min: 13,
  max: 19,
  getSize(zoom) {
    if (zoom < this.min) return 15;
    if (zoom > this.max) return 35;
    return 15 + ((zoom - this.min) / (this.max - this.min)) * (35 - 15);
  },
};

// Enhanced load layer group function with chart analysis
async function loadLayerGroup(groupName, geojsonInfos) {
  // Remove previously displayed layers
  currentLayers.forEach((layer) => map.removeLayer(layer));
  currentLayers = [];

  let allData = { features: [] };

  for (const { path, color, showLabel } of geojsonInfos) {
    try {
      console.log(`Loading: ${path}`);
      const res = await fetch(path);
      
      if (!res.ok) {
        console.error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
        continue;
      }
      
      const data = await res.json();
      console.log(`Loaded ${path}:`, data.features.length, 'features');

      // Collect all features for analysis
      allData.features = allData.features.concat(data.features);

      // Draw lines for oneway roads (without arrow decoration)
      if (
        groupName === "Oneway" &&
        ["GIP_roadnet_oneway.geojson", "GIP_mismatch_oneway.geojson", "GIP_missing_oneway.geojson"].some((name) =>
          path.includes(name)
        )
      ) {
        const lineLayer = L.geoJSON(data, {
          style: {
            color: color,
            weight: 2,
            opacity: 0.9,
          },
          filter: (feature) =>
            feature.geometry.type === "LineString" ||
            feature.geometry.type === "MultiLineString",
        }).addTo(map);

        currentLayers.push(lineLayer);
        console.log(`Added oneway line layer for ${path}`);
        continue; // skip point layer drawing for these files
      }

      // Draw lines for other restriction roads
      if (
        groupName === "Other" &&
        path.includes("GIP_roadnet_other_restriction.geojson")
      ) {
        const lineLayer = L.geoJSON(data, {
          style: {
            color: color,
            weight: 4,
            opacity: 1,
          },
          filter: (feature) =>
            feature.geometry.type === "LineString" ||
            feature.geometry.type === "MultiLineString",
        }).addTo(map);

        currentLayers.push(lineLayer);
        console.log(`Added other restriction line layer for ${path}`);
        continue; // skip point layer drawing for these files
      }

      // Draw point layers
      const layer = L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          const currentZoom = map.getZoom();
          const iconSize = zoomIconSizes.getSize(currentZoom);

          // Oneway traffic sign icons
          if (groupName === "Oneway" && path.includes("traffic_sign_oneway")) {
            const angle = feature.properties.ADD_WINKEL || 0;
            return L.marker(latlng, {
              icon: L.divIcon({
                className: "custom-icon",
                html: `<img src="images/Einbahnstrasse.jpg" style="width:${iconSize}px; transform:rotate(${angle}deg);">`,
                iconSize: [iconSize, iconSize],
                iconAnchor: [iconSize / 2, iconSize / 2],
              }),
            });
          }

          // Maxspeed traffic signs - red circle with white center
          if (groupName === "Maxspeed" && path.includes("traffic_sign_maxspeed")) {
            return L.circleMarker(latlng, {
              radius: iconSize / 4,
              color: "red",
              weight: 2,
              fillColor: "white",
              fillOpacity: 1.0,
            });
          }

          // Default point style
          return L.circleMarker(latlng, {
            radius: iconSize / 7,
            color: "red",
            weight: 2,
            fillColor: "white",
            fillOpacity: 1.0,
          });
        },

        onEachFeature: (feature, layer) => {
          if (showLabel && feature.properties.VALUE) {
            layer.bindTooltip(feature.properties.VALUE.toString(), {
              permanent: true,
              direction: "top",
              className: "speed-label",
            });
            layer.once("add", () => {
              const el = layer.getTooltip()?.getElement();
              if (el) el.style.display = "none";
            });
          }

          const popup =
            feature.properties.Detail ||
            feature.properties.VZBEZ ||
            feature.properties.NAME1 ||

            "No details";
          layer.bindPopup(popup);
        },

        style: {
          color: color,
          weight: 2,
          opacity: 0.9,
        },
      });

      layer.addTo(map);
      currentLayers.push(layer);
    } catch (e) {
      console.error("Error loading", path, e);
    }
  }

  // Use manual chart data instead of analyzing GeoJSON
  const chartAnalysis = getManualChartData(groupName);
  chartData = chartAnalysis;
  currentChartType = groupName;
  updateChart(chartAnalysis, groupName);
}

// Show/hide legend items by IDs
function showLegendItems(visibleIds) {
  const allIds = ["oneway", "maxspeed", "other"];
  allIds.forEach((id) => {
    const item = document.getElementById(id);
    if (item) {
      item.style.display = visibleIds.includes(id) ? "list-item" : "none";
    }
  });
}

// Switch to oneway traffic layers
function switchToOneway() {
  loadLayerGroup("Oneway", [
    { path: "geojsons/GIP_roadnet_oneway.geojson", color: "green" },
    { path: "geojsons/GIP_mismatch_oneway.geojson", color: "red" },
    { path: "geojsons/GIP_missing_oneway.geojson", color: "orange" },
    { path: "geojsons/traffic_sign_oneway.geojson", color: "blue" },
  ]);
  showLegendItems(["oneway"]);
}

// Switch to maxspeed traffic layers
function switchToMaxspeed() {
  loadLayerGroup("Maxspeed", [
    { path: "geojsons/GIP_roadnet_maxspeed.geojson", color: "green", showLabel: true },
    { path: "geojsons/GIP_mismatch_maxspeed.geojson", color: "red" },
    { path: "geojsons/GIP_missing_maxspeed.geojson", color: "orange" },
    { path: "geojsons/traffic_sign_maxspeed.geojson", color: "red" },
  ]);
  showLegendItems(["maxspeed"]);
}

// Switch to other restrictions layers
function switchToOther() {
  loadLayerGroup("Other", [
    { path: "geojsons/GIP_mismatch_other_restriction.geojson", color: "red" },
    { path: "geojsons/GIP_roadnet_other_restriction.geojson", color: "green" },
    { path: "geojsons/GIP_missing_other_restriction.geojson", color: "orange" },
    { path: "geojsons/traffic_sign_other_restriction.geojson", color: "red" },
  ]);
  showLegendItems(["other"]);
}

// On page load, hide all legends and initialize chart
document.addEventListener("DOMContentLoaded", () => {
  showLegendItems([]);
  initializeChart();
  const chartContainer = document.getElementById('chart-container');
  if (chartContainer) {
    chartContainer.style.display = 'none';
  }
});

// Adjust icon sizes and tooltip visibility on zoom end
map.on("zoomend", () => {
  const currentZoom = map.getZoom();
  const showLabel = currentZoom >= 18;

  currentLayers.forEach((layer) => {
    if (layer.eachLayer) {
      layer.eachLayer((subLayer) => {
        // Control tooltip display
        const tooltipEl = subLayer.getTooltip()?.getElement();
        if (tooltipEl) {
          tooltipEl.style.display = showLabel ? "block" : "none";
        }

        // Adjust marker icon sizes for custom icons
        if (subLayer instanceof L.Marker) {
          const iconSize = zoomIconSizes.getSize(currentZoom);
          const icon = subLayer.getIcon();
          if (icon && icon.options && icon.options.className === "custom-icon") {
            const img = icon.options.html;
            subLayer.setIcon(
              L.divIcon({
                className: "custom-icon",
                html: img.replace(/width:\d+px;/, `width:${iconSize}px;`),
                iconSize: [iconSize, iconSize],
                iconAnchor: [iconSize / 2, iconSize / 2],
              })
            );
          }
        } else if (subLayer instanceof L.CircleMarker) {
          // Adjust radius for circle markers
          const newRadius = zoomIconSizes.getSize(currentZoom) / 3;
          if (subLayer.getRadius() !== newRadius) {
            subLayer.setRadius(newRadius);
          }
        }
      });
    }
  });
});

// Make chart responsive to window resize
window.addEventListener('resize', () => {
  if (currentChartType && chartData.length > 0) {
    updateChart(chartData, currentChartType);
  }
});