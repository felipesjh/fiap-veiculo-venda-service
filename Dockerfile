# Estágio de Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio de Produção
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/src/infrastructure/web/public ./dist/infrastructure/web/public

# Boas práticas de segurança: executar container como usuário não-root 'node'
USER node

EXPOSE 3002
ENV NODE_ENV=production
CMD ["node", "dist/infrastructure/web/ExpressApp.js"]
