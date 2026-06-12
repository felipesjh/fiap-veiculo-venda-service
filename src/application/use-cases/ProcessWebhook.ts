import axios from 'axios';
import { ISaleRepository } from '../../domain/ports/ISaleRepository';
import { IVehicleRepository } from '../../domain/ports/IVehicleRepository';

export interface ProcessWebhookDTO {
  paymentCode: string;
  status: string;
}

export class ProcessWebhook {
  private readonly adminServiceUrl: string;

  constructor(
    private readonly saleRepository: ISaleRepository,
    private readonly vehicleRepository: IVehicleRepository
  ) {
    this.adminServiceUrl = process.env.ADMIN_SERVICE_URL || 'http://localhost:3001';
  }

  public async execute(dto: ProcessWebhookDTO): Promise<any> {
    // 1. Tentar buscar pelo código de pagamento (ex: PAY-XYZ)
    let sale = await this.saleRepository.findByPaymentCode(dto.paymentCode);

    // 2. Se não encontrar, tentar buscar pelo ID da venda (caso o usuário tenha confundido id com paymentCode)
    if (!sale) {
      sale = await this.saleRepository.findById(dto.paymentCode);
    }

    if (!sale) {
      throw new Error('Venda não encontrada para o código ou ID fornecido');
    }

    const vehicle = await this.vehicleRepository.findById(sale.getVehicleId());
    if (!vehicle) {
      throw new Error('Veículo correspondente à venda não encontrado');
    }

    const statusClean = (dto.status || '').trim().toLowerCase();
    const isSuccess = ['efetuado', 'aprovado', 'pago', 'confirmado', 'vendido', 'success'].includes(statusClean);
    const isCancelled = ['cancelado', 'rejeitado', 'falhou', 'recusado', 'error'].includes(statusClean);

    if (isSuccess) {
      sale.confirmPayment();
      vehicle.markAsSold();

      await this.saleRepository.save(sale);
      await this.vehicleRepository.save(vehicle);

      // Notificar o serviço de administração para marcar o veículo como VENDIDO no MySQL
      try {
        const url = `${this.adminServiceUrl}/api/internal/vehicles/${vehicle.getId()}/sold`;
        await axios.post(url);
      } catch (err: any) {
        console.error(`Falha ao sincronizar venda concluída com o serviço Admin: ${err.message}`);
        // Não jogamos erro aqui para não invalidar a venda confirmada do cliente,
        // mas marcamos a necessidade de reconciliação.
      }
    } else if (isCancelled) {
      sale.cancelPayment();
      vehicle.markAsAvailable();

      await this.saleRepository.save(sale);
      await this.vehicleRepository.save(vehicle);
    } else {
      throw new Error('Status de pagamento inválido. Use "efetuado" ou "cancelado" (ou sinônimos).');
    }

    return sale.toJSON();
  }
}
