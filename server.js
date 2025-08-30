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

// Conexão com MongoDB - CORRIGIDO para banco 'test'
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

console.log('🔗 Conectando ao MongoDB com URI:', MONGODB_URI);

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
})
.then(() => {
    console.log('✅ MongoDB conectado com sucesso!');
    console.log('📊 Banco de dados:', mongoose.connection.db.databaseName);
})
.catch(err => {
    console.error('❌ Falha na conexão com MongoDB:', err);
    process.exit(1);
});

// Schemas
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
    enunciado: {
        type: String,
        required: [true, 'O campo enunciado é obrigatório']
    },
    alternativas: {
        type: [String],
        required: [true, 'O campo alternativas é obrigatório'],
        set: function(val) {
            return Array.isArray(val) ? val : [val];
        }
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

app.put('/api/pastas/:id/mover', async (req, res) => {
    try {
        const { novoParentId } = req.body;
        const pastaId = req.params.id;
        
        const pasta = await Pasta.findById(pastaId);
        if (!pasta) {
            return res.status(404).json({ error: 'Pasta não encontrada' });
        }
        
        if (novoParentId === pastaId) {
            return res.status(400).json({ error: 'Não é possível mover uma pasta para si mesma' });
        }
        
        if (pasta.parent) {
            await Pasta.findByIdAndUpdate(pasta.parent, { 
                $pull: { children: pastaId } 
            });
        }
        
        pasta.parent = novoParentId || null;
        await pasta.save();
        
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

// Rota POST para Questões - VERSÃO CORRIGIDA E FUNCIONAL
app.post('/api/questoes', async (req, res) => {
    try {
        console.log('📨 Recebendo requisição para criar questão:', req.body);

        const requiredFields = ['disciplina', 'materia', 'enunciado', 'alternativas', 'resposta'];
        const missingFields = requiredFields.filter(field => !req.body[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Campos obrigatórios faltando',
                missingFields: missingFields
            });
        }

        if (!['A', 'B', 'C', 'D', 'E'].includes(req.body.resposta)) {
            return res.status(400).json({
                error: 'Resposta inválida',
                details: 'A resposta deve ser A, B, C, D ou E'
            });
        }

        let provaId = req.body.prova;
        let ano = req.body.ano;
        let index = req.body.index;
        let pasta = null;
        let prova = null;

        if (!provaId) {
            if (!ano) {
                return res.status(400).json({
                    error: 'Para criar prova automaticamente, é necessário o ano da questão'
                });
            }

            ano = parseInt(ano);
            if (isNaN(ano)) {
                return res.status(400).json({
                    error: 'Ano deve ser um número válido'
                });
            }

            if (index !== undefined && index !== null) {
                index = parseInt(index);
                if (isNaN(index)) {
                    return res.status(400).json({
                        error: 'Index deve ser um número válido'
                    });
                }
            }

            let dia = 'Primeiro Dia';
            if (index !== undefined && index !== null && index > 95) {
                dia = 'Segundo Dia';
            }

            // 1. VERIFICAR/CRIAR PASTA
            const pastaNome = `ENEM ${ano}`;
            console.log(`🔍 Buscando pasta: "${pastaNome}"`);
            
            pasta = await Pasta.findOne({ nome: pastaNome });
            
            if (!pasta) {
                console.log(`➕ Criando nova pasta: "${pastaNome}"`);
                pasta = new Pasta({
                    nome: pastaNome,
                    descricao: `Provas do ENEM do ano ${ano}`
                });
                await pasta.save();
                console.log(`✅ Pasta criada com ID: ${pasta._id}`);
            } else {
                console.log(`📁 Pasta encontrada: ${pasta._id}`);
            }

            // 2. VERIFICAR/CRIAR PROVA
            const provaTitulo = `ENEM ${ano} ${dia}`;
            console.log(`🔍 Buscando prova: "${provaTitulo}" na pasta: ${pasta._id}`);
            
            prova = await Prova.findOne({ 
                titulo: provaTitulo, 
                pasta: pasta._id 
            });
            
            if (!prova) {
                console.log(`➕ Criando nova prova: "${provaTitulo}"`);
                prova = new Prova({
                    titulo: provaTitulo,
                    descricao: `Prova do ENEM do ano ${ano} - ${dia}`,
                    pasta: pasta._id
                });
                await prova.save();
                console.log(`✅ Prova criada com ID: ${prova._id}`);

                await Pasta.findByIdAndUpdate(
                    pasta._id, 
                    { $push: { provas: prova._id } }
                );
                console.log(`✅ Prova adicionada à pasta: ${pasta._id}`);

            } else {
                console.log(`📝 Prova encontrada: ${prova._id}`);
            }

            provaId = prova._id;
        } else {
            prova = await Prova.findById(provaId);
            if (prova && prova.pasta) {
                pasta = await Pasta.findById(prova.pasta);
            }
        }

        // 3. CRIAR QUESTÃO
        console.log(`➕ Criando questão para prova: ${provaId}`);
        const questaoData = {
            disciplina: req.body.disciplina,
            materia: req.body.materia,
            assunto: req.body.assunto,
            conteudo: req.body.conteudo || null,
            topico: req.body.topico || null,
            ano: ano,
            instituicao: 'ENEM',
            enunciado: req.body.enunciado,
            alternativas: Array.isArray(req.body.alternativas) ? req.body.alternativas : [req.body.alternativas],
            resposta: req.body.resposta,
            prova: provaId,
            img1: req.body.img1 || null,
            img2: req.body.img2 || null,
            img3: req.body.img3 || null,
            conhecimento1: req.body.conhecimento1 ? req.body.conhecimento1.toLowerCase() : null,
            conhecimento2: req.body.conhecimento2 ? req.body.conhecimento2.toLowerCase() : null,
            conhecimento3: req.body.conhecimento3 ? req.body.conhecimento3.toLowerCase() : null,
            conhecimento4: req.body.conhecimento4 ? req.body.conhecimento4.toLowerCase() : null
        };

        if (index !== undefined && index !== null) {
            questaoData.index = index;
        }

        const questao = new Questao(questaoData);
        await questao.save();
        console.log(`✅ Questão criada com ID: ${questao._id}`);

        await Prova.findByIdAndUpdate(
            provaId, 
            { $push: { questoes: questao._id } }
        );
        console.log(`✅ Questão adicionada à prova: ${provaId}`);

        res.status(201).json({
            success: true,
            questao: questao,
            provaCriada: !req.body.prova,
            pastaCriada: !req.body.prova && !!pasta,
            provaId: provaId,
            pastaId: pasta ? pasta._id : null
        });

    } catch (error) {
        console.error('💥 ERRO ao criar questão:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: error.message
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
    const dbStatus = mongoose.connection.readyState;
    const statusText = {
        0: 'disconnected',
        1: 'connected', 
        2: 'connecting',
        3: 'disconnecting'
    }[dbStatus] || 'unknown';
    
    res.json({
        status: 'online',
        database: statusText,
        databaseName: mongoose.connection.db?.databaseName || 'unknown',
        timestamp: new Date()
    });
});

app.get('/', (req, res) => {
    const dbStatus = mongoose.connection.readyState;
    const statusText = dbStatus === 1 ? 'Conectado' : 'Desconectado';
    const dbName = mongoose.connection.db?.databaseName || 'test';
    
    res.send(`
        <h1>API CRUD com MongoDB para Plataforma Educacional</h1>
        <p>Esta API está funcionando corretamente.</p>
        <p>Banco de dados: ${statusText} (${dbName})</p>
        <p><a href='/api/pastas'>Ver todas as Pastas</a></p>
        <p><a href='/api/provas'>Ver todas as Provas</a></p>
        <p><a href='/api/questoes'>Ver todas as Questões</a></p>
        <p><a href='/api/status'>Status da API</a></p>
    `);
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo deu errado!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🔗 Conectado ao MongoDB em: ${MONGODB_URI}`);
});
