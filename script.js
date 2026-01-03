const API = "https://radar-backend-orat.onrender.com/";

const map = L.map("map", { minZoom: 3 }).setView([-20, -60], 3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const windLayer = L.layerGroup().addTo(map);
const alertLayer = L.layerGroup().addTo(map);

const info = document.getElementById("info");

/* ================= BUSCA ================= */
document.getElementById("search").addEventListener("keydown", async e => {
  if (e.key === "Enter") {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${e.target.value}`
    );
    const d = await r.json();
    if (d[0]) {
      map.setView([Number(d[0].lat), Number(d[0].lon)], 7);
    }
  }
});

/* ================= CORES DO VENTO ================= */
function windColor(kmh) {
  if (kmh <= 1) return "#ffffff";
  if (kmh <= 20) return "#bbdefb";
  if (kmh <= 40) return "#4caf50";
  if (kmh <= 60) return "#ffee58";
  if (kmh <= 80) return "#ff9800";
  return "#f44336";
}

/* ================= QUADRADOS DE VENTO ================= */
async function carregarVento() {
  windLayer.clearLayers();

  const r = await fetch(`${API}/wind-grid`);
  const data = await r.json();

  data.forEach(p => {
    const rect = L.rectangle(
      [[p.lat, p.lon], [p.lat + p.step, p.lon + p.step]],
      {
        fillColor: windColor(p.wind),
        fillOpacity: 0.45,
        weight: 0
      }
    );
    windLayer.addLayer(rect);
  });
}

/* ================= ALERTAS NOAA ================= */
async function carregarAlertas() {
  alertLayer.clearLayers();

  const r = await fetch(`${API}/alertas`);
  const alerts = await r.json();

  alerts.forEach(a => {
    const rect = L.rectangle(
      [[a.lat1, a.lon1], [a.lat2, a.lon2]],
      {
        fillOpacity: 0,
        weight: 0,
        interactive: true
      }
    ).addTo(alertLayer);

    rect.bindTooltip(a.emoji, {
      permanent: true,
      direction: "center",
      className: "emoji-alerta"
    });

    rect.on("click", () => {
      info.style.display = "block";
      info.innerHTML = `
        <div id="close" onclick="info.style.display='none'">✖</div>
        <div style="white-space:pre-wrap;font-size:15px">
${a.description}
        </div>
      `;
    });
  });
}

/* ================= PREVISÃO AO CLICAR NO MAPA ================= */
map.on("click", async e => {
  const r = await fetch(
    `${API}/forecast?lat=${e.latlng.lat}&lon=${e.latlng.lng}`
  );
  const d = await r.json();

  info.style.display = "block";
  info.innerHTML = `
    <div id="close" onclick="info.style.display='none'">✖</div>
    <b>Previsão 5 Dias</b><br><br>
    ${d.map(x => `
      📅 ${x.day}<br>
      ☁️ ${x.weather}<br>
      🌡️ ${x.temp} °C<br>
      💧 ${x.humidity}%<br>
      🌬️ ${x.wind} km/h<br><br>
    `).join("")}
  `;
});

/* ================= INIT ================= */
carregarVento();
carregarAlertas();

setInterval(carregarVento, 60000);
setInterval(carregarAlertas, 120000);
