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
            if (result.rss.channel[0].item) {
                inmet = result.rss.channel[0].item.map(i => ({
                    title: i.title[0],
                    description: i.description[0]
                }));
            }
        }
        res.json({ inmet, noaa: resNoaa.status === 'fulfilled' ? resNoaa.value.data.features : [] });
    } catch (e) { res.json({ inmet: [], noaa: [] }); }
});

app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).send();

    try {
        const [clima, geo, pol, meteo] = await Promise.all([
            axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_KEY}`),
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: {'User-Agent':'Chaser'}}),
            axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OWM_KEY}`),
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max&hourly=cloud_base,cloud_cover,wind_speed_10m,precipitation&timezone=auto`)
        ]);

        res.json({ 
            clima: {
                current: {
                    temp: clima.data.main.temp,
                    feels_like: clima.data.main.feels_like,
                    humidity: clima.data.main.humidity,
                    pressure: clima.data.main.pressure,
                    visibility: clima.data.visibility,
                    wind_speed: clima.data.wind.speed,
                    sunrise: clima.data.sys.sunrise,
                    sunset: clima.data.sys.sunset,
                    weather: clima.data.weather,
                    wind_deg: clima.data.wind.deg
                }
            }, 
            geo: geo.data, 
            poluicao: pol.data,
            extra: meteo.data
        });
    } catch (e) { res.status(500).json({erro: e.message}); }
});

app.listen(3000, () => console.log("Servidor ativo na 3000"));
