export const WEBRTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export const STORAGE_KEYS = {
  USER_ID: "voiceCallUserId",
  DISPLAY_NAME: "voiceCallDisplayName",
  RINGTONE_MUTED: "ringtoneMuted",
};

export const STATUS_TYPES = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
};

export const SOCKET_EVENTS = {
  SET_USER_ID: "setUserId",
  UPDATE_DISPLAY_NAME: "updateDisplayName",
  JOIN_CALL: "joinCall",
  ACCEPT_CALL: "acceptCall",
  REJECT_CALL: "rejectCall",
  END_CALL: "endCall",
  OFFER: "offer",
  ANSWER: "answer",
  ICE_CANDIDATE: "iceCandidate",
  PING: "ping",
  PONG: "pong",
};
