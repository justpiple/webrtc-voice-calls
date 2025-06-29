import { Server, Socket } from "socket.io";
import { JsonStorageManager } from "./json-storage-manager";
import { CallHandler } from "./call-handler";
import { WebRTCHandler } from "./webrtc-handler";
import {
  CallData,
  OfferData,
  AnswerData,
  IceCandidateData,
  EndCallData,
  UpdateDisplayNameData,
} from "./types";

export class SocketHandler {
  private io: Server;
  private storage: JsonStorageManager;
  private callHandler: CallHandler;
  private webrtcHandler: WebRTCHandler;

  constructor(io: Server) {
    this.io = io;
    this.storage = new JsonStorageManager();
    this.callHandler = new CallHandler(this.storage, this.io);
    this.webrtcHandler = new WebRTCHandler(this.storage, this.io);
  }

  setupSocketHandlers(socket: Socket): void {
    let userId: string | null = socket.handshake.auth.userId || null;

    if (userId) {
      console.log("userId", userId);
      this.storage.addUser(socket.id, userId);
      socket.emit("userId", userId);
    } else {
      userId = this.storage.generateUserId();
      this.storage.addUser(socket.id, userId);
      setTimeout(() => {
        socket.emit("userId", userId);
      }, 1000);
    }

    socket.on("setUserId", (existingUserId: string) => {
      if (existingUserId && this.storage.isUserIdAvailable(existingUserId)) {
        userId = existingUserId;
      } else {
        userId = this.storage.generateUserId();
      }

      this.storage.addUser(socket.id, userId);
      socket.emit("userId", userId);
    });

    socket.on("updateDisplayName", (data: UpdateDisplayNameData) => {
      if (userId) {
        this.storage.setDisplayName(userId, data.displayName);
      }
    });

    socket.on("ping", (data: { timestamp: number }) => {
      socket.emit("pong", {
        timestamp: data.timestamp,
        serverTime: Date.now(),
      });
    });

    socket.on("joinCall", (targetUserId: string) => {
      this.callHandler.handleJoinCall(socket, targetUserId);
    });

    socket.on("acceptCall", (data: CallData) => {
      this.callHandler.handleAcceptCall(socket, data);
    });

    socket.on("rejectCall", (data: CallData) => {
      this.callHandler.handleRejectCall(socket, data);
    });

    socket.on("offer", (data: OfferData) => {
      this.webrtcHandler.handleOffer(socket, data);
    });

    socket.on("answer", (data: AnswerData) => {
      this.webrtcHandler.handleAnswer(socket, data);
    });

    socket.on("iceCandidate", (data: IceCandidateData) => {
      this.webrtcHandler.handleIceCandidate(socket, data);
    });

    socket.on("endCall", (data: EndCallData) => {
      this.callHandler.handleEndCall(socket, data);
    });

    socket.on("disconnect", () => {
      const disconnectedUserId = this.storage.removeUser(socket.id);
      if (disconnectedUserId) {
        socket.broadcast.emit("userDisconnected", {
          userId: disconnectedUserId,
        });
      }
    });
  }

  getStorage(): JsonStorageManager {
    return this.storage;
  }
}
