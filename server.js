require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

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

// Conexão com MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/editor-questoes';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
})
.then(() => console.log('MongoDB conectado com sucesso!'))
.catch(err => {
    console.error('Falha na conexão com MongoDB:', err);
    process.exit(1);
});

// Schema para questões
const questaoSchema = new mongoose.Schema({
    title: String,
    index: Number,
    year: Number,
    language: String,
    discipline: String,
    context: String,
    files: [String],
    correctAlternative: String,
    alternativesIntroduction: String,
    alternatives: [{
        letter: String,
        text: String,
        file: String,
        isCorrect: Boolean
    }],
    // Campos legados
    disciplina: String,
    materia: String,
    assunto: String,
    conteudo: String,
    topico: String,
    ano: Number,
    instituicao: String,
    enunciado: String,
    resposta: String,
    prova: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prova'
    },
    img1: String,
    img2: String,
    img3: String,
    conhecimento1: String,
    conhecimento2: String,
    conhecimento3: String,
    conhecimento4: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    strict: false,
    versionKey: false
});

const Questao = mongoose.model('Questao', questaoSchema);

// Schema para provas
const provaSchema = new mongoose.Schema({
    titulo: String,
    descricao: String,
    questoes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Questao'
    }],
    pasta: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pasta'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Prova = mongoose.model('Prova', provaSchema);

// Schema para pastas
const pastaSchema = new mongoose.Schema({
    nome: String,
    descricao: String,
    provas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prova'
    }],
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pasta',
        default: null
    },
    children: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pasta'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Pasta = mongoose.model('Pasta', pastaSchema);

// Rotas básicas para pastas
app.get('/api/pastas', async (req, res) => {
    try {
        const pastas = await Pasta.find().populate('provas').sort({ createdAt: -1 });
        res.json(pastas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/provas', async (req, res) => {
    try {
        const provas = await Prova.find().populate('questoes').populate('pasta').sort({ createdAt: -1 });
        res.json(provas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/questoes', async (req, res) => {
    try {
        const questoes = await Questao.find().populate('prova').sort({ createdAt: -1 });
        res.json(questoes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ROTA PRINCIPAL - CRIAR QUESTÃO COM PASTA E PROVA
app.post('/api/questoes', async (req, res) => {
    try {
        console.log('=== CRIANDO QUESTÃO ===');
        console.log('Dados recebidos:', req.body);

        // Extrair dados básicos
        const year = parseInt(req.body.year);
        const index = parseInt(req.body.index);
        
        console.log('Year:', year, 'Index:', index);

        // Determinar dia
        const dia = index > 95 ? 'SEGUNDO DIA' : 'PRIMEIRO DIA';
        console.log('Dia:', dia);

        // CRIAR PASTA SEMPRE
        const pastaNome = `ENEM ${year}`;
        console.log('Criando pasta:', pastaNome);
        
        const pasta = new Pasta({
            nome: pastaNome,
            descricao: "",
            provas: [],
            parent: null,
            children: []
        });
        
        await pasta.save();
        console.log('✅ Pasta criada:', pasta._id);

        // CRIAR PROVA SEMPRE
        const provaTitulo = `ENEM ${year} ${dia}`;
        console.log('Criando prova:', provaTitulo);
        
        const prova = new Prova({
            titulo: provaTitulo,
            descricao: "",
            questoes: [],
            pasta: pasta._id
        });
        
        await prova.save();
        console.log('✅ Prova criada:', prova._id);

        // Adicionar prova à pasta
        pasta.provas.push(prova._id);
        await pasta.save();
        console.log('✅ Prova adicionada à pasta');

        // CRIAR QUESTÃO
        console.log('Criando questão...');
        
        const questao = new Questao({
            // Novos campos
            title: req.body.title,
            index: index,
            year: year,
            language: req.body.language,
            discipline: req.body.discipline,
            context: req.body.context,
            files: req.body.files || [],
            correctAlternative: req.body.correctAlternative,
            alternativesIntroduction: req.body.alternativesIntroduction,
            alternatives: req.body.alternatives,
            
            // Campos legados
            disciplina: req.body.discipline,
            ano: year,
            instituicao: 'ENEM',
            resposta: req.body.correctAlternative,
            prova: prova._id
        });
        
        await questao.save();
        console.log('✅ Questão criada:', questao._id);

        // Adicionar questão à prova
        prova.questoes.push(questao._id);
        await prova.save();
        console.log('✅ Questão adicionada à prova');

        console.log('=== SUCESSO ===');
        
        res.status(201).json({
            success: true,
            questao: questao,
            prova: prova,
            pasta: pasta,
            message: 'Questão, prova e pasta criadas com sucesso!'
        });

    } catch (error) {
        console.error('❌ ERRO:', error);
        res.status(500).json({
            error: 'Erro ao criar questão',
            details: error.message
        });
    }
});

// Rota de status
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date()
    });
});

app.get('/', (req, res) => {
    res.send(`
        <h1>API Simplificada - Questões ENEM</h1>
        <p>Status: Funcionando</p>
        <p>Banco: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'}</p>
    `);
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`MongoDB: ${MONGODB_URI}`);
});
