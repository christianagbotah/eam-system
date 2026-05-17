// ============================================================================
// QUEUE INITIALIZATION — Register all job processors on app startup
// ============================================================================

import { registerDefaultProcessors } from '@/lib/queue';
import { createLogger } from '@/lib/logger';

const logger = createLogger('queue-init');

let initialized = false;

export function initQueues() {
  if (initialized) return;
  initialized = true;

  try {
    registerDefaultProcessors();
    logger.info('Job queue system initialized');
  } catch (error) {
    logger.error('Failed to initialize job queues', error);
  }
}
