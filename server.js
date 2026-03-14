const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin'); 
const app = express();

// --- CONFIGURAÇÃO FIREBASE ---
// Verifique se o arquivo firebase-key.json está na raiz do projeto!
try {
    const serviceAccount = require("./firebase-key.json");
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
    console.error("ERRO CRÍTICO: firebase-key.json não encontrado!");
}

const OWM_KEY = "7609a59c493758162d9b0a6af2914e1f"; 
const MASTER_INTERNAL_TOKEN = "CHASER-ADMIN-SECURE-2026";
const SEGREDO_URL = "watervalez.falixsrv.me";

app.use(express.json()); 
app.use(express.static(path.join(__dirname)));

// --- FIREWALL UNIVERSAL (Ajustado para não bloquear o próprio Render) ---
app.use((req, res, next) => {
    const referer = req.headers.referer || "";
    // Permite se vier da sua URL, se for o próprio Render ou se for acesso direto (opcional)
    if (referer.includes(SEGREDO_URL) || referer.includes("render.com") || req.path.startsWith('/api/news')) {
        return next();
    }
    return res.status(403).json({ erro: "ACESSO NEGADO: Rede CloudWindz não autorizada." });
});

// --- UTILITÁRIOS DE PERSISTÊNCIA ---
const lerJSON = (arquivo, padrao) => {
    try {
        const caminho = path.join(__dirname, arquivo);
        if (!fs.existsSync(caminho)) return JSON.parse(padrao);
        const data = fs.readFileSync(caminho, 'utf8');
        return JSON.parse(data || padrao);
    } catch (e) { return JSON.parse(padrao); }
};

const salvarJSON = (arquivo, obj) => {
    fs.writeFileSync(path.join(__dirname, arquivo), JSON.stringify(obj, null, 2));
};

// --- ROTAS DE CLIMA E ALERTAS ---
app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    try {
        const [clima, geo, pol, meteo] = await Promise.all([
            axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_KEY}`),
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: {'User-Agent':'Chaser'}}),
            axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OWM_KEY}`),
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max&hourly=cloud_base,cloud_cover,wind_speed_10m,precipitation&timezone=auto`)
        ]);
        res.json({ clima: { current: clima.data.main }, geo: geo.data, poluicao: pol.data, extra: meteo.data });
    } catch (e) { res.status(500).json({erro: e.message}); }
});

app.get('/api/alertas', async (req, res) => {
    try {
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/', { timeout: 4000 }),
            axios.get('https://api.weather.gov/alerts/active?status=actual', { headers: { 'User-Agent': 'Chaser' }, timeout: 4000 })
        ]);
        let inmet = [];
        if (resInmet.status === 'fulfilled') {
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(resInmet.value.data);
            if (result && result.rss && result.rss.channel[0].item) {
                inmet = result.rss.channel[0].item.map(i => ({ title: i.title[0], description: i.description[0] }));
            }
        }
        res.json({ inmet, noaa: resNoaa.status === 'fulfilled' ? (resNoaa.value.data.features || []) : [] });
    } catch (e) { res.json({ inmet: [], noaa: [] }); }
});

// --- SISTEMA DE CONTAS E CONFIGURAÇÕES ---

app.post('/api/cadastro', (req, res) => {
    const { email, senha, nome } = req.body;
    let db = lerJSON('cadastro.json', '{}');
    if (db[email]) return res.status(400).json({ erro: "E-mail já cadastrado" });
    db[email] = { senha, nome, foto: "https://via.placeholder.com/150" };
    salvarJSON('cadastro.json', db);
    res.json({ sucesso: true });
});

app.post('/api/config-accounts', (req, res) => {
    const { email, nome, foto } = req.body;
    let db = lerJSON('config-accounts.json', '{}');
    if (!db[email]) db[email] = {};
    if (nome) db[email].nome = nome;
    if (foto) db[email].foto = foto;
    salvarJSON('config-accounts.json', db);
    res.json({ sucesso: true });
});

app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    if (email === "dev.creator11-54-22.2026" && senha === "lIlIlIlIIIl") {
        return res.json({ sucesso: true, status: "CRIADOR_MASTER", nome: "Dev Creator", token: MASTER_INTERNAL_TOKEN });
    }
    const db = lerJSON('cadastro.json', '{}');
    const config = lerJSON('config-accounts.json', '{}');
    if (db[email] && db[email].senha === senha) {
        return res.json({ 
            sucesso: true, 
            usuario: { 
                nome: config[email]?.nome || db[email].nome, 
                email: email, 
                foto: config[email]?.foto || db[email].foto 
            } 
        });
    }
    res.status(401).json({ sucesso: false });
});

// --- NEWS E GITHUB CONTROL ---

app.get('/api/news', (req, res) => res.json(lerJSON('news.json', '[]')));

app.post('/api/news/postar', (req, res) => {
    const { token, titulo, conteudo } = req.body;
    if (token !== MASTER_INTERNAL_TOKEN) return res.status(403).send();
    let news = lerJSON('news.json', '[]');
    news.unshift({ id: Date.now(), titulo, conteudo, data: new Date().toLocaleDateString('pt-BR') });
    salvarJSON('news.json', news);
    res.json({ sucesso: true });
});

app.post('/api/dev/github-control', async (req, res) => {
    const { token_interno, arquivo, conteudo } = req.body;
    const GH_PAT = process.env.GITHUB_PAT;
    const REPO = "Playclaubrt/radar-frontend";

    if (token_interno !== MASTER_INTERNAL_TOKEN) return res.status(403).send();
    if (!GH_PAT) return res.status(500).json({ erro: "Configuração de Ambiente Ausente" });

    try {
        const url = `https://api.github.com/repos/${REPO}/contents/${arquivo}`;
        const headers = { Authorization: `token ${GH_PAT}`, Accept: 'application/vnd.github.v3+json' };
        let sha = null;
        try {
            const { data } = await axios.get(url, { headers });
            sha = data.sha;
        } catch (e) {}

        await axios.put(url, {
            message: `Chaser Admin Sync: ${arquivo}`,
            content: Buffer.from(JSON.stringify(conteudo, null, 2)).toString('base64'),
            sha: sha
        }, { headers });

        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Online: Porta ${PORT}`));
