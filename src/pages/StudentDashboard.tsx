import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, Video, LogOut, MessageCircle, ArrowLeft, Send, CheckCircle2, Play
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as db from "@/lib/supabase-helpers";
import type { College, Year, Department, Subject, VideoLecture, Doubt, StudentAccount } from "@/lib/supabase-helpers";

type View = "dashboard" | "subjects" | "videos" | "video-player" | "doubts" | "shared-knowledge";

const StudentDashboard = () => {
  const navigate = useNavigate();

  const student: StudentAccount | null = (() => {
    try { return JSON.parse(sessionStorage.getItem("student-auth") || "null"); } catch { return null; }
  })();

  const [view, setView] = useState<View>("dashboard");
  const [selectedSemester, setSelectedSemester] = useState<"odd" | "even">("odd");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [videos, setVideos] = useState<VideoLecture[]>([]);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState("");
  const [selectedVideoTitle, setSelectedVideoTitle] = useState("");
  const [doubts, setDoubts] = useState<Doubt[]>([]);

  const [doubtSubject, setDoubtSubject] = useState("");
  const [doubtText, setDoubtText] = useState("");

  const loadSubjects = useCallback(async () => {
    if (!student) return;
    try {
      const { data: colleges } = await supabase.from('colleges').select('id').eq('name', student.college_name);
      if (!colleges?.length) return;
      const { data: years } = await supabase.from('years').select('id').eq('college_id', colleges[0].id).eq('year_number', student.year);
      if (!years?.length) return;
      const { data: depts } = await supabase.from('departments').select('id').eq('year_id', years[0].id).eq('name', student.department);
      if (!depts?.length) return;
      const subs = await db.fetchSubjects(depts[0].id);
      setSubjects(subs);
    } catch (e: any) { toast.error(e.message); }
  }, [student]);

  const loadDoubts = useCallback(async () => {
    try { setDoubts(await db.fetchDoubts()); } catch (e: any) { toast.error(e.message); }
  }, []);

  useEffect(() => { loadSubjects(); loadDoubts(); }, []);

  if (!student) {
    navigate("/student/login");
    return null;
  }

  const filteredSubjects = subjects.filter((s) => s.semester === selectedSemester);

  const myDoubts = doubts.filter((d) => d.student_reg_no === student.registration_number)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const answeredDoubts = doubts.filter(
    (d) => d.answer && d.student_year === student.year && d.student_department === student.department
  ).sort((a, b) => new Date(b.answered_at!).getTime() - new Date(a.answered_at!).getTime());

  const handleLogout = () => { sessionStorage.removeItem("student-auth"); navigate("/"); };

  const handleSendDoubt = async () => {
    if (doubtSubject.trim() && doubtText.trim()) {
      try {
        await db.addDoubt({
          student_name: student.name,
          student_reg_no: student.registration_number,
          student_year: student.year,
          student_department: student.department,
          student_college: student.college_name,
          subject_name: doubtSubject.trim(),
          question: doubtText.trim(),
        });
        setDoubtText(""); setDoubtSubject("");
        loadDoubts();
        toast.success("Doubt sent to teachers");
      } catch (e: any) { toast.error(e.message); }
    }
  };

  const getEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return url;
  };

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
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setView("doubts"); loadDoubts(); }}>
                <CardContent className="p-6 text-center">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-accent" />
                  <p className="font-semibold font-display">Ask a Doubt</p>
                  <p className="text-xs text-muted-foreground">Send doubts to your teachers</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setView("shared-knowledge"); loadDoubts(); }}>
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
            {filteredSubjects.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No subjects found for this semester.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredSubjects.map((s) => (
                  <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={async () => { setSelectedSubject(s); setView("videos"); setVideos(await db.fetchVideos(s.id)); }}>
                    <CardContent className="p-5">
                      <BookOpen className="h-6 w-6 text-primary mb-2" />
                      <p className="font-semibold font-display">{s.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "videos" && selectedSubject && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setView("subjects"); setSelectedSubject(null); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <h2 className="font-display font-semibold text-lg">{selectedSubject.name}</h2>
            </div>
            {videos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No videos uploaded yet.</p>
            ) : (
              videos.map((v, i) => (
                <Card key={v.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setSelectedVideoUrl(v.url); setSelectedVideoTitle(v.title); setView("video-player"); }}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1"><p className="font-medium text-sm">{v.title}</p></div>
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
              <iframe src={getEmbedUrl(selectedVideoUrl)} className="w-full h-full" allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
            </div>
          </div>
        )}

        {view === "doubts" && (
          <div className="space-y-4 animate-fade-in">
            <Button variant="ghost" size="sm" onClick={() => setView("dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Ask a Doubt</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Subject Name (e.g., M3)" value={doubtSubject} onChange={(e) => setDoubtSubject(e.target.value)} />
                <Textarea placeholder="Type your doubt here..." value={doubtText} onChange={(e) => setDoubtText(e.target.value)} rows={4} />
                <Button onClick={handleSendDoubt} disabled={!doubtSubject.trim() || !doubtText.trim()}>
                  <Send className="h-4 w-4 mr-1" /> Send Doubt
                </Button>
              </CardContent>
            </Card>
            <h3 className="font-display font-semibold">My Doubts</h3>
            {myDoubts.map((d) => (
              <Card key={d.id} className={d.answer ? "border-success/30" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{d.subject_name}</span>
                    {d.answer ? (
                      <span className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Answered</span>
                    ) : (
                      <span className="text-xs text-accent">Pending</span>
                    )}
                  </div>
                  <p className="text-sm font-medium mt-2">{d.question}</p>
                  {d.answer && (
                    <div className="mt-3 p-3 rounded bg-success/10 text-sm">
                      <p className="text-xs text-muted-foreground mb-1">Answer by {d.answered_by}:</p>
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
              answeredDoubts.map((d) => (
                <Card key={d.id} className="border-success/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{d.subject_name}</span>
                      <span className="text-xs text-muted-foreground">by {d.student_name}</span>
                    </div>
                    <p className="text-sm font-medium">{d.question}</p>
                    <div className="mt-3 p-3 rounded bg-success/10 text-sm">
                      <p className="text-xs text-muted-foreground mb-1">Answer by {d.answered_by}:</p>
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
