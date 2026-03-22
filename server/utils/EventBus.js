import { EventEmitter } from "events";

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.clients = [];
  }

  addClient(req, res) {
    const clientId = Date.now();
    const newClient = {
      id: clientId,
      res
    };

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    // Initial keep-alive
    res.write(`data: ${JSON.stringify({ type: "connected", clientId })}\n\n`);

    this.clients.push(newClient);

    req.on("close", () => {
      this.clients = this.clients.filter(client => client.id !== clientId);
    });
  }

  broadcast(type, data) {
    const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    this.clients.forEach(client => {
      client.res.write(`data: ${payload}\n\n`);
    });
  }
}

export const eventBus = new EventBus();
