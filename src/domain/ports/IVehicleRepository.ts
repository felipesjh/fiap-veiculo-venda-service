import { Vehicle } from '../entities/Vehicle';

export interface IVehicleRepository {
  save(vehicle: Vehicle): Promise<Vehicle>;
  findById(id: string): Promise<Vehicle | null>;
  findAvailableSortedByPrice(): Promise<Vehicle[]>;
  findSoldSortedByPrice(): Promise<Vehicle[]>;
  delete(id: string): Promise<void>;
}
