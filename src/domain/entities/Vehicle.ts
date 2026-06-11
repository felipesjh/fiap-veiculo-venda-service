export type VehicleStatus = 'A_VENDA' | 'VENDIDO';

export interface VehicleProps {
  id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  price: number;
  status: VehicleStatus;
}

export class Vehicle {
  private constructor(private readonly props: VehicleProps) {}

  public static create(props: VehicleProps): Vehicle {
    if (!props.id) throw new Error('ID do veículo é obrigatório');
    if (!props.brand) throw new Error('Marca do veículo é obrigatória');
    if (!props.model) throw new Error('Modelo do veículo é obrigatório');
    if (props.price <= 0) throw new Error('Preço do veículo deve ser positivo');
    return new Vehicle(props);
  }

  public update(props: Partial<Omit<VehicleProps, 'id'>>): void {
    if (props.brand) this.props.brand = props.brand;
    if (props.model) this.props.model = props.model;
    if (props.year) this.props.year = props.year;
    if (props.color) this.props.color = props.color;
    if (props.price) this.props.price = props.price;
    if (props.status) this.props.status = props.status;
  }

  public markAsSold(): void {
    this.props.status = 'VENDIDO';
  }

  public markAsAvailable(): void {
    this.props.status = 'A_VENDA';
  }

  public getId(): string {
    return this.props.id;
  }

  public getBrand(): string {
    return this.props.brand;
  }

  public getModel(): string {
    return this.props.model;
  }

  public getYear(): number {
    return this.props.year;
  }

  public getColor(): string {
    return this.props.color;
  }

  public getPrice(): number {
    return this.props.price;
  }

  public getStatus(): VehicleStatus {
    return this.props.status;
  }

  public toJSON() {
    return { ...this.props };
  }
}
