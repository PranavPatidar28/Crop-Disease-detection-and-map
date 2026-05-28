import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { OutbreakProcessor } from './outbreak.processor';

/**
 * Periodic sweep: sets `active=false` on outbreaks with no new contributing
 * report in the last `OUTBREAK_DEACTIVATE_HOURS` window, and emits
 * `outbreak.resolved` for each one.
 *
 * Runs every 2 minutes — cheap query, indexed on `(active, lastSeenAt)`.
 */
@Injectable()
export class OutbreakScheduler {
  private readonly logger = new Logger(OutbreakScheduler.name);

  constructor(private readonly processor: OutbreakProcessor) {}

  @Cron('*/2 * * * *')
  async sweep(): Promise<void> {
    try {
      await this.processor.deactivateStaleZones();
    } catch (err) {
      this.logger.error('Outbreak deactivation sweep failed', err as Error);
    }
  }
}
