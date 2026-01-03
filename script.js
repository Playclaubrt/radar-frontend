const API = "https://radar-backend-orat.onrender.com/";

const map = L.map("map",{minZoom:3}).setView([-15,-45],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const alertLayer = L.layerGroup().addTo(map);
const info = document.getElementById("info");

// ======================
// BUSCA
// ======================
document.getElementById("search").addEventListener("keydown", async e=>{
  if(e.key==="Enter"){
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${e.target.value}`);
    const d = await r.json();
    if(d[0]) map.setView([d[0].lat,d[0].lon],7);
  }
});

// ======================
// ALERTAS
// ======================
async function carregarAlertas(){
  alertLayer.clearLayers();

  const r = await fetch(`${API}/alertas`);
  const dados = await r.json();

  [...dados.noaa, ...dados.inmet].forEach(a=>{
    const lat = (Math.random()*140)-70;
    const lon = (Math.random()*360)-180;

    const div = L.divIcon({
      html:`<div style="font-size:26px">${a.emoji}</div>`,
      className:"",
      iconSize:[30,30]
    });

    const m = L.marker([lat,lon],{icon:div}).addTo(alertLayer);

    m.on("click",()=>{
      info.style.display="block";
      info.innerHTML=`
        <b>${a.emoji} ${a.event}</b><br><br>
        ${a.description || ""}<br><br>
        📡 Fonte: ${a.source}
      `;
    });
  });
}

carregarAlertas();
setInterval(carregarAlertas,300000);