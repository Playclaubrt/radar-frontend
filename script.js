const API = "https://radar-backend-orat.onrender.com/";

const map = L.map("map",{
 minZoom:3,maxZoom:8
}).setView([0,0],3);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const ventoLayer = L.layerGroup().addTo(map);
const alertaLayer = L.layerGroup().addTo(map);
const painel = document.getElementById("painel");

// ======================
// GRADE DE VENTO
// ======================
function corVento(v){
 if(v<=1) return "#fff";
 if(v<30) return "#8bc34a";
 if(v<60) return "#ffeb3b";
 if(v<90) return "#ff9800";
 return "#f44336";
}

async function carregarVento(){
 ventoLayer.clearLayers();
 const b = map.getBounds();
 const step = 5;

 for(let lat=b.getSouth();lat<b.getNorth();lat+=step){
  for(let lon=b.getWest();lon<b.getEast();lon+=step){

   const r = await fetch(`${API}/wind?lat=${lat}&lon=${lon}`);
   const d = await r.json();

   L.rectangle(
    [[lat,lon],[lat+step,lon+step]],
    {fillColor:corVento(d.wind_kmh),fillOpacity:.45,weight:0}
   ).addTo(ventoLayer);
  }
 }
}

// ======================
// ALERTAS NOAA
// ======================
async function carregarAlertas(){
 alertaLayer.clearLayers();
 const r = await fetch(`${API}/alertas`);
 const dados = await r.json();

 dados.forEach((a,i)=>{
  const lat = -60 + i*5;
  const lon = -180 + i*10;

  const q = L.rectangle(
   [[lat,lon],[lat+4,lon+4]],
   {fillOpacity:0,weight:0}
  ).addTo(alertaLayer);

  q.on("click",()=>{
   painel.style.display="block";
   painel.innerHTML=`
    <b>${a.emoji} ${a.evento}</b><br><br>
    ${a.descricao || "Sem descrição"}<br><br>
    📡 Fonte: ${a.fonte}
   `;
  });
 });
}

map.on("moveend zoomend",carregarVento);

carregarVento();
carregarAlertas();