import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSupabaseData, type TeacherAccount, getTeacherSubjects, teacherHandlesSubject } from "@/hooks/useSupabaseData";
import { useTeacherNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap, LogOut, MessageCircle, Send, CheckCircle2, Clock, Loader2, ArrowLeft, RefreshCw, ImagePlus, X, Download, Pencil, Lock, Eye, FolderOpen, ChevronDown, ChevronRight
} from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import DigitalBoardTeacher from "@/components/DigitalBoardTeacher";
import { verifySession, clearSession } from "@/lib/authGuard";
import { supabase } from "@/integrations/supabase/client";

type Section = "unclaimed" | "claimed" | "all";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const store = useSupabaseData();

  const teacher: TeacherAccount | null = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("teacher-auth") || "null");
    } catch { return null; }
  })();

  const teacherSubjects = teacher ? getTeacherSubjects(teacher) : [];
  useTeacherNotifications(teacherSubjects, teacher?.staffId);

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

  const [activeSection, setActiveSection] = useState<Section>("unclaimed");
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyImages, setReplyImages] = useState<Record<string, File[]>>({});
  const [replyImagePreviews, setReplyImagePreviews] = useState<Record<string, string[]>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [followupReply, setFollowupReply] = useState<Record<string, { text: string; images: File[]; previews: string[] }>>({});
  const [followupSending, setFollowupSending] = useState<Record<string, boolean>>({});

  const [claimAlert, setClaimAlert] = useState<{ show: boolean; teacherName: string }>({ show: false, teacherName: "" });
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editAnswerText, setEditAnswerText] = useState("");
  const [editAnswerImages, setEditAnswerImages] = useState<string[]>([]);
  const editAnswerFileRef = useRef<HTMLInputElement | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  // Availability (IN/OUT) — gates new doubt requests and board calls
  const [availability, setAvailability] = useState<"in" | "out">("out");

  useEffect(() => {
    if (!teacher) return;
    (async () => {
      const { data } = await supabase
        .from("teacher_status")
        .select("availability")
        .eq("staff_id", teacher.staffId)
        .maybeSingle();
      if (data && (data as any).availability === "in") setAvailability("in");
    })();
  }, [teacher?.staffId]);

  const toggleAvailability = async () => {
    if (!teacher) return;
    const next = availability === "in" ? "out" : "in";
    setAvailability(next);
    await supabase
      .from("teacher_status")
      .update({ availability: next, updated_at: new Date().toISOString() } as any)
      .eq("staff_id", teacher.staffId);
    await store.runAssignment();
    await store.refetch();
  };

  // Ticker for the 10-second response countdown
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Continuous routing pass: expires ignored offers, assigns waiting doubts
  // and rebalances claimed-but-not-started doubts by workload.
  useEffect(() => {
    if (!teacher) return;
    let cancelled = false;
    const run = async () => {
      await store.runAssignment();
      if (!cancelled) await store.refetch();
    };
    run();
    const id = setInterval(run, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [teacher?.staffId, availability]);

  const secondsLeft = (assignedAt?: string) => {
    if (!assignedAt) return null;
    const left = 10 - Math.floor((nowTs - new Date(assignedAt).getTime()) / 1000);
    return left > 0 ? left : 0;
  };

  if (!teacher) {
    navigate("/teacher/login");
    return null;
  }

  const handleLogout = () => {
    clearSession("teacher");
    navigate("/");
  };

  // Section 1: Claim & Solve — requests for my subjects (only when IN).
  // Includes: doubts the system assigned to me (10-second response window),
  // doubts directed to me by a follow-up, and Learning-Feed clarifications.
  const unclaimedDoubts = availability === "in" ? store.doubts.filter(
    (d) => {
      if (!teacherSubjects.some(s => s.toLowerCase() === d.subjectName.toLowerCase())) return false;
      if (d.claimedBy) return false;
      const directedToMe = !d.handlingTeacher || d.handlingTeacher === teacher.name;
      if (d.status === "clarification_requested" && directedToMe) return true; // feed clarification
      if (d.answer) return false;
      if (d.status === "assigned") return d.assignedTeacherId === teacher.staffId; // routed to me
      if (d.handlingTeacher === teacher.name) return true;                     // directed follow-up
      return false;
    }
  ) : [];

  // Claimed but not started — still reassignable until "Start Solving"
  const claimedNotStarted = store.doubts.filter(
    (d) => d.claimedBy === teacher.staffId && d.status === "claimed" && !d.answer
  );

  // In-progress: locked to me (started, answered or clarification), until understood
  const inProgressDoubts = store.doubts.filter(
    (d) =>
      (d.claimedBy === teacher.staffId || d.answeredBy === teacher.name) &&
      d.status !== "understood" &&
      d.status !== "claimed" &&
      d.status !== "assigned"
  );

  // Section 2: My Solutions — doubts I answered AND student marked understood
  const claimedDoubts = store.doubts.filter(
    (d) => d.answeredBy === teacher.name && d.status === "understood"
  );

  // Section 3: All Solutions — understood doubts answered by OTHER teachers for my subjects
  const allSolvedDoubts = store.doubts.filter(
    (d) =>
      teacherSubjects.some(s => s.toLowerCase() === d.subjectName.toLowerCase()) &&
      d.answer &&
      d.status === "understood" &&
      d.answeredBy !== teacher.name
  );


  const handleClaim = async (doubtId: string) => {
    await store.refetch();
    const freshDoubts = store.doubts;
    const doubt = freshDoubts.find((d) => d.id === doubtId);
    if (doubt?.claimedBy && doubt.claimedBy !== teacher.staffId) {
      const claimerTeacher = store.teachers.find((t) => t.staffId === doubt.claimedBy);
      setClaimAlert({ show: true, teacherName: claimerTeacher?.name || doubt.claimedBy });
      return;
    }
    if (doubt?.status === "clarification_requested") {
      // Keep the status so the In Progress card shows the clarification reply box
      await store.claimClarification(doubtId, teacher.staffId);
    } else {
      await store.claimDoubt(doubtId, teacher.staffId);
    }
  };

  const handleReplyImageSelect = (doubtId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setReplyImages((prev) => ({ ...prev, [doubtId]: [...(prev[doubtId] || []), ...files] }));
    setReplyImagePreviews((prev) => ({
      ...prev,
      [doubtId]: [...(prev[doubtId] || []), ...files.map((f) => URL.createObjectURL(f))],
    }));
  };

  const removeReplyImage = (doubtId: string, index: number) => {
    setReplyImages((prev) => {
      const arr = [...(prev[doubtId] || [])];
      arr.splice(index, 1);
      return { ...prev, [doubtId]: arr };
    });
    setReplyImagePreviews((prev) => {
      const arr = [...(prev[doubtId] || [])];
      arr.splice(index, 1);
      return { ...prev, [doubtId]: arr };
    });
  };

  const clearReplyImages = (doubtId: string) => {
    setReplyImages((prev) => { const n = { ...prev }; delete n[doubtId]; return n; });
    setReplyImagePreviews((prev) => { const n = { ...prev }; delete n[doubtId]; return n; });
  };

  const handleReply = async (doubtId: string) => {
    const text = replyTexts[doubtId]?.trim();
    // Allow text only, image only, or both
    if (!text && (!replyImages[doubtId] || replyImages[doubtId].length === 0)) return;
    setSending((prev) => ({ ...prev, [doubtId]: true }));
    const uploadedUrls: string[] = [];
    for (const file of (replyImages[doubtId] || [])) {
      const url = await store.uploadDoubtImage(file);
      if (url) uploadedUrls.push(url);
    }
    await store.answerDoubt(
      doubtId,
      text || "(Image answer)",
      teacher.name,
      uploadedUrls[0],
      uploadedUrls
    );
    setReplyTexts((prev) => ({ ...prev, [doubtId]: "" }));
    clearReplyImages(doubtId);
    setSending((prev) => ({ ...prev, [doubtId]: false }));
  };

  if (store.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sectionTabs: { key: Section; label: string; count: number; icon: React.ReactNode }[] = [
    { key: "unclaimed", label: "Claim & Solve", count: unclaimedDoubts.length + claimedNotStarted.length + inProgressDoubts.length, icon: <Clock className="h-4 w-4" /> },
    { key: "claimed", label: "My Solutions", count: claimedDoubts.length, icon: <Lock className="h-4 w-4" /> },
    { key: "all", label: "All Solutions", count: allSolvedDoubts.length, icon: <Eye className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-accent" />
          <div>
            <h1 className="text-lg font-bold font-display text-foreground">Teacher Portal</h1>
            <p className="text-xs text-muted-foreground">{teacher.name} · {teacherSubjects.join(", ")} · {teacher.collegeName}</p>
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

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Availability toggle — controls both new doubt requests and board calls */}
        <Card className={availability === "in" ? "border-success/50" : "border-border"}>
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Availability</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${availability === "in" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                {availability === "in" ? "IN — receiving doubts & board calls" : "OUT — requests paused"}
              </span>
            </div>
            <Button
              variant={availability === "in" ? "outline" : "default"}
              size="sm"
              onClick={toggleAvailability}
            >
              {availability === "in" ? "Go OUT" : "Go IN"}
            </Button>
          </CardContent>
        </Card>

        <DigitalBoardTeacher teacher={teacher} availability={availability} />

        {availability === "out" && (
          <Card>
            <CardContent className="p-3 text-xs text-muted-foreground">
              You are OUT. New doubt and board requests are paused — go IN to receive them. Your in-progress and solved doubts remain below.
            </CardContent>
          </Card>
        )}

        {/* Section Tabs */}
        <div className="flex gap-1 border-b overflow-x-auto">
          {sectionTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeSection === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Section 1: Unclaimed Doubts */}
        {activeSection === "unclaimed" && (
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              Claim & Solve
            </h2>
            {unclaimedDoubts.length === 0 && claimedNotStarted.length === 0 && inProgressDoubts.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No pending doubts. Great job!
                </CardContent>
              </Card>
            ) : unclaimedDoubts.length === 0 ? null : (
              unclaimedDoubts
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .map((d) => (
                  <Card key={d.id} className="border-accent/30 animate-fade-in">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageCircle className="h-4 w-4 text-accent" />
                        <span className="text-xs text-muted-foreground">
                          From {d.studentName} · {d.studentCollege} · {d.studentDepartment} · Year {d.studentYear}
                        </span>
                        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded ml-auto">{d.subjectName}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2 text-[11px] text-muted-foreground">
                        <span>{d.questionImageUrl ? "Text + Images" : "Text"}</span>
                        <span>·</span>
                        <span>{new Date(d.createdAt).toLocaleString()}</span>
                        {d.status === "assigned" && secondsLeft(d.assignedAt) !== null && (
                          <span className="ml-auto font-semibold text-accent">
                            Respond in {secondsLeft(d.assignedAt)}s
                          </span>
                        )}
                      </div>
                      {d.status === "clarification_requested" && (() => {
                        const thread = store.followups.filter((f) => f.doubtId === d.id);
                        const lastStudent = [...thread].reverse().find((f) => f.authorRole === "student");
                        return (
                          <div className="mb-3 p-2 rounded bg-accent/10 border border-accent/30 text-xs space-y-1">
                            <p className="font-semibold text-accent">💬 Clarification requested{lastStudent ? ` by ${lastStudent.authorName}` : ""}</p>
                            {d.answer && (
                              <p className="text-muted-foreground">
                                <span className="font-medium">Previous answer ({d.answeredBy}):</span> {d.answer.slice(0, 120)}{d.answer.length > 120 ? "…" : ""}
                              </p>
                            )}
                            {lastStudent?.text && <p><span className="font-medium">Clarification:</span> {lastStudent.text}</p>}
                            {lastStudent?.imageUrls?.map((u, i) => (
                              <img key={i} src={u} alt="clarification" className="max-h-24 rounded border mt-1" />
                            ))}
                          </div>
                        );
                      })()}
                      <p className="text-sm font-medium mb-3">{d.question}</p>
                      {d.questionImageUrl && (
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1">Question Image</p>
                          <img src={d.questionImageUrl} alt="Question" className="max-h-48 rounded border" />
                          <a href={d.questionImageUrl} download className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                            <Download className="h-3 w-3" /> Download Image
                          </a>
                        </div>
                      )}
                      {d.questionImageUrl2 && (
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1">Full Problem Image</p>
                          <img src={d.questionImageUrl2} alt="Full problem" className="max-h-48 rounded border" />
                          <a href={d.questionImageUrl2} download className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                            <Download className="h-3 w-3" /> Download Image
                          </a>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => handleClaim(d.id)}>
                          {d.status === "clarification_requested" ? "Claim & Respond" : "Claim"}
                        </Button>
                        {d.status !== "clarification_requested" && (
                          <Button size="sm" variant="outline" onClick={() => store.passDoubtToOtherTeacher(d.id, teacher.staffId)}>
                            Handle by Other Teacher
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        )}

        {/* Claimed — Not Started (still reassignable by workload) */}
        {activeSection === "unclaimed" && claimedNotStarted.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 mt-6">
              <Clock className="h-5 w-5 text-blue-500" />
              Claimed — Not Started ({claimedNotStarted.length})
            </h2>
            {claimedNotStarted
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((d) => (
                <Card key={d.id} className="border-blue-500/30 animate-fade-in">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground">
                        From {d.studentName} · {d.studentCollege} · {d.studentDepartment} · Year {d.studentYear}
                      </span>
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded ml-auto">{d.subjectName}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {d.questionImageUrl ? "Text + Images" : "Text"} · {new Date(d.createdAt).toLocaleString()}
                    </div>
                    <p className="text-sm font-medium">{d.question}</p>
                    {d.questionImageUrl && <img src={d.questionImageUrl} alt="Question" className="max-h-40 rounded border" />}
                    {d.questionImageUrl2 && <img src={d.questionImageUrl2} alt="Full problem" className="max-h-40 rounded border" />}
                    <p className="text-[11px] text-muted-foreground">
                      Claimed but not started — may be reassigned if a less-loaded teacher becomes available.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => store.startSolving(d.id, teacher.staffId)}>
                        Start Solving
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => store.passDoubtToOtherTeacher(d.id, teacher.staffId)}>
                        Handle by Other Teacher
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* In Progress (still under Claim & Solve tab, until student confirms Understood) */}
        {activeSection === "unclaimed" && inProgressDoubts.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 mt-6">
              <Lock className="h-5 w-5 text-primary" />
              In Progress
            </h2>
            {inProgressDoubts
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((d) => (
                  <Card key={d.id} className="border-primary/30 animate-fade-in">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">
                          From {d.studentName} · {d.studentDepartment} · Year {d.studentYear}
                        </span>
                        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded ml-auto">{d.subjectName}</span>
                      </div>
                      <p className="text-sm font-medium mb-3">{d.question}</p>
                      {d.parentDoubtId && (() => {
                        const parent = store.doubts.find((x) => x.id === d.parentDoubtId);
                        return parent ? (
                          <p className="text-[10px] text-muted-foreground mb-2">
                            🔗 New doubt related to previous: "{parent.question.slice(0, 80)}{parent.question.length > 80 ? "…" : ""}"
                          </p>
                        ) : null;
                      })()}
                      {d.questionImageUrl && (
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1">Question Image</p>
                          <img src={d.questionImageUrl} alt="Question" className="max-h-48 rounded border" />
                          <a href={d.questionImageUrl} download className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                            <Download className="h-3 w-3" /> Download Image
                          </a>
                        </div>
                      )}
                      {d.questionImageUrl2 && (
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1">Full Problem Image</p>
                          <img src={d.questionImageUrl2} alt="Full problem" className="max-h-48 rounded border" />
                          <a href={d.questionImageUrl2} download className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                            <Download className="h-3 w-3" /> Download Image
                          </a>
                        </div>
                      )}
                      {!d.answer ? (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Type your answer..."
                            value={replyTexts[d.id] || ""}
                            onChange={(e) => setReplyTexts((prev) => ({ ...prev, [d.id]: e.target.value }))}
                            rows={3}
                          />
                          {/* Multiple image upload */}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            ref={(el) => { fileInputRefs.current[d.id] = el; }}
                            onChange={(e) => handleReplyImageSelect(d.id, e)}
                          />
                          {(replyImagePreviews[d.id] || []).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {replyImagePreviews[d.id].map((preview, idx) => (
                                <div key={idx} className="relative inline-block">
                                  <img src={preview} alt={`Reply attachment ${idx + 1}`} className="max-h-24 rounded border" />
                                  <button onClick={() => removeReplyImage(d.id, idx)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              <Button variant="outline" size="sm" onClick={() => fileInputRefs.current[d.id]?.click()}>
                                <ImagePlus className="h-4 w-4 mr-1" /> Add More
                              </Button>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => fileInputRefs.current[d.id]?.click()}>
                              <ImagePlus className="h-4 w-4 mr-1" /> Attach Photos
                            </Button>
                          )}
                          <div>
                            <Button
                              size="sm"
                              onClick={() => handleReply(d.id)}
                              disabled={(!replyTexts[d.id]?.trim() && (!replyImages[d.id] || replyImages[d.id].length === 0)) || sending[d.id]}
                            >
                              {sending[d.id] ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Submit Answer
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {editingAnswerId === d.id ? (
                            <div className="space-y-2 p-3 rounded border bg-card">
                              <Textarea value={editAnswerText} onChange={(e) => setEditAnswerText(e.target.value)} rows={3} />
                              {editAnswerImages.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {editAnswerImages.map((url, idx) => (
                                    <div key={idx} className="relative inline-block">
                                      <img src={url} alt={`Answer ${idx + 1}`} className="max-h-24 rounded border" />
                                      <button onClick={() => setEditAnswerImages((prev) => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <input type="file" accept="image/*" multiple className="hidden" ref={editAnswerFileRef} onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                for (const file of files) {
                                  const url = await store.uploadDoubtImage(file);
                                  if (url) setEditAnswerImages((prev) => [...prev, url]);
                                }
                              }} />
                              <Button variant="outline" size="sm" onClick={() => editAnswerFileRef.current?.click()}>
                                <ImagePlus className="h-4 w-4 mr-1" /> Add Images
                              </Button>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={async () => {
                                  await store.updateDoubtAnswer(d.id, { answer: editAnswerText, answerImageUrl: editAnswerImages[0] || null, answerImageUrls: editAnswerImages });
                                  setEditingAnswerId(null);
                                }}>Save</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingAnswerId(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                           <div className="p-3 rounded bg-success/10 text-sm">
                             <p className="text-xs text-muted-foreground mb-1">
                               {d.answeredBy === teacher.name ? "Your Original Answer" : `Original Answer by ${d.answeredBy}`}
                             </p>
                             <p className="whitespace-pre-wrap">{d.answer}</p>
                             {(d.answerImageUrls && d.answerImageUrls.length > 0 ? d.answerImageUrls : d.answerImageUrl ? [d.answerImageUrl] : []).map((u, i) => (
                               <img key={i} src={u} alt="answer" className="max-h-40 rounded border mt-2" />
                             ))}
                             {d.answeredBy === teacher.name && (
                             <div className="mt-2">
                               <Button
                                 variant="outline" size="sm"
                                 disabled={d.viewedByStudent}
                                 title={d.viewedByStudent ? "Student has viewed this — editing locked" : "Edit your solution"}
                                 onClick={() => {
                                   setEditingAnswerId(d.id);
                                   setEditAnswerText(d.answer || "");
                                   setEditAnswerImages(d.answerImageUrls && d.answerImageUrls.length > 0 ? d.answerImageUrls : d.answerImageUrl ? [d.answerImageUrl] : []);
                                 }}
                               >
                                 {d.viewedByStudent ? <Lock className="h-3 w-3 mr-1" /> : <Pencil className="h-3 w-3 mr-1" />}
                                 {d.viewedByStudent ? "Locked — student viewed" : "Edit Solution"}
                               </Button>
                             </div>
                             )}
                           </div>
                          )}
                          {(() => {
                            const thread = store.followups.filter((f) => f.doubtId === d.id);
                            return thread.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground">Discussion</p>
                                {thread.map((f) => (
                                  <div key={f.id} className={`p-2 rounded text-xs ${f.authorRole === "teacher" ? "bg-primary/10" : "bg-accent/10"}`}>
                                    <p className="font-semibold">{f.authorRole === "teacher" ? "👨‍🏫" : "🙋"} {f.authorName}</p>
                                    {f.text && <p className="mt-1 whitespace-pre-wrap">{f.text}</p>}
                                    {f.imageUrls.map((u, i) => (
                                      <img key={i} src={u} alt="attachment" className="max-h-40 rounded border mt-2" />
                                    ))}
                                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(f.createdAt).toLocaleString()}</p>
                                  </div>
                                ))}
                              </div>
                            ) : null;
                          })()}
                          {d.status === "clarification_requested" && (
                          <div className="space-y-2 border-t pt-2">
                            <p className="text-xs font-semibold text-accent">💬 Student requested clarification — send additional explanation:</p>
                            <Textarea
                              placeholder="Additional explanation..."
                              rows={3}
                              value={followupReply[d.id]?.text || ""}
                              onChange={(e) => setFollowupReply((p) => ({ ...p, [d.id]: { text: e.target.value, images: p[d.id]?.images || [], previews: p[d.id]?.previews || [] } }))}
                            />
                            <div className="flex flex-wrap gap-2">
                              {(followupReply[d.id]?.previews || []).map((src, i) => (
                                <div key={i} className="relative">
                                  <img src={src} alt="preview" className="h-20 w-20 object-cover rounded border" />
                                  <button type="button" onClick={() => setFollowupReply((p) => { const cur = p[d.id]; return { ...p, [d.id]: { ...cur, images: cur.images.filter((_, idx) => idx !== i), previews: cur.previews.filter((_, idx) => idx !== i) } }; })} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              <label className="cursor-pointer flex items-center justify-center h-20 w-20 border-2 border-dashed rounded text-xs text-muted-foreground hover:bg-muted/50">
                                <ImagePlus className="h-4 w-4" />
                                <input
                                  type="file" accept="image/*" multiple className="hidden"
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length === 0) return;
                                    const previews = files.map((f) => URL.createObjectURL(f));
                                    setFollowupReply((p) => {
                                      const cur = p[d.id] || { text: "", images: [], previews: [] };
                                      return { ...p, [d.id]: { ...cur, images: [...cur.images, ...files], previews: [...cur.previews, ...previews] } };
                                    });
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                            <Button
                              size="sm"
                              disabled={followupSending[d.id] || !(followupReply[d.id]?.text?.trim())}
                              onClick={async () => {
                                setFollowupSending((p) => ({ ...p, [d.id]: true }));
                                try {
                                  const cur = followupReply[d.id];
                                  const urls: string[] = [];
                                  for (const f of cur.images) {
                                    const url = await store.uploadDoubtImage(f);
                                    if (url) urls.push(url);
                                  }
                                  await store.addFollowup({
                                    doubtId: d.id,
                                    authorRole: "teacher",
                                    authorName: teacher.name,
                                    text: cur.text,
                                    imageUrls: urls,
                                  });
                                  setFollowupReply((p) => { const n = { ...p }; delete n[d.id]; return n; });
                                } finally {
                                  setFollowupSending((p) => ({ ...p, [d.id]: false }));
                                }
                              }}
                            >
                              {followupSending[d.id] ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send Explanation
                            </Button>
                          </div>
                          )}
                        </div>
                      )}

                    </CardContent>
                  </Card>
                ))}
          </div>
        )}

        {/* Section 2: My Solutions — doubts I answered that student marked Understood */}
        {activeSection === "claimed" && (
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> My Solutions
            </h2>
            {claimedDoubts.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">No completed solutions yet. Student must mark "Understood" for doubts to appear here.</CardContent></Card>
            ) : (
              (() => {
                const grouped = claimedDoubts.reduce<Record<string, typeof claimedDoubts>>((acc, d) => {
                  (acc[d.subjectName] = acc[d.subjectName] || []).push(d);
                  return acc;
                }, {});
                const subjectNames = Object.keys(grouped).sort();
                return subjectNames.map((subject) => {
                  const isOpen = expandedSubjects[subject] ?? true;
                  const items = grouped[subject].sort((a, b) => new Date(b.answeredAt!).getTime() - new Date(a.answeredAt!).getTime());
                  return (
                    <div key={subject} className="space-y-2">
                      <button
                        onClick={() => setExpandedSubjects((prev) => ({ ...prev, [subject]: !isOpen }))}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 hover:bg-muted text-left"
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <FolderOpen className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{subject}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
                      </button>
                      {isOpen && (
                        <div className="space-y-3 pl-4 border-l-2 border-muted">
                          {items.map((d) => (
                            <Card key={d.id} className="border-success/30">
                              <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground mb-1">From {d.studentName} · {d.studentDepartment} · Year {d.studentYear}</p>
                                <p className="text-sm font-medium">{d.question}</p>
                                {d.questionImageUrl && <img src={d.questionImageUrl} alt="Question" className="max-h-40 rounded border mt-2" />}
                                {d.questionImageUrl2 && <img src={d.questionImageUrl2} alt="Full problem" className="max-h-40 rounded border mt-2" />}
                                <div className="mt-2 p-3 rounded bg-success/10 text-sm">
                                  <p className="text-xs text-muted-foreground mb-1">Your Answer</p>
                                  <p className="whitespace-pre-wrap">{d.answer}</p>
                                  {(d.answerImageUrls && d.answerImageUrls.length > 0 ? d.answerImageUrls : d.answerImageUrl ? [d.answerImageUrl] : []).map((u, i) => (
                                    <img key={i} src={u} alt="answer" className="max-h-40 rounded border mt-2" />
                                  ))}
                                </div>
                                {(() => {
                                  const thread = store.followups.filter((f) => f.doubtId === d.id);
                                  if (thread.length === 0) return null;
                                  return (
                                    <div className="mt-3 space-y-2 border-t pt-3">
                                      <p className="text-xs font-semibold text-muted-foreground">Discussion History</p>
                                      {thread.map((f) => (
                                        <div key={f.id} className={`p-2 rounded text-xs ${f.authorRole === "teacher" ? "bg-primary/10" : "bg-accent/10"}`}>
                                          <p className="font-semibold">{f.authorRole === "teacher" ? "👨‍🏫" : "🙋"} {f.authorName}</p>
                                          {f.text && <p className="mt-1 whitespace-pre-wrap">{f.text}</p>}
                                          {f.imageUrls.map((u, i) => <img key={i} src={u} alt="attachment" className="max-h-40 rounded border mt-2" />)}
                                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(f.createdAt).toLocaleString()}</p>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                                <p className="text-[10px] text-muted-foreground mt-2">Solved {d.answeredAt ? new Date(d.answeredAt).toLocaleString() : ""}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            )}
          </div>
        )}

        {/* Section 3: All Doubts (solved) */}
        {activeSection === "all" && (
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              All Solutions
            </h2>
            {allSolvedDoubts.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No solved doubts yet.
                </CardContent>
              </Card>
            ) : (
              (() => {
                const sorted = [...allSolvedDoubts].sort(
                  (a, b) => new Date(b.answeredAt!).getTime() - new Date(a.answeredAt!).getTime()
                );
                const grouped = sorted.reduce<Record<string, typeof sorted>>((acc, d) => {
                  (acc[d.subjectName] = acc[d.subjectName] || []).push(d);
                  return acc;
                }, {});
                const subjectNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
                return subjectNames.map((subject) => {
                  const isOpen = expandedSubjects[subject] ?? true;
                  const doubts = grouped[subject];
                  return (
                    <div key={subject} className="space-y-2">
                      <button
                        onClick={() => setExpandedSubjects((prev) => ({ ...prev, [subject]: !isOpen }))}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 hover:bg-muted text-left"
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <FolderOpen className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{subject}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{doubts.length}</span>
                      </button>
                      {isOpen && (
                        <div className="space-y-3 pl-4 border-l-2 border-muted">
                          {doubts.map((d) => (
                            <Card key={d.id} className="border-success/30">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    Answered by {d.answeredBy} · {d.answeredAt ? new Date(d.answeredAt).toLocaleDateString() : ""}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  Q from {d.studentName} · {d.studentDepartment} · Year {d.studentYear}
                                </p>
                                <p className="text-sm font-medium">{d.question}</p>
                                {d.questionImageUrl && (
                                  <div className="mt-2">
                                    <p className="text-xs text-muted-foreground mb-1">Question Image</p>
                                    <img src={d.questionImageUrl} alt="Question" className="max-h-40 rounded border" />
                                  </div>
                                )}
                                {d.questionImageUrl2 && (
                                  <div className="mt-2">
                                    <p className="text-xs text-muted-foreground mb-1">Full Problem Image</p>
                                    <img src={d.questionImageUrl2} alt="Full problem" className="max-h-40 rounded border" />
                                  </div>
                                )}

                                {editingAnswerId === d.id ? (
                                  <div className="mt-2 space-y-2 p-3 rounded border bg-card">
                                    <Textarea
                                      value={editAnswerText}
                                      onChange={(e) => setEditAnswerText(e.target.value)}
                                      rows={3}
                                    />
                                    {editAnswerImages.length > 0 && (
                                      <div className="flex flex-wrap gap-2">
                                        {editAnswerImages.map((url, idx) => (
                                          <div key={idx} className="relative inline-block">
                                            <img src={url} alt={`Answer ${idx + 1}`} className="max-h-24 rounded border" />
                                            <button
                                              onClick={() => setEditAnswerImages((prev) => prev.filter((_, i) => i !== idx))}
                                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                                            >
                                              <X className="h-3 w-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <input
                                      type="file" accept="image/*" multiple className="hidden"
                                      ref={editAnswerFileRef}
                                      onChange={async (e) => {
                                        const files = Array.from(e.target.files || []);
                                        for (const file of files) {
                                          const url = await store.uploadDoubtImage(file);
                                          if (url) setEditAnswerImages((prev) => [...prev, url]);
                                        }
                                      }}
                                    />
                                    <Button variant="outline" size="sm" onClick={() => editAnswerFileRef.current?.click()}>
                                      <ImagePlus className="h-4 w-4 mr-1" /> Add Images
                                    </Button>
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={async () => {
                                        await store.updateDoubtAnswer(d.id, {
                                          answer: editAnswerText,
                                          answerImageUrl: editAnswerImages[0] || null,
                                          answerImageUrls: editAnswerImages,
                                        });
                                        setEditingAnswerId(null);
                                      }}>Save</Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingAnswerId(null)}>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-2 p-3 rounded bg-success/10 text-sm">
                                    <p className="text-xs text-muted-foreground mb-1">Answer:</p>
                                    <p>{d.answer}</p>
                                    {(d.answerImageUrls && d.answerImageUrls.length > 0
                                      ? d.answerImageUrls
                                      : d.answerImageUrl ? [d.answerImageUrl] : []
                                    ).map((url, idx) => (
                                      <div key={idx} className="mt-2">
                                        <img src={url} alt={`Answer attachment ${idx + 1}`} className="max-h-40 rounded border" />
                                        {d.answeredBy !== teacher.name && (
                                          <a href={url} download className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                                            <Download className="h-3 w-3" /> Download
                                          </a>
                                        )}
                                      </div>
                                    ))}
                                    {d.answeredBy === teacher.name && (
                                      <div className="flex gap-2 mt-3">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          title="Edit your answer"
                                          onClick={() => {
                                            setEditingAnswerId(d.id);
                                            setEditAnswerText(d.answer || "");
                                            setEditAnswerImages(
                                              d.answerImageUrls && d.answerImageUrls.length > 0
                                                ? d.answerImageUrls
                                                : d.answerImageUrl ? [d.answerImageUrl] : []
                                            );
                                          }}
                                        >
                                          <Pencil className="h-3 w-3 mr-1" /> Edit Solution
                                          {d.viewedByStudent && <span className="ml-1 text-xs text-muted-foreground">(Viewed)</span>}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {(() => {
                                  const thread = store.followups.filter((f) => f.doubtId === d.id);
                                  if (thread.length === 0) return null;
                                  return (
                                    <div className="mt-3 space-y-2 border-t pt-3">
                                      <p className="text-xs font-semibold text-muted-foreground">Discussion History</p>
                                      {thread.map((f) => (
                                        <div key={f.id} className={`p-2 rounded text-xs ${f.authorRole === "teacher" ? "bg-primary/10" : "bg-accent/10"}`}>
                                          <p className="font-semibold">{f.authorRole === "teacher" ? "👨‍🏫" : "🙋"} {f.authorName}</p>
                                          {f.text && <p className="mt-1 whitespace-pre-wrap">{f.text}</p>}
                                          {f.imageUrls.map((u, i) => <img key={i} src={u} alt="attachment" className="max-h-40 rounded border mt-2" />)}
                                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(f.createdAt).toLocaleString()}</p>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            )}
          </div>
        )}
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
