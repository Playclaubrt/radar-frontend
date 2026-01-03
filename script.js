const API = "https://radar-backend-orat.onrender.com/";

const map = L.map("map",{minZoom:3}).setView([-15,-55],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const panel = document.getElementById("panel");
const content = document.getElementById("content");

document.getElementById("search").addEventListener("keydown", async e=>{
  if(e.key==="Enter"){
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${e.target.value}`);
    const d = await r.json();
    if(d[0]) map.setView([d[0].lat,d[0].lon],8);
  }
});

// ===============================
// INMET ALERTS
// ===============================
async function loadINMET(){
  const r = await fetch(`${API}/inmet`);
  const data = await r.json();

  data.forEach(a=>{
    const marker = L.marker([-15,-55]).addTo(map); // posição aproximada
    marker.on("click",()=>{
      panel.style.display="block";
      content.innerHTML=`
        <b>${a.title}</b><br><br>
        ${a.description}<br><br>
        <small>Fonte: INMET</small>
      `;
    });
  });
}

// ===============================
// NOAA ALERTS
// ===============================
async function loadNOAA(){
  const r = await fetch(`${API}/noaa`);
  const data = await r.json();

  data.forEach(a=>{
    const marker = L.marker([40,-100]).addTo(map);
    marker.on("click",()=>{
      panel.style.display="block";
      content.innerHTML=`
        <b>${a.title}</b><br><br>
        ${a.summary}<br><br>
        <small>Fonte: NOAA</small>
      `;
    });
  });
}

loadINMET();
loadNOAA();