import { Request, Response, NextFunction } from 'express';

// Middleware de Autenticação Básica (para proteger a página do Swagger /api-docs)
export function basicAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Acesso Protegido ao Swagger"');
    res.status(401).send('Autenticação necessária para acessar a documentação');
    return;
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const user = auth[0];
  const pass = auth[1];

  // Credenciais padrões para o avaliador
  if (user === 'admin' && pass === 'fiapsoat') {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Acesso Protegido ao Swagger"');
    res.status(401).send('Credenciais inválidas');
  }
}

// Middleware de API Key (para proteger endpoints de vendas e webhook)
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.API_KEY || 'fiap-secret-key';

  if (!apiKey || apiKey !== expectedApiKey) {
    res.status(401).json({ error: 'Não autorizado: Chave de API (X-API-KEY) inválida ou ausente' });
    return;
  }

  next();
}
