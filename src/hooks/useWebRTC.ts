import { useRef, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseWebRTCOptions {
  sessionId: string;
  userId: string;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTC({ sessionId, userId, onConnectionStateChange }: UseWebRTCOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const hasRemoteDesc = useRef(false);

  const channelName = `bev-voice-${sessionId}`;

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    hasRemoteDesc.current = false;
    pendingCandidates.current = [];
    setConnected(false);
    setConnecting(false);
  }, []);

  const addBufferedCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !hasRemoteDesc.current) return;
    for (const c of pendingCandidates.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    pendingCandidates.current = [];
  }, []);

  const startCall = useCallback(async (isInitiator: boolean) => {
    if (pcRef.current) return;
    setConnecting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        if (!remoteAudioRef.current) {
          const audio = new Audio();
          audio.autoplay = true;
          remoteAudioRef.current = audio;
        }
        remoteAudioRef.current.srcObject = e.streams[0];
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        onConnectionStateChange?.(state);
        setConnected(state === "connected");
        if (state === "failed" || state === "disconnected" || state === "closed") {
          setConnected(false);
        }
      };

      // Signaling channel
      const channel = supabase.channel(channelName, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          channel.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: { candidate: e.candidate.toJSON(), from: userId },
          });
        }
      };

      channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.from === userId) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          hasRemoteDesc.current = true;
          await addBufferedCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({
            type: "broadcast",
            event: "answer",
            payload: { sdp: answer, from: userId },
          });
        } catch (err) { console.error("Error handling offer:", err); }
      });

      channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.from === userId) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          hasRemoteDesc.current = true;
          await addBufferedCandidates();
        } catch (err) { console.error("Error handling answer:", err); }
      });

      channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.from === userId) return;
        if (hasRemoteDesc.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
        } else {
          pendingCandidates.current.push(payload.candidate);
        }
      });

      channel.on("broadcast", { event: "end-call" }, () => {
        cleanup();
      });

      await channel.subscribe();

      if (isInitiator) {
        // Wait a bit for remote to subscribe
        setTimeout(async () => {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            channel.send({
              type: "broadcast",
              event: "offer",
              payload: { sdp: offer, from: userId },
            });
          } catch (err) { console.error("Error creating offer:", err); }
        }, 1000);
      }

      setConnecting(false);
    } catch (err) {
      console.error("WebRTC start error:", err);
      setConnecting(false);
    }
  }, [sessionId, userId, channelName, cleanup, addBufferedCandidates, onConnectionStateChange]);

  const endCall = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "end-call",
      payload: { from: userId },
    });
    cleanup();
  }, [cleanup, userId]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    }
  }, []);

  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return { startCall, endCall, toggleMute, muted, connected, connecting, cleanup };
}
