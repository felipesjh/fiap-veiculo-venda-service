import { IVehicleRepository } from '../../domain/ports/IVehicleRepository';

export class ListAvailableVehicles {
  constructor(private readonly vehicleRepository: IVehicleRepository) {}

  public async execute(): Promise<any[]> {
    const vehicles = await this.vehicleRepository.findAvailableSortedByPrice();
    return vehicles.map(v => v.toJSON());
  }
}
