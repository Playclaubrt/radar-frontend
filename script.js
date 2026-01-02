const API = "https://radar-backend-p5d4.onrender.com/";

const map = L.map("map",{minZoom:3}).setView([-20,-60],3);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const alertLayer = L.layerGroup().addTo(map);
const raioLayer = L.layerGroup().addTo(map);
const painel = document.getElementById("painel");

// ===== ALERTAS =====
async function carregarAlertas(){
 alertLayer.clearLayers();
 const r = await fetch(API+"/alertas");
 const d = await r.json();

 d.forEach(a=>{
  L.marker([a.lat,a.lon],{
   icon:L.divIcon({
    html:`<div style="font-size:24px">${a.emoji}</div>`,
    className:""
   })
  }).addTo(alertLayer)
  .on("click",()=>{
   painel.style.display="block";
   painel.innerHTML=`
    <b>${a.texto}</b><br>
    Fonte: ${a.fonte}
   `;
  });
 });
}

// ===== RAIOS =====
async function carregarRaios(){
 raioLayer.clearLayers();
 const r = await fetch(API+"/raios");
 const d = await r.json();

 d.forEach(x=>{
  L.marker([x.lat,x.lon],{
   icon:L.divIcon({
    html:`<div class="raio">⚡</div>`,
    className:""
   })
  }).addTo(raioLayer)
  .on("click",()=>{
   painel.style.display="block";
   painel.innerHTML=`
    ⚡ Raio detectado<br>
    Hora: ${x.hora}<br>
    Intensidade: ${x.forca}
   `;
  });
 });
}

// ===== LOOP =====
carregarAlertas();
carregarRaios();
setInterval(carregarAlertas,300000);
setInterval(carregarRaios,60000);
