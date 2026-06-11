# Serviço de Venda de Veículos (`veiculo-venda-service`)

Este repositório contém o microsserviço responsável pelas funcionalidades de **Vendas, Listagem de Veículos e Processamento de Webhook de Pagamento** do ecossistema de revenda. Ele implementa as listagens rápidas e ordenadas por preço, e o histórico de transações utilizando o banco de dados NoSQL **MongoDB**.

---

## 🛠️ Arquitetura e Padrões de Design

A aplicação segue rigorosamente os conceitos de **DDD (Domain-Driven Design)** e **Arquitetura Hexagonal (Ports and Adapters)**:

- **Domínio (`src/domain`)**:
  - **Entidades / Agregados**: `Sale.ts` representando a venda e seu ciclo de vida transacional. `Vehicle.ts` atuando como a entidade read-model local sincronizada por chamadas externas.
  - **Value Objects**: `CPF.ts` encapsulando validações matemáticas complexas do dígito verificador do CPF brasileiro, impossibilitando CPFs fictícios ou estruturalmente corrompidos na base de vendas.
  - **Ports (Portas)**: `ISaleRepository` (persistence port) e `IVehicleRepository` (read/write sync port).
- **Aplicação (`src/application`)**:
  - **Use Cases**: 
    - `CreateSale.ts`: Efetua a intenção de compra, criando um pedido com status `PENDENTE`.
    - `ProcessWebhook.ts`: Recebe chamadas externas confirmando ou cancelando o pagamento e reverte/confirma o estado do veículo e da venda.
    - `ListAvailableVehicles.ts` & `ListSoldVehicles.ts`: Buscas rápidas ordenadas por preço crescente.
- **Infraestrutura (`src/infrastructure`)**:
  - **Database Adapters**: `MongoSaleRepository.ts` e `MongoVehicleRepository.ts` utilizando o driver nativo `mongodb`, criando índices para ordenações rápidas e performáticas.
  - **Web Adapter**: Servidor Express que gerencia as rotas públicas, endpoints internos de sincronização e o **Webhook `/api/webhook/payment`**.

---

## 🧪 TDD & Testes Automatizados

Seguindo as práticas de **TDD (Test-Driven Development)**, todo o domínio e os casos de uso foram exaustivamente testados isoladamente. Os testes usam Mocks em memória (`InMemorySaleRepository` e `InMemoryVehicleRepository`), o que garante a velocidade de execução (milissegundos) sem necessitar de uma base MongoDB local rodando.

### Como rodar os testes localmente:
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Execute todos os testes e veja a cobertura (meta de >80% amplamente superada, atingindo **100% de cobertura de domínio e use cases**):
   ```bash
   npm run test:coverage
   ```

---

## 🔌 Endpoint de Webhook de Pagamento

O microsserviço disponibiliza um webhook público de escuta no endpoint:
- **`POST /api/webhook/payment`**

### Payload Esperado:
```json
{
  "paymentCode": "PAY-XXXXXX",
  "status": "efetuado" // ou "cancelado"
}
```

### Regras de Negócio do Webhook:
1. Se status for `efetuado`: a venda é marcada como `CONFIRMADO`, o veículo correspondente é alterado localmente para `VENDIDO`, e uma requisição HTTP de sincronização é disparada de volta ao Serviço de Administração (`veiculo-admin-service`) para atualizar o status do veículo para `VENDIDO` também na base de dados MySQL principal.
2. Se status for `cancelado`: a venda é marcada como `CANCELADO` e o veículo retorna para o estado `A_VENDA` para que outros compradores possam adquiri-lo.

---

## 🚀 Como Rodar Localmente (Independente)

Se quiser rodar este serviço de forma isolada (fora do Docker Compose global):

1. Certifique-se de ter um banco MongoDB rodando.
2. Crie um arquivo `.env` na pasta raiz do serviço com as configurações:
   ```env
   PORT=3002
   MONGO_URI=mongodb://localhost:27017/sales_db
   ADMIN_SERVICE_URL=http://localhost:3001
   ```
3. Execute as dependências e inicie em modo dev:
   ```bash
   npm install
   npm run dev
   ```
