import { getToken } from "./auth";

type EventHandler = (payload: any) => void;

class ForumXWebSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private shouldConnect = false;

  connect() {
    this.shouldConnect = true;
    this.openConnection();
  }

  private openConnection() {
    const token = getToken();
    if (!token || this.ws?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    this.ws = new WebSocket(`${protocol}//${host}/ws?token=${encodeURIComponent(token)}`);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
    };

    this.ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        const hs = this.handlers.get(type);
        if (hs) hs.forEach(h => h(payload));
      } catch {}
    };

    this.ws.onclose = () => {
      if (this.shouldConnect) {
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
          this.openConnection();
        }, this.reconnectDelay);
      }
    };

    this.ws.onerror = () => this.ws?.close();
  }

  disconnect() {
    this.shouldConnect = false;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.ws?.close();
    this.ws = null;
  }

  send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(data));
  }

  on(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  off(type: string, handler: EventHandler) {
    this.handlers.get(type)?.delete(handler);
  }

  sendLobbyMessage(content: string, replyToId?: string) {
    this.send({ type: "lobby_message", content, replyToId });
  }
  editLobbyMessage(messageId: string, content: string) {
    this.send({ type: "lobby_edit", messageId, content });
  }
  deleteLobbyMessage(messageId: string) {
    this.send({ type: "lobby_delete", messageId });
  }
  reactLobbyMessage(messageId: string, emoji: string) {
    this.send({ type: "lobby_react", messageId, emoji });
  }
  sendLobbyTyping(isTyping: boolean) {
    this.send({ type: "lobby_typing", isTyping });
  }
  sendPrivateMessage(conversationId: string, content: string, replyToId?: string, msgType = "text", voiceDuration?: number) {
    this.send({ type: "private_message", conversationId, content, replyToId, msgType, voiceDuration });
  }
  editPrivateMessage(conversationId: string, messageId: string, content: string) {
    this.send({ type: "private_edit", conversationId, messageId, content });
  }
  deletePrivateMessage(conversationId: string, messageId: string) {
    this.send({ type: "private_delete", conversationId, messageId });
  }
  reactPrivateMessage(conversationId: string, messageId: string, emoji: string) {
    this.send({ type: "private_react", conversationId, messageId, emoji });
  }
  sendPrivateTyping(conversationId: string, isTyping: boolean) {
    this.send({ type: "private_typing", conversationId, isTyping });
  }
  markRead(conversationId: string) {
    this.send({ type: "mark_read", conversationId });
  }
}

export const wsClient = new ForumXWebSocket();
