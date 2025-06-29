// Call-related types
export interface CallData {
  from: string;
  fromSocketId: string;
}

export interface CallDataWithDisplayName extends CallData {
  fromDisplayName: string;
}

export interface EndCallData {
  target: string;
}

// WebRTC-related types
export interface RTCSessionDescriptionInit {
  type: "offer" | "answer" | "pranswer" | "rollback";
  sdp?: string;
}

export interface RTCIceCandidateInit {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
  usernameFragment?: string;
}

export interface OfferData {
  target: string;
  offer: RTCSessionDescriptionInit;
}

export interface AnswerData {
  target: string;
  answer: RTCSessionDescriptionInit;
}

export interface IceCandidateData {
  target: string;
  candidate: RTCIceCandidateInit;
}

export interface WebRTCResponseData {
  from: string;
  fromSocketId: string;
}

export interface OfferResponseData extends WebRTCResponseData {
  offer: RTCSessionDescriptionInit;
}

export interface AnswerResponseData extends WebRTCResponseData {
  answer: RTCSessionDescriptionInit;
}

export interface IceCandidateResponseData extends WebRTCResponseData {
  candidate: RTCIceCandidateInit;
}

// User-related types
export interface UpdateDisplayNameData {
  displayName: string;
}
