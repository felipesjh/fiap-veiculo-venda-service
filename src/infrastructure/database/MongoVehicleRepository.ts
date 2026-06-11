import { MongoClient, Collection } from 'mongodb';
import { Vehicle } from '../../domain/entities/Vehicle';
import { IVehicleRepository } from '../../domain/ports/IVehicleRepository';

export class MongoVehicleRepository implements IVehicleRepository {
  private client: MongoClient;
  private collection!: Collection;

  constructor() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/sales_db';
    this.client = new MongoClient(mongoUri);
  }

  public async connect(): Promise<void> {
    await this.client.connect();
    const db = this.client.db();
    this.collection = db.collection('vehicles');
    // Criar índice por preço para otimizar buscas ordenadas exigidas
    await this.collection.createIndex({ price: 1 });
  }

  public async save(vehicle: Vehicle): Promise<Vehicle> {
    const doc = {
      _id: vehicle.getId() as any,
      brand: vehicle.getBrand(),
      model: vehicle.getModel(),
      year: vehicle.getYear(),
      color: vehicle.getColor(),
      price: vehicle.getPrice(),
      status: vehicle.getStatus()
    };

    await this.collection.updateOne(
      { _id: vehicle.getId() as any },
      { $set: doc },
      { upsert: true }
    );

    return vehicle;
  }

  public async findById(id: string): Promise<Vehicle | null> {
    const doc = await this.collection.findOne({ _id: id as any });
    if (!doc) return null;

    return Vehicle.create({
      id: doc._id.toString(),
      brand: doc.brand,
      model: doc.model,
      year: doc.year,
      color: doc.color,
      price: doc.price,
      status: doc.status
    });
  }

  public async findAvailableSortedByPrice(): Promise<Vehicle[]> {
    const docs = await this.collection
      .find({ status: 'A_VENDA' })
      .sort({ price: 1 })
      .toArray();

    return docs.map(doc =>
      Vehicle.create({
        id: doc._id.toString(),
        brand: doc.brand,
        model: doc.model,
        year: doc.year,
        color: doc.color,
        price: doc.price,
        status: doc.status
      })
    );
  }

  public async findSoldSortedByPrice(): Promise<Vehicle[]> {
    const docs = await this.collection
      .find({ status: 'VENDIDO' })
      .sort({ price: 1 })
      .toArray();

    return docs.map(doc =>
      Vehicle.create({
        id: doc._id.toString(),
        brand: doc.brand,
        model: doc.model,
        year: doc.year,
        color: doc.color,
        price: doc.price,
        status: doc.status
      })
    );
  }

  public async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: id as any });
  }

  public async close(): Promise<void> {
    await this.client.close();
  }
}
