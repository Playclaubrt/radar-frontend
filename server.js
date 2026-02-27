const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname)));

app.get('/api/alertas', async (req, res) => {
    try {
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/', { timeout: 5000 }),
            axios.get('https://api.weather.gov/alerts/active?status=actual', { 
                headers: { 'User-Agent': 'ChaserMonitor/1.0' },
                timeout: 5000 
            })
        ]);
        let inmet = [];
        if (resInmet.status === 'fulfilled') {
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(resInmet.value.data);
            if (result.rss.channel[0].item) {
                inmet = result.rss.channel[0].item.map(i => ({ title: i.title[0], description: i.description[0] }));
            }
        }
        let noaa = resNoaa.status === 'fulfilled' ? resNoaa.value.data.features : [];
        res.json({ inmet, noaa });
    } catch (e) { res.json({ inmet: [], noaa: [] }); }
});

app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    try {
        const clima = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m`);
        const geo = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: {'User-Agent':'Chaser'} });
        res.json({ clima: clima.data, geo: geo.data });
    } catch (e) { res.status(500).send(); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Monitor Online na porta ${PORT}`));
