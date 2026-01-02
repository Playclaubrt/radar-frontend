const API = "https://radar-backend-p5d4.onrender.com/";

const map = L.map("map").setView([0,0],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const ventoLayer = L.layerGroup().addTo(map);
const alertaLayer = L.layerGroup().addTo(map);
const info = document.getElementById("info");
const windBar = document.getElementById("windBar");

function corVento(v){
 if(v<10) return "#ffffff";
 if(v<40) return "#81d4fa";
 if(v<80) return "#ffd54f";
 return "#e53935";
}

// =======================
// VENTO INSTANTÂNEO
// =======================
async function vento(){
 ventoLayer.clearLayers();
 const b = map.getBounds();

 for(let lat=b.getSouth();lat<b.getNorth();lat+=4){
  for(let lon=b.getWest();lon<b.getEast();lon+=4){
   fetch(`${API}/wind?lat=${lat}&lon=${lon}`)
    .then(r=>r.json())
    .then(d=>{
     L.rectangle(
      [[lat,lon],[lat+4,lon+4]],
      {fillColor:corVento(d.wind),fillOpacity:.5,weight:0}
     ).addTo(ventoLayer);
    });
  }
 }
}

// =======================
// ALERTAS NOAA PURO
// =======================
async function alertas(){
 alertaLayer.clearLayers();
 const r = await fetch(`${API}/alertas`);
 const data = await r.json();

 data.forEach(a=>{
  const m = L.marker([a.lat,a.lon],{
   icon:L.divIcon({
    html:"⚠️",
    className:"",
    iconSize:[24,24]
   })
  }).addTo(alertaLayer);

  m.on("click",()=>{
   info.style.display="block";
   info.innerHTML=`
   <b>${a.event}</b><br>
   ${a.headline || ""}<hr>
   ${a.description || ""}<hr>
   ${a.instruction || ""}
   `;
  });
 });
}

// =======================
// CLICK MAPA = INFO
// =======================
map.on("click", async e=>{
 const r = await fetch(`${API}/timeline?lat=${e.latlng.lat}&lon=${e.latlng.lng}`);
 const d = await r.json();

 windBar.innerHTML = d.map((x,i)=>`
 Dia ${i+1} 🌡️${x.temp}° 💧${x.humidity}% 🌬️${x.wind}km/h
 `).join(" | ");
});

// =======================
map.on("moveend zoomend",()=>{
 vento();
 alertas();
});

vento();
alertas();
