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
  const [claimAlert, setClaimAlert] = useState<{ show: boolean; teacherName: string }>({ show: false, teacherName: "" });
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editAnswerText, setEditAnswerText] = useState("");
  const [editAnswerImages, setEditAnswerImages] = useState<string[]>([]);
  const editAnswerFileRef = useRef<HTMLInputElement | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  if (!teacher) {
    navigate("/teacher/login");
    return null;
  }

  const handleLogout = () => {
    clearSession("teacher");
    navigate("/");
  };

  // Section 1: Unclaimed doubts — pending, no claimedBy, matching teacher's subjects
  const unclaimedDoubts = store.doubts.filter(
    (d) =>
      teacherSubjects.some(s => s.toLowerCase() === d.subjectName.toLowerCase()) &&
      !d.answer &&
      !d.claimedBy
  );

  // Section 2: Claimed by this teacher — claimed but not yet answered
  const claimedDoubts = store.doubts.filter(
    (d) =>
      d.claimedBy === teacher.staffId &&
      !d.answer
  );

  // Section 3: All solved doubts from teacher's subjects
  const allSolvedDoubts = store.doubts.filter(
    (d) =>
      teacherSubjects.some(s => s.toLowerCase() === d.subjectName.toLowerCase()) &&
      d.answer
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
    await store.claimDoubt(doubtId, teacher.staffId);
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
    { key: "unclaimed", label: "Claim & Solve", count: unclaimedDoubts.length, icon: <Clock className="h-4 w-4" /> },
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
        <DigitalBoardTeacher teacher={teacher} />

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
            {unclaimedDoubts.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No pending doubts. Great job!
                </CardContent>
              </Card>
            ) : (
              unclaimedDoubts
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .map((d) => (
                  <Card key={d.id} className="border-accent/30 animate-fade-in">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="h-4 w-4 text-accent" />
                        <span className="text-xs text-muted-foreground">
                          From {d.studentName} · {d.studentDepartment} · Year {d.studentYear}
                        </span>
                        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded ml-auto">{d.subjectName}</span>
                      </div>
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
                      <Button size="sm" onClick={() => handleClaim(d.id)}>
                        Claim & Solve
                      </Button>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        )}

        {/* Section 2: Claimed Doubts */}
        {activeSection === "claimed" && (
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Claimed Doubts
            </h2>
            {claimedDoubts.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No claimed doubts. Claim a doubt from the Unclaimed section to start answering.
                </CardContent>
              </Card>
            ) : (
              claimedDoubts
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
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        )}

        {/* Section 3: All Doubts (solved) */}
        {activeSection === "all" && (
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              All Solved Doubts
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
                                          disabled={d.viewedByStudent}
                                          title={d.viewedByStudent ? "Editing disabled after student has viewed the answer" : "Edit your answer"}
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
                                          <Pencil className="h-3 w-3 mr-1" /> Edit Answer
                                          {d.viewedByStudent && <span className="ml-1 text-xs text-muted-foreground">(Viewed)</span>}
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
