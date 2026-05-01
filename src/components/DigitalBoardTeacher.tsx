import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone, PhoneOff, Loader2, Monitor, Check, Bell, Mic, MicOff, Lock, Unlock, Image as ImageIcon,
} from "lucide-react";
import DigitalWhiteboard, { type WhiteboardRef } from "@/components/DigitalWhiteboard";
import CCompilerEditor from "@/components/CCompilerEditor";
import { useDigitalBoard, type CallRequest } from "@/hooks/useDigitalBoard";
import { useWebRTC } from "@/hooks/useWebRTC";
import { supabase } from "@/integrations/supabase/client";

interface DigitalBoardTeacherProps {
  teacher: {
    staffId: string;
    name: string;
    collegeName: string;
    subjectName: string;
  };
}

const DigitalBoardTeacher = ({ teacher }: DigitalBoardTeacherProps) => {
  const board = useDigitalBoard();
  const whiteboardRef = useRef<WhiteboardRef>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [teacherLocked, setTeacherLocked] = useState(false);

  // WebRTC voice
  const webrtc = useWebRTC({
    sessionId: board.activeSession?.id || "none",
    userId: `teacher-${teacher.staffId}`,
  });

  // Set teacher online when component mounts
  useEffect(() => {
    board.setTeacherOnline(teacher.staffId, teacher.name, teacher.collegeName, teacher.subjectName);
    return () => { board.setTeacherOffline(teacher.staffId); };
  }, [teacher.staffId]);

  // Filter requests for this teacher's subject, exclude if busy
  const incomingRequests = board.callRequests.filter(
    (r) =>
      r.subjectName.toLowerCase() === teacher.subjectName.toLowerCase() &&
      r.status === "pending"
  );

  const handleAccept = async (request: CallRequest) => {
    setAccepting(request.id);
    try {
      const session = await board.acceptCallRequest(request.id, teacher.staffId, teacher.name);
      await board.fetchSession(session.id);
      // Teacher is initiator for WebRTC
      setTimeout(() => webrtc.startCall(true), 500);
    } catch (err: any) {
      console.error("Failed to accept:", err);
      alert(err.message || "Failed to accept call");
    } finally {
      setAccepting(null);
    }
  };

  const handleEndSession = async () => {
    webrtc.endCall();
    if (board.activeSession) {
      await board.endSession(board.activeSession.id, teacher.staffId);
    }
  };

  const toggleLock = async () => {
    if (!board.activeSession) return;
    const newLocked = !teacherLocked;
    setTeacherLocked(newLocked);
    await supabase
      .from("digital_board_sessions")
      .update({ teacher_locked: newLocked } as any)
      .eq("id", board.activeSession.id);
  };

  // Reset lock on session change
  useEffect(() => {
    if (!board.activeSession) setTeacherLocked(false);
  }, [board.activeSession?.id]);

  // Active session view
  if (board.activeSession && board.activeSession.status === "active") {
    return (
      <Card className="border-primary/30">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Session with {board.activeSession.studentName}</span>
              <span className="text-xs text-muted-foreground">· {board.activeSession.subjectName}</span>
              {webrtc.connected && <span className="text-xs text-green-500">🔊 Voice Connected</span>}
              {webrtc.connecting && <span className="text-xs text-yellow-500">Connecting...</span>}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={webrtc.toggleMute} title={webrtc.muted ? "Unmute" : "Mute"}>
                {webrtc.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={toggleLock} title={teacherLocked ? "Unlock student" : "Lock student"}>
                {teacherLocked ? <Lock className="h-4 w-4 text-destructive" /> : <Unlock className="h-4 w-4" />}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleEndSession}>
                <PhoneOff className="h-4 w-4 mr-1" /> End Session
              </Button>
            </div>
          </div>

          {board.activeSession.doubtText && (
            <div className="p-2 rounded bg-muted text-sm">
              <strong>Doubt:</strong> {board.activeSession.doubtText}
            </div>
          )}

          {board.activeSession.mode === "whiteboard" ? (
            <div className="border rounded-lg overflow-hidden" style={{ height: "60vh" }}>
              <DigitalWhiteboard
                ref={whiteboardRef}
                sessionId={board.activeSession.id}
                userId={`teacher-${teacher.staffId}`}
              />
            </div>
          ) : (
            <div style={{ height: "60vh" }}>
              <CCompilerEditor
                initialCode={board.activeSession.codeContent || undefined}
                onCodeChange={(code) => {
                  if (board.activeSession) board.updateCodeContent(board.activeSession.id, code);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Incoming requests
  if (incomingRequests.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-display font-semibold text-base flex items-center gap-2">
        <Bell className="h-5 w-5 text-accent animate-pulse" />
        Incoming Board Requests ({incomingRequests.length})
      </h3>
      {incomingRequests.map((req) => (
        <Card key={req.id} className="border-accent/50 animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium text-sm">{req.studentName}</p>
                <p className="text-xs text-muted-foreground">
                  {req.studentDepartment} · Year {req.studentYear} · {req.mode === "whiteboard" ? "Writing Board" : "C Compiler"}
                </p>
                {req.doubtText && (
                  <p className="text-xs mt-1 text-muted-foreground italic">"{req.doubtText}"</p>
                )}
                {(req as any).question_image_url && (
                  <div className="mt-1">
                    <img src={(req as any).question_image_url} alt="Question" className="max-h-20 rounded border" />
                  </div>
                )}
              </div>
              <Button size="sm" onClick={() => handleAccept(req)} disabled={accepting === req.id}>
                {accepting === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Accept
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DigitalBoardTeacher;
