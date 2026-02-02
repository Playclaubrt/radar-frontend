const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

let cacheAlertas = { data: null, last: 0 };
let cacheClimaLocal = new Map();

// Rota principal
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// API de Alertas (Brasil e EUA)
app.get('/api/alertas', async (req, res) => {
    const agora = Date.now();
    if (cacheAlertas.data && (agora - cacheAlertas.last < 300000)) return res.json(cacheAlertas.data);

    try {
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/', { timeout: 8000 }),
            axios.get('https://api.weather.gov/alerts/active', {
                headers: { 'User-Agent': 'Cloudwindz' },
                timeout: 8000 
            })
        ]);

        const parser = new xml2js.Parser();
        const inmet = resInmet.status === 'fulfilled' ? (await parser.parseStringPromise(resInmet.value.data))?.rss?.channel[0]?.item : [];
        const noaa = resNoaa.status === 'fulfilled' ? resNoaa.value.data.features : [];

        cacheAlertas = { data: { inmet, noaa }, last: agora };
        res.json(cacheAlertas.data);
    } catch (e) { 
        res.json({ inmet: [], noaa: [] }); 
    }
});

// API de Clima e Localização (14 Dias)
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
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,pressure_msl,wind_speed_10m&daily=weather_code&forecast_days=14&timezone=auto`),
            axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi`),
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
                headers: { 'User-Agent': 'Cloudwindz' }
            })
        ]);

        const total = {
            clima: clima.status === 'fulfilled' ? clima.value.data : null,
            ar: ar.status === 'fulfilled' ? ar.value.data : { current: { european_aqi: '--' } },
            geo: geo.status === 'fulfilled' ? geo.value.data : { address: { city: "Localização" } }
        };

        if (total.clima) {
            cacheClimaLocal.set(key, { data: total, last: agora });
            res.json(total);
        } else { 
            throw new Error("Erro ao obter dados"); 
        }
    } catch (e) { 
        res.status(500).json({ erro: "Falha na API" }); 
    }
});

app.listen(PORT, () => console.log(`Cloudwindz a correr na porta ${PORT}`));
