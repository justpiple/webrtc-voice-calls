import { DOMManager } from "./js/dom-manager.js";
import { AudioManager } from "./js/audio-manager.js";
import { WebRTCManager } from "./js/webrtc-manager.js";
import { SocketManager } from "./js/socket-manager.js";
import { BackgroundManager } from "./js/background-manager.js";
import { PhoneBookManager } from "./js/phone-book-manager.js";
import { copyToClipboard, validateDisplayName } from "./js/utils.js";

class VoiceCallApp {
  constructor() {
    this.domManager = new DOMManager();
    this.audioManager = new AudioManager(this.domManager);
    this.socketManager = new SocketManager(
      this.domManager,
      this.audioManager,
      null,
    );
    this.webrtcManager = new WebRTCManager(
      this.audioManager,
      this.socketManager,
      this.domManager,
    );
    this.backgroundManager = new BackgroundManager(
      this.socketManager,
      this.audioManager,
      this.domManager,
    );
    this.phoneBookManager = new PhoneBookManager(
      this.domManager,
      this.socketManager,
    );

    this.socketManager.webrtcManager = this.webrtcManager;

    this.socketManager.setBackgroundManager(this.backgroundManager);
    this.audioManager.setBackgroundManager(this.backgroundManager);
    this.socketManager.setPhoneBookManager(this.phoneBookManager);

    this.setupEventListeners();
  }

  async init() {
    try {
      this.showAudioOverlayIfNeeded();

      this.socketManager.connect();
      this.loadSavedDisplayName();
    } catch (error) {
      console.error("Error initializing:", error);
      this.domManager.showStatus("Error: " + error.message, "error");
    }
  }

  showAudioOverlayIfNeeded() {
    const audioOverlay = document.getElementById("audioOverlay");
    if (audioOverlay && !this.audioManager.userInteracted) {
      audioOverlay.classList.remove("hidden");
    }
  }

  loadSavedDisplayName() {
    const displayNameElement = this.domManager.get("displayName");
    if (this.socketManager.currentDisplayName) {
      displayNameElement.value = this.socketManager.currentDisplayName;
    }
  }

  setupEventListeners() {
    this.domManager.get("callBtn").addEventListener("click", async () => {
      if (!this.audioManager.userInteracted) {
        this.domManager.showStatus("Please enable audio first!", "error");
        this.showAudioOverlayIfNeeded();
        return;
      }

      if (!this.backgroundManager.notificationPermission) {
        await this.backgroundManager.requestNotificationPermission();
      }

      const targetId = this.domManager.get("targetUserId").value.trim();
      await this.socketManager.startCall(targetId);
    });

    this.phoneBookManager.setupEventListeners();

    this.domManager.get("endCallBtn").addEventListener("click", () => {
      this.socketManager.endCall();

      this.backgroundManager.releaseWakeLock();
    });

    this.domManager.get("muteBtn").addEventListener("click", () => {
      this.audioManager.toggleMute();
    });

    const ringtoneBtn = this.domManager.get("ringtoneBtn");
    if (ringtoneBtn) {
      ringtoneBtn.addEventListener("click", () => {
        this.audioManager.toggleRingtone();
      });
    }

    const ringtoneControlBtn = this.domManager.get("ringtoneControlBtn");
    if (ringtoneControlBtn) {
      ringtoneControlBtn.addEventListener("click", () => {
        this.audioManager.toggleRingtone();
      });
    }

    const copyBtn = this.domManager.get("copyBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        copyToClipboard(this.socketManager.currentUserId, this.domManager);
      });
    }

    const acceptCallBtn = document.getElementById("acceptCallBtn");
    if (acceptCallBtn) {
      acceptCallBtn.addEventListener("click", async () => {
        await this.backgroundManager.acquireWakeLock();
        await this.socketManager.acceptCall();
      });
    }

    const rejectCallBtn = document.getElementById("rejectCallBtn");
    if (rejectCallBtn) {
      rejectCallBtn.addEventListener("click", () => {
        this.socketManager.rejectCall();
      });
    }

    const saveNameBtn = document.getElementById("saveNameBtn");
    if (saveNameBtn) {
      saveNameBtn.addEventListener("click", () => {
        this.saveDisplayName();
      });
    }

    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
  }

  saveDisplayName() {
    const displayNameInput = this.domManager.get("displayName");
    const newDisplayName = displayNameInput.value.trim();

    const validation = validateDisplayName(newDisplayName);
    if (!validation.valid) {
      this.domManager.showStatus(validation.message, "error");
      return;
    }

    this.socketManager.updateDisplayName(newDisplayName);
    this.domManager.showStatus("Name saved successfully!", "connected");
  }

  cleanup() {
    this.audioManager.cleanup();
    this.webrtcManager.cleanup();
    this.socketManager.disconnect();
    this.backgroundManager.cleanup();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new VoiceCallApp();
  app.init();
});
