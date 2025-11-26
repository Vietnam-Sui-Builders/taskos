/**
 * Health Check Server for Purchase Event Listener
 * 
 * Provides HTTP endpoints for monitoring the listener service
 */

import http from 'http';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  lastEventProcessed: string | null;
  eventsProcessed: number;
  errors: number;
  lastError: string | null;
}

export class HealthCheckServer {
  private server: http.Server | null = null;
  private port: number;
  private startTime: number;
  private stats = {
    lastEventProcessed: null as string | null,
    eventsProcessed: 0,
    errors: 0,
    lastError: null as string | null,
  };

  constructor(port: number = 3001) {
    this.port = port;
    this.startTime = Date.now();
  }

  /**
   * Start the health check server
   */
  start() {
    this.server = http.createServer((req, res) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');

      if (req.url === '/health' && req.method === 'GET') {
        this.handleHealthCheck(req, res);
      } else if (req.url === '/metrics' && req.method === 'GET') {
        this.handleMetrics(req, res);
      } else if (req.url === '/ready' && req.method === 'GET') {
        this.handleReadiness(req, res);
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    this.server.listen(this.port, () => {
      console.log(`🏥 Health check server listening on port ${this.port}`);
      console.log(`   GET /health  - Health status`);
      console.log(`   GET /metrics - Detailed metrics`);
      console.log(`   GET /ready   - Readiness probe`);
    });
  }

  /**
   * Stop the health check server
   */
  stop() {
    if (this.server) {
      this.server.close();
      console.log('🏥 Health check server stopped');
    }
  }

  /**
   * Record a successfully processed event
   */
  recordEvent(eventId: string) {
    this.stats.eventsProcessed++;
    this.stats.lastEventProcessed = new Date().toISOString();
  }

  /**
   * Record an error
   */
  recordError(error: string) {
    this.stats.errors++;
    this.stats.lastError = error;
  }

  /**
   * Handle /health endpoint
   */
  private handleHealthCheck(req: http.IncomingMessage, res: http.ServerResponse) {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const status: HealthStatus = {
      status: 'healthy',
      uptime,
      lastEventProcessed: this.stats.lastEventProcessed,
      eventsProcessed: this.stats.eventsProcessed,
      errors: this.stats.errors,
      lastError: this.stats.lastError,
    };

    res.writeHead(200);
    res.end(JSON.stringify(status, null, 2));
  }

  /**
   * Handle /metrics endpoint (Prometheus-compatible)
   */
  private handleMetrics(req: http.IncomingMessage, res: http.ServerResponse) {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    const metrics = [
      `# HELP purchase_listener_uptime_seconds Uptime in seconds`,
      `# TYPE purchase_listener_uptime_seconds gauge`,
      `purchase_listener_uptime_seconds ${uptime}`,
      ``,
      `# HELP purchase_listener_events_processed_total Total events processed`,
      `# TYPE purchase_listener_events_processed_total counter`,
      `purchase_listener_events_processed_total ${this.stats.eventsProcessed}`,
      ``,
      `# HELP purchase_listener_errors_total Total errors encountered`,
      `# TYPE purchase_listener_errors_total counter`,
      `purchase_listener_errors_total ${this.stats.errors}`,
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain');
    res.writeHead(200);
    res.end(metrics);
  }

  /**
   * Handle /ready endpoint (Kubernetes readiness probe)
   */
  private handleReadiness(req: http.IncomingMessage, res: http.ServerResponse) {
    // Service is ready if it's been running for at least 5 seconds
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const isReady = uptime >= 5;

    if (isReady) {
      res.writeHead(200);
      res.end(JSON.stringify({ ready: true }));
    } else {
      res.writeHead(503);
      res.end(JSON.stringify({ ready: false, reason: 'Starting up' }));
    }
  }
}
