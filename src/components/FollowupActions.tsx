import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2, Send, ImagePlus, X, MessageCircle, HelpCircle, CheckCircle2, Check, AlertTriangle,
  Layers, Undo2,
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
  /**
   * "own"  — student's own solved doubt (My Doubts → Still Have a Doubt):
   *          clarification goes to the same teacher; "Ask a New Doubt" closes
   *          the previous doubt as Understood and sends a brand-new pending
   *          doubt to the same teacher.
   * "feed" — shared/completed discussion (Learning Feed → Ask a Doubt, or a
   *          synchronized discussion in My Doubts): clarification reopens the
   *          thread to ALL teachers of the subject; "Ask a New Doubt" creates
   *          a normal pending doubt for all subject teachers and hides the
   *          feed card for this student only.
   */
  context?: "own" | "feed";
  onClarificationSent?: () => void;
  onNewDoubtCreated?: () => void;
}

type FollowupOption = "clarify" | "new" | "both";

/**
 * Three-option follow-up workflow shown under a solved/completed doubt.
 * Step 1: the student MUST pick one option before any form is displayed:
 *   1. Clarify Teacher's Answer                        (same thread)
 *   2. Understood the Previous Answer, Ask a New Doubt (new discussion)
 *   3. Use Both                                        (two independent requests)
 * The cards are fully independent — with "Use Both" the student may submit
 * either one, or both, and the teacher answers each request separately.
 */
const FollowupActions = ({ doubt, student, store, context = "own", onClarificationSent, onNewDoubtCreated }: FollowupActionsProps) => {
  const isOwn = context === "own";
  const hasImages = !!(doubt.questionImageUrl || doubt.questionImageUrl2);
  const answerImages: string[] = doubt.answerImageUrls && doubt.answerImageUrls.length > 0
    ? doubt.answerImageUrls
    : doubt.answerImageUrl ? [doubt.answerImageUrl] : [];

  const previousImages: { url: string; label: string }[] = [
    ...(doubt.questionImageUrl ? [{ url: doubt.questionImageUrl, label: "Question Image" }] : []),
    ...(doubt.questionImageUrl2 ? [{ url: doubt.questionImageUrl2, label: "Full Problem Image" }] : []),
    ...answerImages.map((u, i) => ({ url: u, label: `Answer Image ${i + 1}` })),
  ];

  // ===== Step 1: option selection (no form until an option is chosen) =====
  const [option, setOption] = useState<FollowupOption | null>(null);

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
  const [newSending, setNewSending] = useState(false);
  const [newCreated, setNewCreated] = useState(false);
  const [dupMatches, setDupMatches] = useState<Doubt[] | null>(null);

  // Reset duplicate results whenever the new-doubt inputs change
  useEffect(() => {
    setDupMatches(null);
  }, [newText, img1, img2]);

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
        // Feed clarifications on others' doubts go to all subject teachers
        reopenToAllTeachers: !isOwn,
      });
      if (!isOwn) {
        // Feed: remove this card from the student's own feed only — they
        // track the clarification from My Doubts instead.
        await store.hideFeedCard(student.registrationNumber, doubt.id);
      }
      setClarifySent(true);
      onClarificationSent?.();
    } finally {
      setClarifySending(false);
    }
  };

  const submitNewDoubt = async (skipDuplicateCheck = false) => {
    if (!newText.trim()) return;
    if (hasImages && (!img1 || !img2)) return;
    setNewSending(true);
    try {
      let url1: string | undefined;
      let url2: string | undefined;
      let ocr: string | undefined;
      if (hasImages && img1 && img2) {
        url1 = (await store.uploadDoubtImage(img1)) || undefined;
        url2 = (await store.uploadDoubtImage(img2)) || undefined;
        if (url1) ocr = await store.extractOcrText(url1);
      }

      // Duplicate check BEFORE sending:
      //  - Text doubts: compare typed text against solved TEXT doubts.
      //  - Text + Two Image doubts: compare only the Question Image OCR
      //    against solved question images (Full Problem Image never compared).
      if (!skipDuplicateCheck) {
        const matches = store.searchSimilarDoubts(newText.trim(), {
          subjectName: doubt.subjectName,
          studentYear: student.year,
          studentDepartment: student.department,
          ocrText: hasImages ? (ocr || "") : "",
          requireTwoImages: hasImages,
          textOnly: !hasImages,
          excludeDoubtId: doubt.id,
        });
        if (matches.length > 0) {
          setDupMatches(matches);
          return; // do not send — show previous solution(s)
        }
      }

      if (isOwn && option !== "both" && doubt.status !== "clarification_requested" && !clarifySent) {
        // Close the previous discussion: mark it Understood so it leaves the
        // teacher's Claim & Solve section before the new doubt is created.
        // Never done in "Use Both" mode — the previous discussion must stay
        // active while the clarification is handled independently.
        await store.markDoubtUnderstood(doubt.id);
      }

      await store.addDoubt({
        studentName: student.name,
        studentRegNo: student.registrationNumber,
        studentYear: student.year,
        studentDepartment: student.department,
        studentCollege: student.collegeName,
        subjectName: doubt.subjectName,
        question: newText.trim(),
        questionImageUrl: url1,
        questionImageUrl2: url2,
        ocrText: ocr || undefined,
        // Own doubts: direct the new pending doubt to the same teacher.
        // Feed doubts: normal pending doubt for all subject teachers.
        ...(isOwn && doubt.answeredBy ? { handlingTeacher: doubt.answeredBy, status: "pending" } : {}),
      } as any);
      if (!isOwn) {
        // Feed: remove this card from the student's own feed only
        await store.hideFeedCard(student.registrationNumber, doubt.id);
      }
      setNewCreated(true);
      onNewDoubtCreated?.();
    } finally {
      setNewSending(false);
    }
  };

  /**
   * "Use Both" — one Submit button processes the two requests independently:
   *  1. the clarification always goes to the same teacher (or all subject
   *     teachers from the feed) and continues the existing thread;
   *  2. the new doubt runs the duplicate check first — if a match is found it
   *     is NOT sent and the previous solution is shown instead.
   * The previous doubt is never auto-marked as Understood in this mode.
   */
  const submitBoth = async () => {
    if (clarifyText.trim() && !clarifySent) {
      await submitClarification();
    }
    if (newText.trim() && !newCreated && !(hasImages && (!img1 || !img2))) {
      await submitNewDoubt(false);
    }
  };

  const nothingSent = !clarifySent && !newCreated;
  const bothMode = option === "both";
  const showClarify = option === "clarify" || option === "both";
  const showNew = option === "new" || option === "both";


  // ============ Step 1: Option picker — always shown first ============
  if (option === null) {
    const optionBtn =
      "w-full text-left p-3 rounded-lg border bg-card hover:bg-accent/10 hover:border-accent transition-colors flex items-start gap-3";
    return (
      <div className="space-y-3">
        {/* Original discussion context */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold">Original Discussion</p>
            <div className="p-2 rounded bg-muted/50 text-xs space-y-1">
              <p><span className="font-medium">Q:</span> {doubt.question}</p>
              {doubt.answer && (
                <p className="whitespace-pre-wrap"><span className="font-medium">A ({doubt.answeredBy}):</span> {doubt.answer}</p>
              )}
            </div>
            {previousImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {previousImages.map((img) => (
                  <div key={img.url}>
                    <img src={img.url} alt={img.label} className="h-16 w-16 object-cover rounded border" />
                    <span className="block text-[9px] text-muted-foreground text-center mt-0.5 max-w-16 truncate">{img.label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs font-medium text-muted-foreground">Choose how you want to continue:</p>
        <div className="grid gap-2">
          <button type="button" onClick={() => setOption("clarify")} className={optionBtn}>
            <MessageCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <span>
              <span className="block text-sm font-semibold">Clarify Teacher's Answer</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {isOwn
                  ? `Continue the same discussion — your clarification goes to ${doubt.answeredBy || "the teacher who solved this"}.`
                  : `Continue this discussion — your clarification goes to all ${doubt.subjectName} teachers.`}
              </span>
            </span>
          </button>
          <button type="button" onClick={() => setOption("new")} className={optionBtn}>
            <HelpCircle className="h-5 w-5 text-accent mt-0.5 shrink-0" />
            <span>
              <span className="block text-sm font-semibold">Understood the Previous Answer, Ask a New Doubt</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {isOwn
                  ? `Close this discussion as understood and send a new doubt to ${doubt.answeredBy || "the same teacher"}.`
                  : `Send a completely new doubt to all ${doubt.subjectName} teachers.`}
              </span>
            </span>
          </button>
          <button type="button" onClick={() => setOption("both")} className={optionBtn}>
            <Layers className="h-5 w-5 text-success mt-0.5 shrink-0" />
            <span>
              <span className="block text-sm font-semibold">Use Both</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Send a clarification AND a new doubt together — they are handled as two independent requests, each with its own claim, answer and submit.
              </span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ============ Step 2: Selected form(s) ============
  return (
    <div className="space-y-3">
      {nothingSent && (
        <button
          type="button"
          onClick={() => setOption(null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Undo2 className="h-3 w-3" /> Choose a different option
        </button>
      )}

      {/* ============ Card 1: Clarify Teacher's Answer ============ */}
      {showClarify && (
      <Card className="border-primary/30">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            Clarify Teacher's Answer
          </p>

          {/* Original context */}
          <div className="p-2 rounded bg-muted/50 text-xs space-y-1">
            <p><span className="font-medium">Q:</span> {doubt.question}</p>
            {doubt.answer && (
              <p className="whitespace-pre-wrap"><span className="font-medium">A ({doubt.answeredBy}):</span> {doubt.answer}</p>
            )}
          </div>

          {clarifySent ? (
            <p className="text-xs text-success flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {isOwn
                ? `Clarification sent to ${doubt.answeredBy || "the teacher"}. It will appear in the same discussion.`
                : `Clarification sent to all ${doubt.subjectName} teachers. Track the reply in My Doubts.`}
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
      )}

      {/* ============ Card 2: Ask a New Doubt ============ */}
      {showNew && (
      <Card className="border-accent/30">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-accent" /> Ask a New Doubt
          </p>

          {newCreated ? (
            <p className="text-xs text-success flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {isOwn
                ? `Previous doubt marked as understood. New doubt sent to ${doubt.answeredBy || "the teacher"} — track it in My Doubts.`
                : `New doubt sent to all ${doubt.subjectName} teachers — track it in My Doubts. It will appear in the Learning Feed once solved and marked understood.`}
            </p>
          ) : dupMatches ? (
            /* ===== Duplicate match found — show previous solution(s), don't send ===== */
            <div className="space-y-3">
              <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                A similar doubt was already solved — check the full solution below before sending.
              </p>
              {dupMatches.map((m) => {
                const mAnswerImages: string[] = m.answerImageUrls && m.answerImageUrls.length > 0
                  ? m.answerImageUrls
                  : m.answerImageUrl ? [m.answerImageUrl] : [];
                const thread = (store.followups || []).filter((f: any) => f.doubtId === m.id);
                return (
                  <div key={m.id} className="p-3 rounded border bg-muted/40 space-y-2 text-xs">
                    <p><span className="font-semibold">Previous Question:</span> {m.question}</p>
                    {m.questionImageUrl && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Question Image</p>
                        <img src={m.questionImageUrl} alt="Previous question" className="max-h-40 rounded border" />
                      </div>
                    )}
                    {m.questionImageUrl2 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Full Problem Image</p>
                        <img src={m.questionImageUrl2} alt="Previous full problem" className="max-h-40 rounded border" />
                      </div>
                    )}
                    {m.answer && (
                      <div className="p-2 rounded bg-success/10">
                        <p className="text-[10px] text-muted-foreground mb-1">Answer by {m.answeredBy}</p>
                        <p className="whitespace-pre-wrap">{m.answer}</p>
                        {mAnswerImages.map((u, i) => (
                          <img key={i} src={u} alt={`Answer ${i + 1}`} className="max-h-40 rounded border mt-2" />
                        ))}
                      </div>
                    )}
                    {thread.length > 0 && (
                      <div className="space-y-1 border-t pt-2">
                        <p className="text-[10px] font-semibold text-muted-foreground">Complete Previous Discussion</p>
                        {thread.map((f: any) => (
                          <div key={f.id} className={`p-1.5 rounded text-[11px] ${f.authorRole === "teacher" ? "bg-primary/10" : "bg-accent/10"}`}>
                            <span className="font-semibold">{f.authorRole === "teacher" ? "👨‍🏫" : "🙋"} {f.authorName}: </span>
                            {f.text}
                            {f.imageUrls.map((u: string, i: number) => (
                              <img key={i} src={u} className="max-h-32 rounded border mt-1" alt="" />
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setDupMatches(null)}>
                  Edit My Doubt
                </Button>
                <Button size="sm" variant="secondary" onClick={() => submitNewDoubt(true)} disabled={newSending}>
                  {newSending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                  Ask New Doubt Anyway
                </Button>
              </div>
            </div>
          ) : (
            <>
              {isOwn && (
                <p className="text-[11px] text-muted-foreground">
                  Submitting closes this discussion (marked as Understood) and sends your new doubt to {doubt.answeredBy || "the same teacher"} as a separate pending request.
                </p>
              )}
              <Textarea
                placeholder="Type your new doubt…"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
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
                        <button type="button" onClick={() => { setImg1(null); setImg1Preview(null); }} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center h-28 border-2 border-dashed rounded text-xs text-muted-foreground hover:bg-muted/50">
                        <ImagePlus className="h-5 w-5 mb-1" /> Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          setImg1(f); setImg1Preview(URL.createObjectURL(f));
                        }} />
                      </label>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">New Full Problem Image <span className="text-destructive">*</span></p>
                    {img2Preview ? (
                      <div className="relative">
                        <img src={img2Preview} className="w-full max-h-32 object-contain rounded border" alt="New full problem" />
                        <button type="button" onClick={() => { setImg2(null); setImg2Preview(null); }} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center h-28 border-2 border-dashed rounded text-xs text-muted-foreground hover:bg-muted/50">
                        <ImagePlus className="h-5 w-5 mb-1" /> Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          setImg2(f); setImg2Preview(URL.createObjectURL(f));
                        }} />
                      </label>
                    )}
                  </div>
                </div>
              )}

              <Button
                size="sm"
                onClick={() => submitNewDoubt(false)}
                disabled={!newText.trim() || (hasImages && (!img1 || !img2)) || newSending}
              >
                {newSending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                {newSending
                  ? "Checking & Sending…"
                  : isOwn
                    ? `Close & Send to ${doubt.answeredBy || "Teacher"}`
                    : `Send to ${doubt.subjectName} Teachers`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
};

export default FollowupActions;
