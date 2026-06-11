import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { MongoVehicleRepository } from '../database/MongoVehicleRepository';
import { MongoSaleRepository } from '../database/MongoSaleRepository';
import { SalesController } from './controllers/SalesController';
import { basicAuth, apiKeyAuth } from './middleware/AuthMiddleware';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Documentação do Swagger do Serviço de Vendas aberta (autenticação de endpoints feita via Swagger Authorize)
app.use('/api-docs', express.static(path.join(__dirname, 'public/api-docs')));

// Inicializar dependências
const vehicleRepository = new MongoVehicleRepository();
const saleRepository = new MongoSaleRepository();
const salesController = new SalesController(saleRepository, vehicleRepository);

async function startServer() {
  try {
    console.log('Conectando ao MongoDB...');
    await vehicleRepository.connect();
    await saleRepository.connect();
    console.log('MongoDB conectado com sucesso!');

    // Rotas de Listagem (Públicas)
    app.get('/api/vehicles/available', (req, res) => salesController.getAvailable(req, res));
    app.get('/api/vehicles/sold', (req, res) => salesController.getSold(req, res));
    app.get('/api/sales', (req, res) => salesController.listSales(req, res));

    // Rota de Vendas (Protegida por Chave de API)
    app.post('/api/sales', apiKeyAuth, (req, res) => salesController.createSale(req, res));

    // Webhook de Pagamento (Protegido por Chave de API para segurança extra)
    app.post('/api/webhook/payment', apiKeyAuth, (req, res) => salesController.handleWebhook(req, res));

    // Rotas de Sincronização Interna (Recebe dados do serviço Admin - Sem chave para simplificação do link)
    app.post('/api/internal/vehicles', (req, res) => salesController.syncCreateVehicle(req, res));
    app.put('/api/internal/vehicles/:id', (req, res) => salesController.syncUpdateVehicle(req, res));
    app.delete('/api/internal/vehicles/:id', (req, res) => salesController.syncDeleteVehicle(req, res));

    // Endpoint de Healthcheck
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'UP', database: 'MongoDB' });
    });

    app.listen(port, () => {
      console.log(`Serviço de Vendas rodando na porta ${port}`);
      console.log(`Documentação Swagger disponível em http://localhost:${port}/api-docs`);
    });
  } catch (err) {
    console.error('Falha ao iniciar o Serviço de Vendas:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, vehicleRepository, saleRepository };
