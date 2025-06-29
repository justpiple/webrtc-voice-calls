import { WEBRTC_CONFIG } from "./config.js";

export class WebRTCManager {
  constructor(audioManager, socketManager, domManager) {
    this.audioManager = audioManager;
    this.socketManager = socketManager;
    this.domManager = domManager;
    this.peerConnection = null;
    this.remoteStream = null;
  }

  async createPeerConnection() {
    if (!this.audioManager.localStream) {
      await this.audioManager.initializeLocalStream();
    }

    this.peerConnection = new RTCPeerConnection(WEBRTC_CONFIG);

    this.audioManager.localStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.audioManager.localStream);
    });

    this.setupPeerConnectionHandlers();
  }

  setupPeerConnectionHandlers() {
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      const audioElement = document.createElement("audio");
      audioElement.srcObject = this.remoteStream;
      audioElement.autoplay = true;
      document.body.appendChild(audioElement);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socketManager.emit("iceCandidate", {
          candidate: event.candidate,
          target: this.socketManager.targetUserId,
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;

      if (state === "connected") {
        this.domManager.showStatus(
          "Connected with " + this.socketManager.targetDisplayName,
          "connected",
        );
        this.domManager.updateCallControls(true);
      } else if (state === "disconnected" || state === "failed") {
        this.domManager.showStatus("Connection disconnected", "error");
        this.cleanup();
      }
    };
  }

  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.socketManager.emit("offer", {
        offer: offer,
        target: this.socketManager.targetUserId,
      });
    } catch (error) {
      console.error("Error creating offer:", error);
      this.domManager.showStatus("Error creating offer", "error");
    }
  }

  async handleOffer(data) {
    if (!this.peerConnection) {
      this.createPeerConnection();
    }

    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer),
      );
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socketManager.emit("answer", {
        answer: answer,
        target: data.from,
        targetSocketId: data.fromSocketId,
      });
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  }

  async handleAnswer(data) {
    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer),
      );
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  }

  async handleIceCandidate(data) {
    try {
      await this.peerConnection.addIceCandidate(
        new RTCIceCandidate(data.candidate),
      );
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }

  cleanup() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => audio.remove());

    this.remoteStream = null;
  }
}
