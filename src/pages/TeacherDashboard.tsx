import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSupabaseData, type TeacherAccount } from "@/hooks/useSupabaseData";
import { useTeacherNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap, LogOut, MessageCircle, Send, CheckCircle2, Clock, Loader2, ArrowLeft, RefreshCw, ImagePlus, X, Download, Pencil, Trash2
} from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import DigitalBoardTeacher from "@/components/DigitalBoardTeacher";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const store = useSupabaseData();

  const teacher: TeacherAccount | null = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("teacher-auth") || "null");
    } catch { return null; }
  })();

  useTeacherNotifications(teacher?.subjectName, teacher?.staffId);

  // Auto-claim doubt from notification link
  const notifDoubtId = searchParams.get("doubtId");
  useEffect(() => {
    if (notifDoubtId && teacher && !store.loading) {
      const doubt = store.doubts.find((d) => d.id === notifDoubtId);
      if (doubt && !doubt.claimedBy) {
        store.claimDoubt(notifDoubtId, teacher.staffId);
      }
    }
  }, [notifDoubtId, store.loading]);

  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyImages, setReplyImages] = useState<Record<string, File>>({});
  const [replyImagePreviews, setReplyImagePreviews] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [claimAlert, setClaimAlert] = useState<{ show: boolean; teacherName: string }>({ show: false, teacherName: "" });
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editAnswerText, setEditAnswerText] = useState("");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!teacher) {
    navigate("/teacher/login");
    return null;
  }

  const handleLogout = () => {
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
    // Re-fetch to get latest state and check if already claimed
    await store.refetch();
    const freshDoubts = store.doubts;
    const doubt = freshDoubts.find((d) => d.id === doubtId);
    if (doubt?.claimedBy && doubt.claimedBy !== teacher.staffId) {
      const claimerTeacher = store.teachers.find((t) => t.staffId === doubt.claimedBy);
      setClaimAlert({ show: true, teacherName: claimerTeacher?.name || doubt.claimedBy });
      return;
    }
    await store.claimDoubt(doubtId, teacher.staffId);
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
        <DigitalBoardTeacher teacher={teacher} />
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
                      <div className="mb-3">
                        <img src={d.questionImageUrl} alt="Student attachment" className="max-h-48 rounded border" />
                        <a href={d.questionImageUrl} download className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                          <Download className="h-3 w-3" /> Download Image
                        </a>
                      </div>
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
                    <div className="mt-2">
                      <img src={d.questionImageUrl} alt="Student attachment" className="max-h-40 rounded border" />
                      <a href={d.questionImageUrl} download className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                        <Download className="h-3 w-3" /> Download Image
                      </a>
                    </div>
                  )}
                  <div className="mt-2 p-3 rounded bg-success/10 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-muted-foreground flex-1">Your answer:</p>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditingAnswerId(d.id); setEditAnswerText(d.answer || ""); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={async () => { if (confirm("Delete your answer? The doubt will return to pending.")) await store.deleteDoubtAnswer(d.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {editingAnswerId === d.id ? (
                      <div className="space-y-2">
                        <Textarea value={editAnswerText} onChange={(e) => setEditAnswerText(e.target.value)} rows={3} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={async () => { await store.updateDoubtAnswer(d.id, { answer: editAnswerText }); setEditingAnswerId(null); }}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingAnswerId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <p>{d.answer}</p>
                    )}
                    {d.answerImageUrl && (
                      <div className="mt-2">
                        <img src={d.answerImageUrl} alt="Answer attachment" className="max-h-40 rounded border" />
                      </div>
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
    </div>
  );
};

export default TeacherDashboard;
