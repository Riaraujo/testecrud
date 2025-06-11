require(\'dotenv\').config();
const express = require(\'express\');
const mongoose = require(\'mongoose\');
const cors = require(\'cors\');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Conexão melhorada com MongoDB
const MONGODB_URI = process.env.MONGODB_URI || \'mongodb://mongo:ceHWJohQxTyyQzrTCeDUHOJnEVjDMknx@switchback.proxy.rlwy.net:28016\';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
})
.then(() => console.log(\'MongoDB conectado com sucesso!\'))
.catch(err => {
    console.error(\'FALHA na conexão com MongoDB:\', err);
    process.exit(1);
});

// Listeners de conexão
mongoose.connection.on(\'disconnected\', () => {
    console.log(\'Mongoose desconectado!\');
});

// --- Novos Modelos de Dados para a Plataforma Educacional ---

// Esquema para Questões
const questaoSchema = new mongoose.Schema({
    texto: {
        type: String,
        required: [true, \'O texto da questão é obrigatório\'],
        trim: true
    },
    tipo: {
        type: String,
        enum: [\'multipla_escolha\', \'aberta\'],
        required: [true, \'O tipo da questão é obrigatório\']
    },
    alternativas: [{
        letra: { type: String, trim: true },
        texto: { type: String, trim: true }
    }],
    respostaCorreta: {
        type: String,
        trim: true
    },
    prova: {
        type: mongoose.Schema.Types.ObjectId,
        ref: \'Prova\'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Questao = mongoose.model(\'Questao\', questaoSchema);

// Esquema para Provas
const provaSchema = new mongoose.Schema({
    titulo: {
        type: String,
        required: [true, \'O título da prova é obrigatório\'],
        trim: true,
        maxlength: [200, \'O título não pode ter mais que 200 caracteres\']
    },
    descricao: {
        type: String,
        trim: true,
        maxlength: [1000, \'A descrição não pode ter mais que 1000 caracteres\']
    },
    questoes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: \'Questao\'
    }],
    pasta: {
        type: mongoose.Schema.Types.ObjectId,
        ref: \'Pasta\'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Prova = mongoose.model(\'Prova\', provaSchema);

// Esquema para Pastas
const pastaSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: [true, \'O nome da pasta é obrigatório\'],
        trim: true,
        maxlength: [100, \'O nome não pode ter mais que 100 caracteres\']
    },
    provas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: \'Prova\'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Pasta = mongoose.model(\'Pasta\', pastaSchema);

// --- Rotas da API para Pastas ---

// Criar Pasta
app.post(\'/api/pastas\', async (req, res) => {
    try {
        const pasta = new Pasta(req.body);
        await pasta.save();
        res.status(201).json(pasta);
    } catch (error) {
        res.status(400).json({ error: error.message, details: error.errors });
    }
});

// Listar todas as Pastas
app.get(\'/api/pastas\', async (req, res) => {
    try {
        const pastas = await Pasta.find().populate(\'provas\').sort({ createdAt: -1 });
        res.json(pastas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obter uma Pasta específica
app.get(\'/api/pastas/:id\', async (req, res) => {
    try {
        const pasta = await Pasta.findById(req.params.id).populate({path: \'provas\', populate: {path: \'questoes\'}});
        if (!pasta) {
            return res.status(404).json({ error: \'Pasta não encontrada\' });
        }
        res.json(pasta);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Atualizar Pasta
app.put(\'/api/pastas/:id\', async (req, res) => {
    try {
        const pasta = await Pasta.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!pasta) {
            return res.status(404).json({ error: \'Pasta não encontrada\' });
        }
        res.json(pasta);
    } catch (error) {
        res.status(400).json({ error: error.message, details: error.errors });
    }
});

// Excluir Pasta
app.delete(\'/api/pastas/:id\', async (req, res) => {
    try {
        const pasta = await Pasta.findByIdAndDelete(req.params.id);
        if (!pasta) {
            return res.status(404).json({ error: \'Pasta não encontrada\' });
        }
        // Opcional: remover provas e questões associadas
        await Prova.deleteMany({ pasta: req.params.id });
        res.json({ message: \'Pasta excluída com sucesso\' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Rotas da API para Provas ---

// Criar Prova
app.post(\'/api/provas\', async (req, res) => {
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

// Listar todas as Provas
app.get(\'/api/provas\', async (req, res) => {
    try {
        const provas = await Prova.find().populate(\'questoes\').populate(\'pasta\').sort({ createdAt: -1 });
        res.json(provas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obter uma Prova específica
app.get(\'/api/provas/:id\', async (req, res) => {
    try {
        const prova = await Prova.findById(req.params.id).populate(\'questoes\').populate(\'pasta\');
        if (!prova) {
            return res.status(404).json({ error: \'Prova não encontrada\' });
        }
        res.json(prova);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Atualizar Prova
app.put(\'/api/provas/:id\', async (req, res) => {
    try {
        const prova = await Prova.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!prova) {
            return res.status(404).json({ error: \'Prova não encontrada\' });
        }
        res.json(prova);
    } catch (error) {
        res.status(400).json({ error: error.message, details: error.errors });
    }
});

// Excluir Prova
app.delete(\'/api/provas/:id\', async (req, res) => {
    try {
        const prova = await Prova.findByIdAndDelete(req.params.id);
        if (!prova) {
            return res.status(404).json({ error: \'Prova não encontrada\' });
        }
        // Remover referência da prova na pasta
        if (prova.pasta) {
            await Pasta.findByIdAndUpdate(prova.pasta, { $pull: { provas: prova._id } });
        }
        // Opcional: remover questões associadas
        await Questao.deleteMany({ prova: req.params.id });
        res.json({ message: \'Prova excluída com sucesso\' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Rotas da API para Questões ---

// Criar Questão
app.post(\'/api/questoes\', async (req, res) => {
    try {
        const questao = new Questao(req.body);
        await questao.save();
        if (questao.prova) {
            await Prova.findByIdAndUpdate(questao.prova, { $push: { questoes: questao._id } });
        }
        res.status(201).json(questao);
    } catch (error) {
        res.status(400).json({ error: error.message, details: error.errors });
    }
});

// Listar todas as Questões
app.get(\'/api/questoes\', async (req, res) => {
    try {
        const questoes = await Questao.find().populate(\'prova\').sort({ createdAt: -1 });
        res.json(questoes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obter uma Questão específica
app.get(\'/api/questoes/:id\', async (req, res) => {
    try {
        const questao = await Questao.findById(req.params.id).populate(\'prova\');
        if (!questao) {
            return res.status(404).json({ error: \'Questão não encontrada\' });
        }
        res.json(questao);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Atualizar Questão
app.put(\'/api/questoes/:id\', async (req, res) => {
    try {
        const questao = await Questao.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!questao) {
            return res.status(404).json({ error: \'Questão não encontrada\' });
        }
        res.json(questao);
    } catch (error) {
        res.status(400).json({ error: error.message, details: error.errors });
    }
});

// Excluir Questão
app.delete(\'/api/questoes/:id\', async (req, res) => {
    try {
        const questao = await Questao.findByIdAndDelete(req.params.id);
        if (!questao) {
            return res.status(404).json({ error: \'Questão não encontrada\' });
        }
        // Remover referência da questão na prova
        if (questao.prova) {
            await Prova.findByIdAndUpdate(questao.prova, { $pull: { questoes: questao._id } });
        }
        res.json({ message: \'Questão excluída com sucesso\' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Rotas de Status e Raiz (mantidas) ---

// Rota de status
app.get(\'/api/status\', (req, res) => {
    res.json({
        status: \'online\',
        database: mongoose.connection.readyState === 1 ? \'connected\' : \'disconnected\',
        timestamp: new Date()
    });
});

// Rota raiz
app.get(\'/\', (req, res) => {
    res.send(`
        <h1>API CRUD com MongoDB para Plataforma Educacional</h1>
        <p>Esta API está funcionando corretamente.</p>
        <p>Banco de dados: ${mongoose.connection.readyState === 1 ? \'Conectado\' : \'Desconectado\'}</p>
        <p><a href=\'/api/pastas\'>Ver todas as Pastas</a></p>
        <p><a href=\'/api/provas\'>Ver todas as Provas</a></p>
        <p><a href=\'/api/questoes\'>Ver todas as Questões</a></p>
    `);
});

// Middleware de erro
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: \'Algo deu errado!\' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Conectado ao MongoDB em: ${MONGODB_URI}`);
});


