const API = "https://radar-backend-orat.onrender.com/";

const map = L.map("map",{minZoom:3,maxZoom:8}).setView([-20,-60],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const windLayer = L.layerGroup().addTo(map);
const alertLayer = L.layerGroup().addTo(map);

const bottomBox = document.getElementById("bottomBox");
const forecastContent = document.getElementById("forecastContent");

// ===== BUSCA =====
document.getElementById("search").addEventListener("keydown",async e=>{
  if(e.key==="Enter"){
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${e.target.value}`);
    const d = await r.json();
    if(d[0]) map.setView([d[0].lat,d[0].lon],6);
  }
});

// ===== COR DO VENTO =====
function windColor(kmh){
  if(kmh<10) return "#cce7ff";
  if(kmh<30) return "#8bc34a";
  if(kmh<60) return "#ffeb3b";
  if(kmh<90) return "#ff9800";
  return "#f44336";
}

// ===== QUADRADOS DE VENTO (RÁPIDO) =====
function atualizarVento(){
  windLayer.clearLayers();
  const c = map.getCenter();
  const step = 2;

  for(let i=-3;i<=3;i++){
    for(let j=-3;j<=3;j++){
      const lat=c.lat+i*step;
      const lon=c.lng+j*step;

      fetch(`${API}/wind-grid?lat=${lat}&lon=${lon}`)
        .then(r=>r.json())
        .then(d=>{
          L.rectangle(
            [[lat,lon],[lat+step,lon+step]],
            {fillColor:windColor(d.wind_kmh),fillOpacity:.45,weight:0}
          ).addTo(windLayer);
        });
    }
  }
}

// ===== ALERTAS NOAA =====
function carregarAlertas(){
  fetch(`${API}/alertas`)
    .then(r=>r.json())
    .then(d=>{
      alertLayer.clearLayers();
      d.forEach(a=>{
        const r=L.rectangle(
          [[-90,-180],[90,180]],
          {fillOpacity:0,weight:0}
        );
        r.on("click",()=>mostrarAlerta(a));
        alertLayer.addLayer(r);
      });
    });
}

function mostrarAlerta(a){
  bottomBox.style.display="block";
  forecastContent.innerHTML=`
    <b>${a.event}</b><br><br>
    ${a.description}
  `;
}

// ===== FORECAST 5 DIAS =====
map.on("click",e=>{
  fetch(`${API}/forecast?lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
    .then(r=>r.json())
    .then(d=>{
      bottomBox.style.display="block";
      forecastContent.innerHTML=d.list.slice(0,5).map(x=>`
        🌡️ ${x.main.temp}°C
        💧 ${x.main.humidity}%
        🌬️ ${(x.wind.speed*3.6).toFixed(1)} km/h
        ☁️ ${x.weather[0].main}
      `).join("<hr>");
    });
});

map.on("moveend zoomend",atualizarVento);

atualizarVento();
carregarAlertas();