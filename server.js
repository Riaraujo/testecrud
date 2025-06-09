require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Conexão melhorada com MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:ceHWJohQxTyyQzrTCeDUHOJnEVjDMknx@switchback.proxy.rlwy.net:28016';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
})
.then(() => console.log('MongoDB conectado com sucesso!'))
.catch(err => {
    console.error('FALHA na conexão com MongoDB:', err);
    process.exit(1);
});

// Listeners de conexão
mongoose.connection.on('disconnected', () => {
    console.log('Mongoose desconectado!');
});

// Modelo do Item
const itemSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'O nome é obrigatório'],
        trim: true,
        maxlength: [100, 'O nome não pode ter mais que 100 caracteres']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'A descrição não pode ter mais que 500 caracteres']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Item = mongoose.model('Item', itemSchema);

// Rotas da API
// Criar item
app.post('/api/items', async (req, res) => {
    try {
        const item = new Item(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (error) {
        res.status(400).json({ 
            error: error.message,
            details: error.errors 
        });
    }
});

// Listar todos os itens
app.get('/api/items', async (req, res) => {
    try {
        const items = await Item.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obter um item específico
app.get('/api/items/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Atualizar item
app.put('/api/items/:id', async (req, res) => {
    try {
        const item = await Item.findByIdAndUpdate(
            req.params.id,
            req.body,
            { 
                new: true,
                runValidators: true
            }
        );
        
        if (!item) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        
        res.json(item);
    } catch (error) {
        res.status(400).json({ 
            error: error.message,
            details: error.errors 
        });
    }
});

// Excluir item
app.delete('/api/items/:id', async (req, res) => {
    try {
        const item = await Item.findByIdAndDelete(req.params.id);
        
        if (!item) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        
        res.json({ message: 'Item excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
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

// Rota raiz
app.get('/', (req, res) => {
    res.send(`
        <h1>API CRUD com MongoDB</h1>
        <p>Esta API está funcionando corretamente.</p>
        <p>Banco de dados: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'}</p>
        <p><a href="/api/items">Ver todos os itens</a></p>
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
