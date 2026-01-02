const API = "https://radar-backend-p5d4.onrender.com/";

const map = L.map("map",{minZoom:3}).setView([0,0],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const ventoLayer = L.layerGroup().addTo(map);
const alertaLayer = L.layerGroup().addTo(map);

const info = document.getElementById("info");

// 🔍 Busca
document.getElementById("search").addEventListener("keydown",async e=>{
 if(e.key==="Enter"){
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${e.target.value}`);
  const d = await r.json();
  if(d[0]) map.setView([d[0].lat,d[0].lon],8);
 }
});

// ===== STEP POR ZOOM (ANTI-ALAGAMENTO)
function stepPorZoom(z){
 if(z<=3) return 12;
 if(z<=4) return 8;
 if(z<=6) return 4;
 if(z<=8) return 2;
 return 1;
}

// ===== ESCALA DE VENTO REAL (km/h)
function corVento(kmh){
 if(kmh<1) return "rgba(0,0,0,0)";
 if(kmh<10) return "#e3f2fd";
 if(kmh<25) return "#90caf9";
 if(kmh<40) return "#42a5f5";
 if(kmh<60) return "#ffee58";
 if(kmh<80) return "#ffb300";
 if(kmh<100) return "#f4511e";
 return "#b71c1c";
}

// ===== VENTO EM MILISSEGUNDOS
let lock=false;
async function atualizarVento(){
 if(lock) return;
 lock=true;

 ventoLayer.clearLayers();
 const b=map.getBounds();
 const step=stepPorZoom(map.getZoom());

 for(let lat=Math.floor(b.getSouth());lat<b.getNorth();lat+=step){
  for(let lon=Math.floor(b.getWest());lon<b.getEast();lon+=step){
   fetch(`${API}/wind?lat=${lat}&lon=${lon}`)
    .then(r=>r.json())
    .then(d=>{
     L.rectangle(
      [[lat,lon],[lat+step,lon+step]],
      {fillColor:corVento(d.wind),fillOpacity:.55,weight:0}
     ).addTo(ventoLayer);
    });
  }
 }
 setTimeout(()=>lock=false,700);
}

// ===== ALERTAS NOAA / INMET
async function carregarAlertas(){
 alertaLayer.clearLayers();
 const r = await fetch(`${API}/alertas`);
 const dados = await r.json();

 dados.forEach(a=>{
  const m = L.marker([a.lat,a.lon],{
   icon:L.divIcon({
    html:`<div style="font-size:26px">${a.emoji}</div>`
   })
  }).addTo(alertaLayer);

  m.on("click",()=>abrirPainel(a));
 });
}

// ===== PAINEL MOBILE
function abrirPainel(d){
 info.style.display="block";
 info.innerHTML=`
 <div id="close">✖</div>
 <b>${d.event}</b><br><br>
 ${d.description || ""}<hr>
 🌡️ ${d.temp}°C<br>
 💧 Umidade: ${d.humidity}%<br>
 🌬️ Vento: ${d.wind} km/h<br>
 📅 Previsão: Seg → Sex
 `;
 document.getElementById("close").onclick=()=>info.style.display="none";
}

map.on("zoomend moveend", atualizarVento);

atualizarVento();
carregarAlertas();
