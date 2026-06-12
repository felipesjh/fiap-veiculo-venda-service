import { MongoClient, Collection, ObjectId } from 'mongodb';
import { Sale } from '../../domain/entities/Sale';
import { ISaleRepository } from '../../domain/ports/ISaleRepository';

export class MongoSaleRepository implements ISaleRepository {
  private client: MongoClient;
  private collection!: Collection;

  constructor() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/sales_db';
    this.client = new MongoClient(mongoUri);
  }

  public async connect(): Promise<void> {
    await this.client.connect();
    const db = this.client.db();
    this.collection = db.collection('sales');
    // Criar índice por paymentCode para buscas rápidas no Webhook
    await this.collection.createIndex({ paymentCode: 1 }, { unique: true });
  }

  public async save(sale: Sale): Promise<Sale> {
    const id = sale.getId() || new ObjectId().toString();
    sale.setId(id);

    const doc = {
      _id: new ObjectId(id),
      vehicleId: sale.getVehicleId(),
      vehicleBrand: sale.getVehicleBrand(),
      vehicleModel: sale.getVehicleModel(),
      vehiclePrice: sale.getVehiclePrice(),
      cpf: sale.getCpf(),
      saleDate: sale.getSaleDate(),
      paymentCode: sale.getPaymentCode(),
      status: sale.getStatus()
    };

    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: doc },
      { upsert: true }
    );

    return sale;
  }

  public async findByPaymentCode(paymentCode: string): Promise<Sale | null> {
    const doc = await this.collection.findOne({ paymentCode });
    if (!doc) return null;

    return Sale.create({
      id: doc._id.toString(),
      vehicleId: doc.vehicleId,
      vehicleBrand: doc.vehicleBrand,
      vehicleModel: doc.vehicleModel,
      vehiclePrice: doc.vehiclePrice,
      cpf: doc.cpf,
      saleDate: doc.saleDate,
      paymentCode: doc.paymentCode,
      status: doc.status
    });
  }

  public async findById(id: string): Promise<Sale | null> {
    try {
      const doc = await this.collection.findOne({ _id: new ObjectId(id) });
      if (!doc) return null;

      return Sale.create({
        id: doc._id.toString(),
        vehicleId: doc.vehicleId,
        vehicleBrand: doc.vehicleBrand,
        vehicleModel: doc.vehicleModel,
        vehiclePrice: doc.vehiclePrice,
        cpf: doc.cpf,
        saleDate: doc.saleDate,
        paymentCode: doc.paymentCode,
        status: doc.status
      });
    } catch {
      return null;
    }
  }

  public async findAll(): Promise<Sale[]> {
    const docs = await this.collection.find().toArray();
    return docs.map(doc =>
      Sale.create({
        id: doc._id.toString(),
        vehicleId: doc.vehicleId,
        vehicleBrand: doc.vehicleBrand,
        vehicleModel: doc.vehicleModel,
        vehiclePrice: doc.vehiclePrice,
        cpf: doc.cpf,
        saleDate: doc.saleDate,
        paymentCode: doc.paymentCode,
        status: doc.status
      })
    );
  }

  public async close(): Promise<void> {
    await this.client.close();
  }
}
