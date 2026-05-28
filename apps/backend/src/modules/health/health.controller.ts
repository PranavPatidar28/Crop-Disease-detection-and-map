import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Public } from '@/common/decorators/public.decorator';
import type { Env } from '@/config/env.schema';

import { HealthService, HealthStatus } from './health.service';

interface VersionInfo {
  gitSha: string;
  buildTime: string;
  nodeEnv: string;
  demoMode: boolean;
  startedAt: string;
}

@Controller()
export class HealthController {
  private readonly startedAt = new Date().toISOString();

  constructor(
    private readonly health: HealthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Get('health')
  async check(): Promise<HealthStatus> {
    return this.health.check();
  }

  /** Public build / runtime info — useful for support + demo verification. */
  @Public()
  @Get('version')
  version(): VersionInfo {
    return {
      gitSha: this.config.get('GIT_SHA', { infer: true }),
      buildTime: this.config.get('BUILD_TIME', { infer: true }) || this.startedAt,
      nodeEnv: this.config.get('NODE_ENV', { infer: true }),
      demoMode: this.config.get('DEMO_MODE', { infer: true }),
      startedAt: this.startedAt,
    };
  }
}
