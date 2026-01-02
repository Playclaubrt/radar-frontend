const API = "https://radar-backend-p5d4.onrender.com/";

const map = L.map("map",{minZoom:3}).setView([0,0],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const ventoLayer = L.layerGroup().addTo(map);
const alertaLayer = L.layerGroup().addTo(map);
const info = document.getElementById("info");

// =====================
// ESCALA DE VENTO
// =====================
function corVento(k){
 if(k<1) return "transparent";
 if(k<20) return "#90caf9";
 if(k<40) return "#42a5f5";
 if(k<60) return "#ffee58";
 if(k<80) return "#ff9800";
 return "#f44336";
}

// =====================
// QUADRADOS DE VENTO (estável)
// =====================
async function vento(){
 ventoLayer.clearLayers();
 const b = map.getBounds();
 const step = map.getZoom() < 5 ? 8 : 4;

 for(let lat=b.getSouth();lat<b.getNorth();lat+=step){
  for(let lon=b.getWest();lon<b.getEast();lon+=step){
   const r = await fetch(`${API}/wind?lat=${lat}&lon=${lon}`);
   const d = await r.json();

   L.rectangle(
    [[lat,lon],[lat+step,lon+step]],
    {fillColor:corVento(d.wind),fillOpacity:.55,weight:0}
   ).addTo(ventoLayer);
  }
 }
}

// =====================
// ALERTAS
// =====================
async function alertas(){
 alertaLayer.clearLayers();
 const r = await fetch(`${API}/alertas`);
 const d = await r.json();

 d.forEach(a=>{
  L.marker([a.lat,a.lon],{
   icon:L.divIcon({html:`<div style="font-size:28px">${a.emoji}</div>`})
  })
  .on("click",()=>abrirPainel(a))
  .addTo(alertaLayer);
 });
}

// =====================
// PAINEL + PREVISÃO
// =====================
async function abrirPainel(a){
 info.style.display="block";
 const f = await fetch(`${API}/forecast?lat=${a.lat}&lon=${a.lon}`);
 const dias = await f.json();

 info.innerHTML = `
 <div id="close">✖</div>
 <b>${a.event}</b><br>${a.description}<hr>
 ${dias.map(d=>`
 🌡️ ${d.temp}°C | 💧 ${d.humidity}% | ☁️ ${d.weather}<br>
 `).join("")}
 `;
 document.getElementById("close").onclick=()=>info.style.display="none";
}

map.on("moveend zoomend", vento);

vento();
alertas();
