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
        // Busca INMET
        const resInmet = await axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/', { timeout: 5000 });
        // Busca NOAA (Alertas Ativos)
        const resNoaa = await axios.get('https://www.weather.gov/alerts/wwa.xml', { timeout: 5000 });

        const parser = new xml2js.Parser();

        const inmetData = await new Promise(r => parser.parseString(resInmet.data, (e, res) => r(res?.rss?.channel[0]?.item || [])));
        const noaaData = await new Promise(r => parser.parseString(resNoaa.data, (e, res) => r(res?.rss?.channel[0]?.item || res?.feed?.entry || [])));

        res.json({
            inmet: inmetData,
            noaa: noaaData
        });
    } catch (error) {
        res.json({ inmet: [], noaa: [] });
    }
});

app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
