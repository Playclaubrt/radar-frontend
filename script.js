const map = L.map('map', { zoomControl: false }).setView([-15.7, -47.8], 4);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

let activeLayer = null;

// DEFINIÇÃO DAS 30 CAMADAS
const camadas = [
    { id: 'radar', n: 'Radar Doppler Vivo', e: '📡', p: 'rv' },
    { id: 'precipitation_new', n: 'Chuva 1h', e: '🌧️', p: 'owm' },
    { id: 'temp_new', n: 'Temperatura Ar', e: '🌡️', p: 'owm' },
    { id: 'wind_new', n: 'Ventos Global', e: '🍃', p: 'owm' },
    { id: 'clouds_new', n: 'Nuvens/Satélite', e: '☁️', p: 'owm' },
    { id: 'pressure_new', n: 'Pressão Atmosf.', e: '⏲️', p: 'owm' },
    { id: 'apparent_temperature', n: 'Sensação Térmica', e: '🥵', p: 'om' },
    { id: 'relative_humidity_2m', n: 'Umidade Relativa', e: '💧', p: 'om' },
    { id: 'uv_index', n: 'Índice UV', e: '☀️', p: 'om' },
    { id: 'cape', n: 'Energia CAPE (Raios)', e: '⚡', p: 'om' },
    { id: 'visibility', n: 'Visibilidade', e: '👁️', p: 'om' },
    { id: 'pm2_5', n: 'Qualidade do Ar', e: '🌫️', p: 'om_air' },
    { id: 'dust', n: 'Poeira/Dust', e: '🏜️', p: 'om_air' },
    { id: 'wave_height', n: 'Altura de Ondas', e: '🌊', p: 'om_marine' },
    { id: 'soil_moisture_0_1cm', n: 'Umidade do Solo', e: '🌱', p: 'om' },
    { id: 'snow', n: 'Acúmulo de Neve', e: '❄️', p: 'owm' },
    { id: 'carbon_monoxide', n: 'Monóxido Carbono', e: '🏭', p: 'om_air' },
    { id: 'nitrogen_dioxide', n: 'Dióxido Nitrogênio', e: '🚗', p: 'om_air' },
    { id: 'pollen_birch', n: 'Pólen (Alergia)', e: '🌻', p: 'om_air' },
    { id: 'ocean_currents', n: 'Correntes Mar.', e: '🔄', p: 'om_marine' },
    { id: 'sea_surface_temperature', n: 'Temp. do Mar', e: '🌅', p: 'om_marine' },
    { id: 'wind_gusts_10m', n: 'Rajadas de Vento', e: '🌬️', p: 'om' },
    { id: 'freezing_level_height', n: 'Nível Gelo (Alt)', e: '🏔️', p: 'om' },
    { id: 'evapotranspiration', n: 'Evapotranspiração', e: '🍂', p: 'om' },
    { id: 'soil_temperature_0cm', n: 'Temp. Solo 0cm', e: '🌍', p: 'om' },
    { id: 'surface_pressure', n: 'Pressão Local', e: '📈', p: 'om' },
    { id: 'cloud_ceiling', n: 'Teto de Nuvens', e: '🛫', p: 'om' },
    { id: 'lifted_index', n: 'Estabilidade LI', e: '🌪️', p: 'om' },
    { id: 'convective_precipitation', n: 'Chuva Convectiva', e: '⛈️', p: 'om' },
    { id: 'heat_index', n: 'Índice Calor', e: '🔥', p: 'om' }
];

// Gerar Botões
const container = document.getElementById('container-camadas');
camadas.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'btn-layer-opt';
    btn.innerHTML = `${c.e} ${c.n}`;
    btn.onclick = () => {
        if(activeLayer) map.removeLayer(activeLayer);
        let url = c.p === 'rv' ? "https://tilecache.rainviewer.com/v2/radar/nowcast_5/256/{z}/{x}/{y}/2/1_1.png" :
                  c.p === 'owm' ? `https://tile.openweathermap.org/map/${c.id}/{z}/{x}/{y}.png?appid=79e72ce9f0e1cf547285186b5b54687d` :
                  `https://maps.open-meteo.com/v1/forecast?layers=${c.id}&format=tile&z={z}&x={x}&y={y}`;
        activeLayer = L.tileLayer(url, { opacity: 0.75 }).addTo(map);
    };
    container.appendChild(btn);
});

// Clique no Mapa
map.on('click', async (e) => {
    const res = await fetch(`/api/clima-clique?lat=${e.latlng.lat}&lon=${e.latlng.lng}`);
    const data = await res.json();
    
    document.getElementById('main-temp').innerText = `${Math.round(data.current.temperature_2m)}°C`;
    document.getElementById('val-umi').innerText = `${data.current.relative_humidity_2m}%`;
    document.getElementById('val-wind').innerText = `${data.current.wind_speed_10m} km/h`;
    document.getElementById('val-pres').innerText = `${data.current.surface_pressure} hPa`;
    document.getElementById('val-vis').innerText = `${data.current.visibility / 1000} km`;
    document.getElementById('val-nas').innerText = data.daily.sunrise[0].split('T')[1];
    document.getElementById('val-por').innerText = data.daily.sunset[0].split('T')[1];
    document.getElementById('cidade-txt').innerText = `Coord: ${e.latlng.lat.toFixed(2)}, ${e.latlng.lng.toFixed(2)}`;
});

// Ver Alertas
async function verAlertas(tipo) {
    const res = await fetch('/api/alertas');
    const data = await res.json();
    const box = document.getElementById('scroll-conteudo');
    const painel = document.getElementById('painel-alertas-lista');
    painel.style.display = 'block';
    box.innerHTML = "";
    
    const lista = tipo === 'inmet' ? data.inmet : data.noaa;
    lista.forEach(a => {
        box.innerHTML += `<div style="padding:10px; border-bottom:1px solid #222;">
            <b style="color:#00ff99;">${a.title || a.properties.headline}</b><br>
            <p style="font-size:11px; color:#ccc;">${a.description || a.properties.description}</p>
        </div>`;
    });
}
