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
        const noaaData = resNoaa.status === 'fulfilled' ? resNoaa.value.data.features : [];
        res.json({ inmet, noaa: noaaData });
    } catch (e) { res.json({ inmet: [], noaa: [] }); }
});

app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ erro: "Faltam coordenadas" });
    try {
        const [clima, geo, pol, meteo] = await Promise.all([
            axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_KEY}`),
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: {'User-Agent':'Chaser'}}),
            axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OWM_KEY}`),
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high,cloud_base,precipitation_probability&forecast_days=1`)
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
                    wind_deg: clima.data.wind.deg,
                    sunrise: clima.data.sys.sunrise,
                    sunset: clima.data.sys.sunset,
                    weather: clima.data.weather,
                    clouds: clima.data.clouds.all
                }
            }, 
            geo: geo.data, 
            poluicao: pol.data,
            nuvens_detalhe: meteo.data.hourly
        });
    } catch (e) { res.status(500).json({ erro: "Erro API" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
