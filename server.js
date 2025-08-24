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

// Schemas
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

// FUNÇÃO PRINCIPAL - Criar pasta e prova SEMPRE
async function criarPastaEProvaAutomaticamente(year, index) {
    try {
        console.log(`🔄 Criando pasta e prova para ENEM ${year}, questão ${index}`);
        
        // 1. SEMPRE CRIAR/VERIFICAR PASTA
        const pastaNome = `ENEM ${year}`;
        let pasta = await Pasta.findOne({ nome: pastaNome });
        
        if (!pasta) {
            console.log(`📁 Criando pasta: ${pastaNome}`);
            pasta = new Pasta({ 
                nome: pastaNome, 
                descricao: `Provas do ENEM ${year}` 
            });
            await pasta.save();
            console.log(`✅ Pasta criada: ${pastaNome}`);
        }

        // 2. SEMPRE CRIAR/VERIFICAR PROVA
        const tipoProva = determinarTipoProva(index);
        const provaTitulo = `ENEM ${year} ${tipoProva}`;
        let prova = await Prova.findOne({ titulo: provaTitulo });
        
        if (!prova) {
            console.log(`📝 Criando prova: ${provaTitulo}`);
            prova = new Prova({
                titulo: provaTitulo,
                descricao: `Prova do ENEM ${year} - ${tipoProva}`,
                pasta: pasta._id
            });
            await prova.save();
            console.log(`✅ Prova criada: ${provaTitulo}`);
            
            // 3. SEMPRE VINCULAR PROVA À PASTA
            await Pasta.findByIdAndUpdate(
                pasta._id, 
                { $addToSet: { provas: prova._id } }
            );
            console.log(`🔗 Prova vinculada à pasta: ${pastaNome}`);
        }

        return { pastaId: pasta._id, provaId: prova._id };
        
    } catch (error) {
        console.error('❌ ERRO ao criar pasta/prova:', error);
        throw error;
    }
}

// MIDDLEWARE - Garantir que sempre tenha pasta e prova
questaoSchema.pre('save', async function(next) {
    try {
        console.log(`🔄 Processando questão ${this.index} de ${this.year}`);
        
        // SEMPRE criar pasta e prova
        const { provaId } = await criarPastaEProvaAutomaticamente(this.year, this.index);
        this.prova = provaId;
        
        console.log(`✅ Questão ${this.index} vinculada à prova`);
        next();
    } catch (error) {
        console.error('❌ ERRO no middleware:', error);
        next(error);
    }
});

// MIDDLEWARE - Após salvar, vincular questão à prova
questaoSchema.post('save', async function(doc) {
    try {
        // SEMPRE vincular questão à prova
        await Prova.findByIdAndUpdate(
            doc.prova,
            { $addToSet: { questoes: doc._id } },
            { new: true }
        );
        console.log(`✅ Questão ${doc.index} adicionada à prova`);
    } catch (error) {
        console.error('❌ ERRO ao vincular questão:', error);
    }
});

// Rota POST para Questões - AGORA FUNCIONANDO
app.post('/api/questoes', async (req, res) => {
    try {
        console.log('📥 Recebendo nova questão...');
        
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

        // 1. PRIMEIRO criar pasta e prova
        console.log(`🔄 Criando pasta/prova para ENEM ${req.body.year}`);
        const { provaId } = await criarPastaEProvaAutomaticamente(req.body.year, req.body.index);

        // 2. Preparar alternativas
        const alternatives = req.body.alternatives.map((alt, index) => ({
            letter: String.fromCharCode(65 + index),
            text: alt,
            file: null,
            isCorrect: String.fromCharCode(65 + index) === req.body.correctAlternative
        }));

        // 3. Criar questão
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
            prova: provaId, // Já temos o ID da prova
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

        console.log('✅ Questão salva com sucesso!');
        res.status(201).json(questao);

    } catch (error) {
        console.error('❌ Erro ao criar questão:', error);
        res.status(400).json({
            error: error.message,
            details: error.errors
        });
    }
});

// Rotas RESTantes (mantidas as mesmas)
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

// ... (outras rotas GET, PUT, DELETE)

app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Conectado ao MongoDB em: ${MONGODB_URI}`);
});
