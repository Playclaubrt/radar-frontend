const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();

// Serve os arquivos estáticos (HTML, CSS, JS do front-end)
app.use(express.static(path.join(__dirname)));

// --- ROTA DE ALERTAS (INMET E NOAA) ---
app.get('/api/alertas', async (req, res) => {
    try {
        // Busca simultânea no RSS do INMET e na API da NOAA
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/', { timeout: 5000 }),
            axios.get('https://api.weather.gov/alerts/active?status=actual', { 
                headers: { 'User-Agent': 'MonitorGlobalChaser/1.0' },
                timeout: 5000 
            })
        ]);
        
        let inmet = [];
        if (resInmet.status === 'fulfilled') {
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(resInmet.value.data);
            // Mapeia os itens do RSS para um formato mais limpo
            if (result.rss.channel[0].item) {
                inmet = result.rss.channel[0].item.map(item => ({
                    title: item.title[0],
                    description: item.description[0],
                    link: item.link[0]
                }));
            }
        }

        let noaa = resNoaa.status === 'fulfilled' ? resNoaa.value.data.features : [];
        
        res.json({ inmet, noaa });
    } catch (e) { 
        console.error("Erro ao processar alertas:", e.message);
        res.status(500).json({ inmet: [], noaa: [], error: "Falha ao buscar alertas" }); 
    }
});

// --- ROTA DE DADOS DO CLIQUE (GEO + CLIMA + AR) ---
app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: "Coordenadas ausentes" });

    try {
        // 1. Dados de Clima (Open-Meteo)
        const climaUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,pressure_msl,wind_speed_10m&timezone=auto`;
        
        // 2. Geocodificação Reversa (Para saber o nome da cidade/bairro)
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

        const [clima, geo] = await Promise.all([
            axios.get(climaUrl),
            axios.get(geoUrl, { headers: { 'User-Agent': 'MonitorGlobalChaser/1.0' } })
        ]);
        
        res.json({ 
            clima: clima.data, 
            geo: geo.data 
        });
    } catch (e) { 
        console.error("Erro no processamento do clique:", e.message);
        res.status(500).json({ erro: true, message: "Erro ao processar dados locais" }); 
    }
});

// Inicialização do Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\x1b[32m%s\x1b[0m`, `\n==========================================`);
    console.log(`\x1b[32m%s\x1b[0m`, `  CHASER MONITOR V3 - SISTEMA ONLINE`);
    console.log(`\x1b[32m%s\x1b[0m`, `  Acesse: http://localhost:${PORT}`);
    console.log(`\x1b[32m%s\x1b[0m`, `==========================================\n`);
});
