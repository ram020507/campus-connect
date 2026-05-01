import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Phone, PhoneOff, Loader2, Monitor, X,
} from "lucide-react";
import DigitalWhiteboard, { type WhiteboardRef, type Stroke } from "@/components/DigitalWhiteboard";
import CCompilerEditor from "@/components/CCompilerEditor";
import { useDigitalBoard, type BoardSession } from "@/hooks/useDigitalBoard";
import { supabase } from "@/integrations/supabase/client";

interface DigitalBoardStudentProps {
  student: {
    registrationNumber: string;
    name: string;
    collegeName: string;
    department: string;
    year: number;
  };
  subjects: string[];
  onBack: () => void;
}

type Step = "setup" | "calling" | "session";

const DigitalBoardStudent = ({ student, subjects, onBack }: DigitalBoardStudentProps) => {
  const board = useDigitalBoard();
  const whiteboardRef = useRef<WhiteboardRef>(null);
  const [step, setStep] = useState<Step>("setup");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [mode, setMode] = useState<"whiteboard" | "compiler">("whiteboard");
  const [doubtInput, setDoubtInput] = useState("");
  const [callRequestId, setCallRequestId] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for call request being accepted
  useEffect(() => {
    if (!callRequestId) return;

    const channel = supabase
      .channel(`call-req-${callRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_requests",
          filter: `id=eq.${callRequestId}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          if (updated.status === "accepted" && updated.session_id) {
            await board.fetchSession(updated.session_id);
            setStep("session");
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [callRequestId]);

  const handleCall = async () => {
    if (!selectedSubject) return;
    setCalling(true);
    try {
      const req = await board.createCallRequest({
        studentRegNo: student.registrationNumber,
        studentName: student.name,
        studentCollege: student.collegeName,
        studentDepartment: student.department,
        studentYear: student.year,
        subjectName: selectedSubject,
        mode,
        doubtText: doubtInput || undefined,
      });
      setCallRequestId(req.id);
      setStep("calling");
    } catch (err) {
      console.error("Failed to create call:", err);
    } finally {
      setCalling(false);
    }
  };

  const handleCancel = async () => {
    if (callRequestId) {
      await board.cancelCallRequest(callRequestId);
    }
    setCallRequestId(null);
    setStep("setup");
  };

  const handleEndSession = async () => {
    if (board.activeSession) {
      await board.endSession(board.activeSession.id);
    }
    setStep("setup");
    setCallRequestId(null);
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

  // Sync incoming canvas data from teacher
  useEffect(() => {
    if (board.activeSession && whiteboardRef.current) {
      const currentStrokes = whiteboardRef.current.getStrokes();
      const remoteStrokes = board.activeSession.canvasData || [];
      if (JSON.stringify(currentStrokes) !== JSON.stringify(remoteStrokes)) {
        whiteboardRef.current.setStrokes(remoteStrokes);
      }
    }
  }, [board.activeSession?.canvasData]);

  // Check if session ended
  useEffect(() => {
    if (board.activeSession?.status === "completed") {
      setStep("setup");
      setCallRequestId(null);
      board.setActiveSession(null);
    }
  }, [board.activeSession?.status]);

  if (step === "setup") {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="font-display font-semibold text-lg">Digital Board</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Start a Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Mode</label>
              <Select value={mode} onValueChange={(v) => setMode(v as "whiteboard" | "compiler")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whiteboard">Free Writing Board</SelectItem>
                  <SelectItem value="compiler">C Compiler</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Your Doubt (optional)</label>
              <Textarea
                placeholder="Describe your doubt..."
                value={doubtInput}
                onChange={(e) => setDoubtInput(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleCall}
              disabled={!selectedSubject || calling}
            >
              {calling ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Phone className="h-4 w-4 mr-1" />
              )}
              Call Teacher
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "calling") {
    return (
      <div className="space-y-4 animate-fade-in flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h3 className="font-display font-semibold text-lg">Calling {selectedSubject} teachers...</h3>
          <p className="text-sm text-muted-foreground">
            Waiting for an available teacher to accept your request
          </p>
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <Button variant="destructive" onClick={handleCancel}>
            <PhoneOff className="h-4 w-4 mr-1" /> Cancel Call
          </Button>
        </div>
      </div>
    );
  }

  // Session view
  if (!board.activeSession) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">
            Session with {board.activeSession.teacherName}
          </span>
          <span className="text-xs text-muted-foreground">
            · {board.activeSession.subjectName}
          </span>
        </div>
        <Button variant="destructive" size="sm" onClick={handleEndSession}>
          <PhoneOff className="h-4 w-4 mr-1" /> End
        </Button>
      </div>

      {board.activeSession.doubtText && (
        <div className="p-2 rounded bg-muted text-sm">
          <strong>Doubt:</strong> {board.activeSession.doubtText}
        </div>
      )}

      {board.activeSession.mode === "whiteboard" ? (
        <div className="border rounded-lg overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
          <DigitalWhiteboard
            ref={whiteboardRef}
            onStrokesChange={handleStrokesChange}
          />
        </div>
      ) : (
        <div style={{ height: "calc(100vh - 220px)" }}>
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
    </div>
  );
};

export default DigitalBoardStudent;
