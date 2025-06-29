export function copyToClipboard(text, domManager) {
  if (!text) {
    domManager.showStatus("ID not available yet", "error");
    return;
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        domManager.updateCopyButton(true);
        domManager.showStatus("ID copied successfully!", "connected");
        setTimeout(() => domManager.updateCopyButton(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        fallbackCopyTextToClipboard(text, domManager);
      });
  } else {
    fallbackCopyTextToClipboard(text, domManager);
  }
}

function fallbackCopyTextToClipboard(text, domManager) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    if (successful) {
      domManager.updateCopyButton(true);
      domManager.showStatus("ID copied successfully!", "connected");
      setTimeout(() => domManager.updateCopyButton(false), 2000);
    } else {
      domManager.showStatus("Failed to copy ID", "error");
    }
  } catch (err) {
    console.error("Fallback: Oops, unable to copy", err);
    domManager.showStatus("Failed to copy ID", "error");
  }

  document.body.removeChild(textArea);
}

export function validateDisplayName(displayName) {
  if (!displayName.trim()) {
    return { valid: false, message: "Nama tidak boleh kosong" };
  }

  if (displayName.length > 20) {
    return { valid: false, message: "Nama maksimal 20 karakter" };
  }

  return { valid: true };
}
