import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);
  private readonly mcpApiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.mcpApiUrl = this.configService.get<string>('MCP_API_URL') || 'http://localhost:3010/api/mcp';
    this.apiKey = this.configService.get<string>('MCP_API_KEY') || 'development-key';
    this.logger.log(`MCP Service initialized with URL: ${this.mcpApiUrl}`);
  }

  /**
   * Sequential Thinking süreci başlatır
   */
  async startSequentialProcess(type: string, context: any, steps: any[] = []) {
    try {
      const response = await lastValueFrom(this.httpService.post(
        `${this.mcpApiUrl}/sequential/process`,
        {
          type,
          context,
          steps,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
          },
        },
      ));

      return response.data;
    } catch (error) {
      this.logger.error(`Error starting sequential process: ${error.message}`, error.stack);
      throw new Error(`Failed to start sequential process: ${error.message}`);
    }
  }

  /**
   * Karar verme süreci başlatır
   */
  async startDecisionProcess(context: any, options: any[] = [], criteria: any = {}) {
    try {
      const response = await lastValueFrom(this.httpService.post(
        `${this.mcpApiUrl}/decision/start`,
        {
          context,
          options,
          criteria,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
          },
        },
      ));

      return response.data;
    } catch (error) {
      this.logger.error(`Error starting decision process: ${error.message}`, error.stack);
      throw new Error(`Failed to start decision process: ${error.message}`);
    }
  }

  /**
   * Problem çözme süreci başlatır
   */
  async solveProblem(problem: any, context: any = {}, constraints: any = {}) {
    try {
      const response = await lastValueFrom(this.httpService.post(
        `${this.mcpApiUrl}/problem/solve`,
        {
          problem,
          context,
          constraints,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
          },
        },
      ));

      return response.data;
    } catch (error) {
      this.logger.error(`Error starting problem solving process: ${error.message}`, error.stack);
      throw new Error(`Failed to start problem solving process: ${error.message}`);
    }
  }

  /**
   * Video konferans bağlantı sorunlarını çözer
   */
  async solveVideoConferenceConnectionIssue(sessionId: string, error: string, context: any = {}) {
    try {
      const response = await lastValueFrom(this.httpService.post(
        `${this.mcpApiUrl}/problem/video-conference/connection`,
        {
          sessionId,
          error,
          context,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
          },
        },
      ));

      return response.data;
    } catch (error) {
      this.logger.error(`Error solving video conference connection issue: ${error.message}`, error.stack);
      throw new Error(`Failed to solve video conference connection issue: ${error.message}`);
    }
  }

  /**
   * Video konferans için karar verme süreci başlatır
   */
  async makeVideoConferenceDecision(sessionId: string, context: any = {}) {
    try {
      const response = await lastValueFrom(this.httpService.post(
        `${this.mcpApiUrl}/decision/video-conference`,
        {
          sessionId,
          context,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
          },
        },
      ));

      return response.data;
    } catch (error) {
      this.logger.error(`Error making video conference decision: ${error.message}`, error.stack);
      throw new Error(`Failed to make video conference decision: ${error.message}`);
    }
  }

  /**
   * Süreç durumunu alır
   */
  async getProcessStatus(processId: string) {
    try {
      const response = await lastValueFrom(this.httpService.get(
        `${this.mcpApiUrl}/sequential/process/${processId}`,
        {
          headers: {
            'x-api-key': this.apiKey,
          },
        },
      ));

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting process status: ${error.message}`, error.stack);
      throw new Error(`Failed to get process status: ${error.message}`);
    }
  }

  /**
   * Süreci yürütür
   */
  async executeProcess(processId: string) {
    try {
      const response = await lastValueFrom(this.httpService.post(
        `${this.mcpApiUrl}/sequential/process/${processId}/execute`,
        {},
        {
          headers: {
            'x-api-key': this.apiKey,
          },
        },
      ));

      return response.data;
    } catch (error) {
      this.logger.error(`Error executing process: ${error.message}`, error.stack);
      throw new Error(`Failed to execute process: ${error.message}`);
    }
  }
}
