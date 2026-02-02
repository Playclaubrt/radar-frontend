const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/alertas', async (req, res) => {
    try {
        // 1. INMET (Brasil) - Continua via RSS
        const resInmet = await axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/', { timeout: 8000 });
        const parser = new xml2js.Parser();
        const inmetData = await new Promise(r => parser.parseString(resInmet.data, (e, res) => r(res?.rss?.channel[0]?.item || [])));

        // 2. NOAA (EUA) - API EM TEMPO REAL (JSON)
        // Buscando todos os alertas ativos no momento
        const resNoaa = await axios.get('https://api.weather.gov/alerts/active', {
            headers: { 'User-Agent': 'MeuMonitorClima/1.0' }, // Obrigatório para NOAA
            timeout: 8000
        });

        res.json({
            inmet: inmetData,
            noaa: resNoaa.data.features // A API retorna os alertas dentro de 'features'
        });
    } catch (error) {
        console.error("Erro na busca:", error.message);
        res.json({ inmet: [], noaa: [] });
    }
});

app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
