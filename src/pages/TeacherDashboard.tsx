import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore, type TeacherAccount } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GraduationCap, LogOut, MessageCircle, Send, CheckCircle2, Clock
} from "lucide-react";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const store = useAppStore();

  const teacher: TeacherAccount | null = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("teacher-auth") || "null");
    } catch { return null; }
  })();

  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  if (!teacher) {
    navigate("/teacher/login");
    return null;
  }

  const handleLogout = () => {
    sessionStorage.removeItem("teacher-auth");
    navigate("/");
  };

  // Get doubts for this teacher's subject that are unclaimed or claimed by this teacher
  const pendingDoubts = store.doubts.filter(
    (d) =>
      d.subjectName.toLowerCase() === teacher.subjectName.toLowerCase() &&
      !d.answer &&
      (!d.claimedBy || d.claimedBy === teacher.staffId)
  );

  const answeredDoubts = store.doubts.filter(
    (d) => d.answeredBy === teacher.name && d.answer
  );

  const handleClaim = (doubtId: string) => {
    store.claimDoubt(doubtId, teacher.staffId);
  };

  const handleReply = (doubtId: string) => {
    const text = replyTexts[doubtId]?.trim();
    if (text) {
      store.answerDoubt(doubtId, text, teacher.name);
      setReplyTexts((prev) => ({ ...prev, [doubtId]: "" }));
    }
  };

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
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-1" /> Logout
        </Button>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Pending Doubts */}
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
                        <Button size="sm" onClick={() => handleReply(d.id)}
                          disabled={!replyTexts[d.id]?.trim()}>
                          <Send className="h-4 w-4 mr-1" /> Send Reply
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </div>

        {/* Answered Doubts */}
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
                  <div className="mt-2 p-3 rounded bg-success/10 text-sm">
                    <p>{d.answer}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
