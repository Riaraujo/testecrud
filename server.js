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
    materia: {
        type: String,
        required: [true, 'O campo matéria é obrigatório'],
        trim: true
    },
    assunto: {
        type: String,
        required: false, // Tornando opcional
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

// FUNÇÃO SEPARADA PARA CRIAR PASTA E PROVA AUTOMATICAMENTE
async function criarPastaEProva(dadosQuestao) {
    try {
        console.log('=== INICIANDO CRIAÇÃO DE PASTA E PROVA ===');
        
        // Gerar nome baseado na disciplina e matéria
        const nomeBase = `${dadosQuestao.disciplina} - ${dadosQuestao.materia}`;
        
        // Se tiver assunto, adicionar ao nome
        const nomeCompleto = dadosQuestao.assunto ? 
            `${nomeBase} - ${dadosQuestao.assunto}` : 
            nomeBase;

        console.log(`Nome gerado: ${nomeCompleto}`);

        // Verificar/Criar pasta
        let pasta = await Pasta.findOne({ nome: nomeCompleto });
        let pastaCriada = false;
        
        if (!pasta) {
            pasta = new Pasta({
                nome: nomeCompleto,
                descricao: `Pasta para questões de ${nomeCompleto}`
            });
            await pasta.save();
            pastaCriada = true;
            console.log(`✓ Pasta criada: ${nomeCompleto} com ID: ${pasta._id}`);
        } else {
            console.log(`✓ Pasta encontrada: ${nomeCompleto} com ID: ${pasta._id}`);
        }

        // Verificar/Criar prova
        let prova = await Prova.findOne({ titulo: nomeCompleto, pasta: pasta._id });
        let provaCriada = false;
        
        if (!prova) {
            prova = new Prova({
                titulo: nomeCompleto,
                descricao: `Prova de ${nomeCompleto}`,
                pasta: pasta._id
            });
            await prova.save();
            provaCriada = true;
            console.log(`✓ Prova criada: ${nomeCompleto} com ID: ${prova._id}`);

            // Atualizar pasta com a nova prova
            await Pasta.findByIdAndUpdate(
                pasta._id, 
                { $push: { provas: prova._id } }
            );
            console.log(`✓ Prova adicionada à pasta: ${pasta._id}`);
        } else {
            console.log(`✓ Prova encontrada: ${nomeCompleto} com ID: ${prova._id}`);
        }

        console.log('=== PASTA E PROVA CRIADAS/ENCONTRADAS COM SUCESSO ===');

        return {
            pasta: pasta,
            prova: prova,
            pastaCriada: pastaCriada,
            provaCriada: provaCriada
        };

    } catch (error) {
        console.error('=== ERRO AO CRIAR PASTA E PROVA ===');
        console.error('Erro:', error);
        throw error;
    }
}

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

// ROTA POST PARA QUESTÕES - REFATORADA PARA CHAMAR A FUNÇÃO SEPARADA
app.post('/api/questoes', async (req, res) => {
    try {
        console.log('=== INICIANDO CRIAÇÃO DE QUESTÃO ===');
        console.log('Dados recebidos:', req.body);

        // Validar campos obrigatórios
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

        // CHAMAR A FUNÇÃO SEPARADA PARA CRIAR PASTA E PROVA
        const resultado = await criarPastaEProva(req.body);

        console.log('=== RESULTADO DA CRIAÇÃO DE PASTA/PROVA ===');
        console.log('Pasta ID:', resultado.pasta._id);
        console.log('Prova ID:', resultado.prova._id);
        console.log('Pasta criada:', resultado.pastaCriada);
        console.log('Prova criada:', resultado.provaCriada);

        // Criar a questão
        const questaoData = {
            disciplina: req.body.disciplina,
            materia: req.body.materia,
            assunto: req.body.assunto,
            conteudo: req.body.conteudo || null,
            topico: req.body.topico || null,
            ano: req.body.ano ? parseInt(req.body.ano) : null,
            instituicao: req.body.instituicao || null,
            enunciado: req.body.enunciado,
            alternativas: Array.isArray(req.body.alternativas) ? req.body.alternativas : [req.body.alternativas],
            resposta: req.body.resposta,
            prova: resultado.prova._id,
            img1: req.body.img1 || null,
            img2: req.body.img2 || null,
            img3: req.body.img3 || null,
            conhecimento1: req.body.conhecimento1 ? req.body.conhecimento1.toLowerCase() : null,
            conhecimento2: req.body.conhecimento2 ? req.body.conhecimento2.toLowerCase() : null,
            conhecimento3: req.body.conhecimento3 ? req.body.conhecimento3.toLowerCase() : null,
            conhecimento4: req.body.conhecimento4 ? req.body.conhecimento4.toLowerCase() : null
        };

        // Adicionar index da questão se fornecido
        if (req.body.index !== undefined && req.body.index !== null) {
            const index = parseInt(req.body.index);
            if (!isNaN(index)) {
                questaoData.index = index;
            }
        }

        const questao = new Questao(questaoData);
        await questao.save();
        console.log(`✓ Questão criada com ID: ${questao._id}`);

        // Atualizar a prova com a nova questão
        await Prova.findByIdAndUpdate(
            resultado.prova._id, 
            { $push: { questoes: questao._id } }
        );
        console.log(`✓ Questão adicionada à prova: ${resultado.prova._id}`);

        console.log('=== QUESTÃO CRIADA COM SUCESSO ===');

        res.status(201).json({
            questao: questao,
            pasta: resultado.pasta,
            prova: resultado.prova,
            pastaCriada: resultado.pastaCriada,
            provaCriada: resultado.provaCriada,
            message: `Questão criada com sucesso! ${resultado.pastaCriada ? 'Pasta criada. ' : ''}${resultado.provaCriada ? 'Prova criada.' : ''}`
        });

    } catch (error) {
        console.error('=== ERRO AO CRIAR QUESTÃO ===');
        console.error('Erro:', error);
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
