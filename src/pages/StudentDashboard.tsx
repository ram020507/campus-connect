import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSupabaseData, type StudentAccount } from "@/hooks/useSupabaseData";
import { useStudentNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, Video, LogOut, MessageCircle, ArrowLeft, Send, CheckCircle2, Play, Loader2, RefreshCw, ImagePlus, X, Download, FileText, Search, FolderOpen, ChevronDown, ChevronRight, Pencil, Trash2, Monitor, ThumbsUp, Bookmark, BookmarkCheck, Shuffle, ChevronUp, Type, Image, FileImage, Eye, BookMarked
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import DigitalBoardStudent from "@/components/DigitalBoardStudent";
import FollowupActions from "@/components/FollowupActions";
import { verifySession, clearSession } from "@/lib/authGuard";

type View = "dashboard" | "learning-resources" | "subjects" | "videos" | "video-player" | "doubts" | "digital-board" | "learning-feed" | "saved-doubts" | "exam-subjects" | "exam-content" | "feed-ask-doubt";
type DoubtType = "text" | "text+image";


const StudentDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const store = useSupabaseData();

  const student: StudentAccount | null = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("student-auth") || "null");
    } catch { return null; }
  })();


  useStudentNotifications(student?.registrationNumber);

  const [view, setView] = useState<View>(() => {
    return searchParams.get("doubtId") ? "doubts" : "dashboard";
  });
  const [selectedSemester, setSelectedSemester] = useState<"odd" | "even">("odd");
  const [examSemester, setExamSemester] = useState<"odd" | "even">("odd");
  const [videoSearch, setVideoSearch] = useState("");
  const [examSearch, setExamSearch] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedVideoUrl, setSelectedVideoUrl] = useState("");
  const [selectedVideoTitle, setSelectedVideoTitle] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [doubtSubject, setDoubtSubject] = useState("");
  const [doubtType, setDoubtType] = useState<DoubtType>("text");
  const [doubtText, setDoubtText] = useState("");
  const [doubtImage, setDoubtImage] = useState<File | null>(null);
  const [doubtImagePreview, setDoubtImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateResults, setDuplicateResults] = useState<ReturnType<typeof store.searchSimilarDoubts> | null>(null);
  const [doubtSearch, setDoubtSearch] = useState<Record<string, string>>({});
  const [expandedDoubtSubjects, setExpandedDoubtSubjects] = useState<Record<string, boolean>>({});
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [editingDoubtId, setEditingDoubtId] = useState<string | null>(null);
  const [editDoubtText, setEditDoubtText] = useState("");
  const [editDoubtSubject, setEditDoubtSubject] = useState("");
  const [editDoubtImage, setEditDoubtImage] = useState<File | null>(null);
  const [editDoubtImagePreview, setEditDoubtImagePreview] = useState<string | null>(null);
  const [editDoubtImage2Preview, setEditDoubtImage2Preview] = useState<string | null>(null);
  const [editDoubtHasImages, setEditDoubtHasImages] = useState(false);
  const editFileInput2Ref = useRef<HTMLInputElement>(null);
  const [savedSearch, setSavedSearch] = useState("");
  const [savedSubjectFilter, setSavedSubjectFilter] = useState("all");
  const [feedCurrentIndex, setFeedCurrentIndex] = useState(0);
  const [feedSubjectFilter, setFeedSubjectFilter] = useState<string>("all");
  const [feedAskSource, setFeedAskSource] = useState<any | null>(null);
  const [showFollowup, setShowFollowup] = useState<Record<string, boolean>>({});

  const [doubtImage2, setDoubtImage2] = useState<File | null>(null);
  const [doubtImage2Preview, setDoubtImage2Preview] = useState<string | null>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Reset duplicate results when doubt type or inputs change
  useEffect(() => {
    setDuplicateResults(null);
  }, [doubtType, doubtText, doubtImage, doubtImage2, doubtSubject]);

  useEffect(() => { setFeedCurrentIndex(0); }, [feedSubjectFilter]);


  if (!student) {
    navigate("/student/login");
    return null;
  }

  const college = store.colleges.find((c) => c.name === student.collegeName);
  const year = college?.years.find((y) => y.yearNumber === student.year);
  const dept = year?.departments.find((d) => d.name === student.department);
  const subjects = dept?.subjects.filter((s) => s.semester === selectedSemester) || [];
  const currentSubject = dept?.subjects.find((s) => s.id === selectedSubjectId);
  const currentVideo = currentSubject?.videos.find((v) => v.id === selectedVideoId);

  // Feed: ALL completed doubts (status === "understood"), newest first, never removed after viewing.
  const feedDoubts = useMemo(() => {
    const all = store.doubts.filter(
      (d) => d.answer
        && d.status === "understood"
        && (feedSubjectFilter === "all" || d.subjectName === feedSubjectFilter)
    );
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [store.doubts, feedSubjectFilter]);

  // Mark the currently-viewed feed doubt as seen (kept for internal tracking; does not hide it)
  useEffect(() => {
    if (view !== "learning-feed") return;
    const d = feedDoubts[feedCurrentIndex];
    if (!d) return;
    store.markDoubtSeen(student.registrationNumber, d.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, feedCurrentIndex, feedDoubts]);




  const feedSubjectOptions = useMemo(() => {
    const all = store.doubts.filter((d) => d.answer && d.status === "understood");
    return [...new Set(all.map((d) => d.subjectName))].sort();
  }, [store.doubts.length]);

  // Saved doubts
  const mySavedDoubtIds = store.savedDoubts
    .filter((s) => s.studentRegNo === student.registrationNumber)
    .map((s) => s.doubtId);
  const mySavedDoubts = store.doubts.filter((d) => mySavedDoubtIds.includes(d.id));

  const handleLogout = () => {
    clearSession("student");
    navigate("/");
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDoubtImage(file);
      setDoubtImagePreview(URL.createObjectURL(file));
      setOcrProcessing(true);
      try {
        const url = await store.uploadDoubtImage(file);
        if (url) {
          const text = await store.extractOcrText(url);
          setOcrText(text);
          setDoubtImagePreview(url);
        }
      } catch (err) {
        console.error("OCR failed:", err);
      } finally {
        setOcrProcessing(false);
      }
    }
  };

  const clearImage = () => {
    setDoubtImage(null);
    setDoubtImagePreview(null);
    setOcrText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearImage2 = () => {
    setDoubtImage2(null);
    setDoubtImage2Preview(null);
    if (fileInput2Ref.current) fileInput2Ref.current.value = "";
  };

  const handleImage2Select = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDoubtImage2(file);
      setDoubtImage2Preview(URL.createObjectURL(file));
      try {
        const url = await store.uploadDoubtImage(file);
        if (url) setDoubtImage2Preview(url);
      } catch (err) { console.error(err); }
    }
  };

  const handleCheckAndSend = async () => {
    if (!doubtSubject.trim()) return;
    const hasText = doubtText.trim();
    const hasImage = doubtType === "text+image" && doubtImage;
    if (!hasText && !hasImage) return;

    setCheckingDuplicates(true);

    // Run search with both typed text and OCR text
    const typedSearch = doubtText.trim();
    const ocrSearch = doubtType === "text+image" ? ocrText.trim() : "";

    if ((typedSearch.length >= 3 || ocrSearch.length >= 3) && student) {
      const results = store.searchSimilarDoubts(typedSearch || ocrSearch, {
        subjectName: doubtSubject,
        studentYear: student.year,
        studentDepartment: student.department,
        ocrText: ocrSearch,
        requireTwoImages: doubtType === "text+image",
      });
      if (results.length > 0) {
        setDuplicateResults(results);
        setCheckingDuplicates(false);
        return;
      }
    }
    setDuplicateResults([]);
    setCheckingDuplicates(false);
    await submitDoubt();
  };

  const submitDoubt = async () => {
    setSending(true);
    let imageUrl: string | undefined;
    let imageUrl2: string | undefined;
    if (doubtType === "text+image" && doubtImage) {
      if (doubtImagePreview?.startsWith("http")) {
        imageUrl = doubtImagePreview;
      } else {
        const url = await store.uploadDoubtImage(doubtImage);
        if (url) imageUrl = url;
      }
    }
    if (doubtType === "text+image" && doubtImage2) {
      if (doubtImage2Preview?.startsWith("http")) {
        imageUrl2 = doubtImage2Preview;
      } else {
        const url = await store.uploadDoubtImage(doubtImage2);
        if (url) imageUrl2 = url;
      }
    }
    await store.addDoubt({
      studentName: student!.name,
      studentRegNo: student!.registrationNumber,
      studentYear: student!.year,
      studentDepartment: student!.department,
      studentCollege: student!.collegeName,
      subjectName: doubtSubject.trim(),
      question: doubtText.trim(),
      questionImageUrl: imageUrl,
      questionImageUrl2: imageUrl2,
      ocrText: ocrText || undefined,
    });
    setDoubtText("");
    setDoubtSubject("");
    setDoubtType("text");
    clearImage();
    clearImage2();
    setDuplicateResults(null);
    setSending(false);
  };

  const handleEditImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditDoubtImage(file);
      const url = await store.uploadDoubtImage(file);
      if (url) setEditDoubtImagePreview(url);
      else setEditDoubtImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveEdit = async (doubtId: string) => {
    const updates: { question?: string; questionImageUrl?: string | null; questionImageUrl2?: string | null; subjectName?: string } = {};
    updates.question = editDoubtText;
    if (editDoubtSubject) updates.subjectName = editDoubtSubject;
    if (editDoubtHasImages) {
      updates.questionImageUrl = editDoubtImagePreview;
      updates.questionImageUrl2 = editDoubtImage2Preview;
    }
    await store.updateDoubtQuestion(doubtId, updates);
    setEditingDoubtId(null);
    setEditDoubtImage(null);
    setEditDoubtImagePreview(null);
    setEditDoubtImage2Preview(null);
    setEditDoubtHasImages(false);
  };

  const handleEditImage2Select = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await store.uploadDoubtImage(file);
      if (url) setEditDoubtImage2Preview(url);
      else setEditDoubtImage2Preview(URL.createObjectURL(file));
    }
  };

  const startEditDoubt = (d: any) => {
    setEditingDoubtId(d.id);
    setEditDoubtText(d.question);
    setEditDoubtSubject(d.subjectName);
    const hasImages = !!(d.questionImageUrl || d.questionImageUrl2);
    setEditDoubtHasImages(hasImages);
    setEditDoubtImagePreview(hasImages ? (d.questionImageUrl || null) : null);
    setEditDoubtImage2Preview(hasImages ? (d.questionImageUrl2 || null) : null);
  };

  const getEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return url;
  };

  const isHelpful = (doubtId: string) => store.helpfulByMe.includes(`${student.registrationNumber}:${doubtId}`);
  const isSaved = (doubtId: string) => mySavedDoubtIds.includes(doubtId);

  const goNextFeed = () => {
    if (feedCurrentIndex < feedDoubts.length - 1) setFeedCurrentIndex((i) => i + 1);
  };
  const goPrevFeed = () => {
    if (feedCurrentIndex > 0) setFeedCurrentIndex((i) => i - 1);
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
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => {
            if (view === "saved-doubts") { setView("learning-feed"); }
            else if (view !== "dashboard") { setView("dashboard"); }
            else { navigate("/"); }
          }}>
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

      <div className="max-w-4xl mx-auto p-4">
        {view === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("learning-resources")}>
                <CardContent className="p-4 text-center">
                  <BookOpen className="h-7 w-7 mx-auto mb-2 text-primary" />
                  <p className="font-semibold font-display text-sm">Learning Resources</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("doubts")}>
                <CardContent className="p-4 text-center">
                  <MessageCircle className="h-7 w-7 mx-auto mb-2 text-accent" />
                  <p className="font-semibold font-display text-sm">Ask a Doubt</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setFeedCurrentIndex(0); setView("learning-feed"); }}>
                <CardContent className="p-4 text-center">
                  <Shuffle className="h-7 w-7 mx-auto mb-2 text-accent" />
                  <p className="font-semibold font-display text-sm">Learning Feed</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("digital-board")}>
                <CardContent className="p-4 text-center">
                  <Monitor className="h-7 w-7 mx-auto mb-2 text-primary" />
                  <p className="font-semibold font-display text-sm">Digital Board</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {view === "learning-resources" && (
          <div className="space-y-4 animate-fade-in">
            <Button variant="ghost" size="sm" onClick={() => setView("dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Learning Resources
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("subjects")}>
                <CardContent className="p-6 text-center">
                  <Video className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-semibold font-display">All Lectures</p>
                  <p className="text-xs text-muted-foreground mt-1">Lecture videos & subject notes</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("exam-subjects")}>
                <CardContent className="p-6 text-center">
                  <BookMarked className="h-8 w-8 mx-auto mb-2 text-accent" />
                  <p className="font-semibold font-display">Important Notes</p>
                  <p className="text-xs text-muted-foreground mt-1">Revision videos, PDFs & PPTs</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}


        {view === "exam-subjects" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setView("learning-resources")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Select value={examSemester} onValueChange={(v) => setExamSemester(v as "odd" | "even")}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="odd">Odd Semester</SelectItem>
                  <SelectItem value="even">Even Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-primary" /> Important Notes
            </h2>
            {(() => {
              const examSubjects = (dept?.subjects || []).filter((s) => s.semester === examSemester);
              if (examSubjects.length === 0) {
                return <p className="text-center text-muted-foreground py-8">No subjects found for this semester.</p>;
              }
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {examSubjects.map((s) => (
                    <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => { setSelectedSubjectId(s.id); setExamSearch(""); setView("exam-content"); }}>
                      <CardContent className="p-5">
                        <BookMarked className="h-6 w-6 text-primary mb-2" />
                        <p className="font-semibold font-display">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {store.examPrepVideos.filter((v) => v.subjectId === s.id).length} videos ·{" "}
                          {store.examPrepFiles.filter((f) => f.subjectId === s.id).length} files
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {view === "exam-content" && currentSubject && (() => {
          const q = examSearch.trim().toLowerCase();
          const evs = store.examPrepVideos
            .filter((v) => v.subjectId === currentSubject.id)
            .filter((v) => !q || v.title.toLowerCase().includes(q));
          const efs = store.examPrepFiles
            .filter((f) => f.subjectId === currentSubject.id)
            .filter((f) => !q || f.fileName.toLowerCase().includes(q));
          return (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setView("exam-subjects"); setSelectedSubjectId(""); }}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <h2 className="font-display font-semibold text-lg">{currentSubject.name} — Important Notes</h2>
              </div>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search important videos & notes by title..."
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Tabs defaultValue="videos">
                <TabsList className="grid grid-cols-2 w-full max-w-sm">
                  <TabsTrigger value="videos"><Video className="h-4 w-4 mr-1" /> Videos</TabsTrigger>
                  <TabsTrigger value="files"><FileText className="h-4 w-4 mr-1" /> Files</TabsTrigger>
                </TabsList>
                <TabsContent value="videos" className="space-y-3 mt-4">
                  {evs.length === 0 ? <p className="text-center text-muted-foreground py-8">{q ? "No matching videos." : "No videos yet."}</p> : evs.map((v) => (
                    <Card key={v.id} className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => { setSelectedVideoUrl(v.url); setSelectedVideoTitle(v.title); setSelectedVideoId(""); setView("video-player"); }}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <Video className="h-5 w-5 text-primary" />
                        <p className="flex-1 font-medium text-sm">{v.title}</p>
                        <Play className="h-5 w-5 text-primary" />
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                <TabsContent value="files" className="space-y-2 mt-4">
                  {efs.length === 0 ? <p className="text-center text-muted-foreground py-8">{q ? "No matching notes." : "No files yet."}</p> : efs.map((f) => (
                    <Card key={f.id}>
                      <CardContent className="p-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm flex-1 truncate text-primary hover:underline">{f.fileName}</a>
                        <a href={f.fileUrl} download className="text-muted-foreground hover:text-primary"><Download className="h-4 w-4" /></a>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          );
        })()}


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
            <Tabs defaultValue="videos">
              <TabsList className="grid grid-cols-2 w-full max-w-sm">
                <TabsTrigger value="videos"><Video className="h-4 w-4 mr-1" /> Videos</TabsTrigger>
                <TabsTrigger value="notes"><FileText className="h-4 w-4 mr-1" /> Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="videos" className="space-y-3 mt-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search videos by title..."
                    value={videoSearch}
                    onChange={(e) => setVideoSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {(() => {
                  const q = videoSearch.trim().toLowerCase();
                  const filtered = q
                    ? currentSubject.videos.filter((v) => v.title.toLowerCase().includes(q))
                    : currentSubject.videos;
                  if (filtered.length === 0) {
                    return <p className="text-center text-muted-foreground py-8">{q ? "No matching videos." : "No videos uploaded yet."}</p>;
                  }
                  return filtered.map((v, i) => (
                    <Card key={v.id} className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => { setSelectedVideoUrl(v.url); setSelectedVideoTitle(v.title); setSelectedVideoId(v.id); setView("video-player"); }}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{v.title}</p>
                          {v.files.length > 0 && (
                            <p className="text-xs text-muted-foreground">{v.files.length} file(s) attached</p>
                          )}
                        </div>
                        <Play className="h-5 w-5 text-primary" />
                      </CardContent>
                    </Card>
                  ));
                })()}
              </TabsContent>
              <TabsContent value="notes" className="space-y-2 mt-4">
                {(() => {
                  const notes = store.subjectNotes.filter((n) => n.subjectId === currentSubject.id);
                  if (notes.length === 0) return <p className="text-center text-muted-foreground py-8">No subject notes uploaded yet.</p>;
                  return notes.map((f) => (
                    <Card key={f.id}>
                      <CardContent className="p-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm flex-1 truncate text-primary hover:underline">{f.fileName}</a>
                        <a href={f.fileUrl} download className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                          <Download className="h-4 w-4" />
                        </a>
                      </CardContent>
                    </Card>
                  ));
                })()}
              </TabsContent>
            </Tabs>
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
            {currentVideo && currentVideo.files.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-display font-semibold text-sm">Attached Files</h3>
                {currentVideo.files.map((f) => (
                  <a key={f.id} href={f.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded border bg-card hover:bg-accent/10 transition-colors">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm flex-1">{f.fileName}</span>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}
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
              <CardContent className="space-y-4">
                {/* Subject selector */}
                <Select value={doubtSubject} onValueChange={setDoubtSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {(dept?.subjects || []).map((s) => (
                      <SelectItem key={s.id} value={s.name}>{s.name} ({s.semester} sem)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Doubt Type Selector */}
                <div className="flex gap-2">
                  {([
                    { key: "text" as DoubtType, label: "Text", icon: <Type className="h-4 w-4" /> },
                    { key: "text+image" as DoubtType, label: "Text + 2 Images", icon: <FileImage className="h-4 w-4" /> },
                  ]).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setDoubtType(opt.key); clearImage(); clearImage2(); setDoubtText(""); setOcrText(""); }}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        doubtType === opt.key
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-accent/5"
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>

                {/* Dynamic Input: Text (always shown) */}
                <Textarea
                  placeholder={doubtType === "text+image"
                    ? "Type your exact doubt — which step is unclear, what explanation you need…"
                    : "Type your doubt clearly…"}
                  value={doubtText}
                  onChange={(e) => setDoubtText(e.target.value)}
                  rows={4}
                  className="text-base"
                />

                {/* Dynamic Input: 1st Image (only for text+image) */}
                {doubtType === "text+image" && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">1st Image · Question Image (used for OCR matching)</p>
                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageSelect} />
                    {doubtImagePreview ? (
                      <div className="space-y-2">
                        <div className="relative inline-block">
                          <img src={doubtImagePreview} alt="Doubt attachment" className="max-h-48 rounded-lg border" />
                          <button onClick={clearImage} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { clearImage(); fileInputRef.current?.click(); }}>
                            Replace Image
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/5 transition-all"
                      >
                        <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click or drag & drop the question image</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 2nd image for text+image: full problem image */}
                {doubtType === "text+image" && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">2nd Image · Full Problem Image (derivation, rough work, full problem)</p>
                    <input type="file" accept="image/*" ref={fileInput2Ref} className="hidden" onChange={handleImage2Select} />
                    {doubtImage2Preview ? (
                      <div className="relative inline-block">
                        <img src={doubtImage2Preview} alt="Full problem" className="max-h-48 rounded-lg border" />
                        <button onClick={clearImage2} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInput2Ref.current?.click()}
                        className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/5 transition-all"
                      >
                        <ImagePlus className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Upload full problem image</p>
                      </div>
                    )}
                  </div>
                )}

                {/* OCR Status */}
                {ocrProcessing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded bg-secondary/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting text from image...
                  </div>
                )}
                {ocrText && !ocrProcessing && (
                  <div className="p-2 rounded bg-secondary/50 text-xs text-muted-foreground">
                    <p className="font-semibold mb-1 flex items-center gap-1"><FileText className="h-3 w-3" /> OCR Extracted Text:</p>
                    <p className="line-clamp-3">{ocrText}</p>
                  </div>
                )}

                {/* Duplicate Check Results */}
                {checkingDuplicates && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking for similar doubts…
                  </div>
                )}

                {duplicateResults && duplicateResults.length > 0 && (
                  <div className="border-2 border-accent/30 rounded-lg p-4 bg-accent/5 space-y-3">
                    <p className="text-sm font-semibold text-accent flex items-center gap-2">
                      <Search className="h-4 w-4" /> Exact match found! Here's the solution:
                    </p>
                    {duplicateResults.map((sd) => (
                      <Card key={sd.id} className="border-success/30">
                        <CardContent className="p-4 space-y-2">
                          <p className="text-xs text-muted-foreground">📌 Previous Question</p>
                          <p className="text-sm font-medium">{sd.question}</p>
                          {sd.questionImageUrl && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Question Image:</p>
                              <img src={sd.questionImageUrl} alt="Question" className="max-h-40 rounded border" />
                            </div>
                          )}
                          {sd.questionImageUrl2 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Full Problem Image:</p>
                              <img src={sd.questionImageUrl2} alt="Full problem" className="max-h-40 rounded border" />
                            </div>
                          )}
                          <div className="p-3 rounded bg-success/10">
                            <p className="text-xs text-muted-foreground mb-1">✅ Answer by {sd.answeredBy}:</p>
                            <p className="text-sm">{sd.answer}</p>
                            {(sd.answerImageUrls && sd.answerImageUrls.length > 0
                              ? sd.answerImageUrls
                              : sd.answerImageUrl ? [sd.answerImageUrl] : []
                            ).map((url, idx) => (
                              <div key={idx} className="mt-2">
                                <img src={url} alt={`Answer ${idx + 1}`} className="max-h-40 rounded border" />
                                <a href={url} download className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                                  <Download className="h-3 w-3" /> Download
                                </a>
                              </div>
                            ))}
                          </div>
                          {(() => {
                            const thread = store.followups.filter((f) => f.doubtId === sd.id);
                            if (thread.length === 0) return null;
                            return (
                              <div className="space-y-2 border-t pt-2">
                                <p className="text-xs font-semibold text-muted-foreground">Discussion History</p>
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
                            );
                          })()}
                        </CardContent>
                      </Card>
                    ))}

                    <Button variant="default" size="sm" onClick={() => { setDuplicateResults(null); submitDoubt(); }}>
                      Ask New Doubt Anyway
                    </Button>
                  </div>
                )}

                {duplicateResults && duplicateResults.length === 0 && !sending && (
                  <div className="text-sm text-muted-foreground p-2 rounded bg-secondary/50">
                    ✅ No similar doubts found. Your doubt has been submitted!
                  </div>
                )}

                {/* Submit Button */}
                {(!duplicateResults || duplicateResults.length === 0) && (
                  <Button
                    onClick={handleCheckAndSend}
                    disabled={
                      !doubtSubject.trim() ||
                      (doubtType === "text" && !doubtText.trim()) ||
                      (doubtType === "text+image" && (!doubtText.trim() || !doubtImage || !doubtImage2)) ||
                      sending || ocrProcessing || checkingDuplicates
                    }
                  >
                    {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Ask Doubt
                  </Button>
                )}
              </CardContent>
            </Card>

            <h3 className="font-display font-semibold">My Doubts</h3>
            {(() => {
              const myDoubts = store.doubts
                .filter((d) => d.studentRegNo === student.registrationNumber)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              const subjectGroups = myDoubts.reduce<Record<string, typeof myDoubts>>((acc, d) => {
                (acc[d.subjectName] = acc[d.subjectName] || []).push(d);
                return acc;
              }, {});
              const subjectNames = Object.keys(subjectGroups).sort();
              if (subjectNames.length === 0) return <p className="text-center text-muted-foreground py-8">No doubts yet.</p>;
              return subjectNames.map((subj) => {
                const isOpen = expandedDoubtSubjects[subj] ?? false;
                const search = doubtSearch[subj] || "";
                const filtered = subjectGroups[subj].filter((d) => {
                  if (!search.trim()) return true;
                  const q = search.toLowerCase();
                  return d.question.toLowerCase().includes(q) || d.subjectName.toLowerCase().includes(q) || d.answer?.toLowerCase().includes(q);
                });
                return (
                  <Card key={subj}>
                    <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-accent/5 transition-colors"
                      onClick={() => setExpandedDoubtSubjects((prev) => ({ ...prev, [subj]: !isOpen }))}>
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm flex-1">{subj}</span>
                      <span className="text-xs text-muted-foreground">{subjectGroups[subj].length} doubt(s)</span>
                    </div>
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder={`Search in ${subj}...`} value={search}
                            onChange={(e) => setDoubtSearch((prev) => ({ ...prev, [subj]: e.target.value }))} className="pl-9" />
                        </div>
                        {filtered.length === 0 ? (
                          <p className="text-center text-muted-foreground text-sm py-4">No matching doubts.</p>
                        ) : filtered.map((d) => (
                          <div key={d.id} className={`border rounded-lg p-3 ${d.answer ? "border-success/30" : ""}`}>
                            <div className="flex items-center gap-2 mb-1">
                              {d.answer ? (
                                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 border border-green-500/30 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Answered
                                </span>
                              ) : d.claimedBy ? (
                                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/30">
                                  🔒 Claimed
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 border border-orange-500/30">
                                  ● Pending
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto">{new Date(d.createdAt).toLocaleDateString()}</span>
                              {!d.claimedBy && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => startEditDoubt(d)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={async () => { if (confirm("Delete this doubt?")) await store.deleteDoubt(d.id); }}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                            {editingDoubtId === d.id ? (
                              <div className="space-y-2 mt-1">
                                <Select value={editDoubtSubject} onValueChange={setEditDoubtSubject}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Change subject" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(dept?.subjects || []).map((s) => (
                                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Textarea value={editDoubtText} onChange={(e) => setEditDoubtText(e.target.value)} rows={3} />
                                {editDoubtHasImages && (
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-[10px] text-muted-foreground mb-1">Question Image</p>
                                      {editDoubtImagePreview ? (
                                        <div className="relative inline-block">
                                          <img src={editDoubtImagePreview} alt="Question" className="max-h-32 rounded border" />
                                          <button onClick={() => setEditDoubtImagePreview(null)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                      ) : null}
                                      <input type="file" accept="image/*" ref={editFileInputRef} className="hidden" onChange={handleEditImageSelect} />
                                      <Button variant="outline" size="sm" className="ml-2" onClick={() => editFileInputRef.current?.click()}>
                                        <ImagePlus className="h-3 w-3 mr-1" /> Replace Question Image
                                      </Button>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-muted-foreground mb-1">Full Problem Image</p>
                                      {editDoubtImage2Preview ? (
                                        <div className="relative inline-block">
                                          <img src={editDoubtImage2Preview} alt="Full problem" className="max-h-32 rounded border" />
                                          <button onClick={() => setEditDoubtImage2Preview(null)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                      ) : null}
                                      <input type="file" accept="image/*" ref={editFileInput2Ref} className="hidden" onChange={handleEditImage2Select} />
                                      <Button variant="outline" size="sm" className="ml-2" onClick={() => editFileInput2Ref.current?.click()}>
                                        <ImagePlus className="h-3 w-3 mr-1" /> Replace Full Problem Image
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                {d.answer && (
                                  <p className="text-xs text-destructive">⚠ Editing will remove the existing answer and resend to teachers.</p>
                                )}
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleSaveEdit(d.id)}>Save & Resend</Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingDoubtId(null)}>Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm font-medium mt-1">{d.question}</p>
                            )}
                            {d.questionImageUrl && editingDoubtId !== d.id && (
                              <div className="mt-2">
                                <img src={d.questionImageUrl} alt="Doubt attachment" className="max-h-48 rounded border" />
                              </div>
                            )}
                            {d.questionImageUrl2 && editingDoubtId !== d.id && (
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground mb-1">Full problem</p>
                                <img src={d.questionImageUrl2} alt="Full problem" className="max-h-48 rounded border" />
                              </div>
                            )}
                            {d.answer && editingDoubtId !== d.id && (
                              <div className="mt-3 p-3 rounded bg-success/10 text-sm" ref={(el) => {
                                // Mark as viewed when student sees the answer
                                if (el && !d.viewedByStudent) {
                                  store.markDoubtViewed(d.id);
                                }
                              }}>
                                <p className="text-xs text-muted-foreground mb-1">Answer by {d.answeredBy}:</p>
                                <p>{d.answer}</p>
                                {d.answeredAt && (
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    Last Updated: {new Date(d.answeredAt).toLocaleString()}
                                  </p>
                                )}
                                {/* Show all answer images */}
                                {(d.answerImageUrls && d.answerImageUrls.length > 0
                                  ? d.answerImageUrls
                                  : d.answerImageUrl ? [d.answerImageUrl] : []
                                ).map((url, idx) => (
                                  <div key={idx} className="mt-2">
                                    <img src={url} alt={`Answer attachment ${idx + 1}`} className="max-h-48 rounded border" />
                                    <a href={url} download className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                                      <Download className="h-3 w-3" /> Download Image
                                    </a>
                                  </div>
                                ))}
                                {/* Follow-up thread */}
                                {(() => {
                                  const thread = store.followups.filter((f) => f.doubtId === d.id);
                                  if (thread.length === 0) return null;
                                  return (
                                    <div className="mt-3 space-y-2 border-t pt-3">
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
                                  );
                                })()}
                                {/* Understood / Still Have a Doubt actions */}
                                {d.status !== "understood" && d.status !== "clarification_requested" && (
                                  <div className="mt-3 border-t pt-3 space-y-2">
                                    {!followupInputs[d.id] ? (
                                      <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="gap-1" onClick={() => store.markDoubtUnderstood(d.id)}>
                                          <CheckCircle2 className="h-3 w-3" /> Understood
                                        </Button>
                                        <Button
                                          size="sm" variant="outline" className="gap-1"
                                          onClick={() => setFollowupInputs((p) => ({ ...p, [d.id]: { text: "", images: [], previews: [] } }))}
                                        >
                                          <MessageCircle className="h-3 w-3" /> Still Have a Doubt
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <Textarea
                                          placeholder="Describe what you still don't understand..."
                                          value={followupInputs[d.id].text}
                                          onChange={(e) => setFollowupInputs((p) => ({ ...p, [d.id]: { ...p[d.id], text: e.target.value } }))}
                                          rows={3}
                                        />
                                        <div className="flex flex-wrap gap-2">
                                          {followupInputs[d.id].previews.map((src, i) => (
                                            <div key={i} className="relative">
                                              <img src={src} alt="preview" className="h-20 w-20 object-cover rounded border" />
                                              <button
                                                type="button"
                                                onClick={() => setFollowupInputs((p) => {
                                                  const cur = p[d.id];
                                                  return { ...p, [d.id]: { ...cur, images: cur.images.filter((_, idx) => idx !== i), previews: cur.previews.filter((_, idx) => idx !== i) } };
                                                })}
                                                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                                              >
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
                                                setFollowupInputs((p) => ({ ...p, [d.id]: { ...p[d.id], images: [...p[d.id].images, ...files], previews: [...p[d.id].previews, ...previews] } }));
                                                e.target.value = "";
                                              }}
                                            />
                                          </label>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm" disabled={followupSubmitting === d.id || !followupInputs[d.id].text.trim()}
                                            onClick={async () => {
                                              setFollowupSubmitting(d.id);
                                              try {
                                                const cur = followupInputs[d.id];
                                                const urls: string[] = [];
                                                for (const f of cur.images) {
                                                  const url = await store.uploadDoubtImage(f);
                                                  if (url) urls.push(url);
                                                }
                                                await store.addFollowup({
                                                  doubtId: d.id,
                                                  authorRole: "student",
                                                  authorName: student.name,
                                                  text: cur.text,
                                                  imageUrls: urls,
                                                });
                                                setFollowupInputs((p) => {
                                                  const n = { ...p }; delete n[d.id]; return n;
                                                });
                                              } finally {
                                                setFollowupSubmitting(null);
                                              }
                                            }}
                                          >
                                            {followupSubmitting === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                            Send Follow-up
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={() => setFollowupInputs((p) => { const n = { ...p }; delete n[d.id]; return n; })}>
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {d.status === "clarification_requested" && (
                                  <p className="mt-2 text-xs italic text-accent-foreground">⏳ Clarification requested — waiting for teacher's response.</p>
                                )}
                                {d.status === "understood" && (
                                  <p className="mt-2 text-xs italic text-success">✅ Marked as understood.</p>
                                )}
                              </div>
                            )}

                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              });
            })()}
          </div>
        )}

        {/* Learning Feed - Reels/Shorts style one-card-at-a-time */}
        {view === "learning-feed" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setView("dashboard")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                  <Shuffle className="h-5 w-5 text-accent" /> Learning Feed
                </h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => setView("saved-doubts")}>
                <BookmarkCheck className="h-4 w-4 mr-1" /> Saved Doubts
              </Button>
            </div>

            {/* Subject filter for Learning Feed */}
            {feedSubjectOptions.length > 0 && (
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Filter by subject:</span>
                <button
                  onClick={() => setFeedSubjectFilter("all")}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    feedSubjectFilter === "all"
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-card text-muted-foreground hover:bg-accent/10"
                  }`}
                >
                  All
                </button>
                {feedSubjectOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFeedSubjectFilter(s)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      feedSubjectFilter === s
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-card text-muted-foreground hover:bg-accent/10"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {feedDoubts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Shuffle className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium">No completed doubts yet.</p>
                <p className="text-sm">Doubts appear here once students mark them as understood.</p>
              </div>
            ) : (
              <div className="relative" ref={feedContainerRef}>
                {/* Navigation arrows */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Button variant="outline" size="sm" onClick={goPrevFeed} disabled={feedCurrentIndex === 0}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">{feedCurrentIndex + 1} / {feedDoubts.length}</span>
                  <Button variant="outline" size="sm" onClick={goNextFeed} disabled={feedCurrentIndex >= feedDoubts.length - 1}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Full-size feed card */}
                {(() => {
                  const d = feedDoubts[feedCurrentIndex];
                  if (!d) return null;
                  return (
                    <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
                      <CardContent className="p-0">
                        {/* Subject badge header */}
                        <div className="bg-primary/10 px-4 py-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-primary">{d.subjectName}</span>
                          <span className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</span>
                        </div>

                        <div className="p-5 space-y-4">
                          {/* Question */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Question</p>
                            <p className="text-base font-medium leading-relaxed">{d.question}</p>
                          </div>

                          {/* Question images */}
                          {d.questionImageUrl && (
                            <div>
                              <img src={d.questionImageUrl} alt="Question" className="w-full max-h-64 object-contain rounded-lg border" />
                            </div>
                          )}
                          {d.questionImageUrl2 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Full problem</p>
                              <img src={d.questionImageUrl2} alt="Full problem" className="w-full max-h-64 object-contain rounded-lg border" />
                            </div>
                          )}


                          {/* Answer */}
                          <div className="p-4 rounded-lg bg-success/10">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Answer by {d.answeredBy}</p>
                            <p className="text-sm leading-relaxed">{d.answer}</p>
                            {/* Show all answer images */}
                            {(d.answerImageUrls && d.answerImageUrls.length > 0
                              ? d.answerImageUrls
                              : d.answerImageUrl ? [d.answerImageUrl] : []
                            ).map((url, idx) => (
                              <div key={idx} className="mt-3">
                                <img src={url} alt={`Answer ${idx + 1}`} className="w-full max-h-64 object-contain rounded-lg border" />
                                <a href={url} download className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
                                  <Download className="h-3 w-3" /> Download Image
                                </a>
                              </div>
                            ))}
                          </div>

                          {/* Complete Discussion History */}
                          {(() => {
                            const thread = store.followups.filter((f) => f.doubtId === d.id);
                            if (thread.length === 0) return null;
                            return (
                              <div className="space-y-2 border-t pt-3">
                                <p className="text-xs font-semibold text-muted-foreground">Discussion History</p>
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
                            );
                          })()}

                          {/* Child doubts (Related questions asked from this doubt) */}
                          {(() => {
                            const children = store.doubts.filter((c: any) => c.parentDoubtId === d.id);
                            if (children.length === 0) return null;
                            return (
                              <div className="space-y-2 border-t pt-3">
                                <p className="text-xs font-semibold text-muted-foreground">
                                  Related Doubts ({children.length})
                                </p>
                                {children.map((c: any) => (
                                  <div key={c.id} className="p-3 rounded border bg-muted/30 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-muted-foreground">by {c.studentName}</span>
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                        {c.status === "understood" ? "Completed" : (c.status || (c.answer ? "solved" : "pending"))}
                                      </span>
                                    </div>
                                    <p className="text-sm">{c.question}</p>
                                    {c.questionImageUrl && <img src={c.questionImageUrl} className="max-h-40 rounded border" alt="child q" />}
                                    {c.questionImageUrl2 && <img src={c.questionImageUrl2} className="max-h-40 rounded border" alt="child full" />}
                                    {c.answer && (
                                      <div className="p-2 rounded bg-success/10 text-xs">
                                        <p className="text-[10px] text-muted-foreground mb-1">Answer by {c.answeredBy}</p>
                                        <p>{c.answer}</p>
                                        {(c.answerImageUrls && c.answerImageUrls.length > 0 ? c.answerImageUrls : c.answerImageUrl ? [c.answerImageUrl] : []).map((u: string, i: number) => (
                                          <img key={i} src={u} className="max-h-40 rounded border mt-2" alt="child a" />
                                        ))}
                                      </div>
                                    )}
                                    {(() => {
                                      const ct = store.followups.filter((f: any) => f.doubtId === c.id);
                                      if (ct.length === 0) return null;
                                      return (
                                        <div className="space-y-1">
                                          {ct.map((f: any) => (
                                            <div key={f.id} className={`p-1.5 rounded text-[11px] ${f.authorRole === "teacher" ? "bg-primary/10" : "bg-accent/10"}`}>
                                              <span className="font-semibold">{f.authorRole === "teacher" ? "👨‍🏫" : "🙋"} {f.authorName}: </span>
                                              {f.text}
                                              {f.imageUrls.map((u: string, i: number) => (
                                                <img key={i} src={u} className="max-h-32 rounded border mt-1" alt="" />
                                              ))}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}

                          {/* Footer: asked by + actions */}
                          <div className="flex items-center justify-between pt-2 border-t">

                            <p className="text-xs text-muted-foreground">Asked by {d.studentName}</p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline" size="sm" className="gap-1"
                                onClick={() => {
                                  setFeedAskSource(d);
                                  setFeedAskText("");
                                  setFeedAskUseExisting(true);
                                  setFeedAskImage1(null);
                                  setFeedAskImage1Preview(null);
                                  setFeedAskImage2(null);
                                  setFeedAskImage2Preview(null);
                                  setView("feed-ask-doubt");
                                }}
                              >
                                <MessageCircle className="h-4 w-4" />
                                <span className="text-xs font-medium">Ask a Doubt</span>
                              </Button>
                              <Button
                                variant="outline" size="sm" className="gap-1"
                                onClick={() => isSaved(d.id) ? store.unsaveDoubt(student.registrationNumber, d.id) : store.saveDoubt(student.registrationNumber, d.id)}
                              >
                                {isSaved(d.id) ? <BookmarkCheck className="h-4 w-4 text-success" /> : <Bookmark className="h-4 w-4" />}
                                <span className="text-xs font-medium">{isSaved(d.id) ? "Saved" : "Save"}</span>
                              </Button>
                            </div>
                          </div>

                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Swipe hint */}
                {feedDoubts.length > 1 && (
                  <p className="text-center text-xs text-muted-foreground mt-3">Use arrows to browse through doubts</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Ask a Doubt from Learning Feed */}
        {view === "feed-ask-doubt" && feedAskSource && (
          <div className="space-y-4 animate-fade-in max-w-2xl">
            <Button variant="ghost" size="sm" onClick={() => setView("learning-feed")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Feed
            </Button>
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-accent" /> Ask a Doubt on this
            </h2>
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="text-xs text-muted-foreground">
                  Subject: <span className="font-semibold text-foreground">{feedAskSource.subjectName}</span>
                </div>

                {(() => {
                  const parentHasImages = !!(feedAskSource.questionImageUrl || feedAskSource.questionImageUrl2);
                  return parentHasImages ? (
                    <div>
                      <p className="text-sm font-medium mb-2">Images</p>
                      <div className="flex gap-2 mb-2">
                        <Button size="sm" variant={feedAskUseExisting ? "default" : "outline"} onClick={() => setFeedAskUseExisting(true)}>
                          Use Existing Images
                        </Button>
                        <Button size="sm" variant={!feedAskUseExisting ? "default" : "outline"} onClick={() => setFeedAskUseExisting(false)}>
                          Upload New Images
                        </Button>
                      </div>

                      {feedAskUseExisting ? (
                        <div className="grid grid-cols-2 gap-2">
                          {feedAskSource.questionImageUrl && (
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">Question Image</p>
                              <img src={feedAskSource.questionImageUrl} className="w-full max-h-40 object-contain rounded border" alt="Question" />
                            </div>
                          )}
                          {feedAskSource.questionImageUrl2 && (
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">Full Problem</p>
                              <img src={feedAskSource.questionImageUrl2} className="w-full max-h-40 object-contain rounded border" alt="Full problem" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">New Question Image</p>
                            {feedAskImage1Preview ? (
                              <div className="relative">
                                <img src={feedAskImage1Preview} className="w-full max-h-40 object-contain rounded border" alt="Q1" />
                                <button type="button" onClick={() => { setFeedAskImage1(null); setFeedAskImage1Preview(null); }} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center justify-center h-32 border-2 border-dashed rounded text-xs text-muted-foreground hover:bg-muted/50">
                                <ImagePlus className="h-5 w-5 mb-1" /> Upload
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                  const f = e.target.files?.[0]; if (!f) return;
                                  setFeedAskImage1(f); setFeedAskImage1Preview(URL.createObjectURL(f));
                                }} />
                              </label>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">New Full Problem Image</p>
                            {feedAskImage2Preview ? (
                              <div className="relative">
                                <img src={feedAskImage2Preview} className="w-full max-h-40 object-contain rounded border" alt="Q2" />
                                <button type="button" onClick={() => { setFeedAskImage2(null); setFeedAskImage2Preview(null); }} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center justify-center h-32 border-2 border-dashed rounded text-xs text-muted-foreground hover:bg-muted/50">
                                <ImagePlus className="h-5 w-5 mb-1" /> Upload
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                  const f = e.target.files?.[0]; if (!f) return;
                                  setFeedAskImage2(f); setFeedAskImage2Preview(URL.createObjectURL(f));
                                }} />
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Text-only doubt — just type your related question below.</p>
                  );
                })()}

                <div>
                  <p className="text-sm font-medium mb-1">Your Doubt <span className="text-destructive">*</span></p>
                  <Textarea
                    placeholder="Describe your doubt..."
                    value={feedAskText}
                    onChange={(e) => setFeedAskText(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  className="w-full"
                  disabled={feedAskSubmitting || !feedAskText.trim()}
                  onClick={async () => {
                    setFeedAskSubmitting(true);
                    try {
                      const parentHasImages = !!(feedAskSource.questionImageUrl || feedAskSource.questionImageUrl2);
                      let q1 = "";
                      let q2 = "";
                      if (parentHasImages) {
                        if (feedAskUseExisting) {
                          q1 = feedAskSource.questionImageUrl || "";
                          q2 = feedAskSource.questionImageUrl2 || "";
                        } else {
                          if (feedAskImage1) q1 = (await store.uploadDoubtImage(feedAskImage1)) || "";
                          if (feedAskImage2) q2 = (await store.uploadDoubtImage(feedAskImage2)) || "";
                        }
                      }
                      await store.addDoubt({
                        studentName: student.name,
                        studentRegNo: student.registrationNumber,
                        studentYear: student.year,
                        studentDepartment: student.department,
                        studentCollege: student.collegeName,
                        subjectName: feedAskSource.subjectName,
                        question: feedAskText,
                        questionImageUrl: q1 || undefined,
                        questionImageUrl2: q2 || undefined,
                        parentDoubtId: feedAskSource.id,
                      } as any);
                      setView("doubts");
                    } finally {
                      setFeedAskSubmitting(false);
                    }
                  }}
                >
                  {feedAskSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                  Send Doubt to Teachers
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Saved Doubts (sub-view of Learning Feed) */}

        {view === "saved-doubts" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setView("learning-feed")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Feed
              </Button>
              <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                <BookmarkCheck className="h-5 w-5 text-success" /> Saved Doubts & Answers
              </h2>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search saved doubts..." value={savedSearch}
                  onChange={(e) => setSavedSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={savedSubjectFilter} onValueChange={setSavedSubjectFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {[...new Set(mySavedDoubts.map((d) => d.subjectName))].sort().map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(() => {
              let filtered = mySavedDoubts;
              if (savedSubjectFilter !== "all") filtered = filtered.filter((d) => d.subjectName === savedSubjectFilter);
              if (savedSearch.trim()) {
                const q = savedSearch.toLowerCase();
                filtered = filtered.filter((d) => d.question.toLowerCase().includes(q) || d.answer?.toLowerCase().includes(q));
              }
              if (filtered.length === 0) return <p className="text-center text-muted-foreground py-8">No saved doubts yet.</p>;
              return filtered.map((d) => (
                <DoubtCard key={d.id} d={d} student={student} store={store} isHelpful={isHelpful} isSaved={isSaved} showUnsave />
              ));
            })()}
          </div>
        )}

        {view === "digital-board" && (
          <DigitalBoardStudent
            student={student}
            subjects={dept?.subjects.map((s) => s.name) || []}
            onBack={() => setView("dashboard")}
          />
        )}
      </div>
    </div>
  );
};

// Reusable doubt card for saved doubts list
function DoubtCard({ d, student, store, isHelpful, isSaved, showUnsave }: {
  d: any;
  student: StudentAccount;
  store: any;
  isHelpful: (id: string) => boolean;
  isSaved: (id: string) => boolean;
  showUnsave?: boolean;
}) {
  return (
    <div className="border rounded-lg p-4 border-success/30 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">{d.subjectName}</span>
          <span className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1">
          {showUnsave ? (
            <Button
              variant="ghost" size="sm" className="h-7 px-2"
              onClick={() => store.unsaveDoubt(student.registrationNumber, d.id)}
            >
              <BookmarkCheck className="h-3.5 w-3.5 text-success" />
            </Button>
          ) : (
            <Button
              variant="ghost" size="sm" className="h-7 px-2"
              onClick={() => isSaved(d.id) ? store.unsaveDoubt(student.registrationNumber, d.id) : store.saveDoubt(student.registrationNumber, d.id)}
            >
              {isSaved(d.id) ? <BookmarkCheck className="h-3.5 w-3.5 text-success" /> : <Bookmark className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm font-medium">{d.question}</p>
      {d.questionImageUrl && (
        <img src={d.questionImageUrl} alt="Doubt attachment" className="max-h-48 rounded border" />
      )}
      <div className="p-3 rounded bg-success/10 text-sm">
        <p className="text-xs text-muted-foreground mb-1">Answer by {d.answeredBy}:</p>
        <p>{d.answer}</p>
        {/* Show all answer images */}
        {(d.answerImageUrls && d.answerImageUrls.length > 0
          ? d.answerImageUrls
          : d.answerImageUrl ? [d.answerImageUrl] : []
        ).map((url: string, idx: number) => (
          <div key={idx} className="mt-2">
            <img src={url} alt={`Answer attachment ${idx + 1}`} className="max-h-48 rounded border" />
            <a href={url} download className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
              <Download className="h-3 w-3" /> Download Image
            </a>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Asked by {d.studentName}</p>
    </div>
  );
}

export default StudentDashboard;
