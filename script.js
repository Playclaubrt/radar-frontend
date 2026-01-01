const API = "https://radar-backend.onrender.com";

const map = L.map("map",{minZoom:3}).setView([-20,-60],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const ventoLayer = L.layerGroup().addTo(map);
const alertaLayer = L.layerGroup().addTo(map);
const painel = document.getElementById("painel");

// ===== BUSCA =====
document.getElementById("search").addEventListener("keydown",async e=>{
 if(e.key==="Enter"){
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${e.target.value}`);
  const d = await r.json();
  if(d[0]) map.setView([d[0].lat,d[0].lon],8);
 }
});

// ===== CORES VENTO =====
function corVento(v){
 if(v<20) return "#00ff00";
 if(v<40) return "#ffff00";
 if(v<60) return "#ff9900";
 return "#ff0000";
}

// ===== QUADRADOS VENTO =====
async function vento(){
 ventoLayer.clearLayers();
 const b = map.getBounds();

 for(let lat=b.getSouth();lat<b.getNorth();lat+=5){
  for(let lon=b.getWest();lon<b.getEast();lon+=5){
   const r = await fetch(`${API}/wind?lat=${lat}&lon=${lon}`);
   const d = await r.json();

   L.rectangle([[lat,lon],[lat+5,lon+5]],{
    fillColor:corVento(d.wind_kmh),
    fillOpacity:.4,weight:0
   }).addTo(ventoLayer);
  }
 }
}

// ===== ALERTAS =====
async function alertas(){
 alertaLayer.clearLayers();
 const r = await fetch(`${API}/alertas`);
 const d = await r.json();

 d.forEach(a=>{
  L.rectangle([[a.lat-3,a.lon-3],[a.lat+3,a.lon+3]],{
   fillColor:"#000",
   fillOpacity:0,
   color:a.emoji==="🌪️"?"#800080":"#ff0000",
   weight:2
  }).addTo(alertaLayer)
  .on("click",()=>painel.innerHTML=`
   <b>${a.emoji} ${a.evento}</b><br>
   📡 Fonte: ${a.fonte}
  `|| (painel.style.display="block"));
 });
}

// ===== PAINEL FORECAST =====
map.on("click",async e=>{
 painel.style.display="block";
 const r = await fetch(`${API}/forecast?lat=${e.latlng.lat}&lon=${e.latlng.lng}`);
 const d = await r.json();

 painel.innerHTML = Object.entries(d).map(([dia,v])=>`
  <b>${dia}</b><br>
  🌡️ ${v.temp}°C | 💨 ${v.vento} km/h<br>
  🌧️ ${v.chuva} mm | 🔽 ${v.pressao} hPa
 `).join("<hr>");
});

map.on("moveend zoomend",vento);
vento();
alertas();
setInterval(alertas,300000);
