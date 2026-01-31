const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve os arquivos HTML e CSS diretamente da raiz
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));

app.get('/api/alertas', async (req, res) => {
    try {
        const response = await axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/');
        const parser = new xml2js.Parser();
        parser.parseString(response.data, (err, result) => {
            if (err) res.status(500).send("Erro no XML");
            else res.json(result.rss.channel[0].item || []);
        });
    } catch (error) {
        res.status(500).send("Erro ao buscar alertas");
    }
});

app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
