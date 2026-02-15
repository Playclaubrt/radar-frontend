const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname)));

// --- ROTA DE ALERTAS (INMET E NOAA) ---
app.get('/api/alertas', async (req, res) => {
    try {
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/', { timeout: 5000 }),
            axios.get('https://api.weather.gov/alerts/active?status=actual', { 
                headers: { 'User-Agent': 'MonitorGlobal/1.0' },
                timeout: 5000 
            })
        ]);
        
        let inmet = [];
        if (resInmet.status === 'fulfilled') {
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(resInmet.value.data);
            inmet = result.rss.channel[0].item || [];
        }

        let noaa = resNoaa.status === 'fulfilled' ? resNoaa.value.data.features : [];
        res.json({ inmet, noaa });
    } catch (e) { 
        res.status(500).json({ inmet: [], noaa: [], error: "Falha ao buscar alertas" }); 
    }
});

// --- ROTA DE DADOS DO CLIQUE (GEO + CLIMA + AR) ---
app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: "Coordenadas ausentes" });

    try {
        const climaUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,pressure_msl,visibility,wind_speed_10m&daily=weather_code,sunrise,sunset&timezone=auto`;
        const arUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi`;
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

        const [clima, ar, geo] = await Promise.all([
            axios.get(climaUrl),
            axios.get(arUrl),
            axios.get(geoUrl, { headers: { 'User-Agent': 'MonitorGlobal/1.0' } })
        ]);
        
        res.json({ 
            clima: clima.data, 
            ar: ar.data, 
            geo: geo.data 
        });
    } catch (e) { 
        console.error("Erro no clique:", e.message);
        res.status(500).json({ erro: true, message: "Erro ao processar dados locais" }); 
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\x1b[32m%s\x1b[0m`, `--- MONITOR GLOBAL CHASER ONLINE ---`);
    console.log(`Acesse: http://localhost:${PORT}`);
});
