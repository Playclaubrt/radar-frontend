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
        // Busca INMET (Brasil)
        const resInmet = await axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/');
        // Busca NOAA (Alertas Globais/USA - Exemplo de feed geral)
        const resNoaa = await axios.get('https://www.nhc.noaa.gov/index-at.xml');

        const parser = new xml2js.Parser();
        
        const parseXml = (xml) => new Promise((resolve) => {
            parser.parseString(xml, (err, result) => {
                resolve(result?.rss?.channel[0]?.item || result?.feed?.entry || []);
            });
        });

        const alertasInmet = await parseXml(resInmet.data);
        const alertasNoaa = await parseXml(resNoaa.data);

        // Une os dois e manda para o site
        res.json([...alertasInmet, ...alertasNoaa]);
    } catch (error) {
        res.status(500).send("Erro ao buscar fontes");
    }
});

app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
