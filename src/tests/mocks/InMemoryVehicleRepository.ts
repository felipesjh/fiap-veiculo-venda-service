import { Vehicle } from '../../domain/entities/Vehicle';
import { IVehicleRepository } from '../../domain/ports/IVehicleRepository';

export class InMemoryVehicleRepository implements IVehicleRepository {
  private vehicles: Map<string, Vehicle> = new Map();

  public async save(vehicle: Vehicle): Promise<Vehicle> {
    this.vehicles.set(vehicle.getId(), vehicle);
    return vehicle;
  }

  public async findById(id: string): Promise<Vehicle | null> {
    return this.vehicles.get(id) || null;
  }

  public async findAvailableSortedByPrice(): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values())
      .filter(v => v.getStatus() === 'A_VENDA')
      .sort((a, b) => a.getPrice() - b.getPrice());
  }

  public async findSoldSortedByPrice(): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values())
      .filter(v => v.getStatus() === 'VENDIDO')
      .sort((a, b) => a.getPrice() - b.getPrice());
  }

  public async delete(id: string): Promise<void> {
    this.vehicles.delete(id);
  }

  public clear(): void {
    this.vehicles.clear();
  }
}
