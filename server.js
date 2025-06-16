require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do CORS
const corsOptions = {
    origin: 'https://riaraujo.github.io',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(express.json());

// Conexão com MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:ceHWJohQxTyyQzrTCeDUHOJnEVjDMknx@switchback.proxy.rlwy.net:28016';

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

// Modelo ajustado
const questaoSchema = new mongoose.Schema({
    disciplina: {
        type: String,
        required: [true, 'O campo disciplina é obrigatório'],
        trim: true
    },
    materia: {
        type: String,
        required: [true, 'O campo matéria é obrigatório'],
        trim: true
    },
    assunto: {
        type: String,
        required: [true, 'O campo assunto é obrigatório'],
        trim: true
    },
    conteudo: {
        type: String,
        trim: true
    },
    topico: {
        type: String,
        trim: true
    },
    ano: {
        type: Number
    },
    instituicao: {
        type: String,
        trim: true
    },
    enunciado: {
        type: String,
        required: [true, 'O campo enunciado é obrigatório']
    },
    alternativas: {
  type: [String],  // Aceita tanto array quanto string
  required: true,
  set: function(val) {
    // Converte automaticamente string para array quando necessário
    return Array.isArray(val) ? val : [val];
  },
        { 
  strict: false, // Permite campos não definidos no schema
  versionKey: false 
});
},
    resposta_correta: {
        type: String,
        required: [true, 'O campo resposta_correta é obrigatório'],
        enum: ['A', 'B', 'C', 'D', 'E']
    },
    prova: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prova',
        required: [true, 'O campo prova é obrigatório']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Questao = mongoose.model('Questao', questaoSchema);

const provaSchema = new mongoose.Schema({
    titulo: {
        type: String,
        required: [true, 'O título da prova é obrigatório'],
        trim: true,
        maxlength: [200, 'O título não pode ter mais que 200 caracteres']
    },
    descricao: {
        type: String,
        trim: true,
        maxlength: [1000, 'A descrição não pode ter mais que 1000 caracteres']
    },
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

const pastaSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: [true, 'O nome da pasta é obrigatório'],
        trim: true,
        maxlength: [100, 'O nome não pode ter mais que 100 caracteres']
    },
    descricao: {
        type: String,
        trim: true
    },
    provas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prova'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Pasta = mongoose.model('Pasta', pastaSchema);

// Rotas da API para Pastas
app.post('/api/pastas', async (req, res) => {
    try {
        const pasta = new Pasta(req.body);
        await pasta.save();
        res.status(201).json(pasta);
    } catch (error) {
        res.status(400).json({ error: error.message, details: error.errors });
    }
});

app.get('/api/pastas', async (req, res) => {
    try {
        const pastas = await Pasta.find().populate('provas').sort({ createdAt: -1 });
        res.json(pastas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/pastas/:id', async (req, res) => {
    try {
        const pasta = await Pasta.findById(req.params.id).populate({path: 'provas', populate: {path: 'questoes'}});
        if (!pasta) {
            return res.status(404).json({ error: 'Pasta não encontrada' });
        }
        res.json(pasta);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/pastas/:id', async (req, res) => {
    try {
        const pasta = await Pasta.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!pasta) {
            return res.status(404).json({ error: 'Pasta não encontrada' });
        }
        res.json(pasta);
    } catch (error) {
        res.status(400).json({ error: error.message, details: error.errors });
    }
});

app.delete('/api/pastas/:id', async (req, res) => {
    try {
        const pasta = await Pasta.findByIdAndDelete(req.params.id);
        if (!pasta) {
            return res.status(404).json({ error: 'Pasta não encontrada' });
        }
        await Prova.deleteMany({ pasta: req.params.id });
        res.json({ message: 'Pasta excluída com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rotas da API para Provas
app.post('/api/provas', async (req, res) => {
    try {
        const prova = new Prova(req.body);
        await prova.save();
        if (prova.pasta) {
            await Pasta.findByIdAndUpdate(prova.pasta, { $push: { provas: prova._id } });
        }
        res.status(201).json(prova);
    } catch (error) {
        res.status(400).json({ error: error.message, details: error.errors });
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

app.get('/api/provas/:id', async (req, res) => {
    try {
        const prova = await Prova.findById(req.params.id).populate('questoes').populate('pasta');
        if (!prova) {
            return res.status(404).json({ error: 'Prova não encontrada' });
        }
        res.json(prova);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/provas/:id', async (req, res) => {
    try {
        const prova = await Prova.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!prova) {
            return res.status(404).json({ error: 'Prova não encontrada' });
        }
        res.json(prova);
    } catch (error) {
        res.status(400).json({ error: error.message, details: error.errors });
    }
});

app.delete('/api/provas/:id', async (req, res) => {
    try {
        const prova = await Prova.findByIdAndDelete(req.params.id);
        if (!prova) {
            return res.status(404).json({ error: 'Prova não encontrada' });
        }
        if (prova.pasta) {
            await Pasta.findByIdAndUpdate(prova.pasta, { $pull: { provas: prova._id } });
        }
        await Questao.deleteMany({ prova: req.params.id });
        res.json({ message: 'Prova excluída com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rotas da API para Questões
// Rota POST ajustada
app.post('/api/questoes', async (req, res) => {
    try {
        console.log('Dados recebidos:', req.body);
        
        const requiredFields = [
            'disciplina', 'materia', 'assunto', 
            'enunciado', 'alternativas', 
            'resposta_correta', 'prova'
        ];
        
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Campos obrigatórios faltando',
                missingFields: missingFields
            });
        }

        const questao = new Questao({
            disciplina: req.body.disciplina,
            materia: req.body.materia,
            assunto: req.body.assunto,
            conteudo: req.body.conteudo || undefined,
            topico: req.body.topico || undefined,
            ano: req.body.ano ? parseInt(req.body.ano) : undefined,
            instituicao: req.body.instituicao || undefined,
            enunciado: req.body.enunciado,
            alternativas: req.body.alternativas,
            resposta_correta: req.body.resposta_correta,
            prova: req.body.prova,
            // Adicione os novos campos
            img1: req.body.img1 || undefined,
            img2: req.body.img2 || undefined,
            img3: req.body.img3 || undefined,
            conhecimento1: req.body.conhecimento1 ? req.body.conhecimento1.toLowerCase() : undefined,
            conhecimento2: req.body.conhecimento2 ? req.body.conhecimento2.toLowerCase() : undefined,
            conhecimento3: req.body.conhecimento3 ? req.body.conhecimento3.toLowerCase() : undefined,
            conhecimento4: req.body.conhecimento4 ? req.body.conhecimento4.toLowerCase() : undefined
        });

        await questao.save();

        await Prova.findByIdAndUpdate(req.body.prova, {
            $push: { questoes: questao._id }
        });

        res.status(201).json(questao);
    } catch (error) {
        console.error('Erro ao criar questão:', error);
        res.status(400).json({
            error: error.message,
            details: error.errors
        });
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

app.get('/api/questoes/:id', async (req, res) => {
    try {
        const questao = await Questao.findById(req.params.id).populate('prova');
        if (!questao) {
            return res.status(404).json({ error: 'Questão não encontrada' });
        }
        res.json(questao);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/questoes/:id', async (req, res) => {
    try {
        const questao = await Questao.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!questao) {
            return res.status(404).json({ error: 'Questão não encontrada' });
        }
        res.json(questao);
    } catch (error) {
        res.status(400).json({ error: error.message, details: error.errors });
    }
});

app.delete('/api/questoes/:id', async (req, res) => {
    try {
        const questao = await Questao.findByIdAndDelete(req.params.id);
        if (!questao) {
            return res.status(404).json({ error: 'Questão não encontrada' });
        }
        if (questao.prova) {
            await Prova.findByIdAndUpdate(questao.prova, { $pull: { questoes: questao._id } });
        }
        res.json({ message: 'Questão excluída com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rotas de Status e Raiz
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date()
    });
});

app.get('/', (req, res) => {
    res.send(`
        <h1>API CRUD com MongoDB para Plataforma Educacional</h1>
        <p>Esta API está funcionando corretamente.</p>
        <p>Banco de dados: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'}</p>
        <p><a href='/api/pastas'>Ver todas as Pastas</a></p>
        <p><a href='/api/provas'>Ver todas as Provas</a></p>
        <p><a href='/api/questoes'>Ver todas as Questões</a></p>
    `);
});

// Middleware de erro
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo deu errado!' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Conectado ao MongoDB em: ${MONGODB_URI}`);
});
