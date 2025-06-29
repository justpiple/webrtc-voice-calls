import { STORAGE_KEYS, SOCKET_EVENTS } from "./config.js";

export class SocketManager {
  constructor(domManager, audioManager, webrtcManager) {
    this.domManager = domManager;
    this.audioManager = audioManager;
    this.webrtcManager = webrtcManager;
    this.socket = null;
    this.currentUserId = null;
    this.currentDisplayName = "";
    this.targetUserId = null;
    this.targetDisplayName = "";
    this.isInitiator = false;
    this.incomingCallData = null;
    this.backgroundManager = null;
    this.heartbeatInterval = null;
    this.phoneBookManager = null;

    this.loadSavedData();
  }

  loadSavedData() {
    this.currentUserId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    this.currentDisplayName =
      localStorage.getItem(STORAGE_KEYS.DISPLAY_NAME) || "";
  }

  connect() {
    const auth = {};
    if (this.currentUserId) {
      auth.userId = this.currentUserId;
    }

    this.socket = io({
      auth: auth,
    });
    this.setupEventListeners();

    if (this.currentDisplayName) {
      this.emit(SOCKET_EVENTS.UPDATE_DISPLAY_NAME, {
        displayName: this.currentDisplayName,
      });
    }
  }

  setupEventListeners() {
    this.socket.on("connect", () => {
      this.domManager.showStatus("Connected to server...", "connecting");
      this.startHeartbeat();
    });

    this.socket.on("connect_error", (error) => {
      this.domManager.showStatus("Error connecting to server", "error");
      this.stopHeartbeat();
    });

    this.socket.on("disconnect", () => {
      this.domManager.showStatus("Disconnected from server", "error");
      this.stopHeartbeat();
    });

    this.socket.on("userId", (userId) => {
      this.currentUserId = userId;
      this.domManager.get("userId").textContent = userId;
      localStorage.setItem(STORAGE_KEYS.USER_ID, userId);

      if (this.currentDisplayName) {
        this.emit(SOCKET_EVENTS.UPDATE_DISPLAY_NAME, {
          displayName: this.currentDisplayName,
        });
      }

      this.domManager.showStatus("Ready for calls", "connected");
    });

    this.socket.on("incomingCall", (data) => {
      this.incomingCallData = data;
      const fromName = data.fromDisplayName || `User ${data.from}`;
      this.domManager.updateIncomingCall(true, fromName);
      this.audioManager.playRingtone();

      if (this.backgroundManager) {
        this.backgroundManager.showIncomingCallNotification(fromName);
      }
    });

    this.socket.on(SOCKET_EVENTS.PONG, (data) => {
      console.log("Received pong from server:", data);
    });

    this.socket.on("targetDisplayName", (data) => {
      this.targetDisplayName = data.displayName;
    });

    this.socket.on("callAccepted", async (data) => {
      this.targetUserId = data.from;
      this.domManager.showStatus("Call accepted, connecting...", "connecting");

      if (this.phoneBookManager) {
        this.phoneBookManager.addContact(data.from);
      }

      await this.webrtcManager.createPeerConnection();
      this.webrtcManager.createOffer();
    });

    this.socket.on("callAcceptedByTarget", (data) => {
      if (this.phoneBookManager && this.targetUserId) {
        this.phoneBookManager.addContact(this.targetUserId);
      }
    });

    this.socket.on("callRejected", () => {
      this.domManager.showStatus("Call declined", "error");
      this.resetCallState();
    });

    this.socket.on("callError", (message) => {
      this.domManager.showStatus("Error: " + message, "error");
      this.resetCallState();
    });

    this.socket.on("offer", (data) => {
      this.webrtcManager.handleOffer(data);
    });

    this.socket.on("answer", (data) => {
      this.webrtcManager.handleAnswer(data);
    });

    this.socket.on("iceCandidate", (data) => {
      this.webrtcManager.handleIceCandidate(data);
    });

    this.socket.on("callEnded", (data) => {
      if (data.from === this.targetUserId) {
        const targetName =
          this.targetDisplayName || `User ${this.targetUserId}`;
        this.domManager.showStatus(`Call ended by ${targetName}`, "error");
        this.endCall();
      }
    });

    this.socket.on("userDisconnected", (data) => {
      if (data.userId === this.targetUserId) {
        const targetName =
          this.targetDisplayName || `User ${this.targetUserId}`;
        this.domManager.showStatus(
          `Call ended - ${targetName} disconnected`,
          "error",
        );
        this.endCall();
      }
    });
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  async startCall(targetId) {
    if (!targetId) {
      this.domManager.showStatus("Enter friend ID", "error");
      return;
    }

    if (targetId === this.currentUserId) {
      this.domManager.showStatus("Cannot call yourself", "error");
      return;
    }

    this.targetUserId = targetId;
    this.isInitiator = true;

    const targetName = this.targetDisplayName || `User ${targetId}`;
    this.domManager.showStatus(
      `Starting call to ${targetName}...`,
      "connecting",
    );

    try {
      await this.audioManager.initializeLocalStream();
    } catch (error) {
      this.handleAudioAccessError(error);
      return;
    }

    this.emit(SOCKET_EVENTS.JOIN_CALL, targetId);
  }

  async acceptCall() {
    if (!this.incomingCallData) return;

    this.targetUserId = this.incomingCallData.from;
    this.targetDisplayName =
      this.incomingCallData.fromDisplayName ||
      `User ${this.incomingCallData.from}`;
    this.isInitiator = false;

    this.audioManager.stopRingtone();
    this.domManager.updateIncomingCall(false);
    this.domManager.showStatus(
      `Receiving call from ${this.targetDisplayName}...`,
      "connecting",
    );

    try {
      await this.audioManager.initializeLocalStream();
    } catch (error) {
      this.handleAudioAccessError(error);
      return;
    }

    this.emit(SOCKET_EVENTS.ACCEPT_CALL, this.incomingCallData);
    this.incomingCallData = null;
  }

  rejectCall() {
    if (!this.incomingCallData) return;

    this.emit(SOCKET_EVENTS.REJECT_CALL, this.incomingCallData);
    this.domManager.showStatus("Call declined", "error");
    this.resetCallState();
  }

  endCall() {
    this.webrtcManager.cleanup();

    if (this.targetUserId) {
      this.emit(SOCKET_EVENTS.END_CALL, { target: this.targetUserId });
    }

    const targetName = this.targetDisplayName || `User ${this.targetUserId}`;
    this.resetCallState();

    this.domManager.showStatus(`Call with ${targetName} ended`, "error");
  }

  updateDisplayName(displayName) {
    this.currentDisplayName = displayName;
    localStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, displayName);
    this.emit(SOCKET_EVENTS.UPDATE_DISPLAY_NAME, { displayName });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  resetCallState() {
    this.audioManager.stopLocalStream();
    this.targetUserId = null;
    this.targetDisplayName = "";
    this.isInitiator = false;
    this.incomingCallData = null;
    this.audioManager.stopRingtone();
    this.domManager.updateCallControls(false);
    this.domManager.updateIncomingCall(false);
  }

  handleAudioAccessError(error) {
    this.domManager.showStatus(
      "Error accessing microphone: " + error.message,
      "error",
    );
    this.resetCallState();
  }

  startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.emit(SOCKET_EVENTS.PING, { timestamp: Date.now() });
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  setBackgroundManager(backgroundManager) {
    this.backgroundManager = backgroundManager;
  }

  setPhoneBookManager(phoneBookManager) {
    this.phoneBookManager = phoneBookManager;
  }

  sendKeepAlive() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "START_BACKGROUND_SYNC",
      });
    }

    if (this.socketManager && this.socketManager.socket) {
      this.socketManager.emit(SOCKET_EVENTS.PING, { timestamp: Date.now() });
    }
  }
}
