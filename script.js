const API = "https://radar-backend-p5d4.onrender.com/";

const map = L.map("map",{minZoom:3}).setView([-15,-55],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const alertLayer = L.layerGroup().addTo(map);
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

// ===== ALERTAS NOAA =====
async function carregarAlertas(){
 alertLayer.clearLayers();
 const r = await fetch(`${API}/alertas`);
 const dados = await r.json();

 dados.forEach(a=>{
   const m = L.marker([a.lat,a.lon],{
     icon:L.divIcon({html:a.emoji,iconSize:[24,24]})
   }).addTo(alertLayer);

   m.on("click",()=>{
     info.style.display="block";
     info.innerHTML=`
     <b>${a.emoji} ${a.evento}</b><br><br>
     ${a.headline}<br><br>
     <b>Severidade:</b> ${a.severidade}<br>
     <b>Urgência:</b> ${a.urgencia}<br><br>
     ${a.descricao}<br><br>
     <i>${a.instrucao || ""}</i><br><br>
     📡 Fonte: ${a.fonte}
     `;
   });
 });
}

// ===== QUADRADOS DE VENTO =====
function corVento(v){
 if(v<=1)return"#fff";
 if(v<=20)return"#a5d8ff";
 if(v<=40)return"#4caf50";
 if(v<=60)return"#ffeb3b";
 if(v<=80)return"#ff9800";
 return"#f44336";
}

async function ventoGrid(){
 windLayer.clearLayers();
 const b=map.getBounds();
 const step=map.getZoom()<4?10:5;

 for(let lat=b.getSouth();lat<b.getNorth();lat+=step){
  for(let lon=b.getWest();lon<b.getEast();lon+=step){
   try{
    const r=await fetch(`${API}/wind?lat=${lat}&lon=${lon}`);
    const d=await r.json();
    L.rectangle([[lat,lon],[lat+step,lon+step]],{
      fillColor:corVento(d.kmh),
      fillOpacity:0.35,
      weight:0
    }).addTo(windLayer);
   }catch{}
  }
 }
}

map.on("moveend zoomend",ventoGrid);

carregarAlertas();
ventoGrid();
setInterval(carregarAlertas,300000);
