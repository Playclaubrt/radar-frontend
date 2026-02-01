const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve os arquivos HTML e CSS da raiz (onde eles estão no teu GitHub)
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para pegar os alertas do INMET
app.get('/api/alertas', async (req, res) => {
    try {
        const response = await axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/');
        const parser = new xml2js.Parser();
        
        parser.parseString(response.data, (err, result) => {
            if (err) {
                res.status(500).send("Erro ao processar XML");
            } else {
                // Envia a lista de itens do RSS para o Frontend
                const alertas = result.rss.channel[0].item || [];
                res.json(alertas);
            }
        });
    } catch (error) {
        res.status(500).send("Erro ao procurar alertas no INMET");
    }
});

app.listen(PORT, () => {
    console.log(`Servidor a rodar na porta ${PORT}`);
});
