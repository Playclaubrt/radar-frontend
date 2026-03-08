const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();

const OWM_KEY = "7609a59c493758162d9b0a6af2914e1f"; 

app.use(express.static(path.join(__dirname)));

app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ erro: "Coordenadas ausentes" });

    try {
        const [clima, geo, pol, forecast] = await Promise.all([
            axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_KEY}`),
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: {'User-Agent':'Chaser'}}),
            axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OWM_KEY}`),
            // Open-Meteo para a previsão de 5 dias
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode&timezone=auto`)
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
            previsao_dias: forecast.data.daily // SEG TER QUA QUI SEX
        });
    } catch (e) { res.status(500).json({ erro: "Erro nas APIs" }); }
});

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

app.listen(3000, () => console.log("Servidor rodando na 3000"));
