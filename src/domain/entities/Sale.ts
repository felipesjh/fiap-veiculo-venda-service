import { CPF } from '../value-objects/CPF';

export type SaleStatus = 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';

export interface SaleProps {
  id?: string;
  vehicleId: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePrice: number;
  cpf: string;
  saleDate: Date;
  paymentCode?: string;
  status?: SaleStatus;
}

export class Sale {
  private id?: string;
  private vehicleId: string;
  private vehicleBrand: string;
  private vehicleModel: string;
  private vehiclePrice: number;
  private cpf: CPF;
  private saleDate: Date;
  private paymentCode: string;
  private status: SaleStatus;

  private constructor(props: SaleProps) {
    this.id = props.id;
    this.vehicleId = props.vehicleId;
    this.vehicleBrand = props.vehicleBrand;
    this.vehicleModel = props.vehicleModel;
    this.vehiclePrice = props.vehiclePrice;
    this.cpf = CPF.create(props.cpf);
    this.saleDate = new Date(props.saleDate);
    this.paymentCode = props.paymentCode || Sale.generatePaymentCode();
    this.status = props.status || 'PENDENTE';
  }

  public static create(props: SaleProps): Sale {
    if (!props.vehicleId) throw new Error('O ID do veículo é obrigatório');
    if (!props.cpf) throw new Error('O CPF do comprador é obrigatório');
    if (!props.saleDate) throw new Error('A data da venda é obrigatória');
    if (isNaN(new Date(props.saleDate).getTime())) throw new Error('Data de venda inválida');
    return new Sale(props);
  }

  private static generatePaymentCode(): string {
    return 'PAY-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  public confirmPayment(): void {
    if (this.status !== 'PENDENTE') {
      throw new Error(`Não é possível confirmar uma venda com status: ${this.status}`);
    }
    this.status = 'CONFIRMADO';
  }

  public cancelPayment(): void {
    if (this.status !== 'PENDENTE') {
      throw new Error(`Não é possível cancelar uma venda com status: ${this.status}`);
    }
    this.status = 'CANCELADO';
  }

  public getId(): string | undefined {
    return this.id;
  }

  public setId(id: string): void {
    this.id = id;
  }

  public getVehicleId(): string {
    return this.vehicleId;
  }

  public getVehicleBrand(): string {
    return this.vehicleBrand;
  }

  public getVehicleModel(): string {
    return this.vehicleModel;
  }

  public getVehiclePrice(): number {
    return this.vehiclePrice;
  }

  public getCpf(): string {
    return this.cpf.getValue();
  }

  public getSaleDate(): Date {
    return this.saleDate;
  }

  public getPaymentCode(): string {
    return this.paymentCode;
  }

  public getStatus(): SaleStatus {
    return this.status;
  }

  public toJSON() {
    return {
      id: this.id,
      vehicleId: this.vehicleId,
      vehicleBrand: this.vehicleBrand,
      vehicleModel: this.vehicleModel,
      vehiclePrice: this.vehiclePrice,
      cpf: this.getCpf(),
      saleDate: this.saleDate.toISOString(),
      paymentCode: this.paymentCode,
      status: this.status
    };
  }
}
