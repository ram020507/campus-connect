import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Phone, PhoneOff, Loader2, Monitor, Mic, MicOff, Upload, X, Image as ImageIcon,
} from "lucide-react";
import DigitalWhiteboard, { type WhiteboardRef } from "@/components/DigitalWhiteboard";
import { useDigitalBoard } from "@/hooks/useDigitalBoard";
import { useWebRTC } from "@/hooks/useWebRTC";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

type Step = "setup" | "duplicate-found" | "calling" | "session";

const DigitalBoardStudent = ({ student, subjects, onBack }: DigitalBoardStudentProps) => {
  const board = useDigitalBoard();
  const whiteboardRef = useRef<WhiteboardRef>(null);
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("setup");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [doubtInput, setDoubtInput] = useState("");
  const [callRequestId, setCallRequestId] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [duplicateAnswer, setDuplicateAnswer] = useState<{ question: string; answer: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // WebRTC voice
  const webrtc = useWebRTC({
    sessionId: board.activeSession?.id || "none",
    userId: `student-${student.registrationNumber}`,
  });

  // Listen for call request being accepted
  useEffect(() => {
    if (!callRequestId) return;
    const channel = supabase
      .channel(`call-req-${callRequestId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "call_requests", filter: `id=eq.${callRequestId}` },
        async (payload) => {
          const updated = payload.new as any;
          if (updated.status === "accepted" && updated.session_id) {
            await board.fetchSession(updated.session_id);
            setStep("session");
            // Start WebRTC voice (teacher is initiator)
            setTimeout(() => webrtc.startCall(false), 500);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [callRequestId]);

  // Check if session ended
  useEffect(() => {
    if (board.activeSession?.status === "completed") {
      webrtc.cleanup();
      setStep("setup");
      setCallRequestId(null);
      board.setActiveSession(null);
    }
  }, [board.activeSession?.status]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid format", description: "Only JPG, PNG, JPEG allowed", variant: "destructive" });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Duplicate detection
  const checkDuplicate = async (): Promise<boolean> => {
    if (!doubtInput.trim() || !selectedSubject) return false;
    const { data } = await supabase
      .from("doubts")
      .select("question, answer")
      .eq("subject_name", selectedSubject)
      .eq("student_department", student.department)
      .eq("student_year", student.year)
      .not("answer", "is", null)
      .limit(50);
    if (!data || data.length === 0) return false;

    const inputLower = doubtInput.toLowerCase().trim();
    const inputWords = new Set(inputLower.split(/\s+/).filter((w) => w.length > 2));

    for (const d of data) {
      const qLower = d.question.toLowerCase().trim();
      const qWords = new Set(qLower.split(/\s+/).filter((w: string) => w.length > 2));
      if (qWords.size === 0 || inputWords.size === 0) continue;
      const union = new Set([...inputWords, ...qWords]);
      const intersection = [...inputWords].filter((w) => qWords.has(w));
      const similarity = intersection.length / union.size;
      if (similarity > 0.7) {
        setDuplicateAnswer({ question: d.question, answer: d.answer! });
        return true;
      }
    }
    return false;
  };

  const handleCall = async () => {
    if (!selectedSubject) return;
    setCalling(true);
    try {
      // Check for duplicates first
      const isDup = await checkDuplicate();
      if (isDup) {
        setStep("duplicate-found");
        setCalling(false);
        return;
      }

      // Upload image if present
      let imageUrl: string | null = null;
      if (imageFile) {
        setUploadingImage(true);
        const ext = imageFile.name.split(".").pop();
        const path = `board-questions/${Date.now()}-${student.registrationNumber}.${ext}`;
        const { error } = await supabase.storage.from("doubt-images").upload(path, imageFile);
        if (!error) {
          const { data: urlData } = supabase.storage.from("doubt-images").getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
        setUploadingImage(false);
      }

      const req = await board.createCallRequest({
        studentRegNo: student.registrationNumber,
        studentName: student.name,
        studentCollege: student.collegeName,
        studentDepartment: student.department,
        studentYear: student.year,
        subjectName: selectedSubject,
        mode,
        doubtText: doubtInput || undefined,
        questionImageUrl: imageUrl || undefined,
      });
      setCallRequestId(req.id);
      setStep("calling");
    } catch (err) {
      console.error("Failed to create call:", err);
      toast({ title: "Error", description: "Failed to start call", variant: "destructive" });
    } finally {
      setCalling(false);
    }
  };

  const handleCancel = async () => {
    if (callRequestId) await board.cancelCallRequest(callRequestId);
    setCallRequestId(null);
    setStep("setup");
  };

  const handleEndSession = async () => {
    webrtc.endCall();
    if (board.activeSession) {
      await board.endSession(board.activeSession.id);
    }
    setStep("setup");
    setCallRequestId(null);
  };

  // Setup view
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
          <CardHeader><CardTitle className="text-base">Start a Session</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
            <div>
              <label className="text-sm font-medium mb-1 block">Upload Image (optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                className="hidden"
                onChange={handleImageSelect}
              />
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="max-h-40 rounded border" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Upload Image
                </Button>
              )}
            </div>
            <Button className="w-full" onClick={handleCall} disabled={!selectedSubject || calling || uploadingImage}>

              {calling ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Phone className="h-4 w-4 mr-1" />}
              Call Teacher
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Duplicate found view
  if (step === "duplicate-found" && duplicateAnswer) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setStep("setup"); setDuplicateAnswer(null); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="font-display font-semibold text-lg">Similar Question Found</h2>
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Previous Question:</p>
              <p className="text-sm">{duplicateAnswer.question}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Answer:</p>
              <p className="text-sm bg-muted p-2 rounded">{duplicateAnswer.answer}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep("setup"); setDuplicateAnswer(null); }}>
                Ask Anyway
              </Button>
              <Button onClick={() => { setStep("setup"); setDuplicateAnswer(null); setDoubtInput(""); }}>
                Got It
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calling view
  if (step === "calling") {
    return (
      <div className="space-y-4 animate-fade-in flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h3 className="font-display font-semibold text-lg">Ringing {selectedSubject} teachers...</h3>
          <p className="text-sm text-muted-foreground">Waiting for an available teacher to accept</p>
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

  const isLocked = board.activeSession.teacherLocked || false;

  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Session with {board.activeSession.teacherName}</span>
          <span className="text-xs text-muted-foreground">· {board.activeSession.subjectName}</span>
          {webrtc.connected && <span className="text-xs text-green-500">🔊 Voice Connected</span>}
          {webrtc.connecting && <span className="text-xs text-yellow-500">Connecting voice...</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={webrtc.toggleMute}>
            {webrtc.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleEndSession}>
            <PhoneOff className="h-4 w-4 mr-1" /> End
          </Button>
        </div>
      </div>

      {/* Question panel */}
      {(board.activeSession.doubtText || board.activeSession.questionImageUrl) && (
        <div className="p-3 rounded bg-muted text-sm space-y-2">
          <p className="text-xs font-semibold text-primary">{student.name}</p>
          {board.activeSession.doubtText && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Question:</p>
              <p>{board.activeSession.doubtText}</p>
            </div>
          )}
          {board.activeSession.questionImageUrl && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Attachment:</p>
              <img src={board.activeSession.questionImageUrl} alt="Question" className="max-h-32 rounded border" />
            </div>
          )}
        </div>
      )}

      {board.activeSession.mode === "whiteboard" ? (
        <div className="border rounded-lg overflow-hidden" style={{ height: "calc(100vh - 240px)" }}>
          <DigitalWhiteboard
            ref={whiteboardRef}
            sessionId={board.activeSession.id}
            userId={`student-${student.registrationNumber}`}
            disabled={isLocked}
          />
        </div>
      ) : (
        <div style={{ height: "calc(100vh - 240px)" }}>
          <CCompilerEditor
            initialCode={board.activeSession.codeContent || undefined}
            onCodeChange={(code) => {
              if (board.activeSession) board.updateCodeContent(board.activeSession.id, code);
            }}
            readOnly={isLocked}
          />
        </div>
      )}
    </div>
  );
};

export default DigitalBoardStudent;
