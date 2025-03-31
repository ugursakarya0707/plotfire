const express = require('express');
const router = express.Router();
const sequentialModel = require('../models/sequential');

/**
 * Yeni bir karar verme süreci başlatır
 */
router.post('/start', async (req, res) => {
  try {
    const { context, options, criteria } = req.body;
    
    // Karar verme süreci için özel bir bağlam oluştur
    const decisionContext = {
      ...context,
      options: options || [],
      criteria: criteria || {}
    };
    
    // Karar verme sürecini başlat
    const result = sequentialModel.startProcess({
      type: 'decisionMaker',
      context: decisionContext
    });
    
    // Otomatik olarak bir analiz adımı ekle
    sequentialModel.addStep(result.processId, {
      type: 'analyze',
      description: 'Analyze decision options',
      criteria: criteria || {}
    });
    
    // Otomatik olarak bir karar adımı ekle
    sequentialModel.addStep(result.processId, {
      type: 'decide',
      description: 'Make decision based on analysis',
      options: options || [],
      criteria: criteria || {}
    });
    
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Bir karar verme sürecini yürütür
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
 * Bir karar verme sürecinin durumunu alır
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
 * Video konferans kararları için özel endpoint
 * Bu, video konferans servisindeki sorunları çözmek için kullanılabilir
 */
router.post('/video-conference', async (req, res) => {
  try {
    const { sessionId, context } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID gerekli' });
    }
    
    // Video konferans için karar verme süreci başlat
    const processResult = sequentialModel.startProcess({
      type: 'decisionMaker',
      context: {
        sessionId,
        domain: 'video-conference',
        ...context
      }
    });
    
    // Analiz adımı ekle
    sequentialModel.addStep(processResult.processId, {
      type: 'analyze',
      description: 'Analyze video conference session status',
      data: { sessionId }
    });
    
    // Karar adımı ekle
    sequentialModel.addStep(processResult.processId, {
      type: 'decide',
      description: 'Decide on video conference connection approach',
      options: [
        { id: 'direct', name: 'Direct connection' },
        { id: 'proxy', name: 'Proxy connection' },
        { id: 'fallback', name: 'Fallback connection' }
      ]
    });
    
    // Süreci yürüt
    const result = await sequentialModel.executeProcess(processResult.processId);
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
