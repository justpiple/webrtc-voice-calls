import { Server, Socket } from "socket.io";
import { JsonStorageManager } from "./json-storage-manager";
import { CallData, CallDataWithDisplayName, EndCallData } from "./types";

export class CallHandler {
  private storage: JsonStorageManager;
  private io: Server;
  private activeCalls: Map<
    string,
    { startTime: number; callerId: string; calleeId: string }
  > = new Map();

  constructor(storage: JsonStorageManager, io: Server) {
    this.storage = storage;
    this.io = io;
  }

  handleJoinCall(socket: Socket, targetUserId: string): void {
    const userId = this.storage.getUserBySocketId(socket.id);
    if (!userId) return;

    const targetSocketId = this.storage.getSocketIdByUserId(targetUserId);

    if (!targetSocketId) {
      socket.emit("callError", "User not found or offline");
      return;
    }

    const callerDisplayName = this.storage.getDisplayName(userId);
    const targetDisplayName = this.storage.getDisplayName(targetUserId);

    this.io.to(targetSocketId).emit("incomingCall", {
      from: userId,
      fromSocketId: socket.id,
      fromDisplayName: callerDisplayName,
    } as CallDataWithDisplayName);

    socket.emit("targetDisplayName", {
      target: targetUserId,
      displayName: targetDisplayName,
    });
  }

  handleAcceptCall(socket: Socket, data: CallData): void {
    const userId = this.storage.getUserBySocketId(socket.id);
    if (!userId) return;

    const callId = `call-${Date.now()}-${userId}-${data.from}`;
    this.storage.startCall(callId, data.from, userId);
    this.activeCalls.set(callId, {
      startTime: Date.now(),
      callerId: data.from,
      calleeId: userId,
    });

    this.io.to(data.fromSocketId).emit("callAccepted", {
      from: userId,
      fromSocketId: socket.id,
    });

    this.io.to(data.fromSocketId).emit("callAcceptedByTarget", {
      target: userId,
    });

    console.log(`Call started: ${callId} from ${data.from} to ${userId}`);
  }

  handleRejectCall(socket: Socket, data: CallData): void {
    const userId = this.storage.getUserBySocketId(socket.id);
    if (!userId) return;

    // Record rejected call
    const callId = `call-${Date.now()}-${data.from}-${userId}`;
    this.storage.startCall(callId, data.from, userId);
    this.storage.updateCallStatus(callId, "rejected");

    this.io.to(data.fromSocketId).emit("callRejected", {
      from: userId,
    });

    console.log(`Call rejected: ${callId} from ${data.from} to ${userId}`);
  }

  handleEndCall(socket: Socket, data: EndCallData): void {
    const userId = this.storage.getUserBySocketId(socket.id);
    if (!userId) return;

    const targetSocketId = this.storage.getSocketIdByUserId(data.target);

    // Find and end the active call
    for (const [callId, callData] of this.activeCalls.entries()) {
      if (
        (callData.callerId === userId && callData.calleeId === data.target) ||
        (callData.callerId === data.target && callData.calleeId === userId)
      ) {
        const duration = Math.floor((Date.now() - callData.startTime) / 1000);
        this.storage.endCall(callId, duration);
        this.activeCalls.delete(callId);

        console.log(`Call ended: ${callId} duration: ${duration}s`);
        break;
      }
    }

    if (targetSocketId) {
      this.io.to(targetSocketId).emit("callEnded", {
        from: userId,
      });
    }
  }
}
