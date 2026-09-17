import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Monitor, Mic, MicOff, Lock, Unlock, CheckCircle2 } from "lucide-react";
import DigitalWhiteboard, { type WhiteboardRef } from "@/components/DigitalWhiteboard";
import { useWebRTC } from "@/hooks/useWebRTC";
import { supabase } from "@/integrations/supabase/client";

interface DoubtBoardSessionProps {
  sessionId: string;
  role: "teacher" | "student";
  userId: string;
  /** Original doubt text + images shown during the live explanation */
  question?: string;
  questionImages?: string[];
  previousAnswer?: string | null;
  /** Teacher only — completes the session and marks the doubt Understood */
  onComplete?: () => Promise<void> | void;
  onEnded?: () => void;
}

/**
 * Live Digital Board session attached to a doubt.
 * The Digital Board is only a solving method — the doubt stays the main record.
 */
const DoubtBoardSession = ({
  sessionId, role, userId, question, questionImages = [], previousAnswer, onComplete, onEnded,
}: DoubtBoardSessionProps) => {
  const whiteboardRef = useRef<WhiteboardRef>(null);
  const [status, setStatus] = useState<string>("active");
  const [locked, setLocked] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [completing, setCompleting] = useState(false);

  const webrtc = useWebRTC({ sessionId, userId });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("digital_board_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (!active || !data) return;
      setStatus(data.status);
      setLocked((data as any).teacher_locked || false);
      setTeacherName(data.teacher_name);
      setStudentName(data.student_name);
    })();

    const channel = supabase
      .channel(`doubt-board-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "digital_board_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const d = payload.new as any;
          setStatus(d.status);
          setLocked(d.teacher_locked || false);
        }
      )
      .subscribe();

    // Teacher starts the voice call, student answers
    const t = setTimeout(() => webrtc.startCall(role === "teacher"), 600);

    return () => {
      active = false;
      clearTimeout(t);
      supabase.removeChannel(channel);
      webrtc.cleanup();
    };
  }, [sessionId]);

  useEffect(() => {
    if (status === "completed") onEnded?.();
  }, [status]);

  const toggleLock = async () => {
    const next = !locked;
    setLocked(next);
    await supabase
      .from("digital_board_sessions")
      .update({ teacher_locked: next } as any)
      .eq("id", sessionId);
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      webrtc.endCall();
      await onComplete?.();
    } finally {
      setCompleting(false);
    }
  };

  if (status === "completed") {
    return (
      <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-success" /> Digital Board session completed.
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">
            Digital Board session with {role === "teacher" ? studentName : teacherName}
          </span>
          {webrtc.connected && <span className="text-xs text-green-500">🔊 Voice connected</span>}
          {webrtc.connecting && <span className="text-xs text-yellow-500">Connecting voice…</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={webrtc.toggleMute}>
            {webrtc.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          {role === "teacher" && (
            <>
              <Button variant="outline" size="sm" onClick={toggleLock} title={locked ? "Unlock student" : "Lock student"}>
                {locked ? <Lock className="h-4 w-4 text-destructive" /> : <Unlock className="h-4 w-4" />}
              </Button>
              <Button size="sm" onClick={handleComplete} disabled={completing}>
                {completing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Complete Session
              </Button>
            </>
          )}
        </div>
      </div>

      {webrtc.error && (
        <div className="flex items-center justify-between gap-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <span>Voice connection failed: {webrtc.error}</span>
          <Button size="sm" variant="outline" className="h-6 text-xs shrink-0" onClick={() => webrtc.startCall(role === "teacher")}>
            Retry Voice
          </Button>
        </div>
      )}

      {(question || questionImages.length > 0 || previousAnswer) && (
        <div className="p-3 rounded bg-muted text-sm space-y-2">
          {question && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Question:</p>
              <p className="whitespace-pre-wrap">{question}</p>
            </div>
          )}
          {questionImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {questionImages.map((u, i) => (
                <img key={i} src={u} alt={`Question ${i + 1}`} className="max-h-32 rounded border" />
              ))}
            </div>
          )}
          {previousAnswer && (
            <div className="p-2 rounded bg-success/10">
              <p className="text-xs text-muted-foreground mb-0.5">Previous answer:</p>
              <p className="whitespace-pre-wrap text-xs">{previousAnswer}</p>
            </div>
          )}
        </div>
      )}

      <div className="border rounded-lg overflow-hidden" style={{ height: "60vh" }}>
        <DigitalWhiteboard
          ref={whiteboardRef}
          sessionId={sessionId}
          userId={userId}
          disabled={role === "student" && locked}
        />
      </div>
    </div>
  );
};

export default DoubtBoardSession;
