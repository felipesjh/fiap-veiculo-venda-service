import { Sale } from '../../domain/entities/Sale';
import { ISaleRepository } from '../../domain/ports/ISaleRepository';

export class InMemorySaleRepository implements ISaleRepository {
  private sales: Map<string, Sale> = new Map();

  public async save(sale: Sale): Promise<Sale> {
    const id = sale.getId() || Math.random().toString(36).substring(7);
    sale.setId(id);
    this.sales.set(id, sale);
    return sale;
  }

  public async findByPaymentCode(paymentCode: string): Promise<Sale | null> {
    for (const sale of this.sales.values()) {
      if (sale.getPaymentCode() === paymentCode) {
        return sale;
      }
    }
    return null;
  }

  public async findAll(): Promise<Sale[]> {
    return Array.from(this.sales.values());
  }

  public clear(): void {
    this.sales.clear();
  }
}
