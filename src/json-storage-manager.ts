import fs from "fs";
import path from "path";

export interface User {
  userId: string;
  socketId: string | null;
  displayName: string;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

export interface CallHistory {
  id: string;
  callerId: string;
  calleeId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  status: "completed" | "missed" | "rejected";
}

export interface StorageData {
  users: { [userId: string]: User };
  callHistory: CallHistory[];
  lastUpdated: string;
}

export class JsonStorageManager {
  private dataPath: string;
  private data: StorageData;
  private connectedUsers: Map<string, string>;
  private writeQueue: Promise<void> = Promise.resolve();
  private isWriting = false;

  constructor() {
    const dataDir = path.join(process.cwd(), "data");
    this.dataPath = path.join(dataDir, "storage.json");

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.connectedUsers = new Map();
    this.data = this.loadData();
  }

  private loadData(): StorageData {
    try {
      if (fs.existsSync(this.dataPath)) {
        const fileContent = fs.readFileSync(this.dataPath, "utf8");
        const loadedData = JSON.parse(fileContent) as StorageData;

        if (!loadedData.users) {
          loadedData.users = {};
        }
        if (!loadedData.callHistory) {
          loadedData.callHistory = [];
        }

        return loadedData;
      }
    } catch (error) {
      console.warn("Error loading data file, starting with empty data:", error);
    }

    return {
      users: {},
      callHistory: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  private async saveData(): Promise<void> {
    if (this.isWriting) {
      await this.writeQueue;
      return;
    }

    this.isWriting = true;
    this.writeQueue = this.performWrite();
    await this.writeQueue;
    this.isWriting = false;
  }

  private async performWrite(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.data.lastUpdated = new Date().toISOString();

      fs.writeFile(
        this.dataPath,
        JSON.stringify(this.data, null, 2),
        "utf8",
        (err) => {
          if (err) {
            console.error("Error saving data:", err);
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
  }

  generateUserId(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  addUser(socketId: string, userId: string, displayName?: string): void {
    const user: User = {
      userId,
      socketId,
      displayName: displayName || `User ${userId}`,
      isOnline: true,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.data.users[userId] = user;
    this.connectedUsers.set(socketId, userId);
    this.saveData();
  }

  removeUser(socketId: string): string | null {
    const userId = this.connectedUsers.get(socketId);
    if (userId && this.data.users[userId]) {
      this.data.users[userId].socketId = null;
      this.data.users[userId].isOnline = false;
      this.data.users[userId].lastSeen = new Date().toISOString();

      this.connectedUsers.delete(socketId);
      this.saveData();
      return userId;
    }
    return null;
  }

  getUserBySocketId(socketId: string): string | undefined {
    return this.connectedUsers.get(socketId);
  }

  getSocketIdByUserId(userId: string): string | undefined {
    const user = this.data.users[userId];
    return user?.isOnline ? user.socketId || undefined : undefined;
  }

  isUserIdAvailable(userId: string): boolean {
    const user = this.data.users[userId];
    return !user || !user.isOnline;
  }

  setDisplayName(userId: string, displayName: string): void {
    if (this.data.users[userId]) {
      this.data.users[userId].displayName = displayName;
      this.saveData();
    }
  }

  getDisplayName(userId: string): string | undefined {
    return this.data.users[userId]?.displayName;
  }

  isUserOnline(userId: string): boolean {
    return this.data.users[userId]?.isOnline || false;
  }

  getOnlineUsers(): User[] {
    return Object.values(this.data.users).filter((user) => user.isOnline);
  }

  getUserById(userId: string): User | undefined {
    return this.data.users[userId];
  }

  getAllUsers(): User[] {
    return Object.values(this.data.users);
  }

  startCall(callId: string, callerId: string, calleeId: string): void {
    const call: CallHistory = {
      id: callId,
      callerId,
      calleeId,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      status: "completed",
    };

    this.data.callHistory.push(call);
    this.saveData();
  }

  endCall(callId: string, duration?: number): void {
    const call = this.data.callHistory.find((c) => c.id === callId);
    if (call) {
      call.endTime = new Date().toISOString();
      call.duration = duration || null;
      this.saveData();
    }
  }

  updateCallStatus(
    callId: string,
    status: "completed" | "missed" | "rejected",
  ): void {
    const call = this.data.callHistory.find((c) => c.id === callId);
    if (call) {
      call.status = status;
      this.saveData();
    }
  }

  getCallHistory(userId: string, limit: number = 20): CallHistory[] {
    return this.data.callHistory
      .filter((call) => call.callerId === userId || call.calleeId === userId)
      .sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      )
      .slice(0, limit);
  }

  cleanupOldData(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.data.callHistory = this.data.callHistory.filter(
      (call) => new Date(call.startTime) > cutoffDate,
    );

    this.saveData();
  }

  backup(): void {
    const backupPath = path.join(
      path.dirname(this.dataPath),
      `backup-${Date.now()}.json`,
    );
    fs.writeFileSync(backupPath, JSON.stringify(this.data, null, 2));
    console.log(`Backup created: ${backupPath}`);
  }

  getStats(): { totalUsers: number; onlineUsers: number; totalCalls: number } {
    return {
      totalUsers: Object.keys(this.data.users).length,
      onlineUsers: Object.values(this.data.users).filter((u) => u.isOnline)
        .length,
      totalCalls: this.data.callHistory.length,
    };
  }
}
