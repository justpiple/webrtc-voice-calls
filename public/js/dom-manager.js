export class DOMManager {
  constructor() {
    this.elements = {};
    this.initializeElements();
  }

  initializeElements() {
    const elementIds = [
      "userId",
      "displayName",
      "targetUserId",
      "callBtn",
      "endCallBtn",
      "status",
      "callControls",
      "incomingCall",
      "incomingFrom",
      "muteBtn",
      "muteText",
      "audioIndicator",
      "ringtoneBtn",
      "ringtoneControlBtn",
      "copyBtn",
      "phoneBookBtn",
      "closePhoneBookBtn",
      "phoneBookModal",
      "phoneBookList",
    ];

    elementIds.forEach((id) => {
      this.elements[id] = document.getElementById(id);
    });

    this.validateElements();
  }

  validateElements() {
    const missingElements = Object.entries(this.elements)
      .filter(([id, element]) => !element)
      .map(([id]) => id);

    if (missingElements.length > 0) {
      throw new Error(`Missing DOM elements: ${missingElements.join(", ")}`);
    }
  }

  get(id) {
    return this.elements[id];
  }

  showStatus(message, type) {
    const statusElement = this.get("status");
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.classList.remove("hidden");

    if (type === "error") {
      setTimeout(() => {
        statusElement.classList.add("hidden");
      }, 5000);
    }
  }

  updateCallControls(show) {
    const callControls = this.get("callControls");
    const callBtn = this.get("callBtn");
    const endCallBtn = this.get("endCallBtn");

    if (show) {
      callControls.classList.add("show");
      callBtn.classList.add("hidden");
      endCallBtn.classList.remove("hidden");
    } else {
      callControls.classList.remove("show");
      callBtn.classList.remove("hidden");
      endCallBtn.classList.add("hidden");
    }
  }

  updateIncomingCall(show, fromName = "") {
    const incomingCall = this.get("incomingCall");
    const incomingFrom = this.get("incomingFrom");

    if (show) {
      incomingFrom.textContent = fromName;
      incomingCall.classList.remove("hidden");
    } else {
      incomingCall.classList.add("hidden");
    }
  }

  updateMuteButton(isMuted) {
    const muteText = this.get("muteText");
    const audioIndicator = this.get("audioIndicator");

    muteText.textContent = isMuted ? "Unmute Microphone" : "Mute Microphone";
    audioIndicator.classList.toggle("muted", isMuted);
    audioIndicator.classList.toggle("unmuted", !isMuted);
  }

  updateRingtoneButtons(isMuted) {
    const ringtoneControlBtn = this.get("ringtoneControlBtn");
    const ringtoneBtn = this.get("ringtoneBtn");

    const buttonText = isMuted ? "🔊 Unmute Ringtone" : "🔇 Mute Ringtone";
    const buttonClass = isMuted ? "btn-danger" : "btn-secondary";

    if (ringtoneControlBtn) {
      ringtoneControlBtn.textContent = buttonText;
      ringtoneControlBtn.className = `copy-btn ${buttonClass}`;
    }

    if (ringtoneBtn) {
      ringtoneBtn.textContent = buttonText;
      ringtoneBtn.className = `btn ${buttonClass}`;
    }
  }

  updateCopyButton(success) {
    const copyBtn = this.get("copyBtn");
    if (copyBtn) {
      copyBtn.textContent = success ? "Copied!" : "Copy ID";
    }
  }
}
