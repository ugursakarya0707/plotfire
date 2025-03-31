import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(private readonly mcpService: McpService) {}

  @Post('sequential/start')
  async startSequentialProcess(
    @Body() body: { type: string; context: any; steps?: any[] },
  ) {
    this.logger.log(`Starting sequential process of type: ${body.type}`);
    return this.mcpService.startSequentialProcess(
      body.type,
      body.context,
      body.steps,
    );
  }

  @Post('decision/start')
  async startDecisionProcess(
    @Body() body: { context: any; options?: any[]; criteria?: any },
  ) {
    this.logger.log('Starting decision process');
    return this.mcpService.startDecisionProcess(
      body.context,
      body.options,
      body.criteria,
    );
  }

  @Post('problem/solve')
  async solveProblem(
    @Body() body: { problem: any; context?: any; constraints?: any },
  ) {
    this.logger.log(`Solving problem: ${body.problem.id || 'unknown'}`);
    return this.mcpService.solveProblem(
      body.problem,
      body.context,
      body.constraints,
    );
  }

  @Post('video-conference/solve-connection')
  async solveVideoConferenceConnectionIssue(
    @Body() body: { sessionId: string; error: string; context?: any },
  ) {
    this.logger.log(`Solving video conference connection issue for session: ${body.sessionId}`);
    return this.mcpService.solveVideoConferenceConnectionIssue(
      body.sessionId,
      body.error,
      body.context,
    );
  }

  @Post('video-conference/decide')
  async makeVideoConferenceDecision(
    @Body() body: { sessionId: string; context?: any },
  ) {
    this.logger.log(`Making video conference decision for session: ${body.sessionId}`);
    return this.mcpService.makeVideoConferenceDecision(
      body.sessionId,
      body.context,
    );
  }

  @Get('process/:processId')
  async getProcessStatus(@Param('processId') processId: string) {
    this.logger.log(`Getting status for process: ${processId}`);
    return this.mcpService.getProcessStatus(processId);
  }

  @Post('process/:processId/execute')
  async executeProcess(@Param('processId') processId: string) {
    this.logger.log(`Executing process: ${processId}`);
    return this.mcpService.executeProcess(processId);
  }
}
