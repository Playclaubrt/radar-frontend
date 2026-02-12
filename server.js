const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));
app.use(express.json());

// BANCO DE DADOS LOCAL
let users = [
    { user: "devcreator111.000.12", pass: "CLOUDWINDZ_CREATOR", plan: "THE CREATOR", img: "https://github.com/identicons/dev.png" }
];

app.post('/api/login', (req, res) => {
    const found = users.find(u => u.user === req.body.user && u.pass === req.body.pass);
    if(found) res.json({ success: true, user: found });
    else res.status(401).json({ success: false });
});

app.post('/api/cadastro', (req, res) => {
    const newUser = { ...req.body, plan: "Free", img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" };
    users.push(newUser);
    res.json({ success: true });
});

app.get('/api/alertas', async (req, res) => {
    try {
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/'),
            axios.get('https://api.weather.gov/alerts/active', { headers: { 'User-Agent': 'MonitorGlobal' } })
        ]);
        const parser = new xml2js.Parser();
        const inmet = resInmet.status === 'fulfilled' ? (await parser.parseStringPromise(resInmet.value.data))?.rss?.channel[0]?.item : [];
        const noaa = resNoaa.status === 'fulfilled' ? resNoaa.value.data.features : [];
        res.json({ inmet, noaa });
    } catch (e) { res.json({ inmet: [], noaa: [] }); }
});

app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    try {
        const [clima, ar, geo] = await Promise.allSettled([
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,pressure_msl,visibility,wind_speed_10m&daily=weather_code,sunrise,sunset,uv_index_max&forecast_days=14&timezone=auto`),
            axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm2_5,pm10,no2,so2`),
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: {'User-Agent': 'Monitor'} })
        ]);
        res.json({ clima: clima.value.data, ar: ar.value?.data, geo: geo.value.data });
    } catch (e) { res.status(500).json({ erro: "Falha" }); }
});

app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
