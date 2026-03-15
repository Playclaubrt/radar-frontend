const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin'); 
const app = express();

// --- CONFIGURAÇÃO FIREBASE ---
try {
    const serviceAccount = require("./firebase-key.json");
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
    console.error("AVISO: firebase-key.json não encontrado. Rodando sem Firebase Admin.");
}

// Limite aumentado para Fotos de Perfil (Base64)
app.use(express.json({ limit: '10mb' })); 
app.use(express.static(path.join(__dirname)));

const OWM_KEY = "7609a59c493758162d9b0a6af2914e1f"; 
const MASTER_INTERNAL_TOKEN = "CHASER-ADMIN-SECURE-2026";
const SEGREDO_URL = "watervalez.falixsrv.me";

// --- PROBLEMA 3: FIREWALL OBRIGATÓRIO ---
// Garante que apenas o seu domínio e o Render acessem as APIs
app.use((req, res, next) => {
    const referer = req.headers.referer || "";
    const isAuthorized = referer.includes(SEGREDO_URL) || referer.includes("render.com");
    
    // Libera se for autorizado ou se for acesso interno (sem referer do navegador)
    if (isAuthorized || !referer) {
        return next();
    }
    return res.status(403).json({ erro: "ACESSO NEGADO: Use o site oficial para acessar a API." });
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

// --- PROBLEMA 2: FUNÇÃO DE COMMIT AUTOMÁTICO ---
// Sincroniza os arquivos de usuários/configurações com o GitHub sempre que mudam
const commitAoGitHub = async (arquivo, conteudo) => {
    const GH_PAT = process.env.GITHUB_PAT;
    const REPO = "Playclaubrt/radar-frontend";
    if (!GH_PAT) return console.log("GitHub PAT não configurado.");

    try {
        const url = `https://api.github.com/repos/${REPO}/contents/${arquivo}`;
        const headers = { Authorization: `token ${GH_PAT}`, Accept: 'application/vnd.github.v3+json' };
        
        let sha = null;
        try {
            const { data } = await axios.get(url, { headers });
            sha = data.sha;
        } catch (e) {}

        await axios.put(url, {
            message: `Chaser Data Update: ${arquivo}`,
            content: Buffer.from(JSON.stringify(conteudo, null, 2)).toString('base64'),
            sha: sha
        }, { headers });
        console.log(`[GITHUB] ${arquivo} sincronizado.`);
    } catch (e) { console.error(`Erro ao sincronizar ${arquivo}:`, e.message); }
};

// --- API CLIMA ---
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
        res.json({ clima: { current: clima.data.main }, geo: geo.data, poluicao: pol.data, extra: meteo.data });
    } catch (e) { res.status(500).json({erro: e.message}); }
});

// --- PROBLEMA 1: API ALERTAS (CORREÇÃO NOAA) ---
app.get('/api/alertas', async (req, res) => {
    try {
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/', { timeout: 4000 }),
            axios.get('https://api.weather.gov/alerts/active?status=actual', { 
                headers: { 'User-Agent': '(chaser-monitor, contact@cloudwindz.com)' }, 
                timeout: 5000 
            })
        ]);

        let inmet = [];
        if (resInmet.status === 'fulfilled') {
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(resInmet.value.data);
            if (result && result.rss && result.rss.channel[0].item) {
                inmet = result.rss.channel[0].item.map(i => ({ title: i.title[0], description: i.description[0] }));
            }
        }

        let noaa = [];
        if (resNoaa.status === 'fulfilled') {
            // Extrai as propriedades úteis dos alertas da NOAA (GeoJSON)
            noaa = resNoaa.value.data.features.map(f => ({
                title: f.properties.event,
                description: f.properties.headline || f.properties.description
            }));
        }

        res.json({ inmet, noaa });
    } catch (e) { res.json({ inmet: [], noaa: [] }); }
});

// --- SISTEMA DE CONTAS COM COMMITS AO GITHUB ---

app.post('/api/cadastro', async (req, res) => {
    const { email, senha, nome } = req.body;
    
    let dbCadastro = lerJSON('cadastro.json', '{}');
    let dbUsers = lerJSON('users.json', '{}');

    if (dbCadastro[email]) return res.status(400).json({ erro: "E-mail já cadastrado" });

    // 1. Salva em Cadastro.json
    dbCadastro[email] = { senha, nome, data: new Date() };
    salvarJSON('cadastro.json', dbCadastro);
    await commitAoGitHub('cadastro.json', dbCadastro);

    // 2. Salva em Users.json
    dbUsers[email] = { senha, nome, foto: null };
    salvarJSON('users.json', dbUsers);
    await commitAoGitHub('users.json', dbUsers);

    res.json({ sucesso: true });
});

app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    if (email === "dev.creator11-54-22.2026" && senha === "lIlIlIlIIIl") {
        return res.json({ sucesso: true, status: "CRIADOR_MASTER", nome: "Dev Creator", token: MASTER_INTERNAL_TOKEN });
    }
    const dbUsers = lerJSON('users.json', '{}');
    const dbConfigs = lerJSON('config-accounts.json', '{}');
    if (dbUsers[email] && dbUsers[email].senha === senha) {
        return res.json({ 
            sucesso: true, 
            usuario: { 
                nome: dbConfigs[email]?.nome || dbUsers[email].nome, 
                email: email, 
                foto: dbConfigs[email]?.foto || dbUsers[email].foto 
            } 
        });
    }
    res.status(401).json({ sucesso: false });
});

// Edição de perfil com Sincronização
app.post('/api/config-accounts', async (req, res) => {
    const { email, nome, foto } = req.body;
    let dbConfigs = lerJSON('config-accounts.json', '{}');

    if (!dbConfigs[email]) dbConfigs[email] = {};
    if (nome) dbConfigs[email].nome = nome;
    if (foto) dbConfigs[email].foto = foto;

    salvarJSON('config-accounts.json', dbConfigs);
    
    // PROBLEMA 2: Sincroniza as alterações de perfil com o GitHub
    await commitAoGitHub('config-accounts.json', dbConfigs);
    
    res.json({ sucesso: true });
});

// --- NEWS E GITHUB CONTROL ---

app.get('/api/news', (req, res) => res.json(lerJSON('news.json', '[]')));

app.post('/api/news/postar', async (req, res) => {
    const { token, titulo, conteudo } = req.body;
    if (token !== MASTER_INTERNAL_TOKEN) return res.status(403).send();
    let news = lerJSON('news.json', '[]');
    news.unshift({ id: Date.now(), titulo, conteudo, data: new Date().toLocaleDateString('pt-BR') });
    salvarJSON('news.json', news);
    await commitAoGitHub('news.json', news);
    res.json({ sucesso: true });
});

app.post('/api/dev/github-control', async (req, res) => {
    const { token_interno, arquivo, conteudo } = req.body;
    if (token_interno !== MASTER_INTERNAL_TOKEN) return res.status(403).send();
    await commitAoGitHub(arquivo, conteudo);
    res.json({ sucesso: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Chaser Master Online | Porta ${PORT}`));
