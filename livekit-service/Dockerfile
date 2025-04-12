FROM node:18-alpine

WORKDIR /app

# Bağımlılıkları kopyala ve yükle
COPY package*.json ./
RUN npm install

# Kaynak kodları kopyala
COPY . .

# TypeScript kodunu derle
RUN npm run build

# Uygulama portunu aç
EXPOSE 3030

# Uygulamayı başlat
CMD ["npm", "start"]
