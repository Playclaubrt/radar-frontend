const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Banco de dados em memória (Adicione sua senha no pass)
let users = [{ user: "devcreator111.000.12", pass: "CRIADORBRDEEMPRESA", plan: "Ultra Pro" }];

app.post('/api/cadastro', (req, res) => {
    const { user, pass } = req.body;
    if (users.find(u => u.user === user)) return res.status(400).json({ msg: "Usuário já existe" });
    users.push({ user, pass, plan: "Free" });
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const found = users.find(u => u.user === req.body.user && u.pass === req.body.pass);
    if(found) res.json({ success: true, plan: found.plan });
    else res.status(401).json({ success: false });
});

app.get('/api/alertas', async (req, res) => {
    try {
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/'),
            axios.get('https://api.weather.gov/alerts/active', { headers: { 'User-Agent': 'StormMonitor' } })
        ]);
        const parser = new xml2js.Parser();
        const inmet = resInmet.status === 'fulfilled' ? (await parser.parseStringPromise(resInmet.value.data))?.rss?.channel[0]?.item : [];
        res.json({ inmet, noaa: resNoaa.value?.data.features || [] });
    } catch (e) { res.json({ inmet: [], noaa: [] }); }
});

app.get('/api/clima-completo', async (req, res) => {
    const { lat, lon } = req.query;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,pressure_msl,visibility,wind_speed_10m,wind_direction_10m&daily=sunset&timezone=auto`;
    const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    try {
        const [c, g] = await Promise.all([axios.get(url), axios.get(geoUrl, { headers: {'User-Agent':'Storm'}} )]);
        res.json({ clima: c.data, geo: g.data });
    } catch (e) { res.status(500).send("Erro"); }
});

app.listen(3000, () => console.log("Servidor Online na Porta 3000"));
