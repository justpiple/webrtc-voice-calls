import { STORAGE_KEYS } from "./config.js";

export class AudioManager {
  constructor(domManager) {
    this.domManager = domManager;
    this.ringtone = null;
    this.isRinging = false;
    this.isRingtoneMuted = this.loadRingtonePreference();
    this.localStream = null;
    this.isMuted = false;
    this.userInteracted = false;
    this.audioContext = null;
    this.backgroundManager = null;

    this.initializeRingtone();
    this.setupAudioInteraction();
    this.setupAudioContext();
  }

  setupAudioInteraction() {
    const enableAudioBtn = document.getElementById("enableAudioBtn");
    const audioOverlay = document.getElementById("audioOverlay");

    if (enableAudioBtn) {
      enableAudioBtn.addEventListener("click", async () => {
        try {
          await this.testAudioPlayback();
          this.userInteracted = true;

          if (audioOverlay) {
            audioOverlay.classList.add("hidden");
          }

          this.domManager.showStatus(
            "Audio enabled successfully!",
            "connected",
          );
        } catch (error) {
          console.error("Error enabling audio:", error);
          this.domManager.showStatus(
            "Failed to enable audio. Please try again.",
            "error",
          );
        }
      });
    }
  }

  async testAudioPlayback() {
    try {
      const testAudio = new Audio("/assets/ring.mp3");
      testAudio.volume = 0;

      await testAudio.play();
      testAudio.pause();

      return true;
    } catch (error) {
      throw new Error("Audio playback test failed");
    }
  }

  loadRingtonePreference() {
    return localStorage.getItem(STORAGE_KEYS.RINGTONE_MUTED) === "true";
  }

  initializeRingtone() {
    try {
      this.ringtone = new Audio("/assets/ring.mp3");
      this.ringtone.loop = true;
      this.ringtone.volume = this.isRingtoneMuted ? 0 : 0.5;
      this.domManager.updateRingtoneButtons(this.isRingtoneMuted);
    } catch (error) {
      console.error("Error initializing ringtone:", error);
    }
  }

  setupAudioContext() {
    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      document.addEventListener(
        "click",
        () => {
          if (this.audioContext && this.audioContext.state === "suspended") {
            this.audioContext.resume();
          }
        },
        { once: true },
      );

      this.audioContext.addEventListener("statechange", () => {
        console.log("Audio context state:", this.audioContext.state);
      });
    } catch (error) {
      console.error("Error creating audio context:", error);
    }
  }

  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
        console.log("Audio context resumed");
        return true;
      } catch (error) {
        console.error("Error resuming audio context:", error);
        return false;
      }
    }
    return true;
  }

  setBackgroundManager(backgroundManager) {
    this.backgroundManager = backgroundManager;
  }

  async initializeLocalStream() {
    try {
      await this.resumeAudioContext();

      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      }
      return this.localStream;
    } catch (error) {
      throw new Error(`Failed to get user media: ${error.message}`);
    }
  }

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }

  playRingtone() {
    if (!this.userInteracted) {
      console.warn("Cannot play ringtone: user has not interacted yet");
      return;
    }

    if (this.ringtone && !this.isRinging) {
      try {
        this.resumeAudioContext();

        this.ringtone.volume = this.isRingtoneMuted ? 0 : 0.5;
        this.ringtone.play().catch((error) => {
          console.error("Error playing ringtone:", error);
        });
        this.isRinging = true;
      } catch (error) {
        console.error("Error playing ringtone:", error);
      }
    }
  }

  stopRingtone() {
    if (this.ringtone && this.isRinging) {
      try {
        this.ringtone.pause();
        this.ringtone.currentTime = 0;
        this.isRinging = false;
      } catch (error) {
        console.error("Error stopping ringtone:", error);
      }
    }
  }

  toggleRingtone() {
    this.isRingtoneMuted = !this.isRingtoneMuted;
    localStorage.setItem(
      STORAGE_KEYS.RINGTONE_MUTED,
      this.isRingtoneMuted.toString(),
    );

    if (this.ringtone) {
      this.ringtone.volume = this.isRingtoneMuted ? 0 : 0.5;
    }

    this.domManager.updateRingtoneButtons(this.isRingtoneMuted);
  }

  toggleMute() {
    if (!this.localStream) {
      console.warn("Cannot toggle mute: no local stream available");
      return;
    }

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.isMuted = !audioTrack.enabled;
      this.domManager.updateMuteButton(this.isMuted);
    }
  }

  cleanup() {
    this.stopRingtone();
    this.stopLocalStream();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
