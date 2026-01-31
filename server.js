const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

let cacheAlertas = null;
let ultimaAtualizacao = 0;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/alertas', async (req, res) => {
    const agora = Date.now();
    
    // Se já temos alertas e faz menos de 5 minutos, manda o que está na memória
    if (cacheAlertas && (agora - ultimaAtualizacao < 300000)) {
        return res.json(cacheAlertas);
    }

    try {
        const response = await axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/', { timeout: 5000 });
        const parser = new xml2js.Parser();
        parser.parseString(response.data, (err, result) => {
            if (!err && result.rss.channel[0].item) {
                cacheAlertas = result.rss.channel[0].item;
                ultimaAtualizacao = agora;
                res.json(cacheAlertas);
            } else {
                res.json(cacheAlertas || []); 
            }
        });
    } catch (error) {
        res.json(cacheAlertas || []); // Se der erro, manda o último cache que funcionou
    }
});

app.listen(PORT, () => console.log(`Rodando liso na porta ${PORT}`));
