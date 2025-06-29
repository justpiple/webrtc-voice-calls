import { Server, Socket } from "socket.io";
import { JsonStorageManager } from "./json-storage-manager";
import {
  OfferData,
  AnswerData,
  IceCandidateData,
  OfferResponseData,
  AnswerResponseData,
  IceCandidateResponseData,
} from "./types";

export class WebRTCHandler {
  private storage: JsonStorageManager;
  private io: Server;

  constructor(storage: JsonStorageManager, io: Server) {
    this.storage = storage;
    this.io = io;
  }

  handleOffer(socket: Socket, data: OfferData): void {
    const userId = this.storage.getUserBySocketId(socket.id);
    if (!userId) return;

    const targetSocketId = this.storage.getSocketIdByUserId(data.target);

    if (targetSocketId) {
      this.io.to(targetSocketId).emit("offer", {
        offer: data.offer,
        from: userId,
        fromSocketId: socket.id,
      } as OfferResponseData);
    }
  }

  handleAnswer(socket: Socket, data: AnswerData): void {
    const userId = this.storage.getUserBySocketId(socket.id);
    if (!userId) return;

    const targetSocketId = this.storage.getSocketIdByUserId(data.target);

    if (targetSocketId) {
      this.io.to(targetSocketId).emit("answer", {
        answer: data.answer,
        from: userId,
        fromSocketId: socket.id,
      } as AnswerResponseData);
    }
  }

  handleIceCandidate(socket: Socket, data: IceCandidateData): void {
    const userId = this.storage.getUserBySocketId(socket.id);
    if (!userId) return;

    const targetSocketId = this.storage.getSocketIdByUserId(data.target);

    if (targetSocketId) {
      this.io.to(targetSocketId).emit("iceCandidate", {
        candidate: data.candidate,
        from: userId,
        fromSocketId: socket.id,
      } as IceCandidateResponseData);
    }
  }
}
