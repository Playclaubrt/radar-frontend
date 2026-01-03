const API = "https://radar-backend-1-j3y5.onrender.com";

const map = L.map("map").setView([-15, -55], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const panel = document.getElementById("panel");

function showPanel(html){
 panel.innerHTML = html;
 panel.style.display = "block";
}

fetch(`${API}/inmet`).then(r=>r.json()).then(alertas=>{
 alertas.forEach(a=>{
   if(a.tipo==="geometrico" && a.poligono){
     L.polygon(a.poligono,{color:"orange"})
      .addTo(map)
      .on("click",()=>showPanel(`<h3>${a.titulo}</h3><p>${a.texto}</p>`));
   }else{
     a.ufs.forEach(u=>{
       L.marker([u.lat,u.lon],{
         icon:L.divIcon({html:"⚠️",className:"alert"})
       }).addTo(map)
       .on("click",()=>showPanel(`<h3>${a.titulo}</h3><p>${a.texto}</p>`));
     });
   }
 });
});

map.on("click",e=>{
 fetch(`${API}/owm?lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
 .then(r=>r.json()).then(w=>{
   fetch(`${API}/forecast?lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
   .then(r=>r.json()).then(f=>{
     showPanel(`
     🌥️ ${w.weather[0].description}<br>
     🌡️ ${w.main.temp} °C<br>
     💧 Umidade: ${w.main.humidity}%<br>
     🌬️ Vento: ${w.wind.speed} km/h<br>
     📊 Pressão: ${w.main.pressure} hPa<br>
     <hr>
     <b>Previsão 5 dias:</b><br>
     ${f.list.filter((_,i)=>i%8===0).map(d=>`
       ${new Date(d.dt*1000).toLocaleDateString()} - ${d.main.temp}°C
     `).join("<br>")}
     `);
   });
 });
});