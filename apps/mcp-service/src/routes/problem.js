const express = require('express');
const router = express.Router();
const sequentialModel = require('../models/sequential');
const axios = require('axios');
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

/**
 * Yeni bir problem çözme süreci başlatır
 */
router.post('/solve', async (req, res) => {
  try {
    const { problem, context, constraints } = req.body;
    
    if (!problem) {
      return res.status(400).json({ error: 'Problem tanımı gerekli' });
    }
    
    // Problem çözme süreci için özel bir bağlam oluştur
    const problemContext = {
      problem,
      constraints: constraints || {},
      ...context
    };
    
    // Problem çözme sürecini başlat
    const result = sequentialModel.startProcess({
      type: 'problemSolver',
      context: problemContext
    });
    
    // Otomatik olarak bir analiz adımı ekle
    sequentialModel.addStep(result.processId, {
      type: 'analyze',
      description: 'Analyze problem details',
      data: problem
    });
    
    // Otomatik olarak bir çözüm adımı ekle
    sequentialModel.addStep(result.processId, {
      type: 'solve',
      description: 'Generate solution for the problem',
      problem,
      constraints: constraints || {}
    });
    
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Bir problem çözme sürecini yürütür
 */
router.post('/:processId/execute', async (req, res) => {
  try {
    const { processId } = req.params;
    
    const result = await sequentialModel.executeProcess(processId);
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Bir problem çözme sürecinin durumunu alır
 */
router.get('/:processId', async (req, res) => {
  try {
    const { processId } = req.params;
    
    const result = sequentialModel.getProcessStatus(processId);
    
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * Video konferans sorunlarını çözmek için özel endpoint
 * Bu, video konferans servisindeki bağlantı sorunlarını çözmek için kullanılabilir
 */
router.post('/video-conference/connection', async (req, res) => {
  try {
    const { sessionId, error, context } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID gerekli' });
    }
    
    // Video konferans bağlantı sorunu için problem çözme süreci başlat
    const processResult = sequentialModel.startProcess({
      type: 'problemSolver',
      context: {
        sessionId,
        error,
        domain: 'video-conference',
        ...context
      }
    });
    
    // Analiz adımı ekle
    sequentialModel.addStep(processResult.processId, {
      type: 'analyze',
      description: 'Analyze video conference connection error',
      data: { sessionId, error }
    });
    
    // LiveKit API URL'lerini kontrol etmek için özel adım ekle
    sequentialModel.addStep(processResult.processId, {
      type: 'custom',
      action: 'checkLiveKitEndpoints',
      description: 'Check LiveKit API endpoints configuration',
      params: {
        sessionId,
        mainApiUrl: config.integration.mainApi.endpoint,
        videoConferenceApiUrl: config.integration.videoConference.endpoint
      }
    });
    
    // Çözüm adımı ekle
    sequentialModel.addStep(processResult.processId, {
      type: 'solve',
      description: 'Generate solution for video conference connection issue',
      problem: {
        id: 'video-conference-connection',
        description: `Connection error for session ${sessionId}: ${error || 'Unknown error'}`
      },
      constraints: {
        fixEndpoints: true,
        checkTokens: true,
        verifySessionStatus: true
      }
    });
    
    // Süreci yürüt
    const result = await sequentialModel.executeProcess(processResult.processId);
    
    // Eğer çözüm bulunduysa, video konferans servisine bildir
    if (result.status === 'completed' && result.results && result.results.solution) {
      try {
        // Video konferans servisine çözümü bildir
        await axios.post(`${config.integration.videoConference.endpoint}/video-sessions/${sessionId}/fix-connection`, {
          solution: result.results.solution,
          processId: processResult.processId
        });
      } catch (notifyError) {
        console.error('Video konferans servisine bildirim hatası:', notifyError);
      }
    }
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
