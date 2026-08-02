import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2, Send, ImagePlus, X, MessageCircle, HelpCircle, Search, CheckCircle2, Check,
} from "lucide-react";
import type { Doubt } from "@/hooks/useSupabaseData";

interface FollowupActionsProps {
  doubt: Doubt;
  student: {
    name: string;
    registrationNumber: string;
    year: number;
    department: string;
    collegeName: string;
  };
  store: any;
  onClarificationSent?: () => void;
  onNewDoubtCreated?: () => void;
}

/**
 * Two-card follow-up workflow shown under a solved doubt:
 *  Card 1 – Clarify Previous Answer / Continue Previous Question (same thread, same teacher)
 *  Card 2 – Ask a New Doubt (match-check, then directed to the same teacher as a separate doubt)
 */
const FollowupActions = ({ doubt, student, store, onClarificationSent, onNewDoubtCreated }: FollowupActionsProps) => {
  const hasImages = !!(doubt.questionImageUrl || doubt.questionImageUrl2);
  const answerImages: string[] = doubt.answerImageUrls && doubt.answerImageUrls.length > 0
    ? doubt.answerImageUrls
    : doubt.answerImageUrl ? [doubt.answerImageUrl] : [];

  const previousImages: { url: string; label: string }[] = [
    ...(doubt.questionImageUrl ? [{ url: doubt.questionImageUrl, label: "Question Image" }] : []),
    ...(doubt.questionImageUrl2 ? [{ url: doubt.questionImageUrl2, label: "Full Problem Image" }] : []),
    ...answerImages.map((u, i) => ({ url: u, label: `Answer Image ${i + 1}` })),
  ];

  // ===== Card 1: Clarify / Continue =====
  const [clarifyText, setClarifyText] = useState("");
  const [selectedPrev, setSelectedPrev] = useState<string[]>([]);
  const [clarifyFiles, setClarifyFiles] = useState<File[]>([]);
  const [clarifyPreviews, setClarifyPreviews] = useState<string[]>([]);
  const [clarifySending, setClarifySending] = useState(false);
  const [clarifySent, setClarifySent] = useState(false);

  // ===== Card 2: New Doubt =====
  const [newText, setNewText] = useState("");
  const [img1, setImg1] = useState<File | null>(null);
  const [img1Preview, setImg1Preview] = useState<string | null>(null);
  const [img2, setImg2] = useState<File | null>(null);
  const [img2Preview, setImg2Preview] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [matches, setMatches] = useState<Doubt[] | null>(null);
  const [newSending, setNewSending] = useState(false);
  const [newCreated, setNewCreated] = useState(false);
  // Cache uploads so "Ask Anyway" doesn't re-upload
  const [uploaded, setUploaded] = useState<{ url1?: string; url2?: string; ocr?: string }>({});

  const togglePrev = (url: string) =>
    setSelectedPrev((p) => (p.includes(url) ? p.filter((u) => u !== url) : [...p, url]));

  const submitClarification = async () => {
    if (!clarifyText.trim()) return;
    setClarifySending(true);
    try {
      const urls: string[] = [...selectedPrev];
      for (const f of clarifyFiles) {
        const u = await store.uploadDoubtImage(f);
        if (u) urls.push(u);
      }
      await store.addFollowup({
        doubtId: doubt.id,
        authorRole: "student",
        authorName: student.name,
        text: clarifyText.trim(),
        imageUrls: urls,
      });
      setClarifySent(true);
      onClarificationSent?.();
    } finally {
      setClarifySending(false);
    }
  };

  const createDirectedDoubt = async (urls: { url1?: string; url2?: string; ocr?: string }) => {
    setNewSending(true);
    try {
      await store.addDoubt({
        studentName: student.name,
        studentRegNo: student.registrationNumber,
        studentYear: student.year,
        studentDepartment: student.department,
        studentCollege: student.collegeName,
        subjectName: doubt.subjectName,
        question: newText.trim(),
        questionImageUrl: urls.url1 || undefined,
        questionImageUrl2: urls.url2 || undefined,
        ocrText: urls.ocr || undefined,
        parentDoubtId: doubt.id,
        // Direct to the same teacher who solved the original doubt
        claimedBy: doubt.claimedBy || undefined,
        handlingTeacher: doubt.answeredBy || undefined,
        status: doubt.claimedBy ? "in_progress" : "pending",
      } as any);
      setNewCreated(true);
      setMatches(null);
      onNewDoubtCreated?.();
    } finally {
      setNewSending(false);
    }
  };

  const handleCheckNewDoubt = async () => {
    if (!newText.trim()) return;
    if (hasImages && (!img1 || !img2)) return;
    setChecking(true);
    try {
      let { url1, url2, ocr } = uploaded;
      if (hasImages) {
        if (!url1 && img1) url1 = (await store.uploadDoubtImage(img1)) || undefined;
        if (!url2 && img2) url2 = (await store.uploadDoubtImage(img2)) || undefined;
        if (url1 && !ocr) ocr = await store.extractOcrText(url1);
        setUploaded({ url1, url2, ocr });
      }
      const results = store.searchSimilarDoubts(newText.trim(), {
        subjectName: doubt.subjectName,
        studentYear: student.year,
        studentDepartment: student.department,
        ocrText: hasImages ? (ocr || "") : "",
        requireTwoImages: hasImages,
        excludeDoubtId: doubt.id,
      });
      if (results.length > 0) {
        setMatches(results);
        return;
      }
      await createDirectedDoubt({ url1, url2, ocr });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* ============ Card 1: Clarify Previous Answer / Continue Previous Question ============ */}
      <Card className="border-primary/30">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            {hasImages ? "Continue Previous Question" : "Clarify Previous Answer"}
          </p>

          {/* Original context */}
          <div className="p-2 rounded bg-muted/50 text-xs space-y-1">
            <p><span className="font-medium">Q:</span> {doubt.question}</p>
            {doubt.answer && (
              <p className="line-clamp-3"><span className="font-medium">A ({doubt.answeredBy}):</span> {doubt.answer}</p>
            )}
          </div>

          {clarifySent ? (
            <p className="text-xs text-success flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Clarification sent to {doubt.answeredBy || "the teacher"}. It will appear in the same discussion.
            </p>
          ) : (
            <>
              {/* Select previous images (image doubts) */}
              {previousImages.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Attach previous images (optional — tap to select)</p>
                  <div className="flex flex-wrap gap-2">
                    {previousImages.map((img) => {
                      const selected = selectedPrev.includes(img.url);
                      return (
                        <button
                          key={img.url}
                          type="button"
                          onClick={() => togglePrev(img.url)}
                          className={`relative rounded border-2 transition-colors ${selected ? "border-primary" : "border-transparent"}`}
                        >
                          <img src={img.url} alt={img.label} className="h-16 w-16 object-cover rounded" />
                          {selected && (
                            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                          <span className="block text-[9px] text-muted-foreground text-center mt-0.5 max-w-16 truncate">{img.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload new supporting images (optional) */}
              <div className="flex flex-wrap gap-2">
                {clarifyPreviews.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt="preview" className="h-16 w-16 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={() => {
                        setClarifyFiles((p) => p.filter((_, idx) => idx !== i));
                        setClarifyPreviews((p) => p.filter((_, idx) => idx !== i));
                      }}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="cursor-pointer flex flex-col items-center justify-center h-16 w-16 border-2 border-dashed rounded text-[9px] text-muted-foreground hover:bg-muted/50">
                  <ImagePlus className="h-4 w-4 mb-0.5" /> New image
                  <input
                    type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      setClarifyFiles((p) => [...p, ...files]);
                      setClarifyPreviews((p) => [...p, ...files.map((f) => URL.createObjectURL(f))]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              <Textarea
                placeholder={hasImages
                  ? "What is still unclear about this question? Describe the step you need explained…"
                  : "What is still unclear about the previous answer?"}
                value={clarifyText}
                onChange={(e) => setClarifyText(e.target.value)}
                rows={3}
              />
              <Button size="sm" onClick={submitClarification} disabled={!clarifyText.trim() || clarifySending}>
                {clarifySending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                Send Clarification
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ============ Card 2: Ask a New Doubt ============ */}
      <Card className="border-accent/30">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-accent" /> Ask a New Doubt
          </p>

          {newCreated ? (
            <p className="text-xs text-success flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> New doubt sent to {doubt.answeredBy || "the teacher"}. Track it in My Doubts — it will be published separately once completed.
            </p>
          ) : (
            <>
              <Textarea
                placeholder="Type your new doubt…"
                value={newText}
                onChange={(e) => { setNewText(e.target.value); setMatches(null); }}
                rows={3}
              />

              {/* New images required for image-based doubts */}
              {hasImages && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">New Question Image <span className="text-destructive">*</span></p>
                    {img1Preview ? (
                      <div className="relative">
                        <img src={img1Preview} className="w-full max-h-32 object-contain rounded border" alt="New question" />
                        <button type="button" onClick={() => { setImg1(null); setImg1Preview(null); setUploaded((u) => ({ ...u, url1: undefined, ocr: undefined })); }} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center h-28 border-2 border-dashed rounded text-xs text-muted-foreground hover:bg-muted/50">
                        <ImagePlus className="h-5 w-5 mb-1" /> Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          setImg1(f); setImg1Preview(URL.createObjectURL(f));
                          setUploaded((u) => ({ ...u, url1: undefined, ocr: undefined }));
                        }} />
                      </label>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">New Full Problem Image <span className="text-destructive">*</span></p>
                    {img2Preview ? (
                      <div className="relative">
                        <img src={img2Preview} className="w-full max-h-32 object-contain rounded border" alt="New full problem" />
                        <button type="button" onClick={() => { setImg2(null); setImg2Preview(null); setUploaded((u) => ({ ...u, url2: undefined })); }} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center h-28 border-2 border-dashed rounded text-xs text-muted-foreground hover:bg-muted/50">
                        <ImagePlus className="h-5 w-5 mb-1" /> Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          setImg2(f); setImg2Preview(URL.createObjectURL(f));
                          setUploaded((u) => ({ ...u, url2: undefined }));
                        }} />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Match results */}
              {matches && matches.length > 0 && (
                <div className="space-y-2 border-t pt-2">
                  <p className="text-xs font-semibold text-accent flex items-center gap-1">
                    <Search className="h-3 w-3" /> Exact match found — previously solved discussion:
                  </p>
                  {matches.map((m) => (
                    <div key={m.id} className="p-3 rounded border border-success/30 bg-success/5 space-y-2">
                      <p className="text-xs font-medium">{m.question}</p>
                      {m.questionImageUrl && <img src={m.questionImageUrl} className="max-h-32 rounded border" alt="Question" />}
                      {m.questionImageUrl2 && <img src={m.questionImageUrl2} className="max-h-32 rounded border" alt="Full problem" />}
                      <div className="p-2 rounded bg-success/10 text-xs">
                        <p className="text-[10px] text-muted-foreground mb-1">Answer by {m.answeredBy}</p>
                        <p className="whitespace-pre-wrap">{m.answer}</p>
                        {(m.answerImageUrls && m.answerImageUrls.length > 0 ? m.answerImageUrls : m.answerImageUrl ? [m.answerImageUrl] : []).map((u, i) => (
                          <img key={i} src={u} className="max-h-32 rounded border mt-1" alt={`Answer ${i + 1}`} />
                        ))}
                      </div>
                      {(() => {
                        const thread = store.followups.filter((f: any) => f.doubtId === m.id);
                        if (thread.length === 0) return null;
                        return (
                          <div className="space-y-1">
                            {thread.map((f: any) => (
                              <div key={f.id} className={`p-1.5 rounded text-[11px] ${f.authorRole === "teacher" ? "bg-primary/10" : "bg-accent/10"}`}>
                                <span className="font-semibold">{f.authorRole === "teacher" ? "👨‍🏫" : "🙋"} {f.authorName}: </span>
                                {f.text}
                                {f.imageUrls.map((u: string, i: number) => (
                                  <img key={i} src={u} className="max-h-24 rounded border mt-1" alt="" />
                                ))}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => createDirectedDoubt(uploaded)} disabled={newSending}>
                      {newSending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                      Ask New Doubt Anyway
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMatches(null)}>Back</Button>
                  </div>
                </div>
              )}

              {(!matches || matches.length === 0) && (
                <Button
                  size="sm"
                  onClick={handleCheckNewDoubt}
                  disabled={!newText.trim() || (hasImages && (!img1 || !img2)) || checking || newSending}
                >
                  {checking || newSending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                  {checking ? "Checking for matches…" : `Send to ${doubt.answeredBy || "Teacher"}`}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FollowupActions;
