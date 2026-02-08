const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname)));

let cacheAlertas = { data: null, lastUpdate: 0 };
let cacheClima = new Map();

app.get('/api/alertas', async (req, res) => {
    const agora = Date.now();
    if (cacheAlertas.data && (agora - cacheAlertas.lastUpdate < 30000)) return res.json(cacheAlertas.data);
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
    const key = `${lat}|${lon}`;
    if (cacheClima.has(key) && (Date.now() - cacheClima.get(key).last < 10000)) return res.json(cacheClima.get(key).data);
    try {
        const [clima, geo] = await Promise.allSettled([
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m&timezone=auto`),
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: {'User-Agent': 'Monitor'} })
        ]);
        const total = { clima: clima.value.data, geo: geo.value.data };
        cacheClima.set(key, { data: total, last: Date.now() });
        res.json(total);
    } catch (e) { res.status(500).send("Erro"); }
});

app.listen(3000);
