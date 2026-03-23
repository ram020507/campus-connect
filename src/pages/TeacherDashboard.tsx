import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseData, type TeacherAccount } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap, LogOut, MessageCircle, Send, CheckCircle2, Clock, Loader2, ArrowLeft, RefreshCw, ImagePlus, X
} from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction,
} from "@/components/ui/alert-dialog";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const store = useSupabaseData();

  const teacher: TeacherAccount | null = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("teacher-auth") || "null");
    } catch { return null; }
  })();

  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyImages, setReplyImages] = useState<Record<string, File>>({});
  const [replyImagePreviews, setReplyImagePreviews] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [claimAlert, setClaimAlert] = useState<{ show: boolean; teacherName: string }>({ show: false, teacherName: "" });
  const [realtimeAlert, setRealtimeAlert] = useState<{ show: boolean; teacherName: string; question: string }>({ show: false, teacherName: "", question: "" });
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!teacher) {
    navigate("/teacher/login");
    return null;
  }

  // Realtime: listen for doubts changing to "in_progress" by another teacher
  useEffect(() => {
    if (!teacher) return;
    const channel = supabase
      .channel("doubt-status-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "doubts" },
        (payload: any) => {
          const newRow = payload.new;
          if (
            newRow.status === "in_progress" &&
            newRow.handling_teacher &&
            newRow.handling_teacher !== teacher.name &&
            newRow.subject_name?.toLowerCase() === teacher.subjectName.toLowerCase()
          ) {
            setRealtimeAlert({
              show: true,
              teacherName: newRow.handling_teacher,
              question: newRow.question?.substring(0, 80) || "a doubt",
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [teacher]);


    sessionStorage.removeItem("teacher-auth");
    navigate("/");
  };

  const pendingDoubts = store.doubts.filter(
    (d) =>
      d.subjectName.toLowerCase() === teacher.subjectName.toLowerCase() &&
      !d.answer &&
      (!d.claimedBy || d.claimedBy === teacher.staffId)
  );

  const answeredDoubts = store.doubts.filter(
    (d) => d.answeredBy === teacher.name && d.answer
  );

  const handleClaim = async (doubtId: string) => {
    await store.refetch();
    const doubt = store.doubts.find((d) => d.id === doubtId);
    if (doubt?.claimedBy && doubt.claimedBy !== teacher.staffId) {
      const claimerTeacher = store.teachers.find((t) => t.staffId === doubt.claimedBy);
      setClaimAlert({ show: true, teacherName: claimerTeacher?.name || doubt.claimedBy });
      return;
    }
    store.claimDoubt(doubtId, teacher.staffId, teacher.name);
  };

  const handleReplyImageSelect = (doubtId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReplyImages((prev) => ({ ...prev, [doubtId]: file }));
      setReplyImagePreviews((prev) => ({ ...prev, [doubtId]: URL.createObjectURL(file) }));
    }
  };

  const clearReplyImage = (doubtId: string) => {
    setReplyImages((prev) => { const n = { ...prev }; delete n[doubtId]; return n; });
    setReplyImagePreviews((prev) => { const n = { ...prev }; delete n[doubtId]; return n; });
  };

  const handleReply = async (doubtId: string) => {
    const text = replyTexts[doubtId]?.trim();
    if (text) {
      setSending((prev) => ({ ...prev, [doubtId]: true }));
      let imageUrl: string | undefined;
      if (replyImages[doubtId]) {
        const url = await store.uploadDoubtImage(replyImages[doubtId]);
        if (url) imageUrl = url;
      }
      await store.answerDoubt(doubtId, text, teacher.name, imageUrl);
      setReplyTexts((prev) => ({ ...prev, [doubtId]: "" }));
      clearReplyImage(doubtId);
      setSending((prev) => ({ ...prev, [doubtId]: false }));
    }
  };

  if (store.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-accent" />
          <div>
            <h1 className="text-lg font-bold font-display text-foreground">Teacher Portal</h1>
            <p className="text-xs text-muted-foreground">{teacher.name} · {teacher.subjectName} · {teacher.collegeName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div>
          <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-accent" />
            Pending Doubts ({pendingDoubts.length})
          </h2>
          {pendingDoubts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No pending doubts. Great job!
              </CardContent>
            </Card>
          ) : (
            pendingDoubts
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((d) => (
                <Card key={d.id} className="mb-3 border-accent/30 animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="h-4 w-4 text-accent" />
                      <span className="text-xs text-muted-foreground">
                        From {d.studentName} · {d.studentDepartment} · Year {d.studentYear}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-3">{d.question}</p>
                    {d.questionImageUrl && (
                      <img src={d.questionImageUrl} alt="Student attachment" className="mb-3 max-h-48 rounded border" />
                    )}
                    {!d.claimedBy ? (
                      <Button size="sm" variant="outline" onClick={() => handleClaim(d.id)}>
                        Open & Claim
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Type your reply..."
                          value={replyTexts[d.id] || ""}
                          onChange={(e) => setReplyTexts((prev) => ({ ...prev, [d.id]: e.target.value }))}
                          rows={3}
                        />
                        {/* Reply image */}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[d.id] = el; }}
                          onChange={(e) => handleReplyImageSelect(d.id, e)}
                        />
                        {replyImagePreviews[d.id] ? (
                          <div className="relative inline-block">
                            <img src={replyImagePreviews[d.id]} alt="Reply attachment" className="max-h-32 rounded border" />
                            <button onClick={() => clearReplyImage(d.id)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => fileInputRefs.current[d.id]?.click()}>
                            <ImagePlus className="h-4 w-4 mr-1" /> Attach Photo
                          </Button>
                        )}
                        <div>
                          <Button size="sm" onClick={() => handleReply(d.id)} disabled={!replyTexts[d.id]?.trim() || sending[d.id]}>
                            {sending[d.id] ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send Reply
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </div>

        <div>
          <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Answered ({answeredDoubts.length})
          </h2>
          {answeredDoubts
            .sort((a, b) => new Date(b.answeredAt!).getTime() - new Date(a.answeredAt!).getTime())
            .map((d) => (
              <Card key={d.id} className="mb-3 border-success/30">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Q from {d.studentName} · {d.studentDepartment} · Year {d.studentYear}
                  </p>
                  <p className="text-sm font-medium">{d.question}</p>
                  {d.questionImageUrl && (
                    <img src={d.questionImageUrl} alt="Student attachment" className="mt-2 max-h-40 rounded border" />
                  )}
                  <div className="mt-2 p-3 rounded bg-success/10 text-sm">
                    <p>{d.answer}</p>
                    {d.answerImageUrl && (
                      <img src={d.answerImageUrl} alt="Answer attachment" className="mt-2 max-h-40 rounded border" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Claim conflict dialog */}
      <AlertDialog open={claimAlert.show} onOpenChange={(open) => !open && setClaimAlert({ show: false, teacherName: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Doubt Already Claimed</AlertDialogTitle>
            <AlertDialogDescription>
              This doubt is being solved by <strong>{claimAlert.teacherName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setClaimAlert({ show: false, teacherName: "" })}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Realtime notification dialog */}
      <AlertDialog open={realtimeAlert.show} onOpenChange={(open) => !open && setRealtimeAlert({ show: false, teacherName: "", question: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Doubt Being Handled</AlertDialogTitle>
            <AlertDialogDescription>
              This doubt is being handled by <strong>{realtimeAlert.teacherName}</strong>:
              <br />
              <em className="text-xs">"{realtimeAlert.question}"</em>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setRealtimeAlert({ show: false, teacherName: "", question: "" })}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeacherDashboard;
