const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const fs = require('fs');
const app = express();

// Aumentando o limite para suportar upload de fotos em Base64
app.use(express.json({ limit: '10mb' })); 
app.use(express.static(path.join(__dirname)));

const OWM_KEY = "7609a59c493758162d9b0a6af2914e1f"; 
const MASTER_INTERNAL_TOKEN = "CHASER-ADMIN-SECURE-2026";
const SEGREDO_URL = "watervalez.falixsrv.me";

// --- FIREWALL DE SEGURANÇA (Original Mantido) ---
app.use((req, res, next) => {
    const referer = req.headers.referer || "";
    if (referer.includes(SEGREDO_URL) || referer.includes("render.com") || !referer) {
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

// --- API CLIMA (Correção de Undefineds) ---
app.get('/api/clima-clique', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).send();
    try {
        const [clima, geo, pol, meteo] = await Promise.all([
            axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_KEY}`).catch(() => ({data: {main:{}, wind:{}, sys:{}}})),
            axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: {'User-Agent':'Chaser'}}).catch(() => ({data: {address:{}}})),
            axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OWM_KEY}`).catch(() => ({data: {list:[{main:{aqi:0}}]}})),
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max&hourly=cloud_base,cloud_cover,wind_speed_10m,precipitation&timezone=auto`).catch(() => ({data: {hourly:{cloud_base:[0], precipitation:[0]}, daily:{weathercode:[0], temperature_2m_max:[0]}}}))
        ]);

        res.json({ 
            clima: { 
                current: {
                    temp: clima.data.main.temp ?? 0,
                    humidity: clima.data.main.humidity ?? 0,
                    pressure: clima.data.main.pressure ?? 0,
                    feels_like: clima.data.main.feels_like ?? 0,
                    visibility: clima.data.visibility ?? 0,
                    sunrise: clima.data.sys.sunrise ?? 0,
                    sunset: clima.data.sys.sunset ?? 0,
                    wind_speed: clima.data.wind.speed ?? 0,
                    wind_deg: clima.data.wind.deg ?? 0
                } 
            }, 
            geo: geo.data, 
            poluicao: pol.data, 
            extra: meteo.data 
        });
    } catch (e) { res.status(500).json({erro: "Falha na Matrix Atmosférica"}); }
});

// --- API ALERTAS ---
app.get('/api/alertas', async (req, res) => {
    try {
        const [resInmet, resNoaa] = await Promise.allSettled([
            axios.get('https://apiprevmet3.inmet.gov.br/avisos/rss/', {timeout: 3000}),
            axios.get('https://api.weather.gov/alerts/active?status=actual', { headers: { 'User-Agent': 'Chaser' }, timeout: 3000})
        ]);
        let inmet = [];
        if (resInmet.status === 'fulfilled') {
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(resInmet.value.data);
            if (result.rss && result.rss.channel[0].item) {
                inmet = result.rss.channel[0].item.map(i => ({ title: i.title[0], description: i.description[0] }));
            }
        }
        res.json({ inmet, noaa: resNoaa.status === 'fulfilled' ? (resNoaa.value.data.features || []) : [] });
    } catch (e) { res.json({ inmet: [], noaa: [] }); }
});

// --- SISTEMA DE CONTAS (Vínculo cadastro -> users -> configs) ---

app.post('/api/cadastro', (req, res) => {
    const { email, senha, nome } = req.body;
    let dbCadastro = lerJSON('cadastro.json', '{}');
    let dbUsers = lerJSON('users.json', '{}');

    if (dbCadastro[email]) return res.status(400).json({ erro: "E-mail já cadastrado" });
    
    // Salva no cadastro.json (Registro Central)
    dbCadastro[email] = { senha, nome, data: new Date() };
    salvarJSON('cadastro.json', dbCadastro);

    // Inicializa no users.json (Sessão de Login)
    dbUsers[email] = { senha, nome, foto: null };
    salvarJSON('users.json', dbUsers);

    res.json({ sucesso: true });
});

app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    
    // Login Master
    if (email === "dev.creator11-54-22.2026" && senha === "lIlIlIlIIIl") {
        return res.json({ sucesso: true, status: "CRIADOR_MASTER", nome: "Dev Creator", token: MASTER_INTERNAL_TOKEN });
    }

    const dbUsers = lerJSON('users.json', '{}');
    const dbConfigs = lerJSON('config-accounts.json', '{}');

    if (dbUsers[email] && dbUsers[email].senha === senha) {
        // Puxa a foto e nome atualizados do config-accounts se existir
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

// Salva edições de perfil (Foto Base64 e Nome)
app.post('/api/config-accounts', (req, res) => {
    const { email, nome, foto } = req.body;
    let dbConfigs = lerJSON('config-accounts.json', '{}');
    
    if (!dbConfigs[email]) dbConfigs[email] = {};
    if (nome) dbConfigs[email].nome = nome;
    if (foto) dbConfigs[email].foto = foto; // Aqui entra o Base64 da imagem
    
    salvarJSON('config-accounts.json', dbConfigs);
    res.json({ sucesso: true });
});

// --- NEWS E GITHUB (Mantidos) ---
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
        try { const { data } = await axios.get(url, { headers }); sha = data.sha; } catch (e) {}
        await axios.put(url, {
            message: `Chaser Admin Sync: ${arquivo}`,
            content: Buffer.from(JSON.stringify(conteudo, null, 2)).toString('base64'),
            sha: sha
        }, { headers });
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Master Server Rodando na ${PORT}`));
