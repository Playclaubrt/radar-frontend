const API = "https://radar-backend-p5d4.onrender.com/";

const map = L.map("map",{minZoom:3}).setView([0,0],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const ventoLayer = L.layerGroup().addTo(map);
const alertaLayer = L.layerGroup().addTo(map);
const info = document.getElementById("info");

// ======================
// CORES DO VENTO
// ======================
function corVento(k){
 if(k<1) return "#fff";
 if(k<50) return "#b3e5fc";
 if(k<100) return "#ffeb3b";
 return "#f44336";
}

// ======================
// QUADRADOS DE VENTO
// ======================
async function vento(){
 ventoLayer.clearLayers();
 const b = map.getBounds();
 for(let lat=b.getSouth();lat<b.getNorth();lat+=5){
  for(let lon=b.getWest();lon<b.getEast();lon+=5){
   const r = await fetch(`${API}/wind?lat=${lat}&lon=${lon}`);
   const d = await r.json();
   L.rectangle(
    [[lat,lon],[lat+5,lon+5]],
    {fillColor:corVento(d.wind_kmh),fillOpacity:.45,weight:0}
   ).addTo(ventoLayer);
  }
 }
}

// ======================
// ALERTAS
// ======================
async function alertas(){
 alertaLayer.clearLayers();
 const r = await fetch(`${API}/alertas`);
 const dados = await r.json();

 dados.forEach(a=>{
  const m = L.marker([a.lat,a.lon],{
   icon:L.divIcon({
    html:`<span style="font-size:22px">${a.emoji}</span>`
   })
  }).addTo(alertaLayer);

  m.on("click",()=>mostrarInfo(a.lat,a.lon,a));
 });
}

// ======================
// INFO INFERIOR
// ======================
async function mostrarInfo(lat,lon,a){
 info.style.display="block";
 info.innerHTML=`<button onclick="info.style.display='none'">✖</button>
 <b>${a.tipo||"Alerta"}</b><br>
 ${a.descricao||""}<hr>Carregando...`;

 const r = await fetch(`${API}/detalhes?lat=${lat}&lon=${lon}`);
 const d = await r.json();

 info.innerHTML+=d.map((x,i)=>`
 <b>Dia ${i+1}</b>
 🌡️ ${x.temp}°C
 💧 ${x.umidade}%
 🌬️ ${x.vento.toFixed(1)} km/h
 <hr>`).join("");
}

map.on("moveend zoomend",()=>{
 vento();
 alertas();
});

vento();
alertas();
