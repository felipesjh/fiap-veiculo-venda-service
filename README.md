# Servico de Venda de Veiculos - veiculo-venda-service

Este repositorio contem o microsservico responsavel pelas operacoes de vendas, listagem de veiculos disponiveis e processamento de webhook de confirmacao de pagamento. A aplicacao utiliza o banco de dados MongoDB para persistencia e indexacao de dados de vendas.

---

## Arquitetura e Estrutura do Codigo

O projeto segue a divisao da Arquitetura Hexagonal e DDD:

- Dominio (src/domain):
  - Entidades e Agregados (Sale.ts e Vehicle.ts) controlando as validacoes de estado de compra e integracao de leitura.
  - Value Object (CPF.ts) que implementa a validacao matematica do digito verificador de CPFs.
  - Portas (ISaleRepository e IVehicleRepository).
- Aplicacao (src/application):
  - Casos de uso (CreateSale.ts, ProcessWebhook.ts, ListAvailableVehicles.ts e ListSoldVehicles.ts).
- Infraestrutura (src/infrastructure):
  - Adaptadores MongoDB (MongoSaleRepository.ts e MongoVehicleRepository.ts).
  - Rotas e Controladores Express (SalesController.ts e ExpressApp.ts) incluindo a escuta de Webhook.
  - Documentacao automatizada via Swagger UI.

---

## Webhook de Pagamento

O endpoint publico para recebimento de notificacoes da integradora de pagamento e:
- POST /api/webhook/payment

### Payload esperado:
```json
{
  "paymentCode": "PAY-XXXXXX",
  "status": "efetuado"
}
```

### Comportamento do Webhook:
- Se o status for "efetuado", a venda e confirmada no MongoDB e o servico dispara uma requisicao HTTP sincrona para o servico de administracao atualizar o status do veiculo para "VENDIDO" no MySQL.
- Se o status for "cancelado", a venda e cancelada e o veiculo volta a ficar disponivel para novos compradores.

---

## Execucao dos Testes Automatizados

O projeto contem testes unitarios e de integracao que validam o comportamento das regras de negocio usando repositorios em memoria.

### Instrucoes para rodar:
1. Instale as dependencias:
   ```bash
   npm install
   ```
2. Execute os testes com geracao de relatorio de cobertura:
   ```bash
   npm run test:coverage
   ```
A suite atinge mais de 90% de cobertura de linhas nos componentes principais do microsservico.

---

## Como Executar de Forma Isolada

Caso queira rodar este servico de forma independente (sem o Docker Compose do repositorio principal):

1. Configure um banco MongoDB local.
2. Crie o arquivo .env na raiz desta pasta com as variaveis:
   ```env
   PORT=3002
   MONGO_URI=mongodb://localhost:27017/sales_db
   ADMIN_SERVICE_URL=http://localhost:3001
   ```
3. Instale e inicie o projeto em modo dev:
   ```bash
   npm install
   npm run dev
   ```
   *A documentacao da API estara acessivel em http://localhost:3002/api-docs*
