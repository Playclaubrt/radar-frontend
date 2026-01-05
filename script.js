// ===== MAPA =====
const map = L.map("map", {
  minZoom: 3,     // limite mínimo (não afasta demais)
  maxZoom: 10,    // limite máximo (não entra demais)
  worldCopyJump: true
}).setView([0, 0], 3);

// ===== TILES =====
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

// ===== BARRA DE PESQUISA =====
const searchInput = document.getElementById("search");

searchInput.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;

  const query = searchInput.value.trim();
  if (!query) return;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
    );
    const data = await res.json();

    if (data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      map.setView([lat, lon], 7);
    }
  } catch (err) {
    console.error("Erro na busca:", err);
  }
});