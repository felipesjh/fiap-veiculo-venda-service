import { Sale, SaleProps } from '../../domain/entities/Sale';
import { ISaleRepository } from '../../domain/ports/ISaleRepository';
import { IVehicleRepository } from '../../domain/ports/IVehicleRepository';

export interface CreateSaleDTO {
  vehicleId: string;
  cpf: string;
  saleDate: string;
}

export class CreateSale {
  constructor(
    private readonly saleRepository: ISaleRepository,
    private readonly vehicleRepository: IVehicleRepository
  ) {}

  public async execute(dto: CreateSaleDTO): Promise<any> {
    const vehicle = await this.vehicleRepository.findById(dto.vehicleId);
    if (!vehicle) {
      throw new Error('Veículo não encontrado para venda');
    }

    if (vehicle.getStatus() !== 'A_VENDA') {
      throw new Error('Este veículo não está disponível para venda');
    }

    const sale = Sale.create({
      vehicleId: vehicle.getId(),
      vehicleBrand: vehicle.getBrand(),
      vehicleModel: vehicle.getModel(),
      vehiclePrice: vehicle.getPrice(),
      cpf: dto.cpf,
      saleDate: new Date(dto.saleDate),
      status: 'PENDENTE'
    });

    const savedSale = await this.saleRepository.save(sale);
    return savedSale.toJSON();
  }
}
