import { IVehicleRepository } from '../../domain/ports/IVehicleRepository';

export class ListSoldVehicles {
  constructor(private readonly vehicleRepository: IVehicleRepository) {}

  public async execute(): Promise<any[]> {
    const vehicles = await this.vehicleRepository.findSoldSortedByPrice();
    return vehicles.map(v => v.toJSON());
  }
}
