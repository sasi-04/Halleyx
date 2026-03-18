import { ExecutionService } from "./executionService";
import { RequestService } from "./requestService";

/**
 * Simple in-memory service registry so controllers outside of the router wiring
 * (e.g. legacy controllers) can reuse the app's singleton services.
 *
 * This avoids creating duplicate ExecutionService instances (which can lead to
 * missing socket/email integrations and inconsistent execution behavior).
 */
class ServiceRegistry {
  private executionService: ExecutionService | null = null;
  private requestService: RequestService | null = null;

  setExecutionService(service: ExecutionService) {
    this.executionService = service;
  }

  getExecutionService(): ExecutionService {
    if (!this.executionService) throw new Error("Execution service not initialized");
    return this.executionService;
  }

  setRequestService(service: RequestService) {
    this.requestService = service;
  }

  getRequestService(): RequestService {
    if (!this.requestService) throw new Error("Request service not initialized");
    return this.requestService;
  }
}

export const serviceRegistry = new ServiceRegistry();

