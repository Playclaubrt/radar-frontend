const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();

const OWM_KEY = "7609a59c493758162d9b0a6af2914e1f"; 

app.use(express.static(path.join(__dirname)));

// ROTA DE ALERTAS (ESTÁ CERTA, MANTIVE IGUAL)
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

// ROTA DE CLIQUE (CORRIGIDA PARA VERSÃO 2.5 ATIVA)
app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    
    // Se não vier lat ou lon, mata aqui pra não travar o servidor
    if (!lat || !lon) return res.status(400).json({ erro: "Faltam coordenadas" });

    try {
        // MUDANÇA AQUI: Trocamos o 'onecall' (que dá erro 401/404) por 'weather' normal + poluição + geo
        const [clima, geo, pol] = await Promise.all([
            axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_KEY}`),
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: {'User-Agent':'Chaser'}}),
            axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OWM_KEY}`)
        ]);

        // Adaptamos o JSON para que o seu INDEX.HTML não precise de mudanças drásticas
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
                    weather: clima.data.weather
                }
            }, 
            geo: geo.data, 
            poluicao: pol.data 
        });

    } catch (e) { 
        console.error("Erro na API OWM:", e.response ? e.response.data : e.message);
        res.status(500).json({ erro: "Falha na comunicação com as APIs" }); 
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
