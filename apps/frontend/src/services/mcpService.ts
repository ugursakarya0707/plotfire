import { API_URL } from '../config';

/**
 * MCP (Model Control Protocol) servisi
 * Sequential Thinking, karar verme ve problem çözme süreçlerini yönetir
 */
export class McpService {
  private readonly baseUrl: string;

  constructor() {
    // API_URL'nin sonunda '/api' olup olmadığını kontrol et
    if (API_URL.endsWith('/api')) {
      this.baseUrl = `${API_URL}/mcp`;
    } else {
      this.baseUrl = `${API_URL}/api/mcp`;
    }
  }

  /**
   * Sıralı düşünme süreci başlatır
   * @param type Süreç tipi
   * @param context Başlangıç bağlamı
   * @param steps Önceden tanımlanmış adımlar (opsiyonel)
   */
  async startSequentialProcess(type: string, context: any, steps: any[] = []) {
    try {
      const response = await fetch(`${this.baseUrl}/sequential/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          context,
          steps,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting sequential process:', error);
      throw error;
    }
  }

  /**
   * Karar verme süreci başlatır
   * @param context Başlangıç bağlamı
   * @param options Karar seçenekleri
   * @param criteria Karar kriterleri
   */
  async startDecisionProcess(context: any, options: any[] = [], criteria: any = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/decision/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context,
          options,
          criteria,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting decision process:', error);
      throw error;
    }
  }

  /**
   * Problem çözme süreci başlatır
   * @param problem Çözülecek problem
   * @param context Başlangıç bağlamı
   * @param constraints Kısıtlamalar
   */
  async solveProblem(problem: any, context: any = {}, constraints: any = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/problem/solve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem,
          context,
          constraints,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error solving problem:', error);
      throw error;
    }
  }

  /**
   * Video konferans bağlantı sorunlarını çözer
   * @param sessionId Oturum ID'si
   * @param error Hata mesajı
   * @param context Ek bağlam
   */
  async solveVideoConferenceConnectionIssue(sessionId: string, error: string, context: any = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/video-conference/solve-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          error,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error solving video conference connection issue:', error);
      throw error;
    }
  }

  /**
   * Süreç durumunu alır
   * @param processId Süreç ID'si
   */
  async getProcessStatus(processId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/process/${processId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting process status:', error);
      throw error;
    }
  }

  /**
   * Süreci yürütür
   * @param processId Süreç ID'si
   */
  async executeProcess(processId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/process/${processId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error executing process:', error);
      throw error;
    }
  }

  /**
   * Video konferans servisi için karar verme süreci başlatır
   * @param sessionId Oturum ID'si
   * @param context Ek bağlam
   */
  async makeVideoConferenceDecision(sessionId: string, context: any = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/video-conference/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error making video conference decision:', error);
      throw error;
    }
  }
}
