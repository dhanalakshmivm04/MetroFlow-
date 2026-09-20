// Initialize Leaflet map centered at Chennai coordinates
const map = L.map('map').setView([13.0827, 80.2707], 12);

// Standard OpenStreetMap Tiles (Reliable across all environments)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);

// Hub Locations
const hubLocations = [
  { name: "Central Station Hub", lat: 13.0827, lng: 80.2707 },
  { name: "North Market Micro-Hub", lat: 13.1000, lng: 80.2800 },
  { name: "Tech Park Distribution", lat: 12.9800, lng: 80.2200 },
  { name: "South Port Freight Center", lat: 12.9500, lng: 80.2500 }
];

let markers = [];
let routePolyline = null;
let vehicleMarker = null;
let animTimeout = null;

// Custom Animated Delivery Emoji Icon
const vanIcon = L.divIcon({
  className: 'custom-van-icon',
  html: `<div class="bg-emerald-500 text-slate-950 font-bold p-1 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-sm w-8 h-8">🚚</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

function drawHubsAndRoute() {
  // Clear previous layers
  markers.forEach(m => map.removeLayer(m));
  if (routePolyline) map.removeLayer(routePolyline);
  if (vehicleMarker) map.removeLayer(vehicleMarker);
  if (animTimeout) clearTimeout(animTimeout);
  markers = [];

  const points = hubLocations.map(h => [h.lat, h.lng]);

  // Add markers for all locations
  hubLocations.forEach((hub, idx) => {
    const m = L.marker([hub.lat, hub.lng])
      .addTo(map)
      .bindPopup(`<b>Stop ${idx + 1}: ${hub.name}</b><br><span class="text-xs text-slate-400">Low-emission window active.</span>`);
    markers.push(m);
  });

  // Draw polyline connecting delivery route
  routePolyline = L.polyline(points, { color: '#059669', weight: 5, opacity: 0.9, dashArray: '6, 6' }).addTo(map);
  
  // Fit map view to bounds
  map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });

  // Place initial vehicle marker at Start Node
  vehicleMarker = L.marker(points[0], { icon: vanIcon }).addTo(map);
}

// Animate delivery van moving through stops
function animateVehicle(points, index = 0) {
  if (index >= points.length - 1) return;

  const start = points[index];
  const end = points[index + 1];
  let step = 0;
  const numSteps = 50;

  function move() {
    step++;
    const lat = start[0] + (end[0] - start[0]) * (step / numSteps);
    const lng = start[1] + (end[1] - start[1]) * (step / numSteps);

    vehicleMarker.setLatLng([lat, lng]);

    if (step < numSteps) {
      animTimeout = setTimeout(move, 20);
    } else {
      animTimeout = setTimeout(() => animateVehicle(points, index + 1), 500);
    }
  }

  move();
}

// Initial Map & Marker Draw
drawHubsAndRoute();

// Ensure map recalculates size properly after initial layout load
setTimeout(() => {
  map.invalidateSize();
}, 400);

// Optimize Button Click Handler
document.getElementById('optimizeBtn').addEventListener('click', () => {
  const btn = document.getElementById('optimizeBtn');
  btn.textContent = "⚡ Recalculating Low-Congestion Route...";
  btn.classList.add('opacity-75');

  setTimeout(() => {
    btn.textContent = "Optimize Eco-Route & Schedule";
    btn.classList.remove('opacity-75');

    // Update statistics
    const vehicleType = document.getElementById('vehicleType').value;
    let co2Multiplier = vehicleType === 'electric-van' ? 1.5 : vehicleType === 'e-bike' ? 2.2 : 0.7;

    document.getElementById('co2Saved').textContent = (10 + Math.random() * 6 * co2Multiplier).toFixed(1) + " kg";
    document.getElementById('timeSaved').textContent = Math.floor(20 + Math.random() * 15) + " mins";

    // Re-draw map and start animated tour
    drawHubsAndRoute();
    const points = hubLocations.map(h => [h.lat, h.lng]);
    animateVehicle(points);

  }, 600);
});