const map = L.map("map",{minZoom:3}).setView([-20,-60],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const layer = L.layerGroup().addTo(map);
const info = document.getElementById("info");

document.getElementById("search").addEventListener("keydown",async e=>{
  if(e.key==="Enter"){
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${e.target.value}`);
    const d = await r.json();
    if(d[0]) map.setView([d[0].lat,d[0].lon],8);
  }
});

async function carregar(){
  layer.clearLayers();
  const r = await fetch("https://radar-backend-1-yfkr.onrender.com/alertas");
  const dados = await r.json();

  dados.forEach(p=>{
    let cor="#fff";
    if(p.emoji.includes("🚨")) cor="#ff0000";
    else if(p.emoji==="🟣") cor="#a020f0";
    else if(p.emoji==="🌪️") cor="#ff4500";
    else if(p.emoji==="🌀") cor="#00bfff";

    const q = L.rectangle(
      [[p.lat-5,p.lon-5],[p.lat+5,p.lon+5]],
      {fillColor:cor,color:cor,fillOpacity:.4,weight:0}
    ).addTo(layer);

    q.on("click",()=>{
      info.style.display="block";
      info.innerHTML=`
        <b>${p.emoji}</b><br><br>
        🌬️ Vento: ${p.vento} km/h<br>
        ☁️ Nuvem: ${p.nuvem}<br>
        📡 Fonte: INMET / NOAA / OWM
      `;
    });
  });
}

carregar();
setInterval(carregar,300000);

// ===== CAMADA DE QUADRADOS DE VENTO =====
const windLayer = L.layerGroup().addTo(map);

function windColor(kmh) {
  if (kmh <= 1) return "#ffffff";
  if (kmh <= 20) return "#cce7ff";
  if (kmh <= 40) return "#8bc34a";
  if (kmh <= 60) return "#ffeb3b";
  if (kmh <= 80) return "#ff9800";
  if (kmh <= 120) return "#f44336";
  return "#8e24aa";
}

async function atualizarQuadradosVento() {
  windLayer.clearLayers();

  const bounds = map.getBounds();
  const zoom = map.getZoom();

  let step =
    zoom <= 3 ? 20 :
    zoom <= 4 ? 10 :
    zoom <= 5 ? 5 :
    zoom <= 6 ? 2 : 1;

  for (let lat = Math.floor(bounds.getSouth()); lat < bounds.getNorth(); lat += step) {
    for (let lon = Math.floor(bounds.getWest()); lon < bounds.getEast(); lon += step) {

      try {
        const r = await fetch(`https://radar-backend-1-yfkr.onrender.com/wind?lat=${lat}&lon=${lon}`);
        const d = await r.json();

        const rect = L.rectangle(
          [[lat, lon], [lat + step, lon + step]],
          {
            fillColor: windColor(d.wind_kmh),
            fillOpacity: 0.45,
            weight: 0
          }
        );

        windLayer.addLayer(rect);

      } catch (e) {}
    }
  }
}

map.on("zoomend moveend", atualizarQuadradosVento);
atualizarQuadradosVento();
