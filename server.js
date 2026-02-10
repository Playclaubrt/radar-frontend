const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Banco de dados em memória
let users = [{ user: "devcreator111.000.12", pass: "CRIADORBRDEEMPRESA", plan: "Ultra Pro" }];

app.post('/api/login', (req, res) => {
    const found = users.find(u => u.user === req.body.user && u.pass === req.body.pass);
    if(found) res.json({ success: true, plan: found.plan });
    else res.status(401).json({ success: false });
});

// Cache Milissegundos
let cacheAlertas = { data: null, last: 0 };
app.get('/api/alertas', async (req, res) => {
    if (Date.now() - cacheAlertas.last < 30000) return res.json(cacheAlertas.data);
    try {
        const [inmet, noaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/'),
            axios.get('https://api.weather.gov/alerts/active', { headers: {'User-Agent': 'StormPro'} })
        ]);
        const parser = new xml2js.Parser();
        const dataInmet = inmet.status === 'fulfilled' ? (await parser.parseStringPromise(inmet.value.data))?.rss?.channel[0]?.item : [];
        cacheAlertas = { data: { inmet: dataInmet, noaa: noaa.value?.data.features || [] }, last: Date.now() };
        res.json(cacheAlertas.data);
    } catch (e) { res.json({ inmet: [], noaa: [] }); }
});

app.get('/api/clima', async (req, res) => {
    const { lat, lon } = req.query;
    try {
        const [clima, geo] = await Promise.all([
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,pressure_msl,visibility,wind_speed_10m,wind_direction_10m&daily=sunset&timezone=auto`),
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: {'User-Agent': 'StormMonitor'} })
        ]);
        res.json({ clima: clima.data, geo: geo.data });
    } catch (e) { res.status(500).send("Erro"); }
});

app.listen(3000, () => console.log("StormChaser God Mode Online"));
