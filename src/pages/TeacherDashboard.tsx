import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap, LogOut, MessageCircle, Send, CheckCircle2, Clock
} from "lucide-react";
import { toast } from "sonner";
import * as db from "@/lib/supabase-helpers";
import type { Doubt, TeacherAccount } from "@/lib/supabase-helpers";

const TeacherDashboard = () => {
  const navigate = useNavigate();

  const teacher: TeacherAccount | null = (() => {
    try { return JSON.parse(sessionStorage.getItem("teacher-auth") || "null"); } catch { return null; }
  })();

  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  if (!teacher) {
    navigate("/teacher/login");
    return null;
  }

  const loadDoubts = useCallback(async () => {
    try { setDoubts(await db.fetchDoubts()); } catch (e: any) { toast.error(e.message); }
  }, []);

  useEffect(() => { loadDoubts(); }, []);

  const handleLogout = () => { sessionStorage.removeItem("teacher-auth"); navigate("/"); };

  const pendingDoubts = doubts.filter(
    (d) => d.subject_name.toLowerCase() === teacher.subject_name.toLowerCase() &&
      !d.answer && (!d.claimed_by || d.claimed_by === teacher.staff_id)
  ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const answeredDoubts = doubts.filter(
    (d) => d.answered_by === teacher.name && d.answer
  ).sort((a, b) => new Date(b.answered_at!).getTime() - new Date(a.answered_at!).getTime());

  const handleClaim = async (doubtId: string) => {
    try { await db.claimDoubt(doubtId, teacher.staff_id); loadDoubts(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleReply = async (doubtId: string) => {
    const text = replyTexts[doubtId]?.trim();
    if (text) {
      try {
        await db.answerDoubt(doubtId, text, teacher.name);
        setReplyTexts((prev) => ({ ...prev, [doubtId]: "" }));
        loadDoubts();
        toast.success("Reply sent to students");
      } catch (e: any) { toast.error(e.message); }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-accent" />
          <div>
            <h1 className="text-lg font-bold font-display text-foreground">Teacher Portal</h1>
            <p className="text-xs text-muted-foreground">{teacher.name} · {teacher.subject_name} · {teacher.college_name}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-1" /> Logout
        </Button>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div>
          <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-accent" />
            Pending Doubts ({pendingDoubts.length})
          </h2>
          {pendingDoubts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">No pending doubts. Great job!</CardContent>
            </Card>
          ) : (
            pendingDoubts.map((d) => (
              <Card key={d.id} className="mb-3 border-accent/30 animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="h-4 w-4 text-accent" />
                    <span className="text-xs text-muted-foreground">
                      From {d.student_name} · {d.student_department} · Year {d.student_year}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-3">{d.question}</p>
                  {!d.claimed_by ? (
                    <Button size="sm" variant="outline" onClick={() => handleClaim(d.id)}>Open & Claim</Button>
                  ) : (
                    <div className="space-y-2">
                      <Textarea placeholder="Type your reply..." value={replyTexts[d.id] || ""}
                        onChange={(e) => setReplyTexts((prev) => ({ ...prev, [d.id]: e.target.value }))} rows={3} />
                      <Button size="sm" onClick={() => handleReply(d.id)} disabled={!replyTexts[d.id]?.trim()}>
                        <Send className="h-4 w-4 mr-1" /> Send Reply
                      </Button>
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
          {answeredDoubts.map((d) => (
            <Card key={d.id} className="mb-3 border-success/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Q from {d.student_name} · {d.student_department} · Year {d.student_year}
                </p>
                <p className="text-sm font-medium">{d.question}</p>
                <div className="mt-2 p-3 rounded bg-success/10 text-sm"><p>{d.answer}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
