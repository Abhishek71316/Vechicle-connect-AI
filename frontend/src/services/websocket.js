// Smart Vehicles connect AI - WebSocket Service
// Service for real-time WebSocket communication

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectInterval = null;
    this.reconnectDelay = 5000;
    this.listeners = {};
    this.connectionStatus = 'disconnected';
  }

  connect() {
    try {
      this.ws = new WebSocket(WS_URL);
      this.connectionStatus = 'connecting';

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.connectionStatus = 'connected';
        this.emit('status', { status: 'connected' });
        this.clearReconnect();
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event);
        this.connectionStatus = 'disconnected';
        this.emit('status', { status: 'disconnected' });
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionStatus = 'error';
        this.emit('status', { status: 'error' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.connectionStatus = 'error';
      this.emit('status', { status: 'error' });
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.clearReconnect();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionStatus = 'disconnected';
  }

  scheduleReconnect() {
    this.clearReconnect();
    this.reconnectInterval = setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      this.connect();
    }, this.reconnectDelay);
  }

  clearReconnect() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  handleMessage(message) {
    const { type, data } = message;
    this.emit(type, data);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  getStatus() {
    return this.connectionStatus;
  }
}

const websocketService = new WebSocketService();
export default websocketService;
