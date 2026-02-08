const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

// CONFIGURAÇÃO DE CACHE EM MS
let cacheAlertas = { data: null, lastUpdate: 0 };
const ALERTAS_TTL = 300000; // 5 minutos em ms

let cacheClima = new Map();
const CLIMA_TTL = 600000; // 10 minutos em ms

app.get('/api/alertas', async (req, res) => {
    const agora = Date.now();
    if (cacheAlertas.data && (agora - cacheAlertas.lastUpdate < ALERTAS_TTL)) {
        return res.json(cacheAlertas.data);
    }

    try {
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/'),
            axios.get('https://api.weather.gov/alerts/active', { headers: { 'User-Agent': 'StormMonitor' } })
        ]);
        const parser = new xml2js.Parser();
        const inmet = resInmet.status === 'fulfilled' ? (await parser.parseStringPromise(resInmet.value.data))?.rss?.channel[0]?.item : [];
        const noaa = resNoaa.status === 'fulfilled' ? resNoaa.value.data.features : [];
        
        cacheAlertas = { data: { inmet, noaa }, lastUpdate: agora };
        res.json(cacheAlertas.data);
    } catch (e) { res.json({ inmet: [], noaa: [] }); }
});

app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    const key = `${parseFloat(lat).toFixed(2)}|${parseFloat(lon).toFixed(2)}`;
    const agora = Date.now();

    if (cacheClima.has(key) && (agora - cacheClima.get(key).last < CLIMA_TTL)) {
        return res.json(cacheClima.get(key).data);
    }

    try {
        const [clima, ar, geo] = await Promise.allSettled([
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,pressure_msl,visibility,wind_speed_10m,wind_direction_10m&daily=weather_code,sunrise,sunset,temperature_2m_max&forecast_days=14&timezone=auto`),
            axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi`),
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: {'User-Agent': 'Monitor'} })
        ]);
        const total = { clima: clima.value.data, ar: ar.value.data, geo: geo.value.data };
        cacheClima.set(key, { data: total, last: agora });
        res.json(total);
    } catch (e) { res.status(500).send("Erro"); }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
