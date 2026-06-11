import request from 'supertest';
import express from 'express';
import axios from 'axios';
import { CPF } from '../domain/value-objects/CPF';
import { Vehicle } from '../domain/entities/Vehicle';
import { Sale } from '../domain/entities/Sale';
import { ListAvailableVehicles } from '../application/use-cases/ListAvailableVehicles';
import { ListSoldVehicles } from '../application/use-cases/ListSoldVehicles';
import { CreateSale } from '../application/use-cases/CreateSale';
import { ProcessWebhook } from '../application/use-cases/ProcessWebhook';
import { InMemoryVehicleRepository } from './mocks/InMemoryVehicleRepository';
import { InMemorySaleRepository } from './mocks/InMemorySaleRepository';
import { SalesController } from '../infrastructure/web/controllers/SalesController';
import { basicAuth, apiKeyAuth } from '../infrastructure/web/middleware/AuthMiddleware';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Sales Service - Testes Unitários e de Integração', () => {
  let vehicleRepository: InMemoryVehicleRepository;
  let saleRepository: InMemorySaleRepository;

  // Suprimir console.error nos logs de testes para evitar mensagens de erro falsas no terminal
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    vehicleRepository = new InMemoryVehicleRepository();
    saleRepository = new InMemorySaleRepository();
    jest.clearAllMocks();
  });

  describe('CPF Value Object', () => {
    test('Deve validar CPFs corretos e lançar erro para incorretos', () => {
      // CPF válido gerado matematicamente
      const validCpfStr = '12345678909'; 
      const cpf = CPF.create(validCpfStr);
      expect(cpf.getValue()).toBe('123.456.789-09');

      expect(() => CPF.create('')).toThrow('CPF é obrigatório');
      expect(() => CPF.create('11111111111')).toThrow('CPF inválido'); // repetido
      expect(() => CPF.create('123456')).toThrow('CPF inválido'); // curto
    });
  });

  describe('Vehicle Entity', () => {
    test('Deve criar veículo e alterar status de venda', () => {
      const v = Vehicle.create({
        id: '123',
        brand: 'Honda',
        model: 'Civic',
        year: 2022,
        color: 'Preto',
        price: 150000,
        status: 'A_VENDA'
      });

      expect(v.getId()).toBe('123');
      expect(v.getStatus()).toBe('A_VENDA');

      v.markAsSold();
      expect(v.getStatus()).toBe('VENDIDO');

      v.markAsAvailable();
      expect(v.getStatus()).toBe('A_VENDA');
    });

    test('Deve validar dados obrigatórios no veículo', () => {
      expect(() => Vehicle.create({ id: '', brand: 'H', model: 'C', year: 2020, color: 'X', price: 10, status: 'A_VENDA' })).toThrow('ID do veículo é obrigatório');
      expect(() => Vehicle.create({ id: '1', brand: '', model: 'C', year: 2020, color: 'X', price: 10, status: 'A_VENDA' })).toThrow('Marca do veículo é obrigatória');
      expect(() => Vehicle.create({ id: '1', brand: 'H', model: '', year: 2020, color: 'X', price: 10, status: 'A_VENDA' })).toThrow('Modelo do veículo é obrigatório');
      expect(() => Vehicle.create({ id: '1', brand: 'H', model: 'C', year: 2020, color: 'X', price: -5, status: 'A_VENDA' })).toThrow('Preço do veículo deve ser positivo');
    });

    test('Deve atualizar dados do veículo no Sync', () => {
      const v = Vehicle.create({
        id: '123',
        brand: 'Honda',
        model: 'Civic',
        year: 2022,
        color: 'Preto',
        price: 150000,
        status: 'A_VENDA'
      });

      v.update({ price: 145000, color: 'Prata' });
      expect(v.getPrice()).toBe(145000);
      expect(v.getColor()).toBe('Prata');
    });
  });

  describe('Sale Entity', () => {
    test('Deve criar venda e confirmar/cancelar transação', () => {
      const sale = Sale.create({
        vehicleId: '123',
        vehicleBrand: 'Honda',
        vehicleModel: 'Civic',
        vehiclePrice: 150000,
        cpf: '12345678909',
        saleDate: new Date()
      });

      expect(sale.getStatus()).toBe('PENDENTE');
      expect(sale.getPaymentCode()).toMatch(/^PAY-/);

      sale.confirmPayment();
      expect(sale.getStatus()).toBe('CONFIRMADO');

      expect(() => sale.cancelPayment()).toThrow('Não é possível cancelar uma venda com status: CONFIRMADO');
    });

    test('Deve permitir cancelamento de pagamentos pendentes', () => {
      const sale = Sale.create({
        vehicleId: '123',
        vehicleBrand: 'Honda',
        vehicleModel: 'Civic',
        vehiclePrice: 150000,
        cpf: '12345678909',
        saleDate: new Date()
      });

      sale.cancelPayment();
      expect(sale.getStatus()).toBe('CANCELADO');
      expect(() => sale.confirmPayment()).toThrow('Não é possível confirmar uma venda com status: CANCELADO');
    });

    test('Deve validar propriedades obrigatórias na venda', () => {
      expect(() => Sale.create({ vehicleId: '', vehicleBrand: 'B', vehicleModel: 'M', vehiclePrice: 10, cpf: '12345678909', saleDate: new Date() })).toThrow('O ID do veículo é obrigatório');
      expect(() => Sale.create({ vehicleId: '1', vehicleBrand: 'B', vehicleModel: 'M', vehiclePrice: 10, cpf: '', saleDate: new Date() })).toThrow('O CPF do comprador é obrigatório');
      expect(() => Sale.create({ vehicleId: '1', vehicleBrand: 'B', vehicleModel: 'M', vehiclePrice: 10, cpf: '12345678909', saleDate: null as any })).toThrow('A data da venda é obrigatória');
      expect(() => Sale.create({ vehicleId: '1', vehicleBrand: 'B', vehicleModel: 'M', vehiclePrice: 10, cpf: '12345678909', saleDate: new Date('data-invalida') })).toThrow('Data de venda inválida');
    });
  });

  describe('Use Cases', () => {
    test('ListAvailableVehicles - Deve listar veículos disponíveis ordenados por preço ASC', async () => {
      await vehicleRepository.save(Vehicle.create({ id: '1', brand: 'A', model: 'M1', year: 2020, color: 'X', price: 90000, status: 'A_VENDA' }));
      await vehicleRepository.save(Vehicle.create({ id: '2', brand: 'B', model: 'M2', year: 2020, color: 'X', price: 40000, status: 'A_VENDA' }));
      await vehicleRepository.save(Vehicle.create({ id: '3', brand: 'C', model: 'M3', year: 2020, color: 'X', price: 120000, status: 'A_VENDA' }));

      const useCase = new ListAvailableVehicles(vehicleRepository);
      const res = await useCase.execute();

      expect(res.length).toBe(3);
      expect(res[0].price).toBe(40000); // Mais barato primeiro
      expect(res[1].price).toBe(90000);
      expect(res[2].price).toBe(120000); // Mais caro por último
    });

    test('ListSoldVehicles - Deve listar veículos vendidos ordenados por preço ASC', async () => {
      await vehicleRepository.save(Vehicle.create({ id: '1', brand: 'A', model: 'M1', year: 2020, color: 'X', price: 90000, status: 'VENDIDO' }));
      await vehicleRepository.save(Vehicle.create({ id: '2', brand: 'B', model: 'M2', year: 2020, color: 'X', price: 40000, status: 'VENDIDO' }));

      const useCase = new ListSoldVehicles(vehicleRepository);
      const res = await useCase.execute();

      expect(res.length).toBe(2);
      expect(res[0].price).toBe(40000);
      expect(res[1].price).toBe(90000);
    });

    test('CreateSale - Deve gerar pedido de venda pendente com CPF formatado', async () => {
      const vehicle = Vehicle.create({ id: 'v1', brand: 'Fiat', model: 'Uno', year: 2010, color: 'Vermelho', price: 25000, status: 'A_VENDA' });
      await vehicleRepository.save(vehicle);

      const useCase = new CreateSale(saleRepository, vehicleRepository);
      const res = await useCase.execute({
        vehicleId: 'v1',
        cpf: '12345678909',
        saleDate: '2026-05-30'
      });

      expect(res.paymentCode).toBeDefined();
      expect(res.cpf).toBe('123.456.789-09');
      expect(res.status).toBe('PENDENTE');
    });

    test('CreateSale - Deve falhar se veículo não existir ou já estiver vendido', async () => {
      const useCase = new CreateSale(saleRepository, vehicleRepository);
      await expect(useCase.execute({ vehicleId: 'invalido', cpf: '12345678909', saleDate: '2026-05-30' })).rejects.toThrow('Veículo não encontrado para venda');

      const soldVehicle = Vehicle.create({ id: 'v2', brand: 'Fiat', model: 'Uno', year: 2010, color: 'Vermelho', price: 25000, status: 'VENDIDO' });
      await vehicleRepository.save(soldVehicle);
      await expect(useCase.execute({ vehicleId: 'v2', cpf: '12345678909', saleDate: '2026-05-30' })).rejects.toThrow('Este veículo não está disponível para venda');
    });

    test('ProcessWebhook - Deve confirmar pagamento, marcar como vendido e sincronizar com o Admin via HTTP', async () => {
      const vehicle = Vehicle.create({ id: 'v1', brand: 'Fiat', model: 'Uno', year: 2010, color: 'Vermelho', price: 25000, status: 'A_VENDA' });
      await vehicleRepository.save(vehicle);

      const sale = Sale.create({
        vehicleId: 'v1',
        vehicleBrand: 'Fiat',
        vehicleModel: 'Uno',
        vehiclePrice: 25000,
        cpf: '12345678909',
        saleDate: new Date()
      });
      await saleRepository.save(sale);

      mockedAxios.post.mockResolvedValue({ status: 200 });

      const useCase = new ProcessWebhook(saleRepository, vehicleRepository);
      const res = await useCase.execute({
        paymentCode: sale.getPaymentCode(),
        status: 'efetuado'
      });

      expect(res.status).toBe('CONFIRMADO');
      const updatedVehicle = await vehicleRepository.findById('v1');
      expect(updatedVehicle!.getStatus()).toBe('VENDIDO');

      // Verifica se a chamada HTTP do webhook para sincronizar com o Admin foi efetuada
      expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining(`/api/internal/vehicles/v1/sold`));
    });

    test('ProcessWebhook - Deve cancelar pagamento e reverter status do veículo', async () => {
      const vehicle = Vehicle.create({ id: 'v1', brand: 'Fiat', model: 'Uno', year: 2010, color: 'Vermelho', price: 25000, status: 'A_VENDA' });
      await vehicleRepository.save(vehicle);

      const sale = Sale.create({
        vehicleId: 'v1',
        vehicleBrand: 'Fiat',
        vehicleModel: 'Uno',
        vehiclePrice: 25000,
        cpf: '12345678909',
        saleDate: new Date()
      });
      await saleRepository.save(sale);

      const useCase = new ProcessWebhook(saleRepository, vehicleRepository);
      const res = await useCase.execute({
        paymentCode: sale.getPaymentCode(),
        status: 'cancelado'
      });

      expect(res.status).toBe('CANCELADO');
      const updatedVehicle = await vehicleRepository.findById('v1');
      expect(updatedVehicle!.getStatus()).toBe('A_VENDA');
    });

    test('ProcessWebhook - Deve falhar se dados forem inconsistentes', async () => {
      const useCase = new ProcessWebhook(saleRepository, vehicleRepository);
      await expect(useCase.execute({ paymentCode: 'PAY-INEXISTENTE', status: 'efetuado' })).rejects.toThrow('Venda não encontrada');
      
      const saleInvalido = Sale.create({ id: 's_err', vehicleId: 'v_err', vehicleBrand: 'B', vehicleModel: 'M', vehiclePrice: 10, cpf: '12345678909', saleDate: new Date() });
      await saleRepository.save(saleInvalido);
      await expect(useCase.execute({ paymentCode: saleInvalido.getPaymentCode(), status: 'efetuado' })).rejects.toThrow('Veículo correspondente à venda não encontrado');

      const vehicle = Vehicle.create({ id: 'v_err', brand: 'Fiat', model: 'Uno', year: 2010, color: 'Vermelho', price: 25000, status: 'A_VENDA' });
      await vehicleRepository.save(vehicle);
      await expect(useCase.execute({ paymentCode: saleInvalido.getPaymentCode(), status: 'invalido' as any })).rejects.toThrow('Status de pagamento inválido');
    });
  });

  describe('HTTP Controller Integration', () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      const controller = new SalesController(saleRepository, vehicleRepository);
      app.get('/api/vehicles/available', (req, res) => controller.getAvailable(req, res));
      app.get('/api/vehicles/sold', (req, res) => controller.getSold(req, res));
      app.post('/api/sales', (req, res) => controller.createSale(req, res));
      app.get('/api/sales', (req, res) => controller.listSales(req, res));
      app.post('/api/webhook/payment', (req, res) => controller.handleWebhook(req, res));
      app.post('/api/internal/vehicles', (req, res) => controller.syncCreateVehicle(req, res));
      app.put('/api/internal/vehicles/:id', (req, res) => controller.syncUpdateVehicle(req, res));
      app.delete('/api/internal/vehicles/:id', (req, res) => controller.syncDeleteVehicle(req, res));
    });

    test('GET /api/vehicles/available - Deve retornar veículos à venda ordenados', async () => {
      await vehicleRepository.save(Vehicle.create({ id: '1', brand: 'A', model: 'M', year: 2020, color: 'X', price: 500, status: 'A_VENDA' }));
      await vehicleRepository.save(Vehicle.create({ id: '2', brand: 'B', model: 'M', year: 2020, color: 'X', price: 100, status: 'A_VENDA' }));

      const res = await request(app).get('/api/vehicles/available');
      expect(res.status).toBe(200);
      expect(res.body[0].price).toBe(100);
    });

    test('GET /api/vehicles/sold - Deve retornar veículos vendidos ordenados', async () => {
      await vehicleRepository.save(Vehicle.create({ id: '1', brand: 'A', model: 'M', year: 2020, color: 'X', price: 500, status: 'VENDIDO' }));
      await vehicleRepository.save(Vehicle.create({ id: '2', brand: 'B', model: 'M', year: 2020, color: 'X', price: 100, status: 'VENDIDO' }));

      const res = await request(app).get('/api/vehicles/sold');
      expect(res.status).toBe(200);
      expect(res.body[0].price).toBe(100);
    });

    test('POST /api/sales - Deve cadastrar venda com sucesso', async () => {
      await vehicleRepository.save(Vehicle.create({ id: 'v1', brand: 'Fiat', model: 'Uno', year: 2010, color: 'Vermelho', price: 25000, status: 'A_VENDA' }));
      const res = await request(app)
        .post('/api/sales')
        .send({ vehicleId: 'v1', cpf: '12345678909', saleDate: '2026-05-30' });

      expect(res.status).toBe(201);
      expect(res.body.paymentCode).toBeDefined();
    });

    test('POST /api/sales - Deve retornar 400 se venda falhar', async () => {
      const res = await request(app)
        .post('/api/sales')
        .send({ vehicleId: 'inexistente', cpf: '12345678909', saleDate: '2026-05-30' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('GET /api/sales - Deve retornar todas as vendas', async () => {
      await saleRepository.save(Sale.create({ vehicleId: 'v1', vehicleBrand: 'B', vehicleModel: 'M', vehiclePrice: 10, cpf: '12345678909', saleDate: new Date() }));
      const res = await request(app).get('/api/sales');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    test('POST /api/webhook/payment - Deve retornar 400 se webhook falhar', async () => {
      const res = await request(app)
        .post('/api/webhook/payment')
        .send({ paymentCode: 'PAY-FALSO', status: 'efetuado' });

      expect(res.status).toBe(400);
    });

    test('POST /api/webhook/payment - Deve processar webhook com sucesso', async () => {
      await vehicleRepository.save(Vehicle.create({ id: 'v1', brand: 'Fiat', model: 'Uno', year: 2010, color: 'Vermelho', price: 25000, status: 'A_VENDA' }));
      const sale = Sale.create({ vehicleId: 'v1', vehicleBrand: 'B', vehicleModel: 'M', vehiclePrice: 10, cpf: '12345678909', saleDate: new Date() });
      await saleRepository.save(sale);

      const res = await request(app)
        .post('/api/webhook/payment')
        .send({ paymentCode: sale.getPaymentCode(), status: 'efetuado' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Webhook processado com sucesso');
    });

    test('POST /api/internal/vehicles - Deve sincronizar veículo criado vindo do Admin', async () => {
      const res = await request(app)
        .post('/api/internal/vehicles')
        .send({ id: 'v_sync', brand: 'Tesla', model: 'Model 3', year: 2023, color: 'Vermelho', price: 290000, status: 'A_VENDA' });

      expect(res.status).toBe(201);
      const vehicle = await vehicleRepository.findById('v_sync');
      expect(vehicle).toBeDefined();
      expect(vehicle!.getModel()).toBe('Model 3');
    });

    test('POST /api/internal/vehicles - Deve retornar 400 se sincronização do create falhar', async () => {
      const res = await request(app)
        .post('/api/internal/vehicles')
        .send({ id: '', brand: 'Tesla' });

      expect(res.status).toBe(400);
    });

    test('PUT /api/internal/vehicles/:id - Deve sincronizar veículo editado vindo do Admin', async () => {
      const vehicle = Vehicle.create({ id: 'v_sync', brand: 'Tesla', model: 'Model 3', year: 2023, color: 'Vermelho', price: 290000, status: 'A_VENDA' });
      await vehicleRepository.save(vehicle);

      const res = await request(app)
        .put('/api/internal/vehicles/v_sync')
        .send({ brand: 'Tesla', model: 'Model 3 Plaid', year: 2023, color: 'Branco', price: 340000 });

      expect(res.status).toBe(200);
      const updated = await vehicleRepository.findById('v_sync');
      expect(updated!.getModel()).toBe('Model 3 Plaid');
      expect(updated!.getColor()).toBe('Branco');
    });

    test('PUT /api/internal/vehicles/:id - Deve cadastrar se veículo não existia no sync do update', async () => {
      const res = await request(app)
        .put('/api/internal/vehicles/v_sync_novo')
        .send({ brand: 'Tesla', model: 'Model X', year: 2023, color: 'Branco', price: 500000 });

      expect(res.status).toBe(200);
      const vehicle = await vehicleRepository.findById('v_sync_novo');
      expect(vehicle).toBeDefined();
      expect(vehicle!.getModel()).toBe('Model X');
    });

    test('PUT /api/internal/vehicles/:id - Deve retornar 400 se sincronização do update falhar', async () => {
      const res = await request(app)
        .put('/api/internal/vehicles/v_sync_novo')
        .send({ price: -10 });

      expect(res.status).toBe(400);
    });

    test('DELETE /api/internal/vehicles/:id - Deve sincronizar exclusão com sucesso', async () => {
      const vehicle = Vehicle.create({ id: 'v_sync', brand: 'Tesla', model: 'Model 3', year: 2023, color: 'Vermelho', price: 290000, status: 'A_VENDA' });
      await vehicleRepository.save(vehicle);

      const res = await request(app).delete('/api/internal/vehicles/v_sync');
      expect(res.status).toBe(200);

      const deleted = await vehicleRepository.findById('v_sync');
      expect(deleted).toBeNull();
    });

    test('DELETE /api/internal/vehicles/:id - Deve retornar 404 se veículo não existir', async () => {
      const res = await request(app).delete('/api/internal/vehicles/invalido');
      expect(res.status).toBe(404);
    });

    test('Erro global catch - deve responder com 500 se o repositorio falhar', async () => {
      // Mocking getAvailable to throw error
      jest.spyOn(vehicleRepository, 'findAvailableSortedByPrice').mockRejectedValue(new Error('Erro de banco de dados'));
      
      const res = await request(app).get('/api/vehicles/available');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Erro de banco de dados');

      jest.spyOn(vehicleRepository, 'findSoldSortedByPrice').mockRejectedValue(new Error('Erro de banco de dados'));
      const resSold = await request(app).get('/api/vehicles/sold');
      expect(resSold.status).toBe(500);

      jest.spyOn(saleRepository, 'findAll').mockRejectedValue(new Error('Erro de banco de dados'));
      const resSales = await request(app).get('/api/sales');
      expect(resSales.status).toBe(500);
    });
  });

  describe('Auth Middleware', () => {
    let mockReq: any;
    let mockRes: any;
    let nextFunction: any;

    beforeEach(() => {
      mockReq = {
        headers: {}
      };
      mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn()
      };
      nextFunction = jest.fn();
    });

    test('basicAuth - Deve autorizar com credenciais válidas', () => {
      mockReq.headers.authorization = 'Basic ' + Buffer.from('admin:fiapsoat').toString('base64');
      basicAuth(mockReq, mockRes, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    test('basicAuth - Deve retornar 401 sem header ou com credenciais inválidas', () => {
      basicAuth(mockReq, mockRes, nextFunction);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('Autenticação necessária'));

      mockReq.headers.authorization = 'Basic ' + Buffer.from('admin:errado').toString('base64');
      jest.clearAllMocks();
      basicAuth(mockReq, mockRes, nextFunction);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    test('apiKeyAuth - Deve autorizar com chave válida', () => {
      mockReq.headers['x-api-key'] = 'fiap-secret-key';
      apiKeyAuth(mockReq, mockRes, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    test('apiKeyAuth - Deve retornar 401 com chave inválida ou vazia', () => {
      apiKeyAuth(mockReq, mockRes, nextFunction);
      expect(mockRes.status).toHaveBeenCalledWith(401);

      mockReq.headers['x-api-key'] = 'errada';
      jest.clearAllMocks();
      apiKeyAuth(mockReq, mockRes, nextFunction);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
