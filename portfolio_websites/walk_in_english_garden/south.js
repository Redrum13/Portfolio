// ── BASE MAPS ────────────────────────────────
// Dark OSM via CartoDB DarkMatter (clean dark OSM-based)
const darkOSM = L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }
);

const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  opacity: 0.85,
});

// ── MAP INIT ─────────────────────────────────
const map = L.map('map', {
  zoomControl: false,
  layers: [darkOSM],
  minZoom: 13,
  maxZoom: 17,
}).setView([0, 0], 10);

const baseLayers = {
  "Dark OSM": darkOSM,
  "OpenStreetMap": osmLayer,
};

L.control.layers(baseLayers, null, { position: 'topleft' }).addTo(map);

// ── LOCATION BUTTON ──────────────────────────
const locationButton = L.DomUtil.create('button', 'location-button');
const mapContainer = map.getContainer();
mapContainer.appendChild(locationButton);
locationButton.style.position = 'absolute';
locationButton.style.bottom = '20px';
locationButton.style.right = '12px';

const userLocationCircle = L.circleMarker([0, 0], {
  radius: 8,
  fillColor: '#2ecc71',
  color: '#fff',
  weight: 2,
  opacity: 1,
  fillOpacity: 0.85,
  zIndex: 9999,
}).addTo(map);

locationButton.onclick = function () {
  map.locate({ setView: true, maxZoom: 16, watch: true });
};

map.on('locationfound', function (e) {
  userLocationCircle.setLatLng(e.latlng);
  map.setView(e.latlng, map.getZoom());
});

map.on('locationerror', function () {
  alert('Location access denied or unavailable');
});

// ── SCALE + MEASURE ──────────────────────────
L.control.scale({ position: 'bottomleft', metric: true, maxWidth: 100 }).addTo(map);

L.Control.Measure.include({
  _setCaptureMarkerIcon: function () {
    this._captureMarker.options.autoPanOnFocus = false;
    this._captureMarker.setIcon(
      L.divIcon({ iconSize: this._map.getSize().multiplyBy(2) })
    );
  },
});

L.control.measure({
  position: 'bottomleft',
  primaryLengthUnit: 'meters',
  secondaryLengthUnit: 'kilometers',
  primaryAreaUnit: 'sqmeters',
  secondaryAreaUnit: 'sqkilometers',
}).addTo(map);

L.control.zoom({ position: 'topleft' }).addTo(map);

// ── PANES ────────────────────────────────────
map.createPane('polygonPane');
map.createPane('linePane');
map.createPane('walkLinePane');
map.createPane('pointPane');

map.getPane('polygonPane').style.zIndex = 400;
map.getPane('linePane').style.zIndex = 500;
map.getPane('walkLinePane').style.zIndex = 600;   // above roads
map.getPane('pointPane').style.zIndex = 1000;

const polygonLayerGroup = L.layerGroup();
const lineLayerGroup    = L.layerGroup();
const walkLineLayerLayerGroup = L.layerGroup();
const pointLayerGroup   = L.layerGroup();

// ── POLYGON STYLE ────────────────────────────
const polygonStyle = function (feature) {
  let style = { weight: 1, opacity: 0.8, fillOpacity: 0.55 };
  if (feature.properties.natural === 'wood') {
    style.color = '#2ecc71';
    style.fillColor = '#1a5c35';
  } else if (feature.properties.natural === 'water') {
    style.color = '#48cae4';
    style.fillColor = '#0077b6';
    style.fillOpacity = 0.65;
  } else if (feature.properties.natural === 'other') {
    style.color = '#555';
    style.fillColor = '#2a2a2a';
    style.fillOpacity = 0.4;
  } else {
    style.color = '#56ab2f';
    style.fillColor = '#2d6a1f';
    style.fillOpacity = 0.5;
  }
  return style;
};

const addDropShadowFilter = () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("style", "height:0; width:0; position:absolute;");
  svg.innerHTML = `
    <filter id="drop-shadow">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
      <feOffset in="blur" dx="2" dy="2" result="offsetBlur"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.7"/></feComponentTransfer>
      <feMerge><feMergeNode in="offsetBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
  document.body.appendChild(svg);
};
addDropShadowFilter();

const onEachFeature = (feature, layer) => {
  layer.on('add', () => {
    const el = layer.getElement();
    if (el) el.setAttribute('filter', 'url(#drop-shadow)');
  });
};

// ── ROAD STYLE ───────────────────────────────
const innerLineStyle = function (feature) {
  const z = map.getZoom();
  let style = { color: 'rgba(180,170,150,0.45)', weight: 5, opacity: 1, fillOpacity: 0.4 };
  if (feature.properties && ['trunk','unclassified'].includes(feature.properties.highway)) {
    style.weight = 6.5;
    style.color = 'rgba(200,185,160,0.5)';
  } else if (feature.properties && ['path','cycleway'].includes(feature.properties.highway)) {
    style.weight = 4; style.opacity = z >= 15 ? 0.7 : 0;
    style.color = 'rgba(160,150,130,0.5)';
  } else if (feature.properties && ['bridleway','steps','footway'].includes(feature.properties.highway)) {
    style.weight = 3; style.opacity = z >= 16 ? 0.6 : 0;
    style.color = 'rgba(140,130,110,0.45)';
  } else if (feature.properties && ['corridor','residential','secondary','service','track'].includes(feature.properties.highway)) {
    style.weight = 3; style.opacity = z >= 16 ? 0.55 : 0;
    style.color = 'rgba(140,130,110,0.4)';
  }
  return style;
};

// ── POINT STYLE ──────────────────────────────
const pointStyle = (feature) => {
  const svgIcons = {
    Bus: 'bus-stop-14-svgrepo-com.svg',
    Tram: 'Tram_logo.svg',
    Ubahn: 'Ubahn_logo.svg',
    monument: 'monument-one-svgrepo-com.svg',
    building: 'monument-one-svgrepo-com.svg',
  };
  return { iconUrl: svgIcons[feature.properties.type], iconSize: [22, 22], iconAnchor: [11, 11] };
};

// ── LOAD POLYGONS ────────────────────────────
fetch("https://raw.githubusercontent.com/Redrum13/mapro/refs/heads/main/merge_2non.geojson")
  .then(r => r.json())
  .then(geojsonData => {
    [0, 2, 3, 1].forEach(index => {
      L.geoJSON(geojsonData.features[index], {
        style: polygonStyle, onEachFeature, pane: 'polygonPane'
      }).addTo(polygonLayerGroup);
    });
    map.fitBounds(L.geoJSON(geojsonData).getBounds());
  })
  .catch(e => console.error('Polygon GeoJSON error:', e));

// ── LOAD ROADS ───────────────────────────────
fetch("https://raw.githubusercontent.com/Redrum13/mapro/refs/heads/main/final_track.geojson")
  .then(r => r.json())
  .then(geojsonData => {
    const innerLayer = L.geoJSON(geojsonData, { style: innerLineStyle, pane: 'linePane' });
    L.layerGroup([innerLayer]).addTo(map);
    map.on('zoomend', () => innerLayer.eachLayer(l => l.setStyle(innerLineStyle(l.feature))));
  })
  .catch(e => console.error('Road GeoJSON error:', e));

// ── WALK TRACKS ──────────────────────────────
// Bold, glowing, high-contrast tracks — the star of the show
const TRACK_COLORS = [
  '#ff6b35', '#ffd700', '#00e5ff', '#76ff03', '#ff4081',
  '#ff9100', '#18ffff', '#b2ff59', '#ea80fc', '#40c4ff',
];

let geojsonData = null;
let trackColorMap = {};

fetch('https://raw.githubusercontent.com/Redrum13/mapro/refs/heads/main/loop_final.geojson')
  .then(r => r.json())
  .then(data => {
    geojsonData = data;
    // assign a vivid color to each track
    data.features.forEach((f, i) => {
      trackColorMap[f.properties.Name] = TRACK_COLORS[i % TRACK_COLORS.length];
    });
    populateTrackDropdown(geojsonData);
    initializeWalkLines(geojsonData);
  })
  .catch(e => console.error('Walk GeoJSON error:', e));

function populateTrackDropdown(data) {
  const sel = document.getElementById('trackSelect');
  data.features.forEach((feature, index) => {
    const opt = document.createElement('option');
    opt.value = index;
    opt.textContent = feature.properties.Name;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => updateTableAndMap(data));
}

function updateTableAndMap(data) {
  const sel = document.getElementById('trackSelect');
  const val = sel.value;
  if (val === 'noTrack') {
    document.getElementById('time-value').textContent = '——';
    document.getElementById('distance-value').textContent = '——';
    return;
  }
  const anyChecked = [...document.querySelectorAll('#right-pane input[type="checkbox"]')].some(cb => cb.checked);
  if (!anyChecked) { alert('Please toggle on at least one track!'); return; }

  const track = data.features[parseInt(val)];
  document.getElementById('time-value').textContent = track.properties.Time || '——';
  document.getElementById('distance-value').textContent = track.properties.Distance_km || '——';
  zoomToTrack(track);
  highlightTrack(track);
}

function zoomToTrack(track) {
  const bounds = L.latLngBounds(track.geometry.coordinates[0].map(c => L.latLng(c[1], c[0])));
  map.fitBounds(bounds, { padding: [30, 30] });
}

let highlightLayer = null;

function highlightTrack(track) {
  if (highlightLayer) map.removeLayer(highlightLayer);
  if (!map.getPane('highlightPane')) {
    map.createPane('highlightPane');
    map.getPane('highlightPane').style.zIndex = 650;
  }
  // Bright white glow outline for selected track
  highlightLayer = L.geoJSON(track, {
    style: { color: '#ffffff', weight: 10, opacity: 0.25, pane: 'highlightPane' },
  }).addTo(map);
  // And the vivid colored line on top
  L.geoJSON(track, {
    style: {
      color: trackColorMap[track.properties.Name] || '#ffd700',
      weight: 5,
      opacity: 1,
      pane: 'highlightPane',
    },
  }).addTo(map);
}

function initializeWalkLines(data) {
  const layers = {};

  data.features.forEach(feature => {
    const name = feature.properties.Name;
    const color = trackColorMap[name] || '#ff6b35';
    if (!layers[name]) layers[name] = L.layerGroup();

    // Outer glow pass
    layers[name].addLayer(L.geoJSON(feature, {
      style: { color: color, weight: 9, opacity: 0.18, pane: 'walkLinePane' },
    }));
    // Main vivid line
    layers[name].addLayer(L.geoJSON(feature, {
      style: { color: color, weight: 4, opacity: 1, pane: 'walkLinePane' },
    }));
    // Bright white dashed centre highlight
    layers[name].addLayer(L.geoJSON(feature, {
      style: {
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.55,
        dashArray: '6 8',
        pane: 'walkLinePane',
      },
    }));
  });

  document.querySelectorAll('#right-pane input').forEach(checkbox => {
    const type = checkbox.value;
    if (checkbox.checked) layers[type]?.addTo(map);
    checkbox.addEventListener('change', e => {
      e.target.checked ? layers[type]?.addTo(map) : layers[type]?.remove();
    });
  });
}

// ── POINTS ───────────────────────────────────
const markers = L.markerClusterGroup({ maxClusterRadius: 20 });

fetch('https://raw.githubusercontent.com/Redrum13/mapro/refs/heads/main/point_fin.geojson')
  .then(r => r.json())
  .then(data => {
    const layer = L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        const marker = L.marker(latlng, { icon: L.icon(pointStyle(feature)) });
        const props = feature.properties;
        marker.on('mouseover', e => {
          e.target.bindPopup(
            `<strong style="color:#2ecc71">${props.name || 'N/A'}</strong><br>
             <span style="opacity:0.75">${props.type || ''}</span>`,
            { maxWidth: 180 }
          ).openPopup();
        });
        marker.on('mouseout', e => e.target.closePopup());
        return marker;
      },
    });
    markers.addLayer(layer);
    pointLayerGroup.addLayer(markers);
  })
  .catch(e => console.error('Point GeoJSON error:', e));

// Add layers in order
polygonLayerGroup.addTo(map);
lineLayerGroup.addTo(map);
walkLineLayerLayerGroup.addTo(map);
pointLayerGroup.addTo(map);

// ── LEGEND ───────────────────────────────────
const legend = L.control({ position: 'topright' });
legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'leaflet-control');
  div.innerHTML = `
    <div style="background:rgba(14,26,14,0.93); padding:12px 14px; border-radius:6px;
      border:1px solid #2ecc71; color:rgba(255,255,255,0.85);
      font-family:'Raleway',sans-serif; font-size:11px; min-width:150px;
      box-shadow:0 4px 20px rgba(0,0,0,0.5);">
      <div id="leg-title" style="text-align:center; cursor:pointer; letter-spacing:2.5px;
        font-size:10px; font-weight:700; color:#a8e063; text-transform:uppercase; margin-bottom:2px;">
        MAP LEGEND ▾
      </div>
      <div id="leg-body" style="display:none; margin-top:9px; line-height:1.7;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
          <span style="width:22px;height:4px;background:#ff6b35;border-radius:2px;box-shadow:0 0 5px #ff6b35;flex-shrink:0;"></span> Walk Tracks
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
          <span style="width:22px;height:3px;background:rgba(200,185,160,0.5);flex-shrink:0;"></span> Park Roads
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
          <img src="bus-stop-14-svgrepo-com.svg" style="width:16px;height:16px;flex-shrink:0;"> Bus
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
          <img src="Tram_logo.svg" style="width:16px;height:16px;flex-shrink:0;"> Tram
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
          <img src="Ubahn_logo.svg" style="width:16px;height:16px;flex-shrink:0;"> U-Bahn
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
          <img src="monument-one-svgrepo-com.svg" style="width:16px;height:16px;flex-shrink:0;"> Monument
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
          <span style="width:16px;height:16px;background:#1a5c35;border:1px solid #2ecc71;border-radius:2px;flex-shrink:0;"></span> Forest
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
          <span style="width:16px;height:16px;background:#0077b6;border:1px solid #48cae4;border-radius:2px;flex-shrink:0;"></span> Water
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
          <span style="width:16px;height:16px;background:#2d6a1f;border:1px solid #56ab2f;border-radius:2px;flex-shrink:0;"></span> Open Space
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="width:16px;height:16px;background:#2a2a2a;border:1px solid #555;border-radius:2px;flex-shrink:0;"></span> Other
        </div>
      </div>
    </div>`;
  const title = div.querySelector('#leg-title');
  const body  = div.querySelector('#leg-body');
  title.addEventListener('click', () => {
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    title.textContent = open ? 'MAP LEGEND ▾' : 'MAP LEGEND ▴';
  });
  return div;
};
legend.addTo(map);