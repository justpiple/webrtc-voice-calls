export class UserManager {
  private connectedUsers: Map<string, string>; // socketId -> userId
  private userIdToSocket: Map<string, string>; // userId -> socketId
  private userDisplayNames: Map<string, string>; // userId -> displayName

  constructor() {
    this.connectedUsers = new Map();
    this.userIdToSocket = new Map();
    this.userDisplayNames = new Map();
  }

  generateUserId(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  addUser(socketId: string, userId: string): void {
    this.connectedUsers.set(socketId, userId);
    this.userIdToSocket.set(userId, socketId);
  }

  removeUser(socketId: string): string | null {
    const userId = this.connectedUsers.get(socketId);
    if (userId) {
      this.connectedUsers.delete(socketId);
      this.userIdToSocket.delete(userId);
      this.userDisplayNames.delete(userId);
      return userId;
    }
    return null;
  }

  getUserBySocketId(socketId: string): string | undefined {
    return this.connectedUsers.get(socketId);
  }

  getSocketIdByUserId(userId: string): string | undefined {
    return this.userIdToSocket.get(userId);
  }

  isUserIdAvailable(userId: string): boolean {
    return !this.userIdToSocket.has(userId);
  }

  setDisplayName(userId: string, displayName: string): void {
    this.userDisplayNames.set(userId, displayName);
  }

  getDisplayName(userId: string): string | undefined {
    return this.userDisplayNames.get(userId);
  }

  isUserOnline(userId: string): boolean {
    return this.userIdToSocket.has(userId);
  }
}
