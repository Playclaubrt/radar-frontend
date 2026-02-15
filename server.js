const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const { spawn } = require('child_process');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Rota de Alertas Unificada
app.get('/api/alertas', async (req, res) => {
    try {
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/'),
            axios.get('https://api.weather.gov/alerts/active', { headers: { 'User-Agent': 'MonitorGlobal' } })
        ]);
        const parser = new xml2js.Parser();
        let inmet = [];
        if (resInmet.status === 'fulfilled') {
            const result = await parser.parseStringPromise(resInmet.value.data);
            inmet = result.rss.channel[0].item || [];
        }
        res.json({ inmet, noaa: resNoaa.status === 'fulfilled' ? resNoaa.value.data.features : [] });
    } catch (e) { res.json({ inmet: [], noaa: [] }); }
});

// Rota Clima-Clique (Dados Atuais + Previsão 14 dias)
app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=14`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (e) { res.status(500).json({ error: "Erro na API de clima" }); }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
