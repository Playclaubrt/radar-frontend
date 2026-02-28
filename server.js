const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();

const OWM_KEY = "7609a59c493758162d9b0a6af2914e1f"; 

app.use(express.static(path.join(__dirname)));

app.get('/api/alertas', async (req, res) => {
    try {
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/'),
            axios.get('https://api.weather.gov/alerts/active?status=actual', { headers: { 'User-Agent': 'Chaser' }})
        ]);
        let inmet = [];
        if (resInmet.status === 'fulfilled') {
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(resInmet.value.data);
            if (result.rss.channel[0].item) inmet = result.rss.channel[0].item;
        }
        res.json({ inmet, noaa: resNoaa.status === 'fulfilled' ? resNoaa.value.data.features : [] });
    } catch (e) { res.json({ inmet: [], noaa: [] }); }
});

app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    try {
        const [clima, geo, pol] = await Promise.all([
            axios.get(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_KEY}`),
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: {'User-Agent':'Chaser'}}),
            axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OWM_KEY}`)
        ]);
        res.json({ clima: clima.data, geo: geo.data, poluicao: pol.data });
    } catch (e) { res.status(500).send(); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));
