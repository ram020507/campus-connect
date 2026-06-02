import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSupabaseData, type StudentAccount } from "@/hooks/useSupabaseData";
import { useStudentNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, Video, LogOut, MessageCircle, ArrowLeft, Send, CheckCircle2, Play, Loader2, RefreshCw, ImagePlus, X, Download, FileText, Search, FolderOpen, ChevronDown, ChevronRight, Pencil, Trash2, Monitor, ThumbsUp, Bookmark, BookmarkCheck, Shuffle, ChevronUp, Type, Image, FileImage, Eye
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import DigitalBoardStudent from "@/components/DigitalBoardStudent";

type View = "dashboard" | "subjects" | "videos" | "video-player" | "doubts" | "digital-board" | "learning-feed" | "saved-doubts";
type DoubtType = "text" | "image" | "text+image";

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
  const [savedSearch, setSavedSearch] = useState("");
  const [savedSubjectFilter, setSavedSubjectFilter] = useState("all");
  const [feedCurrentIndex, setFeedCurrentIndex] = useState(0);
  const [feedSubjectFilter, setFeedSubjectFilter] = useState<string>("all");
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

  // Feed: randomized doubts from all subjects for this year/dept (excluding own)
  const feedDoubts = useMemo(() => {
    const all = store.doubts.filter(
      (d) => d.answer && d.studentYear === student.year && d.studentDepartment === student.department && d.studentRegNo !== student.registrationNumber
        && (feedSubjectFilter === "all" || d.subjectName === feedSubjectFilter)
    );
    const shuffled = [...all];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [store.doubts.length, student.year, student.department, feedSubjectFilter]);

  const feedSubjectOptions = useMemo(() => {
    const all = store.doubts.filter(
      (d) => d.answer && d.studentYear === student.year && d.studentDepartment === student.department && d.studentRegNo !== student.registrationNumber
    );
    return [...new Set(all.map((d) => d.subjectName))].sort();
  }, [store.doubts.length, student.year, student.department]);

  // Saved doubts
  const mySavedDoubtIds = store.savedDoubts
    .filter((s) => s.studentRegNo === student.registrationNumber)
    .map((s) => s.doubtId);
  const mySavedDoubts = store.doubts.filter((d) => mySavedDoubtIds.includes(d.id));

  const handleLogout = () => {
    sessionStorage.removeItem("student-auth");
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
    const hasText = doubtType !== "image" && doubtText.trim();
    const hasImage = doubtType !== "text" && doubtImage;
    if (!hasText && !hasImage) return;

    setCheckingDuplicates(true);

    // Run search with both typed text and OCR text
    const typedSearch = doubtType !== "image" ? doubtText.trim() : "";
    const ocrSearch = doubtType !== "text" ? ocrText.trim() : "";

    if ((typedSearch.length >= 3 || ocrSearch.length >= 3) && student) {
      const results = store.searchSimilarDoubts(typedSearch || ocrSearch, {
        subjectName: doubtSubject,
        studentYear: student.year,
        studentDepartment: student.department,
        ocrText: ocrSearch,
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
    if (doubtType !== "text" && doubtImage) {
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
      question: doubtType === "image" ? (ocrText || "(Image doubt)") : doubtText.trim(),
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
    const updates: { question?: string; questionImageUrl?: string | null; subjectName?: string } = {};
    updates.question = editDoubtText;
    if (editDoubtSubject) updates.subjectName = editDoubtSubject;
    if (editDoubtImagePreview) updates.questionImageUrl = editDoubtImagePreview;
    await store.updateDoubtQuestion(doubtId, updates);
    setEditingDoubtId(null);
    setEditDoubtImage(null);
    setEditDoubtImagePreview(null);
  };

  const startEditDoubt = (d: any) => {
    setEditingDoubtId(d.id);
    setEditDoubtText(d.question);
    setEditDoubtSubject(d.subjectName);
    setEditDoubtImagePreview(d.questionImageUrl || null);
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
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("subjects")}>
                <CardContent className="p-4 text-center">
                  <Video className="h-7 w-7 mx-auto mb-2 text-primary" />
                  <p className="font-semibold font-display text-sm">Video Lectures</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("doubts")}>
                <CardContent className="p-4 text-center">
                  <MessageCircle className="h-7 w-7 mx-auto mb-2 text-accent" />
                  <p className="font-semibold font-display text-sm">Ask a Doubt</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView("digital-board")}>
                <CardContent className="p-4 text-center">
                  <Monitor className="h-7 w-7 mx-auto mb-2 text-primary" />
                  <p className="font-semibold font-display text-sm">Digital Board</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setFeedCurrentIndex(0); setView("learning-feed"); }}>
                <CardContent className="p-4 text-center">
                  <Shuffle className="h-7 w-7 mx-auto mb-2 text-accent" />
                  <p className="font-semibold font-display text-sm">Learning Feed</p>
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
                    { key: "image" as DoubtType, label: "Image", icon: <Image className="h-4 w-4" /> },
                    { key: "text+image" as DoubtType, label: "Text + Image", icon: <FileImage className="h-4 w-4" /> },
                  ]).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setDoubtType(opt.key); clearImage(); setDoubtText(""); setOcrText(""); }}
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

                {/* Dynamic Input: Text */}
                {(doubtType === "text" || doubtType === "text+image") && (
                  <Textarea
                    placeholder="Type your doubt clearly…"
                    value={doubtText}
                    onChange={(e) => setDoubtText(e.target.value)}
                    rows={4}
                    className="text-base"
                  />
                )}

                {/* Dynamic Input: Image */}
                {(doubtType === "image" || doubtType === "text+image") && (
                  <div className="space-y-2">
                    {doubtType === "text+image" && (
                      <p className="text-xs font-medium text-muted-foreground">1st Image · Question Image (used for OCR matching)</p>
                    )}
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
                        <p className="text-sm text-muted-foreground">Click or drag & drop to upload image</p>
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
                            <img src={sd.questionImageUrl} alt="Question" className="max-h-32 rounded border" />
                          )}
                          <div className="p-3 rounded bg-success/10">
                            <p className="text-xs text-muted-foreground mb-1">✅ Answer by {sd.answeredBy}:</p>
                            <p className="text-sm">{sd.answer}</p>
                            {(sd.answerImageUrls && sd.answerImageUrls.length > 0
                              ? sd.answerImageUrls
                              : sd.answerImageUrl ? [sd.answerImageUrl] : []
                            ).map((url, idx) => (
                              <div key={idx} className="mt-2">
                                <img src={url} alt={`Answer ${idx + 1}`} className="max-h-32 rounded border" />
                                <a href={url} download className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                                  <Download className="h-3 w-3" /> Download
                                </a>
                              </div>
                            ))}
                          </div>
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
                      (doubtType === "image" && !doubtImage) ||
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
                                <span className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Answered</span>
                              ) : (
                                <span className="text-xs text-accent">Pending</span>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto">{new Date(d.createdAt).toLocaleDateString()}</span>
                              {/* Only show edit/delete if not claimed */}
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
                              {d.claimedBy && !d.answer && (
                                <span className="text-xs text-yellow-600 flex items-center gap-1">🔒 Claimed</span>
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
                                {editDoubtImagePreview && (
                                  <div className="relative inline-block">
                                    <img src={editDoubtImagePreview} alt="Edit attachment" className="max-h-32 rounded border" />
                                    <button onClick={() => setEditDoubtImagePreview(null)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                                <input type="file" accept="image/*" ref={editFileInputRef} className="hidden" onChange={handleEditImageSelect} />
                                <Button variant="outline" size="sm" onClick={() => editFileInputRef.current?.click()}>
                                  <ImagePlus className="h-3 w-3 mr-1" /> {editDoubtImagePreview ? "Change Image" : "Add Image"}
                                </Button>
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
                            {d.answer && editingDoubtId !== d.id && (
                              <div className="mt-3 p-3 rounded bg-success/10 text-sm" ref={(el) => {
                                // Mark as viewed when student sees the answer
                                if (el && !d.viewedByStudent) {
                                  store.markDoubtViewed(d.id);
                                }
                              }}>
                                <p className="text-xs text-muted-foreground mb-1">Answer by {d.answeredBy}:</p>
                                <p>{d.answer}</p>
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
                <p className="text-lg font-medium">No solved doubts available yet</p>
                <p className="text-sm">Come back later to learn from your peers!</p>
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

                          {/* Question image */}
                          {d.questionImageUrl && (
                            <div>
                              <img src={d.questionImageUrl} alt="Question" className="w-full max-h-64 object-contain rounded-lg border" />
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

                          {/* Footer: asked by + actions */}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <p className="text-xs text-muted-foreground">Asked by {d.studentName}</p>
                            <div className="flex items-center gap-2">
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
          <Button
            variant="ghost" size="sm" className="h-7 px-2 gap-1"
            onClick={() => store.toggleHelpful(student.registrationNumber, d.id)}
          >
            <ThumbsUp className={`h-3.5 w-3.5 ${isHelpful(d.id) ? "fill-primary text-primary" : ""}`} />
            <span className="text-xs">{d.helpfulCount || 0}</span>
          </Button>
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
