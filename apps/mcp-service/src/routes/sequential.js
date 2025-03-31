const express = require('express');
const router = express.Router();
const sequentialModel = require('../models/sequential');

/**
 * Yeni bir sıralı düşünme süreci başlatır
 */
router.post('/process', async (req, res) => {
  try {
    const { type, context, steps } = req.body;
    
    const result = sequentialModel.startProcess({
      type: type || 'default',
      context: context || {},
      steps: steps || []
    });
    
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Bir düşünme sürecine adım ekler
 */
router.post('/process/:processId/step', async (req, res) => {
  try {
    const { processId } = req.params;
    const step = req.body;
    
    const result = sequentialModel.addStep(processId, step);
    
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Bir düşünme sürecinin durumunu alır
 */
router.get('/process/:processId', async (req, res) => {
  try {
    const { processId } = req.params;
    
    const result = sequentialModel.getProcessStatus(processId);
    
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * Bir düşünme sürecini yürütür
 */
router.post('/process/:processId/execute', async (req, res) => {
  try {
    const { processId } = req.params;
    
    const result = await sequentialModel.executeProcess(processId);
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
