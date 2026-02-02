const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

// Sistema de Cache
let cacheDados = null;
let ultimaBusca = 0;
const INTERVALO = 1000 * 60 * 5; // Atualiza a cada 5 minutos

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/alertas', async (req, res) => {
    const agora = Date.now();

    if (cacheDados && (agora - ultimaBusca < INTERVALO)) {
        return res.json(cacheDados);
    }

    try {
        const [resInmet, resNoaa] = await Promise.all([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/', { timeout: 10000 }),
            axios.get('https://api.weather.gov/alerts/active', {
                headers: { 'User-Agent': 'MonitorGlobal/1.0' },
                timeout: 10000
            })
        ]);

        const parser = new xml2js.Parser();
        const inmetJson = await new Promise(r => parser.parseString(resInmet.data, (e, res) => r(res?.rss?.channel[0]?.item || [])));

        cacheDados = {
            inmet: inmetJson, // Manda TODOS do Inmet
            noaa: resNoaa.data.features // Manda TODOS da NOAA
        };
        ultimaBusca = agora;

        res.json(cacheDados);
    } catch (error) {
        if (cacheDados) return res.json(cacheDados);
        res.json({ inmet: [], noaa: [] });
    }
});

app.listen(PORT, () => console.log("Servidor rodando com Cache"));
