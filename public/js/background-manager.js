export class BackgroundManager {
  constructor(socketManager, audioManager, domManager) {
    this.socketManager = socketManager;
    this.audioManager = audioManager;
    this.domManager = domManager;
    this.isPageVisible = true;
    this.keepAliveInterval = null;
    this.wakeLock = null;
    this.notificationPermission = false;

    this.init();
  }

  async init() {
    this.setupPageVisibility();
    this.setupServiceWorker();
    this.setupNotifications();
    this.setupWakeLock();
    this.startKeepAlive();
  }

  setupPageVisibility() {
    document.addEventListener("visibilitychange", () => {
      this.isPageVisible = !document.hidden;

      if (this.isPageVisible) {
        this.onPageVisible();
      } else {
        this.onPageHidden();
      }
    });

    this.isPageVisible = !document.hidden;
  }

  async setupServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("Service Worker registered:", registration);

        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data.type === "KEEP_ALIVE") {
            this.handleKeepAlive();
          }
        });

        if (registration.sync) {
          registration.sync.register("keep-alive");
        }
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    }
  }

  async setupNotifications() {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        this.notificationPermission = true;
      } else if (Notification.permission === "default") {
      }
    }
  }

  async requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission === "granted";
      return this.notificationPermission;
    }
    return this.notificationPermission;
  }

  async setupWakeLock() {
    if ("wakeLock" in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request("screen");
        console.log("Wake Lock acquired");
      } catch (error) {
        console.log("Wake Lock not supported or failed:", error);
      }
    }
  }

  startKeepAlive() {
    this.keepAliveInterval = setInterval(() => {
      this.sendKeepAlive();
    }, 30000);
  }

  sendKeepAlive() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "START_BACKGROUND_SYNC",
      });
    }

    if (this.socketManager && this.socketManager.socket) {
      this.socketManager.emit("ping", { timestamp: Date.now() });
    }
  }

  handleKeepAlive() {
    if (this.audioManager && this.audioManager.audioContext) {
      if (this.audioManager.audioContext.state === "suspended") {
        this.audioManager.audioContext.resume();
      }
    }
  }

  onPageVisible() {
    console.log("Page became visible");

    if (this.audioManager && this.audioManager.audioContext) {
      this.audioManager.audioContext.resume();
    }

    if (this.socketManager && !this.socketManager.socket?.connected) {
      this.socketManager.connect();
    }

    this.domManager.showStatus("Aplikasi aktif kembali", "connected");
  }

  onPageHidden() {
    console.log("Page became hidden");

    if (this.audioManager && this.audioManager.audioContext) {
    }
  }

  showIncomingCallNotification(callerName) {
    if (this.notificationPermission && !this.isPageVisible) {
      const notification = new Notification("Incoming Call", {
        body: `From: ${callerName}`,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "incoming-call",
        requireInteraction: true,
        actions: [
          {
            action: "accept",
            title: "Accept",
          },
          {
            action: "reject",
            title: "Decline",
          },
        ],
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      notification.onaction = (event) => {
        if (event.action === "accept") {
          window.focus();

          const acceptBtn = document.getElementById("acceptCallBtn");
          if (acceptBtn) acceptBtn.click();
        } else if (event.action === "reject") {
          window.focus();

          const rejectBtn = document.getElementById("rejectCallBtn");
          if (rejectBtn) rejectBtn.click();
        }
        notification.close();
      };

      return notification;
    }
    return null;
  }

  async acquireWakeLock() {
    if ("wakeLock" in navigator && !this.wakeLock) {
      try {
        this.wakeLock = await navigator.wakeLock.request("screen");
        console.log("Wake Lock acquired for call");
      } catch (error) {
        console.log("Failed to acquire Wake Lock:", error);
      }
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
      console.log("Wake Lock released");
    }
  }

  cleanup() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    this.releaseWakeLock();
  }
}
