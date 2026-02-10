const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname)));
app.use(express.json());

let users = [{ user: "devcreator111.000.12", pass: "CRIADORBRDEEMPRESA", plan: "Ultra Pro" }];
let cacheAlertas = { data: null, last: 0 };

app.post('/api/cadastro', (req, res) => {
    users.push({ user: req.body.user, pass: req.body.pass, plan: "Free" });
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const found = users.find(u => u.user === req.body.user && u.pass === req.body.pass);
    if(found) res.json({ success: true, plan: found.plan });
    else res.status(401).json({ success: false });
});

app.get('/api/alertas', async (req, res) => {
    const agora = Date.now();
    if (cacheAlertas.data && (agora - cacheAlertas.last < 300000)) return res.json(cacheAlertas.data);
    try {
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/'),
            axios.get('https://api.weather.gov/alerts/active', { headers: { 'User-Agent': 'Monitor' } })
        ]);
        const parser = new xml2js.Parser();
        const inmet = resInmet.status === 'fulfilled' ? (await parser.parseStringPromise(resInmet.value.data))?.rss?.channel[0]?.item : [];
        cacheAlertas = { data: { inmet, noaa: resNoaa.value?.data.features || [] }, last: agora };
        res.json(cacheAlertas.data);
    } catch (e) { res.json({ inmet: [], noaa: [] }); }
});

app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    try {
        const [clima, ar, geo] = await Promise.allSettled([
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,pressure_msl,visibility,wind_speed_10m,wind_direction_10m&daily=weather_code,sunrise,sunset&timezone=auto`),
            axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi`),
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: {'User-Agent': 'Monitor'} })
        ]);
        res.json({
            clima: clima.value.data,
            ar: ar.value?.data || { current: { european_aqi: '--' } },
            geo: geo.value.data
        });
    } catch (e) { res.status(500).send("Erro"); }
});

app.listen(PORT, () => console.log(`Storm Chaser rodando em http://localhost:${PORT}`));
