const API = "https://radar-backend.onrender.com";

const map = L.map("map",{minZoom:3}).setView([-20,-60],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const layer = L.layerGroup().addTo(map);
const windLayer = L.layerGroup().addTo(map);
const info = document.getElementById("info");

// ===== BUSCA =====
document.getElementById("search").addEventListener("keydown",async e=>{
  if(e.key==="Enter"){
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${e.target.value}`);
    const d = await r.json();
    if(d[0]) map.setView([d[0].lat,d[0].lon],7);
  }
});

// ===== ALERTAS =====
async function carregarAlertas(){
  layer.clearLayers();
  const r = await fetch(`${API}/alertas`);
  const dados = await r.json();

  dados.forEach(p=>{
    let cor = p.emoji.includes("🌪️") ? "#ff0000" : "#ff9800";

    const q = L.rectangle(
      [[p.lat-1,p.lon-1],[p.lat+1,p.lon+1]],
      {fillColor:cor,fillOpacity:.5,weight:0}
    ).addTo(layer);

    q.on("click",()=>{
      info.style.display="block";
      info.innerHTML=`
        <b>${p.emoji}</b><br>
        🌬️ Vento: ${p.vento}<br>
        ☁️ Evento: ${p.nuvem}<br>
        📡 ${p.fonte}<br><br>
        ${p.descricao}
      `;
    });
  });
}

// ===== QUADRADOS DE VENTO =====
function windColor(kmh){
  if(kmh<=1) return "#fff";
  if(kmh<=20) return "#8bc34a";
  if(kmh<=40) return "#ffeb3b";
  if(kmh<=60) return "#ff9800";
  return "#f44336";
}

async function atualizarQuadrados(){
  windLayer.clearLayers();
  const b = map.getBounds();
  for(let lat=b.getSouth();lat<b.getNorth();lat+=5){
    for(let lon=b.getWest();lon<b.getEast();lon+=5){
      const r = await fetch(`${API}/wind?lat=${lat}&lon=${lon}`);
      const d = await r.json();
      L.rectangle(
        [[lat,lon],[lat+5,lon+5]],
        {fillColor:windColor(d.wind_kmh),fillOpacity:.35,weight:0}
      ).addTo(windLayer);
    }
  }
}

map.on("moveend zoomend", atualizarQuadrados);

carregarAlertas();
atualizarQuadrados();
setInterval(carregarAlertas,300000);
