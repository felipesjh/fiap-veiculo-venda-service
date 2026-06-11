import { Request, Response } from 'express';
import { CreateSale } from '../../../application/use-cases/CreateSale';
import { ProcessWebhook } from '../../../application/use-cases/ProcessWebhook';
import { ListAvailableVehicles } from '../../../application/use-cases/ListAvailableVehicles';
import { ListSoldVehicles } from '../../../application/use-cases/ListSoldVehicles';
import { ISaleRepository } from '../../../domain/ports/ISaleRepository';
import { IVehicleRepository } from '../../../domain/ports/IVehicleRepository';
import { Vehicle } from '../../../domain/entities/Vehicle';

export class SalesController {
  constructor(
    private readonly saleRepository: ISaleRepository,
    private readonly vehicleRepository: IVehicleRepository
  ) {}

  public async getAvailable(req: Request, res: Response): Promise<void> {
    try {
      const useCase = new ListAvailableVehicles(this.vehicleRepository);
      const list = await useCase.execute();
      res.status(200).json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async getSold(req: Request, res: Response): Promise<void> {
    try {
      const useCase = new ListSoldVehicles(this.vehicleRepository);
      const list = await useCase.execute();
      res.status(200).json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async createSale(req: Request, res: Response): Promise<void> {
    try {
      const { vehicleId, cpf, saleDate } = req.body;
      const useCase = new CreateSale(this.saleRepository, this.vehicleRepository);
      const sale = await useCase.execute({ vehicleId, cpf, saleDate });
      res.status(201).json(sale);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { paymentCode, status } = req.body;
      const useCase = new ProcessWebhook(this.saleRepository, this.vehicleRepository);
      const sale = await useCase.execute({ paymentCode, status });
      res.status(200).json({
        message: 'Webhook processado com sucesso',
        sale
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async listSales(req: Request, res: Response): Promise<void> {
    try {
      const sales = await this.saleRepository.findAll();
      res.status(200).json(sales.map(s => s.toJSON()));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Métodos de Sincronização Interna (Chamados pelo Serviço Admin)
  public async syncCreateVehicle(req: Request, res: Response): Promise<void> {
    try {
      const { id, brand, model, year, color, price, status } = req.body;
      const vehicle = Vehicle.create({ id, brand, model, year, color, price, status });
      await this.vehicleRepository.save(vehicle);
      res.status(201).json({ message: 'Veículo sincronizado com sucesso' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async syncUpdateVehicle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { brand, model, year, color, price, status } = req.body;
      
      const vehicle = await this.vehicleRepository.findById(id);
      if (!vehicle) {
        // Se por acaso não existir, criamos para manter integridade
        const newVehicle = Vehicle.create({ id, brand, model, year, color, price, status: status || 'A_VENDA' });
        await this.vehicleRepository.save(newVehicle);
      } else {
        vehicle.update({ brand, model, year, color, price, status });
        await this.vehicleRepository.save(vehicle);
      }
      res.status(200).json({ message: 'Sincronização de atualização efetuada' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async syncDeleteVehicle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const vehicle = await this.vehicleRepository.findById(id);
      if (!vehicle) {
        res.status(404).json({ error: 'Veículo não encontrado para exclusão' });
        return;
      }
      await this.vehicleRepository.delete(id);
      res.status(200).json({ message: 'Sincronização de exclusão efetuada' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
