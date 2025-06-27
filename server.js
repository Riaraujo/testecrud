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
        'http://www.repositoriodequestoes.com' // Adicionado para permitir requisições HTTP
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

// Schemas atualizados
const questaoSchema = new mongoose.Schema({
    disciplina: {
        type: String,
        required: [true, 'O campo disciplina é obrigatório'],
        trim: true
    },
    language: {
        type: String,
        trim: true,
        default: null
    },
    index: {
        type: Number,
        default: null
    },
    title: {
        type: String,
        trim: true,
        default: null
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
    ano: {
        type: Number
    },
    instituicao: {
        type: String,
        trim: true
    },
    context: { // Mantido o campo context
        type: String,
        trim: true,
        default: null
    },
    enunciado: { // Enunciado será a parte do context antes do \n\n
        type: String,
        required: [true, 'O campo enunciado é obrigatório']
    },
    referencia: { // Novo campo para a parte do context após o \n\n
        type: String,
        trim: true,
        default: null
    },
    alternativesIntroduction: { // Mantido o campo alternativesIntroduction
        type: String,
        trim: true,
        default: null
    },
    alternativas: {
        type: [{
            letter: { type: String, required: true },
            text: { type: String, required: true },
            file: { type: String, default: null },
            isCorrect: { type: Boolean, default: false }
        }],
        required: [true, 'O campo alternativas é obrigatório']
    },
    resposta: {
        type: String,
        required: [true, 'O campo resposta é obrigatório'],
        enum: ['A', 'B', 'C', 'D', 'E']
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
    }
}, {
    strict: false,
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

// Rotas da API para Pastas
app.post('/api/pastas', async (req, res) => {
    try {
        const pasta = new Pasta(req.body);
        await pasta.save();
        
        // Se tem parent, adicionar esta pasta aos children do parent
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
        
        // Remover esta pasta dos children do parent
        if (pasta.parent) {
            await Pasta.findByIdAndUpdate(pasta.parent, { 
                $pull: { children: pasta._id } 
            });
        }
        
        // Mover os children desta pasta para o parent (ou null se não tiver parent)
        if (pasta.children && pasta.children.length > 0) {
            await Pasta.updateMany(
                { _id: { $in: pasta.children } },
                { parent: pasta.parent }
            );
            
            // Se tem parent, adicionar os children aos children do parent
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

// Rota para mover pasta
app.put('/api/pastas/:id/mover', async (req, res) => {
    try {
        const { novoParentId } = req.body;
        const pastaId = req.params.id;
        
        const pasta = await Pasta.findById(pastaId);
        if (!pasta) {
            return res.status(404).json({ error: 'Pasta não encontrada' });
        }
        
        // Verificar se não está tentando mover para si mesma ou para um descendente
        if (novoParentId === pastaId) {
            return res.status(400).json({ error: 'Não é possível mover uma pasta para si mesma' });
        }
        
        // Remover dos children do parent atual
        if (pasta.parent) {
            await Pasta.findByIdAndUpdate(pasta.parent, { 
                $pull: { children: pastaId } 
            });
        }
        
        // Atualizar o parent da pasta
        pasta.parent = novoParentId || null;
        await pasta.save();
        
        // Adicionar aos children do novo parent
        if (novoParentId) {
            await Pasta.findByIdAndUpdate(novoParentId, { 
                $push: { children: pastaId } 
            });
        }
        
        res.json({ message: 'Pasta movida com sucesso', pasta });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rotas da API para Provas
app.post('/api/provas', async (req, res) => {
    try {
        // Verificar se a pasta tem children (outras pastas)
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
        const provas = await Prova.find().populate('questoes').populate('pasta').sort({ createdAt: -1 });
        res.json(provas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/provas/:id', async (req, res) => {
    try {
        const populateQuery = req.query.populate === 'questoes' ?
            {path: 'questoes', options: {sort: {createdAt: -1}}} :
            'questoes';

        const prova = await Prova.findById(req.params.id)
            .populate(populateQuery)
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

// Rota POST para Questões (completa e corrigida)
app.post('/api/questoes', async (req, res) => {
    try {
        const requiredFields = [
            'title', 'index', 'year', 'discipline',
            'context', 'alternativesIntroduction', 'alternatives',
            'correctAlternative'
        ];

        const missingFields = requiredFields.filter(field => !req.body[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Campos obrigatórios faltando',
                missingFields: missingFields
            });
        }

        // Validação adicional para o campo correctAlternative
        if (!['A', 'B', 'C', 'D', 'E'].includes(req.body.correctAlternative)) {
            return res.status(400).json({
                error: 'correctAlternative inválida',
                details: 'A correctAlternative deve ser A, B, C, D ou E'
            });
        }

        const questionYear = req.body.year;
        const questionIndex = req.body.index;

        if (!questionYear || !questionIndex) {
            return res.status(400).json({ error: 'Os campos year e index são obrigatórios para organizar a questão.' });
        }

        // Determinar o nome da prova com base no index
        let provaNameSuffix = '';
        if (questionIndex >= 1 && questionIndex <= 90) {
            provaNameSuffix = ' PRIMEIRO DIA';
        } else if (questionIndex >= 91) {
            provaNameSuffix = ' SEGUNDO DIA';
        } else {
            return res.status(400).json({ error: 'Index da questão fora do intervalo esperado (1-90 ou 91+).' });
        }

        const pastaName = `ENEM ${questionYear}`;
        const provaTitle = `ENEM ${questionYear}${provaNameSuffix}`;

        // 1. Encontrar ou criar a Pasta (folder) com o nome "ENEM [ano]"
        let pasta = await Pasta.findOne({ nome: pastaName });
        if (!pasta) {
            pasta = new Pasta({ nome: pastaName, descricao: `Questões do ENEM do ano ${questionYear}` });
            await pasta.save();
        }

        // 2. Encontrar ou criar a Prova (exam) com o título específico dentro dessa pasta
        let prova = await Prova.findOne({ titulo: provaTitle, pasta: pasta._id });
        if (!prova) {
            prova = new Prova({ titulo: provaTitle, descricao: `Questões do ${provaTitle}`, pasta: pasta._id });
            await prova.save();
            // Adicionar a prova à pasta
            await Pasta.findByIdAndUpdate(pasta._id, { $push: { provas: prova._id } });
        }

        let enunciadoText = req.body.context;
        let referenciaText = null;

        // Separar enunciado e referência do context
        const contextParts = req.body.context.split('\n\n');
        if (contextParts.length > 1) {
            enunciadoText = contextParts[0];
            referenciaText = contextParts.slice(1).join('\n\n');
        }

        // Processar files para img1, img2, img3
        const files = req.body.files || [];
        const img1 = files[0] || null;
        const img2 = files[1] || null;
        const img3 = files[2] || null;

        const questao = new Questao({
            title: req.body.title,
            index: req.body.index,
            year: req.body.year,
            language: req.body.language || null,
            discipline: req.body.discipline,
            context: req.body.context, // Mantém o context original
            enunciado: enunciadoText, // Enunciado extraído
            referencia: referenciaText, // Referência extraída
            alternativesIntroduction: req.body.alternativesIntroduction, // Mantém alternativesIntroduction original
            alternativas: req.body.alternatives, // Array de objetos
            resposta: req.body.correctAlternative, // Mapeia correctAlternative para resposta
            prova: prova._id, // Associa a questão à prova encontrada/criada
            img1: img1,
            img2: img2,
            img3: img3,
            // Os campos materia, assunto, conteudo, topico, instituicao, conhecimento1-4
            // não estão no JSON de entrada, então serão nulos ou precisarão ser adicionados
            // se forem obrigatórios ou desejados.
            // Por exemplo, você pode adicionar valores padrão ou mapeá-los se existirem em outro lugar.
            materia: req.body.materia || 'Geral', // Exemplo de valor padrão
            assunto: req.body.assunto || null,
            instituicao: req.body.instituicao || 'ENEM', // Exemplo de valor padrão
            conhecimento1: req.body.conhecimento1 ? req.body.conhecimento1.toLowerCase() : null,
            conhecimento2: req.body.conhecimento2 ? req.body.conhecimento2.toLowerCase() : null,
            conhecimento3: req.body.conhecimento3 ? req.body.conhecimento3.toLowerCase() : null,
            conhecimento4: req.body.conhecimento4 ? req.body.conhecimento4.toLowerCase() : null
        });

        await questao.save();

        // Atualizar a prova com a nova questão
        await Prova.findByIdAndUpdate(prova._id, {
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
        // Validação adicional para o campo correctAlternative (se estiver sendo atualizado)
        if (req.body.correctAlternative && !['A', 'B', 'C', 'D', 'E'].includes(req.body.correctAlternative)) {
            return res.status(400).json({
                error: 'correctAlternative inválida',
                details: 'A correctAlternative deve ser A, B, C, D ou E'
            });
        }

        // Processar files para img1, img2, img3 se existirem no update
        const updateData = { ...req.body };
        if (req.body.files) {
            updateData.img1 = req.body.files[0] || null;
            updateData.img2 = req.body.files[1] || null;
            updateData.img3 = req.body.files[2] || null;
            delete updateData.files; // Remover o campo files do updateData
        }

        // Mapear correctAlternative para resposta
        if (req.body.correctAlternative) {
            updateData.resposta = req.body.correctAlternative;
            delete updateData.correctAlternative;
        }

        // Separar enunciado e referência do context se o context for atualizado
        if (req.body.context) {
            const contextParts = req.body.context.split('\n\n');
            updateData.enunciado = contextParts[0];
            updateData.referencia = contextParts.slice(1).join('\n\n') || null;
        }

        // Mapear campos de conhecimento para lowercase se existirem
        if (updateData.conhecimento1) updateData.conhecimento1 = updateData.conhecimento1.toLowerCase();
        if (updateData.conhecimento2) updateData.conhecimento2 = updateData.conhecimento2.toLowerCase();
        if (updateData.conhecimento3) updateData.conhecimento3 = updateData.conhecimento3.toLowerCase();
        if (updateData.conhecimento4) updateData.conhecimento4 = updateData.conhecimento4.toLowerCase();

        const questao = await Questao.findByIdAndUpdate(
            req.params.id,
            updateData,
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


