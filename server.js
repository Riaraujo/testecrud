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

// Schemas atualizados em inglês
const questaoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'O campo título é obrigatório'],
        trim: true
    },
    index: {
        type: Number,
        required: [true, 'O campo índice é obrigatório']
    },
    year: {
        type: Number,
        required: [true, 'O campo ano é obrigatório']
    },
    language: {
        type: String,
        default: null
    },
    discipline: {
        type: String,
        required: [true, 'O campo disciplina é obrigatório'],
        trim: true
    },
    context: {
        type: String,
        required: [true, 'O campo contexto é obrigatório']
    },
    files: {
        type: [String],
        default: []
    },
    correctAlternative: {
        type: String,
        required: [true, 'O campo alternativa correta é obrigatório'],
        enum: ['A', 'B', 'C', 'D', 'E']
    },
    alternativesIntroduction: {
        type: String,
        required: [true, 'O campo introdução das alternativas é obrigatório'],
        trim: true
    },
    materia: {
        type: String,
        required: [true, 'O campo matéria é obrigatório'],
        trim: true
    },
    assunto: {
        type: String,
        required: false,
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
    instituicao: {
        type: String,
        trim: true
    },
    prova: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prova',
        required: [true, 'O campo prova é obrigatório']
    },
    img1: {
        type: String,
        trim: true
    },
    img2: {
        type: String,
        trim: true
    },
    img3: {
        type: String,
        trim: true
    },
    conhecimento1: {
        type: String,
        trim: true,
        lowercase: true
    },
    conhecimento2: {
        type: String,
        trim: true,
        lowercase: true
    },
    conhecimento3: {
        type: String,
        trim: true,
        lowercase: true
    },
    conhecimento4: {
        type: String,
        trim: true,
        lowercase: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    alternatives: [{
        letter: {
            type: String,
            required: true,
            enum: ['A', 'B', 'C', 'D', 'E']
        },
        text: {
            type: String,
            required: true,
            trim: true
        },
        file: {
            type: String,
            default: null
        },
        isCorrect: {
            type: Boolean,
            required: true
        }
    }]
}, {
    versionKey: false
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

// Função para determinar o tipo de prova baseado no índice
function determinarTipoProva(index) {
    return index > 95 ? 'SEGUNDO DIA' : 'PRIMEIRO DIA';
}

// Função para criar pasta e prova automaticamente
async function criarPastaEProvaAutomaticamente(year, index) {
    try {
        // 1. Verificar/Criar PASTA
        const pastaNome = `ENEM ${year}`;
        let pasta = await Pasta.findOne({ nome: pastaNome });
        
        if (!pasta) {
            pasta = new Pasta({ 
                nome: pastaNome, 
                descricao: `Provas do ENEM ${year}` 
            });
            await pasta.save();
            console.log(`✅ Pasta criada: ${pastaNome}`);
        }

        // 2. Verificar/Criar PROVA
        const tipoProva = determinarTipoProva(index);
        const provaTitulo = `ENEM ${year} ${tipoProva}`;
        let prova = await Prova.findOne({ titulo: provaTitulo });
        
        if (!prova) {
            prova = new Prova({
                titulo: provaTitulo,
                descricao: `Prova do ENEM ${year} - ${tipoProva}`,
                pasta: pasta._id
            });
            await prova.save();
            console.log(`✅ Prova criada: ${provaTitulo}`);
            
            // 3. Adicionar prova à pasta
            await Pasta.findByIdAndUpdate(
                pasta._id, 
                { $push: { provas: prova._id } }
            );
        }

        return { pastaId: pasta._id, provaId: prova._id };
        
    } catch (error) {
        console.error('❌ Erro ao criar pasta/prova:', error);
        throw error;
    }
}

// MIDDLEWARE Pré-save para Questão
questaoSchema.pre('save', async function(next) {
    try {
        if (this.isNew) {
            const { provaId } = await criarPastaEProvaAutomaticamente(this.year, this.index);
            this.prova = provaId;
        }
        next();
    } catch (error) {
        next(error);
    }
});

// MIDDLEWARE Pós-save para Questão - Adicionar questão à prova
questaoSchema.post('save', async function(doc) {
    try {
        await Prova.findByIdAndUpdate(
            doc.prova,
            { $addToSet: { questoes: doc._id } }
        );
        console.log(`✅ Questão ${doc.index} adicionada à prova`);
    } catch (error) {
        console.error('❌ Erro ao adicionar questão à prova:', error);
    }
});

// Rotas da API para Pastas
app.post('/api/pastas', async (req, res) => {
    try {
        const pasta = new Pasta(req.body);
        await pasta.save();
        
        if (pasta.parent) {
            await Pasta.findByIdAndUpdate(pasta.parent, { 
                $push: { children: pasta._id } 
            });
        }
        
        res.status(201).json(pasta);
    } catch (error) {
        res.status(400).json({ error: error.message, details: error.errors });
    }
});

app.get('/api/pastas', async (req, res) => {
    try {
        const pastas = await Pasta.find()
            .populate('provas')
            .populate('children')
            .populate('parent')
            .sort({ createdAt: -1 });
        res.json(pastas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/pastas/:id', async (req, res) => {
    try {
        const populateQuery = req.query.populate === 'provas' ?
            {path: 'provas', populate: {path: 'questoes'}} :
            'provas';

        const pasta = await Pasta.findById(req.params.id).populate(populateQuery);
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
        const pasta = await Pasta.findById(req.params.id);
        if (!pasta) {
            return res.status(404).json({ error: 'Pasta não encontrada' });
        }
        
        if (pasta.parent) {
            await Pasta.findByIdAndUpdate(pasta.parent, { 
                $pull: { children: pasta._id } 
            });
        }
        
        if (pasta.children && pasta.children.length > 0) {
            await Pasta.updateMany(
                { _id: { $in: pasta.children } },
                { parent: pasta.parent }
            );
            
            if (pasta.parent) {
                await Pasta.findByIdAndUpdate(pasta.parent, { 
                    $push: { children: { $each: pasta.children } } 
                });
            }
        }
        
        await Pasta.findByIdAndDelete(req.params.id);
        await Prova.deleteMany({ pasta: req.params.id });
        res.json({ message: 'Pasta excluída com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rotas da API para Provas
app.post('/api/provas', async (req, res) => {
    try {
        if (req.body.pasta) {
            const pasta = await Pasta.findById(req.body.pasta);
            if (pasta && pasta.children && pasta.children.length > 0) {
                return res.status(400).json({ 
                    error: 'Não é possível criar provas em pastas que contêm outras pastas' 
                });
            }
        }
        
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
        const provas = await Prova.find()
            .populate('questoes')
            .populate('pasta')
            .sort({ createdAt: -1 });
        res.json(provas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/provas/:id', async (req, res) => {
    try {
        const prova = await Prova.findById(req.params.id)
            .populate('questoes')
            .populate('pasta');

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

// Rota POST para Questões
app.post('/api/questoes', async (req, res) => {
    try {
        const requiredFields = [
            'title', 'index', 'year', 'discipline', 'materia',
            'context', 'alternatives', 'correctAlternative',
            'alternativesIntroduction'
        ];

        const missingFields = requiredFields.filter(field => !req.body[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Campos obrigatórios faltando',
                missingFields: missingFields
            });
        }

        if (!['A', 'B', 'C', 'D', 'E'].includes(req.body.correctAlternative)) {
            return res.status(400).json({
                error: 'Resposta inválida',
                details: 'A resposta deve ser A, B, C, D ou E'
            });
        }

        // Preparar alternativas
        const alternatives = req.body.alternatives.map((alt, index) => ({
            letter: String.fromCharCode(65 + index),
            text: alt,
            file: null,
            isCorrect: String.fromCharCode(65 + index) === req.body.correctAlternative
        }));

        // Criar pasta e prova primeiro
        const { provaId } = await criarPastaEProvaAutomaticamente(req.body.year, req.body.index);

        const questao = new Questao({
            title: req.body.title,
            index: req.body.index,
            year: req.body.year,
            language: req.body.language || null,
            discipline: req.body.discipline,
            context: req.body.context,
            files: req.body.files || [],
            correctAlternative: req.body.correctAlternative,
            alternativesIntroduction: req.body.alternativesIntroduction,
            materia: req.body.materia,
            assunto: req.body.assunto || null,
            conteudo: req.body.conteudo || null,
            topico: req.body.topico || null,
            instituicao: req.body.instituicao || null,
            prova: provaId,
            img1: req.body.img1 || null,
            img2: req.body.img2 || null,
            img3: req.body.img3 || null,
            conhecimento1: req.body.conhecimento1 ? req.body.conhecimento1.toLowerCase() : null,
            conhecimento2: req.body.conhecimento2 ? req.body.conhecimento2.toLowerCase() : null,
            conhecimento3: req.body.conhecimento3 ? req.body.conhecimento3.toLowerCase() : null,
            conhecimento4: req.body.conhecimento4 ? req.body.conhecimento4.toLowerCase() : null,
            alternatives: alternatives
        });

        await questao.save();

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
        const questoes = await Questao.find()
            .populate('prova')
            .sort({ createdAt: -1 });
        res.json(questoes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/questoes/:id', async (req, res) => {
    try {
        const questao = await Questao.findById(req.params.id)
            .populate('prova');
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
