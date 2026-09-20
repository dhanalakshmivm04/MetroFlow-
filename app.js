// Initialize Leaflet map (Default center: Chennai)
const map = L.map('map').setView([13.0827, 80.2707], 12);

// Standard OpenStreetMap Tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

let markers = [];
let routePolyline = null;
let vehicleMarker = null;
let animInterval = null;

// Helper to return icon emoji based on selected dropdown vehicle
function getVehicleEmoji(vehicleType) {
  switch (vehicleType) {
    case 'e-bike':
      return '🚲';
    case 'diesel-truck':
      return '🚛';
    case 'electric-van':
    default:
      return '🚚';
  }
}

// Function to create custom Leaflet Icon dynamically
function createVehicleIcon(vehicleType) {
  const emoji = getVehicleEmoji(vehicleType);
  return L.divIcon({
    className: 'custom-van-icon',
    html: `<div class="bg-emerald-500 text-slate-950 font-bold p-1 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-sm w-8 h-8">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

// Convert Address Text to Coordinates via Free OpenStreetMap Geocoding API
async function geocodeAddress(addressName) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressName)}`
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        name: addressName,
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (error) {
    console.error("Geocoding error for:", addressName, error);
  }
  return null;
}

// Clear Existing Map Layers & Animations
function clearMap() {
  markers.forEach(m => map.removeLayer(m));
  if (routePolyline) map.removeLayer(routePolyline);
  if (vehicleMarker) map.removeLayer(vehicleMarker);
  if (animInterval) clearInterval(animInterval);
  markers = [];
}

// Draw Hub Markers and Path
function drawHubsAndRoute(locations, vehicleType = 'electric-van') {
  clearMap();

  const points = locations.map(h => [h.lat, h.lng]);

  // Add markers for all valid stops
  locations.forEach((hub, idx) => {
    const m = L.marker([hub.lat, hub.lng])
      .addTo(map)
      .bindPopup(`<b>Stop ${idx + 1}: ${hub.name}</b><br><span class="text-xs text-slate-400">Eco-Window Active</span>`);
    markers.push(m);
  });

  // Draw connected route line
  if (points.length > 1) {
    routePolyline = L.polyline(points, { color: '#059669', weight: 5, opacity: 0.9, dashArray: '6, 6' }).addTo(map);
    map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
  } else if (points.length === 1) {
    map.setView(points[0], 14);
  }

  // Place selected vehicle marker at start point
  const currentIcon = createVehicleIcon(vehicleType);
  vehicleMarker = L.marker(points[0], { icon: currentIcon }).addTo(map);
}

// Smooth Vehicle Movement Animation Loop
function animateVehicle(points) {
  if (points.length < 2) return;

  let currentSegment = 0;
  let step = 0;
  const stepsPerSegment = 60; // Smoothness factor

  if (animInterval) clearInterval(animInterval);

  animInterval = setInterval(() => {
    if (currentSegment >= points.length - 1) {
      clearInterval(animInterval);
      return;
    }

    const start = points[currentSegment];
    const end = points[currentSegment + 1];

    step++;
    const progress = step / stepsPerSegment;

    const lat = start[0] + (end[0] - start[0]) * progress;
    const lng = start[1] + (end[1] - start[1]) * progress;

    vehicleMarker.setLatLng([lat, lng]);

    if (step >= stepsPerSegment) {
      step = 0;
      currentSegment++;
    }
  }, 30); // Runs every 30ms for fluid movement
}

// Default Initial Draw (Chennai Hubs)
const defaultLocations = [
  { name: "Central Station Hub", lat: 13.0827, lng: 80.2707 },
  { name: "North Market Micro-Hub", lat: 13.1000, lng: 80.2800 },
  { name: "Tech Park Distribution", lat: 12.9800, lng: 80.2200 },
  { name: "South Port Freight Center", lat: 12.9500, lng: 80.2500 }
];
drawHubsAndRoute(defaultLocations, 'electric-van');

// Force Leaflet map resize calculation
setTimeout(() => {
  map.invalidateSize();
}, 400);

// Handle Route Optimization Click
document.getElementById('optimizeBtn').addEventListener('click', async () => {
  const btn = document.getElementById('optimizeBtn');
  const inputVal = document.getElementById('stopsInput').value;
  const vehicleType = document.getElementById('vehicleType').value;

  // Split comma-separated addresses
  const addressList = inputVal.split(',').map(item => item.trim()).filter(item => item.length > 0);

  if (addressList.length < 2) {
    alert("Please enter at least 2 comma-separated locations so the vehicle can move between them!\n\nExample: Chennai Central, T Nagar, Guindy");
    return;
  }

  btn.textContent = "🔍 Locating Addresses & Routing...";
  btn.classList.add('opacity-75');

  // Search coordinates for each address
  const locationPromises = addressList.map(addr => geocodeAddress(addr));
  const results = await Promise.all(locationPromises);
  const validLocations = results.filter(loc => loc !== null);

  btn.textContent = "Optimize Eco-Route & Schedule";
  btn.classList.remove('opacity-75');

  if (validLocations.length < 2) {
    alert("Could not locate enough valid addresses. Please try typing major city names or clear street addresses!");
    return;
  }

  // Update statistics dashboard
  let co2Multiplier = vehicleType === 'electric-van' ? 1.5 : vehicleType === 'e-bike' ? 2.2 : 0.7;

  document.getElementById('co2Saved').textContent = (8 + validLocations.length * 2.5 * co2Multiplier).toFixed(1) + " kg";
  document.getElementById('timeSaved').textContent = Math.floor(15 + validLocations.length * 5) + " mins";

  // Render locations with selected vehicle and start animation
  drawHubsAndRoute(validLocations, vehicleType);
  
  const points = validLocations.map(h => [h.lat, h.lng]);
  setTimeout(() => {
    animateVehicle(points);
  }, 500);
});
