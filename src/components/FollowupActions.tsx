import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2, Send, ImagePlus, X, MessageCircle, HelpCircle, CheckCircle2, Check,
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
   * "own"  — student's own solved doubt (My Doubts): clarification goes to the
   *          same teacher; "Ask a New Doubt" closes the previous doubt as
   *          Understood and sends a brand-new pending doubt to the same teacher.
   * "feed" — someone else's doubt (Learning Feed): clarification reopens the
   *          thread to ALL teachers of the subject; "Ask a New Doubt" creates a
   *          normal pending doubt for all subject teachers.
   */
  context?: "own" | "feed";
  onClarificationSent?: () => void;
  onNewDoubtCreated?: () => void;
}

/**
 * Two-card follow-up workflow shown under a solved doubt:
 *  Card 1 – Clarify Previous Answer / Continue Previous Question (same thread)
 *  Card 2 – Ask a New Doubt (completely separate discussion, no parent-child link)
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
      setClarifySent(true);
      onClarificationSent?.();
    } finally {
      setClarifySending(false);
    }
  };

  const submitNewDoubt = async () => {
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
      if (isOwn) {
        // Close the previous discussion: mark it Understood so it leaves the
        // teacher's Claim & Solve section before the new doubt is created.
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
      setNewCreated(true);
      onNewDoubtCreated?.();
    } finally {
      setNewSending(false);
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

      {/* ============ Card 2: Ask a New Doubt ============ */}
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
                onClick={submitNewDoubt}
                disabled={!newText.trim() || (hasImages && (!img1 || !img2)) || newSending}
              >
                {newSending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                {newSending
                  ? "Sending…"
                  : isOwn
                    ? `Close & Send to ${doubt.answeredBy || "Teacher"}`
                    : `Send to ${doubt.subjectName} Teachers`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FollowupActions;
