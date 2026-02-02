<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Cloudwindz | Storm Chaser</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <header id="top-bar">
        <div class="logo">Cloudwindz</div>
        <div class="search-box">
            <input type="text" id="cityInput" placeholder="Buscar local...">
            <button onclick="buscar()">🔍</button>
        </div>
    </header>

    <div id="map"></div>

    <div id="painel-full">
        <button class="btn-fechar-full" onclick="fecharPainel()">✕</button>
        <div id="conteudo-full"></div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        const map = L.map('map', { zoomControl: false }).setView([-15.7938, -47.8827], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        function getClimaEmoji(code) {
            const tab = { 0: "🌞", 1: "🌤️", 2: "⛅", 3: "🌥️", 45: "☁️", 61: "🌧️", 71: "🌨️", 95: "⛈️" };
            return tab[code] || "🌡️";
        }

        map.on('click', async (e) => {
            const { lat, lng } = e.latlng;
            abrirPainelFull("<div class='loader'>Carregando...</div>", "#1a1a1a");
            const res = await fetch(`/api/clima-clique?lat=${lat}&lon=${lng}`);
            const data = await res.json();
            renderizarPainel(data);
        });

        function renderizarPainel(data) {
            const temp = data.clima.current.temperature_2m;
            const code = data.clima.current.weather_code;
            
            let bg = "linear-gradient(180deg, #1e3c72 0%, #121212 100%)";
            if(temp > 30) bg = "linear-gradient(180deg, #f5576c 0%, #121212 100%)";
            if(code >= 95) bg = "linear-gradient(180deg, #4b0082 0%, #000000 100%)";

            // LISTA VERTICAL DE 14 DIAS
            let listaHTML = `<div class='lista-previsao'>`;
            const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
            
            data.clima.daily.time.forEach((t, i) => {
                const d = new Date(t);
                listaHTML += `
                    <div class="linha-dia">
                        <span class="txt-dia">${diasSemana[d.getDay()]}</span>
                        <span class="txt-data">${d.getDate()}/${d.getMonth()+1}</span>
                        <span class="emoji-dia">${getClimaEmoji(data.clima.daily.weather_code[i])}</span>
                    </div>`;
            });
            listaHTML += `</div>`;

            const html = `
                <div class="container-info">
                    <h1 class="cidade">${data.geo.address.city || "Localização"}</h1>
                    <div class="temp-big">${temp}°C</div>
                    
                    <div class="grid-stats">
                        <div class="stat">💧 ${data.clima.current.relative_humidity_2m}%</div>
                        <div class="stat">🌬️ ${data.clima.current.wind_speed_10m}km/h</div>
                        <div class="stat">⏲️ ${data.clima.current.pressure_msl}hPa</div>
                    </div>

                    ${listaHTML}
                </div>
            `;
            abrirPainelFull(html, bg);
        }

        function abrirPainelFull(html, bg) {
            const p = document.getElementById('painel-full');
            p.style.background = bg;
            document.getElementById('conteudo-full').innerHTML = html;
            p.classList.add('active');
        }

        function fecharPainel() { document.getElementById('painel-full').classList.remove('active'); }
        
        async function buscar() {
            const v = document.getElementById('cityInput').value;
            const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${v}`);
            const d = await r.json();
            if(d.length > 0) map.setView([d[0].lat, d[0].lon], 10);
        }
    </script>
</body>
</html>
