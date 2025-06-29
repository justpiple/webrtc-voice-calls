export class PhoneBookManager {
  constructor(domManager, socketManager) {
    this.domManager = domManager;
    this.socketManager = socketManager;
    this.contacts = this.loadContacts();
  }

  loadContacts() {
    try {
      const saved = localStorage.getItem("phoneBook");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Error loading phone book:", error);
      return [];
    }
  }

  saveContacts() {
    try {
      localStorage.setItem("phoneBook", JSON.stringify(this.contacts));
    } catch (error) {
      console.error("Error saving phone book:", error);
    }
  }

  addContact(userId) {
    if (!userId || this.contacts.some((contact) => contact.id === userId)) {
      return;
    }

    this.contacts.push({
      id: userId,
      addedAt: new Date().toISOString(),
    });

    this.saveContacts();
  }

  removeContact(userId) {
    this.contacts = this.contacts.filter((contact) => contact.id !== userId);
    this.saveContacts();
    this.renderContacts();
  }

  async getContactNames() {
    if (!this.contacts.length) return {};

    try {
      const response = await fetch("/api/users/names", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userIds: this.contacts.map((contact) => contact.id),
        }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Error fetching contact names:", error);
    }

    return {};
  }

  async renderContacts() {
    const phoneBookList = this.domManager.get("phoneBookList");
    const names = await this.getContactNames();

    if (!this.contacts.length) {
      phoneBookList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📞</div>
          <p>No contacts saved yet</p>
          <small>Contacts will be automatically saved after making calls</small>
        </div>
      `;
      return;
    }

    const contactsHtml = this.contacts
      .map((contact) => {
        const name = names[contact.id] || "Tidak diketahui";
        const displayName = name === "Tidak diketahui" ? "" : name;

        return `
          <div class="phone-book-item" data-user-id="${contact.id}">
            <div class="phone-book-item-info">
              <div class="phone-book-item-name">${
                displayName || "Tidak diketahui"
              }</div>
              <div class="phone-book-item-id">ID: ${contact.id}</div>
            </div>
            <div class="phone-book-item-actions">
              <button class="phone-book-item-btn call-btn" title="Call">
                📞
              </button>
              <button class="phone-book-item-btn delete" title="Hapus">
                🗑️
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    phoneBookList.innerHTML = contactsHtml;

    this.setupContactEventListeners();
  }

  setupContactEventListeners() {
    const callButtons = document.querySelectorAll(
      ".phone-book-item-btn.call-btn",
    );
    const deleteButtons = document.querySelectorAll(
      ".phone-book-item-btn.delete",
    );

    callButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        const userId = button.closest(".phone-book-item").dataset.userId;
        this.callContact(userId);
      });
    });

    deleteButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        const userId = button.closest(".phone-book-item").dataset.userId;
        this.removeContact(userId);
      });
    });
  }

  callContact(userId) {
    this.domManager.get("targetUserId").value = userId;
    this.closeModal();
    this.domManager.get("callBtn").click();
  }

  showModal() {
    this.domManager.get("phoneBookModal").classList.remove("hidden");
    this.renderContacts();
  }

  closeModal() {
    this.domManager.get("phoneBookModal").classList.add("hidden");
  }

  setupEventListeners() {
    const phoneBookBtn = this.domManager.get("phoneBookBtn");
    const closePhoneBookBtn = this.domManager.get("closePhoneBookBtn");
    const modalOverlay = this.domManager.get("phoneBookModal");

    phoneBookBtn.addEventListener("click", () => {
      this.showModal();
    });

    closePhoneBookBtn.addEventListener("click", () => {
      this.closeModal();
    });

    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        this.closeModal();
      }
    });
  }
}
