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
        const response = await axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/');
        const parser = new xml2js.Parser();
        parser.parseString(response.data, (err, result) => {
            if (err || !result.rss.channel[0].item) return res.json([]);
            
            const alertas = result.rss.channel[0].item.map(item => ({
                title: item.title[0],
                description: item.description[0],
                pubDate: item.pubDate[0],
                link: item.link[0],
                // Captura a área (polygon) ou ponto (point) do GeoRSS
                polygon: item['georss:polygon'] ? item['georss:polygon'][0] : null,
                point: item['georss:point'] ? item['georss:point'][0] : null
            }));
            res.json(alertas);
        });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar dados" });
    }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
