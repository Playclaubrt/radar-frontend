const API = "https://radar-backend-orat.onrender.com/";

const map = L.map("map",{minZoom:3,maxZoom:7}).setView([-20,-50],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const windLayer = L.layerGroup().addTo(map);
const alertLayer = L.layerGroup().addTo(map);
const panel = document.getElementById("panel");

document.getElementById("search").addEventListener("keydown",async e=>{
 if(e.key==="Enter"){
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${e.target.value}`);
  const d = await r.json();
  if(d[0]) map.setView([d[0].lat,d[0].lon],6);
 }
});

// ===================
// QUADRADOS DE VENTO (GRADE LAT/LON – RÁPIDO)
// ===================
function windColor(v){
 if(v<20) return "#9be7ff";
 if(v<40) return "#7CFC00";
 if(v<60) return "#FFD700";
 if(v<80) return "#FF8C00";
 return "#FF0000";
}

async function loadWind(){
 windLayer.clearLayers();
 const b = map.getBounds();
 const step = 5;

 for(let lat=Math.floor(b.getSouth());lat<b.getNorth();lat+=step){
  for(let lon=Math.floor(b.getWest());lon<b.getEast();lon+=step){
   fetch(`${API}/owm?lat=${lat}&lon=${lon}`)
   .then(r=>r.json())
   .then(d=>{
     L.rectangle([[lat,lon],[lat+step,lon+step]],{
      fillColor:windColor(d.wind),
      fillOpacity:0.45,
      weight:0
     }).addTo(windLayer);
   });
  }
 }
}

// ===================
// ALERTAS NOAA + INMET
// ===================
async function loadAlerts(){
 alertLayer.clearLayers();

 const noaa = await fetch(`${API}/noaa`).then(r=>r.json());
 const inmet = await fetch(`${API}/inmet`).then(r=>r.json());

 [...noaa,...inmet].forEach(a=>{
  const lat = (a.bounds[0][0]+a.bounds[1][0])/2;
  const lon = (a.bounds[0][1]+a.bounds[1][1])/2;

  const m = L.marker([lat,lon],{
    icon:L.divIcon({html:"⚠️",className:""})
  }).addTo(alertLayer);

  m.on("click",()=>panel.innerHTML=`
   <b>${a.title}</b><br><br>
   ${a.description}<br><br>
   Fonte: ${a.source}
  ` || (panel.style.display="block"));
 });
}

// ===================
// CLICK MAP → PREVISÃO 5 DIAS
// ===================
map.on("click",async e=>{
 const r = await fetch(`${API}/forecast?lat=${e.latlng.lat}&lon=${e.latlng.lng}`);
 const d = await r.json();

 panel.style.display="block";
 panel.innerHTML = d.map((i,idx)=>`
  <b>Dia ${idx+1}</b><br>
  🌡️ ${i.temp}°C<br>
  💧 ${i.humidity}%<br>
  🌬️ ${i.wind.toFixed(1)} km/h<br>
  📊 ${i.pressure} hPa<br><br>
 `).join("");
});

map.on("moveend zoomend",loadWind);

loadWind();
loadAlerts();
setInterval(loadAlerts,300000);