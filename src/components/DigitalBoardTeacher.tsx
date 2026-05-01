import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone, PhoneOff, Loader2, Monitor, Check, X, Bell,
} from "lucide-react";
import DigitalWhiteboard, { type WhiteboardRef, type Stroke } from "@/components/DigitalWhiteboard";
import CCompilerEditor from "@/components/CCompilerEditor";
import { useDigitalBoard, type CallRequest } from "@/hooks/useDigitalBoard";

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
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set teacher online when component mounts
  useEffect(() => {
    board.setTeacherOnline(teacher.staffId, teacher.name, teacher.collegeName, teacher.subjectName);
    return () => {
      board.setTeacherOffline(teacher.staffId);
    };
  }, [teacher.staffId]);

  // Filter requests for this teacher's subject and college
  const incomingRequests = board.callRequests.filter(
    (r) =>
      r.subjectName.toLowerCase() === teacher.subjectName.toLowerCase() &&
      r.status === "pending"
  );

  const handleAccept = async (request: CallRequest) => {
    setAccepting(request.id);
    try {
      const session = await board.acceptCallRequest(
        request.id,
        teacher.staffId,
        teacher.name
      );
      await board.fetchSession(session.id);
    } catch (err: any) {
      console.error("Failed to accept:", err);
      alert(err.message || "Failed to accept call");
    } finally {
      setAccepting(null);
    }
  };

  const handleEndSession = async () => {
    if (board.activeSession) {
      await board.endSession(board.activeSession.id, teacher.staffId);
    }
  };

  const handleStrokesChange = useCallback(
    (strokes: Stroke[]) => {
      if (!board.activeSession) return;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        board.updateCanvasData(board.activeSession!.id, strokes);
      }, 300);
    },
    [board.activeSession]
  );

  // Sync incoming canvas data from student
  useEffect(() => {
    if (board.activeSession && whiteboardRef.current) {
      const currentStrokes = whiteboardRef.current.getStrokes();
      const remoteStrokes = board.activeSession.canvasData || [];
      if (JSON.stringify(currentStrokes) !== JSON.stringify(remoteStrokes)) {
        whiteboardRef.current.setStrokes(remoteStrokes);
      }
    }
  }, [board.activeSession?.canvasData]);

  // Active session view
  if (board.activeSession && board.activeSession.status === "active") {
    return (
      <Card className="border-primary/30">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">
                Session with {board.activeSession.studentName}
              </span>
              <span className="text-xs text-muted-foreground">
                · {board.activeSession.subjectName}
              </span>
            </div>
            <Button variant="destructive" size="sm" onClick={handleEndSession}>
              <PhoneOff className="h-4 w-4 mr-1" /> End Session
            </Button>
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
                onStrokesChange={handleStrokesChange}
              />
            </div>
          ) : (
            <div style={{ height: "60vh" }}>
              <CCompilerEditor
                initialCode={board.activeSession.codeContent || undefined}
                onCodeChange={(code) => {
                  if (board.activeSession) {
                    board.updateCodeContent(board.activeSession.id, code);
                  }
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
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{req.studentName}</p>
                <p className="text-xs text-muted-foreground">
                  {req.studentDepartment} · Year {req.studentYear} · {req.mode === "whiteboard" ? "Writing Board" : "C Compiler"}
                </p>
                {req.doubtText && (
                  <p className="text-xs mt-1 text-muted-foreground italic">"{req.doubtText}"</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(req)}
                  disabled={accepting === req.id}
                >
                  {accepting === req.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Accept
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DigitalBoardTeacher;
