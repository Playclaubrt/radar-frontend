const API = "https://radar-backend-1-j3y5.onrender.com";

const map = L.map("map", {
  minZoom: 3,
  maxZoom: 7
}).setView([-14.2, -51.9], 3);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

const alertLayer = L.layerGroup().addTo(map);
const info = document.getElementById("info");

/* =========================
   SEARCH (TIPO WINDY)
========================= */
document.getElementById("search").addEventListener("keydown", async e => {
  if (e.key === "Enter") {
    const q = e.target.value;
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${q}`
    );
    const d = await r.json();
    if (d[0]) map.setView([d[0].lat, d[0].lon], 7);
  }
});

/* =========================
   ALERTAS INMET
========================= */
async function carregarINMET() {
  const r = await fetch(`${API}/inmet`);
  const data = await r.json();

  data.forEach(a => {

    // ALERTA GEOMÉTRICO
    if (a.type === "geometrico" && a.polygon) {
      const poly = L.polygon(a.polygon, {
        color: "transparent",
        fillOpacity: 0
      }).addTo(alertLayer);

      poly.on("click", () => abrirAlerta(a));
    }

    // ALERTA TEXTUAL
    if (a.type === "textual") {
      const m = L.marker([a.lat, a.lon], {
        opacity: 0
      }).addTo(alertLayer);

      m.on("click", () => abrirAlerta(a));
    }
  });
}

/* =========================
   ALERTAS NOAA
========================= */
async function carregarNOAA() {
  const r = await fetch(`${API}/noaa`);
  const data = await r.json();

  data.forEach(a => {
    if (!a.polygon) return;

    const poly = L.polygon(a.polygon[0], {
      color: "transparent",
      fillOpacity: 0
    }).addTo(alertLayer);

    poly.on("click", () => abrirAlerta(a));
  });
}

/* =========================
   CLICK NO MAPA → WEATHER
========================= */
map.on("click", async e => {
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;

  const w = await fetch(`${API}/owm?lat=${lat}&lon=${lon}`).then(r => r.json());
  const f = await fetch(`${API}/forecast?lat=${lat}&lon=${lon}`).then(r => r.json());

  info.style.display = "block";

  let dias = "";
  Object.entries(f).forEach(([d, v]) => {
    dias += `
      <div>
        <b>${d}</b><br>
        🌡️ ${v.temp}°C |
        💧 ${v.humidity}% |
        🌬️ ${v.wind.toFixed(1)} km/h
      </div><hr>
    `;
  });

  info.innerHTML = `
    <button onclick="info.style.display='none'">✖</button><br><br>
    ☁️ ${w.description}<br>
    🌡️ ${w.temp} °C<br>
    💧 Umidade: ${w.humidity}%<br>
    🌬️ Vento: ${w.wind.toFixed(1)} km/h<br>
    📊 Pressão: ${w.pressure} hPa<br><br>
    <b>Previsão 5 dias</b><br>
    ${dias}
  `;
});

/* =========================
   ABRIR ALERTA
========================= */
function abrirAlerta(a) {
  info.style.display = "block";

  info.innerHTML = `
    <button onclick="info.style.display='none'">✖</button><br><br>
    <b>${a.emoji || "⚠️"} ${a.title || a.event}</b><br><br>
    ${a.description || a.headline}<br><br>
    <small>Fonte: ${a.source || "INMET/NOAA"}</small>
  `;
}

/* =========================
   INIT
========================= */
carregarINMET();
carregarNOAA();