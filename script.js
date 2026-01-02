const API = "https://radar-backend-p5d4.onrender.com/";

const map = L.map("map",{minZoom:3}).setView([-20,-60],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const ventoLayer = L.layerGroup().addTo(map);
const alertaLayer = L.layerGroup().addTo(map);
const info = document.getElementById("info");

// -------- BUSCA --------
document.getElementById("search").addEventListener("keydown", async e=>{
  if(e.key==="Enter"){
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${e.target.value}`);
    const d = await r.json();
    if(d[0]) map.setView([d[0].lat,d[0].lon],7);
  }
});

// -------- COR DO VENTO --------
function corVento(kmh){
  if(kmh<=1) return "#ffffff";
  if(kmh<=20) return "#a5d8ff";
  if(kmh<=40) return "#69db7c";
  if(kmh<=60) return "#ffd43b";
  if(kmh<=80) return "#ff922b";
  return "#f03e3e";
}

// -------- QUADRADOS --------
async function atualizar(){
  ventoLayer.clearLayers();
  alertaLayer.clearLayers();

  const b = map.getBounds();
  const step = map.getZoom() <= 4 ? 10 : 5;

  for(let lat=Math.floor(b.getSouth()); lat<b.getNorth(); lat+=step){
    for(let lon=Math.floor(b.getWest()); lon<b.getEast(); lon+=step){

      // vento
      const vr = await fetch(`${API}/vento?lat=${lat}&lon=${lon}`);
      const vd = await vr.json();

      L.rectangle([[lat,lon],[lat+step,lon+step]],{
        fillColor:corVento(vd.wind_kmh),
        fillOpacity:0.45,
        weight:0
      }).addTo(ventoLayer);

      // alertas
      const ar = await fetch(`${API}/alertas?lat=${lat}&lon=${lon}`);
      const ad = await ar.json();

      if(ad.length>0){
        const m = L.marker([lat+step/2,lon+step/2],{
          opacity:0.9,
          icon:L.divIcon({html:"⚠️",className:""})
        }).addTo(alertaLayer);

        m.on("click",async ()=>{
          const pr = await fetch(`${API}/previsao?lat=${lat}&lon=${lon}`);
          const pd = await pr.json();

          info.style.display="block";
          info.innerHTML = `
            <b>${ad[0].evento}</b><br>
            ${ad[0].descricao}<hr>
            🌡️ ${pd[0].temp}°C |
            🌬️ ${pd[0].vento} km/h |
            💧 ${pd[0].umidade}% |
            ☁️ ${pd[0].nuvem}
          `;
        });
      }
    }
  }
}

map.on("moveend zoomend", atualizar);
atualizar();
