const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// Konfigürasyon dosyasını oku
let config;
try {
  const configPath = path.resolve(__dirname, '../../..', 'mcp_config.json');
  const configFile = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configFile);
} catch (error) {
  console.error('Konfigürasyon dosyası okunamadı:', error);
  process.exit(1);
}

// Logger oluştur
const logDir = path.resolve(__dirname, '../../..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: config.logging.level || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.resolve(logDir, config.logging.file || 'mcp.log') 
    })
  ]
});

// Express uygulaması oluştur
const app = express();

// Middleware
app.use(cors(config.security.cors));
app.use(bodyParser.json());

// API anahtarı kontrolü
app.use((req, res, next) => {
  if (config.security.apiKey) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.MCP_API_KEY) {
      return res.status(401).json({ error: 'Geçersiz API anahtarı' });
    }
  }
  next();
});

// MCP modelleri ve işleyicileri
const sequentialThinking = require('./models/sequential');

// Rotalar
app.use('/api/mcp/sequential', require('./routes/sequential'));
app.use('/api/mcp/decision', require('./routes/decision'));
app.use('/api/mcp/problem', require('./routes/problem'));

// Sağlık kontrolü
app.get('/api/mcp/health', (req, res) => {
  res.json({ status: 'up', timestamp: new Date().toISOString() });
});

// Sunucuyu başlat
const PORT = config.server.port || 3010;
const HOST = config.server.host || 'localhost';

app.listen(PORT, HOST, () => {
  logger.info(`MCP sunucusu başlatıldı: http://${HOST}:${PORT}`);
  logger.info(`Sequential Thinking MCP entegrasyonu hazır`);
});

// Hata yakalama
process.on('uncaughtException', (error) => {
  logger.error('Yakalanmamış istisna:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('İşlenmeyen reddetme:', reason);
});

module.exports = app;
