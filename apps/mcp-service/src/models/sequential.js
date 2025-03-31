/**
 * Sequential Thinking Model
 * Bu model, karmaşık problemleri adım adım çözmek için sıralı düşünme süreci uygular
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Konfigürasyon dosyasını oku
let config;
try {
  const configPath = path.resolve(__dirname, '../../../..', 'mcp_config.json');
  const configFile = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configFile);
} catch (error) {
  console.error('Konfigürasyon dosyası okunamadı:', error);
  process.exit(1);
}

// Aktif düşünme süreçlerini saklamak için
const activeProcesses = new Map();

/**
 * Yeni bir sıralı düşünme süreci başlatır
 * @param {Object} options - Süreç seçenekleri
 * @param {string} options.type - Düşünme süreci tipi (default, problemSolver, decisionMaker)
 * @param {Object} options.context - Başlangıç bağlamı
 * @param {Array} options.steps - Önceden tanımlanmış adımlar (opsiyonel)
 * @returns {Object} Süreç bilgileri
 */
function startProcess(options) {
  const { type = 'default', context = {}, steps = [] } = options;
  
  // Model konfigürasyonunu al
  const modelConfig = config.models[type] || config.models.default;
  
  // Yeni süreç ID'si oluştur
  const processId = uuidv4();
  
  // Yeni süreci oluştur
  const process = {
    id: processId,
    type,
    status: 'active',
    startTime: new Date().toISOString(),
    config: modelConfig.config,
    context,
    steps: steps.length > 0 ? steps : [],
    currentStep: 0,
    results: null,
    error: null
  };
  
  // Süreci kaydet
  activeProcesses.set(processId, process);
  
  return {
    processId,
    status: process.status,
    type
  };
}

/**
 * Bir düşünme sürecine adım ekler
 * @param {string} processId - Süreç ID'si
 * @param {Object} step - Adım bilgileri
 * @returns {Object} Güncellenmiş süreç bilgileri
 */
function addStep(processId, step) {
  if (!activeProcesses.has(processId)) {
    throw new Error(`Süreç bulunamadı: ${processId}`);
  }
  
  const process = activeProcesses.get(processId);
  
  // Maksimum adım sayısını kontrol et
  if (process.steps.length >= process.config.maxSteps) {
    throw new Error(`Maksimum adım sayısına ulaşıldı: ${process.config.maxSteps}`);
  }
  
  // Adımı ekle
  const newStep = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...step
  };
  
  process.steps.push(newStep);
  
  return {
    processId,
    stepId: newStep.id,
    totalSteps: process.steps.length
  };
}

/**
 * Bir düşünme sürecinin durumunu alır
 * @param {string} processId - Süreç ID'si
 * @returns {Object} Süreç durumu
 */
function getProcessStatus(processId) {
  if (!activeProcesses.has(processId)) {
    throw new Error(`Süreç bulunamadı: ${processId}`);
  }
  
  const process = activeProcesses.get(processId);
  
  return {
    processId,
    status: process.status,
    type: process.type,
    startTime: process.startTime,
    currentStep: process.currentStep,
    totalSteps: process.steps.length,
    results: process.results
  };
}

/**
 * Bir düşünme sürecini yürütür
 * @param {string} processId - Süreç ID'si
 * @returns {Object} Süreç sonuçları
 */
async function executeProcess(processId) {
  if (!activeProcesses.has(processId)) {
    throw new Error(`Süreç bulunamadı: ${processId}`);
  }
  
  const process = activeProcesses.get(processId);
  
  // Süreç zaten tamamlanmış mı kontrol et
  if (process.status === 'completed') {
    return {
      processId,
      status: process.status,
      results: process.results
    };
  }
  
  try {
    process.status = 'running';
    
    // Adımları sırayla yürüt
    let currentContext = { ...process.context };
    
    for (let i = process.currentStep; i < process.steps.length; i++) {
      const step = process.steps[i];
      process.currentStep = i;
      
      // Adımı yürüt
      const stepResult = await executeStep(step, currentContext);
      
      // Bağlamı güncelle
      currentContext = {
        ...currentContext,
        ...stepResult
      };
      
      // Adım sonucunu kaydet
      process.steps[i].result = stepResult;
    }
    
    // Süreci tamamla
    process.status = 'completed';
    process.results = currentContext;
    
    return {
      processId,
      status: process.status,
      results: process.results
    };
  } catch (error) {
    process.status = 'failed';
    process.error = error.message;
    
    return {
      processId,
      status: process.status,
      error: process.error
    };
  }
}

/**
 * Bir adımı yürütür
 * @param {Object} step - Adım bilgileri
 * @param {Object} context - Mevcut bağlam
 * @returns {Object} Adım sonuçları
 */
async function executeStep(step, context) {
  // Adım tipine göre işlem yap
  switch (step.type) {
    case 'analyze':
      return analyzeStep(step, context);
    case 'decide':
      return decideStep(step, context);
    case 'solve':
      return solveStep(step, context);
    case 'custom':
      return customStep(step, context);
    default:
      return defaultStep(step, context);
  }
}

// Adım tipleri için işlevler
async function analyzeStep(step, context) {
  // Analiz adımı - veriyi incele ve sonuçları döndür
  const { data, criteria } = step;
  const sourceData = data || context.data;
  
  if (!sourceData) {
    throw new Error('Analiz için veri bulunamadı');
  }
  
  // Basit bir analiz örneği
  const analysis = {
    timestamp: new Date().toISOString(),
    dataPoints: Array.isArray(sourceData) ? sourceData.length : 1,
    summary: `Analyzed data based on ${criteria || 'default'} criteria`
  };
  
  return {
    analysis,
    lastStep: 'analyze'
  };
}

async function decideStep(step, context) {
  // Karar adımı - seçenekleri değerlendir ve bir karar ver
  const { options, criteria } = step;
  const decisionOptions = options || context.options || [];
  
  if (decisionOptions.length === 0) {
    throw new Error('Karar vermek için seçenek bulunamadı');
  }
  
  // Basit bir karar verme örneği
  const decision = {
    timestamp: new Date().toISOString(),
    selectedOption: decisionOptions[0], // Basit örnek: ilk seçeneği seç
    reason: `Selected based on ${criteria || 'default'} criteria`
  };
  
  return {
    decision,
    lastStep: 'decide'
  };
}

async function solveStep(step, context) {
  // Problem çözme adımı - bir problemi çöz ve sonucu döndür
  const { problem, constraints } = step;
  const targetProblem = problem || context.problem;
  
  if (!targetProblem) {
    throw new Error('Çözülecek problem bulunamadı');
  }
  
  // Basit bir problem çözme örneği
  const solution = {
    timestamp: new Date().toISOString(),
    problemId: typeof targetProblem === 'object' ? targetProblem.id : 'unknown',
    approach: `Solved using ${constraints || 'default'} approach`,
    result: 'Solution found'
  };
  
  return {
    solution,
    lastStep: 'solve'
  };
}

async function customStep(step, context) {
  // Özel adım - kullanıcı tanımlı işlemi yürüt
  const { action, params } = step;
  
  if (!action) {
    throw new Error('Özel adım için eylem belirtilmedi');
  }
  
  // Özel eylemi yürüt (burada sadece bir örnek)
  const result = {
    timestamp: new Date().toISOString(),
    action,
    status: 'completed',
    output: `Executed custom action: ${action}`
  };
  
  return {
    customResult: result,
    lastStep: 'custom'
  };
}

async function defaultStep(step, context) {
  // Varsayılan adım - genel işlem
  return {
    defaultResult: {
      timestamp: new Date().toISOString(),
      message: 'Executed default step'
    },
    lastStep: 'default'
  };
}

module.exports = {
  startProcess,
  addStep,
  getProcessStatus,
  executeProcess
};
