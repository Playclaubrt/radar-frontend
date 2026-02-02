const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

let cacheAlertas = { data: null, last: 0 };
let cacheClimaLocal = new Map();

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/alertas', async (req, res) => {
    const agora = Date.now();
    if (cacheAlertas.data && (agora - cacheAlertas.last < 300000)) return res.json(cacheAlertas.data);

    try {
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/', { timeout: 10000 }),
            axios.get('https://api.weather.gov/alerts/active', {
                headers: { 'User-Agent': '(MonitorGlobal, clima@monitor.com)' },
                timeout: 10000 
            })
        ]);

        const parser = new xml2js.Parser();
        const inmet = resInmet.status === 'fulfilled' ? (await parser.parseStringPromise(resInmet.value.data))?.rss?.channel[0]?.item : [];
        const noaa = resNoaa.status === 'fulfilled' ? resNoaa.value.data.features : [];

        cacheAlertas = { data: { inmet, noaa }, last: agora };
        res.json(cacheAlertas.data);
    } catch (e) { res.json(cacheAlertas.data || { inmet: [], noaa: [] }); }
});

app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    const key = `${parseFloat(lat).toFixed(2)}|${parseFloat(lon).toFixed(2)}`;
    const agora = Date.now();

    if (cacheClimaLocal.has(key)) {
        const c = cacheClimaLocal.get(key);
        if (agora - c.last < 600000) return res.json(c.data);
    }

    try {
        const [clima, ar, geo] = await Promise.allSettled([
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m
