const API = "https://SEU-BACKEND.onrender.com";

const map = L.map("map",{minZoom:3}).setView([-15,-50],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const info = document.getElementById("info");
const layerAlertas = L.layerGroup().addTo(map);

document.getElementById("search").addEventListener("keydown", async e=>{
 if(e.key==="Enter"){
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${e.target.value}`);
  const d = await r.json();
  if(d[0]) map.setView([d[0].lat,d[0].lon],8);
 }
});

// ===== INMET =====
async function carregarINMET(){
 layerAlertas.clearLayers();
 const r = await fetch(`${API}/inmet`);
 const d = await r.json();

 d.geograficos.forEach(a=>{
  a.areas.forEach(ar=>{
   if(ar.coordenadas){
    const poly = L.polygon(ar.coordenadas,{
     color:"transparent",
     fillOpacity:0
    }).addTo(layerAlertas);

    poly.on("click",()=>{
     info.style.display="block";
     info.innerHTML = `
      ⚠️ ${a.evento}<br><br>
      ${a.descricao}<br>
      Início: ${a.inicio}<br>
      Fim: ${a.fim}
     `;
    });
   }
  });
 });

 d.textuais.forEach(t=>{
  const m = L.marker(map.getCenter(),{opacity:0}).addTo(layerAlertas);
  m.on("click",()=>{
   info.style.display="block";
   info.innerHTML = `<b>${t.titulo}</b><br><br>${t.texto}`;
  });
 });
}

map.on("click", async e=>{
 const r = await fetch(`${API}/owm?lat=${e.latlng.lat}&lon=${e.latlng.lng}`);
 const d = await r.json();

 info.style.display="block";
 info.innerHTML = `
  🌡️ ${d.atual.temp}°C<br>
  💧 Umidade: ${d.atual.umidade}%<br>
  🌬️ Vento: ${d.atual.vento.toFixed(1)} km/h<br>
  ☁️ ${d.atual.tempo}
 `;
});

carregarINMET();
setInterval(carregarINMET,300000);