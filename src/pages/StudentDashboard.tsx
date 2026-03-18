import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseData, type StudentAccount } from "@/hooks/useSupabaseData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, Video, LogOut, MessageCircle, ArrowLeft, Send, CheckCircle2, Play, Loader2
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type View = "dashboard" | "subjects" | "videos" | "video-player" | "doubts" | "shared-knowledge";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const store = useSupabaseData();

  const student: StudentAccount | null = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("student-auth") || "null");
    } catch { return null; }
  })();

  const [view, setView] = useState<View>("dashboard");
  const [selectedSemester, setSelectedSemester] = useState<"odd" | "even">("odd");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedVideoUrl, setSelectedVideoUrl] = useState("");
  const [selectedVideoTitle, setSelectedVideoTitle] = useState("");
  const [doubtSubject, setDoubtSubject] = useState("");
  const [doubtText, setDoubtText] = useState("");

  if (!student) {
    navigate("/student/login");
    return null;
  }

  const college = store.colleges.find((c) => c.name === student.collegeName);
  const year = college?.years.find((y) => y.yearNumber === student.year);
  const dept = year?.departments.find((d) => d.name === student.department);
  const subjects = dept?.subjects.filter((s) => s.semester === selectedSemester) || [];
  const currentSubject = dept?.subjects.find((s) => s.id === selectedSubjectId);

  const answeredDoubts = store.doubts.filter(
    (d) => d.answer && d.studentYear === student.year && d.studentDepartment === student.department
  );

  const handleLogout = () => {
    sessionStorage.removeItem("student-auth");
    navigate("/");
  };

  const handleSendDoubt = () => {
    if (doubtSubject.trim() && doubtText.trim()) {
      store.addDoubt({
        studentName: student.name,
        studentRegNo: student.registrationNumber,
        studentYear: student.year,
        studentDepartment: student.department,
        studentCollege: student.collegeName,
        subjectName: doubtSubject.trim(),
        question: doubtText.trim(),
      });
      setDoubtText("");
      setDoubtSubject("");
    }
  };

  const getEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return url;
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
          <BookOpen className="h-6 w-6 text-success" />
          <div>
            <h1 className="text-lg font-bold font-display text-foreground">Campus-Connect</h1>
            <p className="text-xs text-muted-foreground">{student.name} · {student.department} · Year {student.year}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-1" /> Logout
        </Button>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {view === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("subjects")}>
                <CardContent className="p-6 text-center">
                  <Video className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-semibold font-display">Video Lectures</p>
                  <p className="text-xs text-muted-foreground">Browse subject-wise videos</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("doubts")}>
                <CardContent className="p-6 text-center">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-accent" />
                  <p className="font-semibold font-display">Ask a Doubt</p>
                  <p className="text-xs text-muted-foreground">Send doubts to your teachers</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("shared-knowledge")}>
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p className="font-semibold font-display">Shared Knowledge</p>
                  <p className="text-xs text-muted-foreground">View answered doubts</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {view === "subjects" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setView("dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Select value={selectedSemester} onValueChange={(v) => setSelectedSemester(v as "odd" | "even")}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="odd">Odd Semester</SelectItem>
                  <SelectItem value="even">Even Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {subjects.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No subjects found for this semester.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {subjects.map((s) => (
                  <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => { setSelectedSubjectId(s.id); setView("videos"); }}>
                    <CardContent className="p-5">
                      <BookOpen className="h-6 w-6 text-primary mb-2" />
                      <p className="font-semibold font-display">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.videos.length} video lectures</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "videos" && currentSubject && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setView("subjects"); setSelectedSubjectId(""); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <h2 className="font-display font-semibold text-lg">{currentSubject.name}</h2>
            </div>
            {currentSubject.videos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No videos uploaded yet.</p>
            ) : (
              currentSubject.videos.map((v, i) => (
                <Card key={v.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setSelectedVideoUrl(v.url); setSelectedVideoTitle(v.title); setView("video-player"); }}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{v.title}</p>
                    </div>
                    <Play className="h-5 w-5 text-primary" />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {view === "video-player" && (
          <div className="space-y-4 animate-fade-in">
            <Button variant="ghost" size="sm" onClick={() => setView("videos")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h2 className="font-display font-semibold text-lg">{selectedVideoTitle}</h2>
            <div className="aspect-video rounded-lg overflow-hidden bg-foreground/5">
              <iframe
                src={getEmbedUrl(selectedVideoUrl)}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        )}

        {view === "doubts" && (
          <div className="space-y-4 animate-fade-in">
            <Button variant="ghost" size="sm" onClick={() => setView("dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Ask a Doubt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Subject Name (e.g., M3)" value={doubtSubject} onChange={(e) => setDoubtSubject(e.target.value)} />
                <Textarea placeholder="Type your doubt here..." value={doubtText} onChange={(e) => setDoubtText(e.target.value)} rows={4} />
                <Button onClick={handleSendDoubt} disabled={!doubtSubject.trim() || !doubtText.trim()}>
                  <Send className="h-4 w-4 mr-1" /> Send Doubt
                </Button>
              </CardContent>
            </Card>

            <h3 className="font-display font-semibold">My Doubts</h3>
            {store.doubts
              .filter((d) => d.studentRegNo === student.registrationNumber)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((d) => (
                <Card key={d.id} className={d.answer ? "border-success/30" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {d.subjectName}
                      </span>
                      {d.answer ? (
                        <span className="text-xs text-success flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Answered
                        </span>
                      ) : (
                        <span className="text-xs text-accent">Pending</span>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-2">{d.question}</p>
                    {d.answer && (
                      <div className="mt-3 p-3 rounded bg-success/10 text-sm">
                        <p className="text-xs text-muted-foreground mb-1">Answer by {d.answeredBy}:</p>
                        <p>{d.answer}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {view === "shared-knowledge" && (
          <div className="space-y-4 animate-fade-in">
            <Button variant="ghost" size="sm" onClick={() => setView("dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h2 className="font-display font-semibold text-lg">Shared Knowledge</h2>
            <p className="text-sm text-muted-foreground">Answered doubts from your year & department</p>
            {answeredDoubts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No answered doubts yet.</p>
            ) : (
              answeredDoubts
                .sort((a, b) => new Date(b.answeredAt!).getTime() - new Date(a.answeredAt!).getTime())
                .map((d) => (
                  <Card key={d.id} className="border-success/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                          {d.subjectName}
                        </span>
                        <span className="text-xs text-muted-foreground">by {d.studentName}</span>
                      </div>
                      <p className="text-sm font-medium">{d.question}</p>
                      <div className="mt-3 p-3 rounded bg-success/10 text-sm">
                        <p className="text-xs text-muted-foreground mb-1">Answer by {d.answeredBy}:</p>
                        <p>{d.answer}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
