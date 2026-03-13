const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const fs = require('fs'); // Necessário para os arquivos JSON
const app = express();

const OWM_KEY = "7609a59c493758162d9b0a6af2914e1f"; 

// Arquivos de persistência
const USERS_FILE = path.join(__dirname, 'users.json');
const NEWS_FILE = path.join(__dirname, 'news.json');

// Token Master Interno (Definido por você para o site se comunicar com o servidor)
const MASTER_INTERNAL_TOKEN = "CHASER-ADMIN-SECURE-2026";

app.use(express.json()); // Habilita receber JSON no corpo das requisições
app.use(express.static(path.join(__dirname)));

// --- FUNÇÕES DE PERSISTÊNCIA (BLINDAGEM DE DADOS) ---
const lerJSON = (arquivo, padrao) => {
    try {
        if (!fs.existsSync(arquivo)) fs.writeFileSync(arquivo, padrao);
        const data = fs.readFileSync(arquivo, 'utf8');
        return JSON.parse(data || padrao);
    } catch (e) { return JSON.parse(padrao); }
};

const salvarJSON = (arquivo, obj) => {
    fs.writeFileSync(arquivo, JSON.stringify(obj, null, 2));
};

// --- ROTA: CLIMA-CLIQUE (MANTIDA ORIGINAL + INTEGRADA) ---
app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).send();

    try {
        const [clima, geo, pol, meteo] = await Promise.all([
            axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_KEY}`),
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: {'User-Agent':'Chaser'}}),
            axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OWM_KEY}`),
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max&hourly=cloud_base,cloud_cover,wind_speed_10m,precipitation&timezone=auto`)
        ]);

        res.json({ 
            clima: {
                current: {
                    temp: clima.data.main.temp,
                    feels_like: clima.data.main.feels_like,
                    humidity: clima.data.main.humidity,
                    pressure: clima.data.main.pressure,
                    visibility: clima.data.visibility,
                    wind_speed: clima.data.wind.speed,
                    sunrise: clima.data.sys.sunrise,
                    sunset: clima.data.sys.sunset,
                    weather: clima.data.weather,
                    wind_deg: clima.data.wind.deg
                }
            }, 
            geo: geo.data, 
            poluicao: pol.data,
            extra: meteo.data
        });
    } catch (e) { res.status(500).json({erro: e.message}); }
});

// --- ROTA: ALERTAS (MANTIDA ORIGINAL) ---
app.get('/api/alertas', async (req, res) => {
    try {
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/'),
            axios.get('https://api.weather.gov/alerts/active?status=actual', { headers: { 'User-Agent': 'Chaser' }})
        ]);
        let inmet = [];
        if (resInmet.status === 'fulfilled') {
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(resInmet.value.data);
            if (result.rss.channel[0].item) {
                inmet = result.rss.channel[0].item.map(i => ({
                    title: i.title[0],
                    description: i.description[0]
                }));
            }
        }
        res.json({ inmet, noaa: resNoaa.status === 'fulfilled' ? resNoaa.value.data.features : [] });
    } catch (e) { res.json({ inmet: [], noaa: [] }); }
});

// --- ROTAS DE CONTA (LOGIN / CADASTRO / CONFIG) ---
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    
    // Login do Criador
    if (email === "dev.creator11-54-22.2026" && senha === "lIlIlIlIIIl") {
        return res.json({ sucesso: true, status: "CRIADOR_MASTER", nome: "Dev Creator", token: MASTER_INTERNAL_TOKEN });
    }

    const db = lerJSON(USERS_FILE, '{}');
    if (db[email] && db[email].senha === senha) {
        return res.json({ sucesso: true, usuario: { nome: db[email].nome, email: email, foto: db[email].foto } });
    }
    res.status(401).json({ erro: "Credenciais inválidas." });
});

app.post('/api/cadastro', (req, res) => {
    const { email, senha, nome } = req.body;
    let db = lerJSON(USERS_FILE, '{}');
    if (db[email]) return res.status(400).json({ erro: "E-mail já cadastrado." });
    
    db[email] = { senha, nome, foto: null };
    salvarJSON(USERS_FILE, db);
    res.json({ sucesso: true });
});

app.post('/api/config-accounts', (req, res) => {
    const { email, nome, foto } = req.body;
    let db = lerJSON(USERS_FILE, '{}');
    if (!db[email]) return res.status(404).json({ erro: "Usuário não encontrado." });
    
    if (nome) db[email].nome = nome;
    if (foto) db[email].foto = foto;
    salvarJSON(USERS_FILE, db);
    res.json({ sucesso: true });
});

// --- ROTAS DE NEWS ---
app.get('/api/news', (req, res) => {
    res.json(lerJSON(NEWS_FILE, '[]'));
});

app.post('/api/news/postar', (req, res) => {
    const { token, titulo, conteudo } = req.body;
    if (token !== MASTER_INTERNAL_TOKEN) return res.status(403).json({ erro: "Acesso negado." });

    let news = lerJSON(NEWS_FILE, '[]');
    news.unshift({ id: Date.now(), titulo, conteudo, data: new Date().toLocaleDateString('pt-BR') });
    salvarJSON(NEWS_FILE, news);
    res.json({ sucesso: true });
});

// --- ROTA: GITHUB CONTROL (CONTROLE DE DEPLOY) ---
app.post('/api/dev/github-control', async (req, res) => {
    const { token_interno, arquivo, conteudo, mensagem } = req.body;
    const GH_PAT = process.env.GITHUB_PAT; // Variável de Ambiente do Render
    const REPO = "Playclaubrt/radar-frontend";

    if (token_interno !== MASTER_INTERNAL_TOKEN) return res.status(403).send("Token Inválido");

    try {
        const url = `https://api.github.com/repos/${REPO}/contents/${arquivo}`;
        const headers = { Authorization: `token ${GH_PAT}`, Accept: 'application/vnd.github.v3+json' };
        
        let sha;
        try {
            const resFile = await axios.get(url, { headers });
            sha = resFile.data.sha;
        } catch (e) { sha = null; }

        const update = await axios.put(url, {
            message: mensagem || "Chaser Deploy Update",
            content: Buffer.from(JSON.stringify(conteudo, null, 2)).toString('base64'),
            sha: sha
        }, { headers });

        res.json({ sucesso: true, sha: update.data.commit.sha });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.listen(3000, () => console.log("Servidor Chaser Monitor V3 ativo na 3000"));
