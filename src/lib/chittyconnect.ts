/**
 * ChittyConnect Integration
 * Connection broker and orchestration (NOT registry)
 *
 * ChittyConnect: Connection management, routing, proxying
 * ChittyRegistry: Service catalog, discovery, health
 */

export interface ConnectionRequest {
  source_service: string;
  target_service: string;
  operation: string;
  metadata?: Record<string, any>;
}

export interface ConnectionResponse {
  connection_id: string;
  endpoint: string;
  auth_token?: string;
}

/**
 * ChittyConnect Client
 * Broker connections between services
 */
export class ChittyConnectClient {
  constructor(
    private baseUrl: string,
    private authToken: string
  ) {}

  /**
   * Establish connection to another service
   */
  async connect(request: ConnectionRequest): Promise<ConnectionResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.authToken}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`ChittyConnect failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Close connection
   */
  async disconnect(connectionId: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/connections/${connectionId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${this.authToken}`,
      },
    });
  }
}

/**
 * ChittyRegistry Client
 * Service discovery and catalog
 */
export interface ServiceRegistration {
  name: string;
  version: string;
  url: string;
  health_endpoint: string;
  capabilities: string[];
  metadata?: Record<string, any>;
}

export class ChittyRegistryClient {
  constructor(
    private baseUrl: string,
    private authToken: string
  ) {}

  /**
   * Register service with ChittyRegistry
   */
  async register(registration: ServiceRegistration): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/services/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.authToken}`,
      },
      body: JSON.stringify(registration),
    });

    if (!response.ok) {
      throw new Error(`ChittyRegistry registration failed: ${response.statusText}`);
    }
  }

  /**
   * Update service heartbeat
   */
  async heartbeat(serviceName: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/services/${serviceName}/heartbeat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.authToken}`,
      },
    });
  }

  /**
   * Discover service by name
   */
  async discover(serviceName: string): Promise<ServiceRegistration | null> {
    const response = await fetch(`${this.baseUrl}/api/v1/services/${serviceName}`, {
      headers: {
        "Authorization": `Bearer ${this.authToken}`,
      },
    });

    if (!response.ok) return null;
    return await response.json();
  }
}
