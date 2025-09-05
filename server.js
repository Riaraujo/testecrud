const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do CORS
const corsOptions = {
    origin: [
        'https://riaraujo.github.io',
        'http://localhost:3000',
        'https://repositoriodequestoes.com',
        'https://www.repositoriodequestoes.com',
        'http://www.repositoriodequestoes.com'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.static('.'));

// Dados mock para teste
let pastas = [
    { _id: '1', nome: 'ENEM 2023', descricao: 'Questões do ENEM 2023' },
    { _id: '2', nome: 'FUVEST 2023', descricao: 'Questões da FUVEST 2023' }
];

let provas = [
    { _id: '1', titulo: 'Matemática', descricao: 'Questões de matemática', pasta: '1' },
    { _id: '2', titulo: 'Português', descricao: 'Questões de português', pasta: '1' }
];

let questoes = [
    {
        _id: '1',
        disciplina: 'Matemática',
        materia: 'Álgebra',
        assunto: 'Equações',
        enunciado: '<div>Resolva a equação x + 2 = 5</div>',
        alternativas: ['A) x = 1', 'B) x = 2', 'C) x = 3', 'D) x = 4', 'E) x = 5'],
        resposta: 'C',
        prova: '1',
        files: ['https://example.com/image1.png']
    }
];

// Rotas de API
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        database: 'mock',
        timestamp: new Date()
    });
});

app.get('/api/pastas', (req, res) => {
    res.json(pastas);
});

app.get('/api/provas', (req, res) => {
    res.json(provas);
});

app.get('/api/provas/:id', (req, res) => {
    const prova = provas.find(p => p._id === req.params.id);
    if (!prova) {
        return res.status(404).json({ error: 'Prova não encontrada' });
    }
    
    const questoesDaProva = questoes.filter(q => q.prova === req.params.id);
    res.json({ ...prova, questoes: questoesDaProva });
});

app.get('/api/questoes/:id', (req, res) => {
    const questao = questoes.find(q => q._id === req.params.id);
    if (!questao) {
        return res.status(404).json({ error: 'Questão não encontrada' });
    }
    res.json(questao);
});

app.post('/api/questoes', (req, res) => {
    const novaQuestao = {
        _id: String(Date.now()),
        ...req.body
    };
    questoes.push(novaQuestao);
    res.json(novaQuestao);
});

app.put('/api/questoes/:id', (req, res) => {
    const index = questoes.findIndex(q => q._id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Questão não encontrada' });
    }
    
    questoes[index] = { ...questoes[index], ...req.body };
    res.json(questoes[index]);
});

app.delete('/api/questoes/:id', (req, res) => {
    const index = questoes.findIndex(q => q._id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Questão não encontrada' });
    }
    
    questoes.splice(index, 1);
    res.json({ message: 'Questão excluída com sucesso' });
});

app.delete('/api/provas/:id', (req, res) => {
    const index = provas.findIndex(p => p._id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Prova não encontrada' });
    }
    
    // Remover questões da prova
    questoes = questoes.filter(q => q.prova !== req.params.id);
    provas.splice(index, 1);
    res.json({ message: 'Prova excluída com sucesso' });
});

// Servir o arquivo HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor de teste rodando na porta ${PORT}`);
});

