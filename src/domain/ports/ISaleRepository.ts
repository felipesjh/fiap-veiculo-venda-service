import { Sale } from '../entities/Sale';

export interface ISaleRepository {
  save(sale: Sale): Promise<Sale>;
  findByPaymentCode(paymentCode: string): Promise<Sale | null>;
  findAll(): Promise<Sale[]>;
}
