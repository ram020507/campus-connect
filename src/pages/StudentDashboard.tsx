import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSupabaseData, type StudentAccount } from "@/hooks/useSupabaseData";
import { useStudentNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, Video, LogOut, MessageCircle, ArrowLeft, Send, CheckCircle2, Play, Loader2, RefreshCw, ImagePlus, X, Download, FileText, Search, FolderOpen, ChevronDown, ChevronRight
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type View = "dashboard" | "subjects" | "videos" | "video-player" | "doubts" | "shared-knowledge";

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
    // If navigated from notification, go directly to doubts view
    return searchParams.get("doubtId") ? "doubts" : "dashboard";
  });
  const [selectedSemester, setSelectedSemester] = useState<"odd" | "even">("odd");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedVideoUrl, setSelectedVideoUrl] = useState("");
  const [selectedVideoTitle, setSelectedVideoTitle] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [doubtSubject, setDoubtSubject] = useState("");
  const [doubtText, setDoubtText] = useState("");
  const [doubtImage, setDoubtImage] = useState<File | null>(null);
  const [doubtImagePreview, setDoubtImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [doubtSearch, setDoubtSearch] = useState<Record<string, string>>({});
  const [sharedSearch, setSharedSearch] = useState<Record<string, string>>({});
  const [expandedDoubtSubjects, setExpandedDoubtSubjects] = useState<Record<string, boolean>>({});
  const [expandedSharedSubjects, setExpandedSharedSubjects] = useState<Record<string, boolean>>({});
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [similarDoubts, setSimilarDoubts] = useState<ReturnType<typeof store.searchSimilarDoubts>>([]);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time duplicate detection on text input with subject/year/department filtering
  useEffect(() => {
    const searchText = `${doubtText} ${ocrText}`.trim();
    if (searchText.length >= 5 && student) {
      const results = store.searchSimilarDoubts(searchText, {
        subjectName: doubtSubject || undefined,
        studentYear: student.year,
        studentDepartment: student.department,
      });
      setSimilarDoubts(results);
    } else {
      setSimilarDoubts([]);
    }
  }, [doubtText, ocrText, doubtSubject, store.doubts]);

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

  const answeredDoubts = store.doubts.filter(
    (d) => d.answer && d.studentYear === student.year && d.studentDepartment === student.department
  );

  const handleLogout = () => {
    sessionStorage.removeItem("student-auth");
    navigate("/");
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDoubtImage(file);
      setDoubtImagePreview(URL.createObjectURL(file));
      // Upload image first, then run OCR
      setOcrProcessing(true);
      try {
        const url = await store.uploadDoubtImage(file);
        if (url) {
          const text = await store.extractOcrText(url);
          setOcrText(text);
          // Store the uploaded URL for later use
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

  const handleSendDoubt = async () => {
    if (doubtSubject.trim() && (doubtText.trim() || doubtImage)) {
      setSending(true);
      // If image was already uploaded during OCR, use that URL
      let imageUrl: string | undefined;
      if (doubtImage && doubtImagePreview?.startsWith("http")) {
        imageUrl = doubtImagePreview;
      } else if (doubtImage) {
        const url = await store.uploadDoubtImage(doubtImage);
        if (url) imageUrl = url;
      }
      await store.addDoubt({
        studentName: student.name,
        studentRegNo: student.registrationNumber,
        studentYear: student.year,
        studentDepartment: student.department,
        studentCollege: student.collegeName,
        subjectName: doubtSubject.trim(),
        question: doubtText.trim(),
        questionImageUrl: imageUrl,
        ocrText: ocrText || undefined,
      });
      setDoubtText("");
      setDoubtSubject("");
      clearImage();
      setSimilarDoubts([]);
      setSending(false);
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
            {/* Downloadable files */}
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
              <CardContent className="space-y-3">
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
                <Textarea placeholder="Type your doubt here..." value={doubtText} onChange={(e) => setDoubtText(e.target.value)} rows={4} />
                
                {/* OCR processing indicator */}
                {ocrProcessing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded bg-secondary/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting text from image...
                  </div>
                )}

                {/* OCR extracted text */}
                {ocrText && !ocrProcessing && (
                  <div className="p-2 rounded bg-secondary/50 text-xs text-muted-foreground">
                    <p className="font-semibold mb-1 flex items-center gap-1"><FileText className="h-3 w-3" /> OCR Extracted Text:</p>
                    <p className="line-clamp-3">{ocrText}</p>
                  </div>
                )}

                {/* Similar doubts suggestions */}
                {similarDoubts.length > 0 && (
                  <div className="border rounded-md p-3 bg-accent/5 space-y-2">
                    <p className="text-xs font-semibold text-accent flex items-center gap-1">
                      <Search className="h-3 w-3" /> Similar answered doubts found:
                    </p>
                    {similarDoubts.map((sd) => (
                      <div key={sd.id} className="border rounded p-2 bg-card text-sm cursor-pointer hover:bg-accent/10 transition-colors"
                        onClick={() => setExpandedSuggestion(expandedSuggestion === sd.id ? null : sd.id)}>
                        <p className="font-medium text-xs">{sd.question}</p>
                        <span className="text-xs text-muted-foreground">{sd.subjectName}</span>
                        {expandedSuggestion === sd.id && (
                          <div className="mt-2 p-2 rounded bg-success/10 text-xs space-y-2">
                            {sd.questionImageUrl && (
                              <div>
                                <p className="font-semibold text-muted-foreground mb-1">Question Image:</p>
                                <img src={sd.questionImageUrl} alt="Question" className="max-h-32 rounded border" />
                              </div>
                            )}
                            <p className="font-semibold text-muted-foreground mb-1">Answer by {sd.answeredBy}:</p>
                            <p>{sd.answer}</p>
                            {sd.answerImageUrl && (
                              <div className="mt-2">
                                <img src={sd.answerImageUrl} alt="Answer" className="max-h-32 rounded border" />
                                <a href={sd.answerImageUrl} download className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                                  <Download className="h-3 w-3" /> Download
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Image upload */}
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageSelect} />
                {doubtImagePreview ? (
                  <div className="relative inline-block">
                    <img src={doubtImagePreview} alt="Doubt attachment" className="max-h-40 rounded border" />
                    <button onClick={clearImage} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <ImagePlus className="h-4 w-4 mr-1" /> Attach Photo
                  </Button>
                )}

                <Button onClick={handleSendDoubt} disabled={!doubtSubject.trim() || (!doubtText.trim() && !doubtImage) || sending || ocrProcessing}>
                  {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send Doubt
                </Button>
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
                            </div>
                            <p className="text-sm font-medium mt-1">{d.question}</p>
                            {d.questionImageUrl && (
                              <div className="mt-2">
                                <img src={d.questionImageUrl} alt="Doubt attachment" className="max-h-48 rounded border" />
                              </div>
                            )}
                            {d.answer && (
                              <div className="mt-3 p-3 rounded bg-success/10 text-sm">
                                <p className="text-xs text-muted-foreground mb-1">Answer by {d.answeredBy}:</p>
                                <p>{d.answer}</p>
                                {d.answerImageUrl && (
                                  <div className="mt-2">
                                    <img src={d.answerImageUrl} alt="Answer attachment" className="max-h-48 rounded border" />
                                    <a href={d.answerImageUrl} download className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                                      <Download className="h-3 w-3" /> Download Image
                                    </a>
                                  </div>
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

        {view === "shared-knowledge" && (
          <div className="space-y-4 animate-fade-in">
            <Button variant="ghost" size="sm" onClick={() => setView("dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h2 className="font-display font-semibold text-lg">Shared Knowledge</h2>
            <p className="text-sm text-muted-foreground">Answered doubts from your year & department</p>
            {(() => {
              const subjectGroups = answeredDoubts.reduce<Record<string, typeof answeredDoubts>>((acc, d) => {
                (acc[d.subjectName] = acc[d.subjectName] || []).push(d);
                return acc;
              }, {});
              const subjectNames = Object.keys(subjectGroups).sort();
              if (subjectNames.length === 0) return <p className="text-center text-muted-foreground py-8">No answered doubts yet.</p>;
              return subjectNames.map((subj) => {
                const isOpen = expandedSharedSubjects[subj] ?? false;
                const search = sharedSearch[subj] || "";
                const filtered = subjectGroups[subj]
                  .filter((d) => {
                    if (!search.trim()) return true;
                    const q = search.toLowerCase();
                    return d.question.toLowerCase().includes(q) || d.answer?.toLowerCase().includes(q) || d.studentName.toLowerCase().includes(q);
                  })
                  .sort((a, b) => new Date(b.answeredAt!).getTime() - new Date(a.answeredAt!).getTime());
                return (
                  <Card key={subj}>
                    <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-accent/5 transition-colors"
                      onClick={() => setExpandedSharedSubjects((prev) => ({ ...prev, [subj]: !isOpen }))}>
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <FolderOpen className="h-4 w-4 text-success" />
                      <span className="font-semibold text-sm flex-1">{subj}</span>
                      <span className="text-xs text-muted-foreground">{subjectGroups[subj].length} answer(s)</span>
                    </div>
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder={`Search in ${subj}...`} value={search}
                            onChange={(e) => setSharedSearch((prev) => ({ ...prev, [subj]: e.target.value }))} className="pl-9" />
                        </div>
                        {filtered.length === 0 ? (
                          <p className="text-center text-muted-foreground text-sm py-4">No matching doubts.</p>
                        ) : filtered.map((d) => (
                          <div key={d.id} className="border rounded-lg p-3 border-success/30">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-muted-foreground">by {d.studentName}</span>
                              <span className="text-xs text-muted-foreground ml-auto">{new Date(d.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm font-medium">{d.question}</p>
                            {d.questionImageUrl && (
                              <div>
                                <img src={d.questionImageUrl} alt="Doubt attachment" className="mt-2 max-h-48 rounded border" />
                                {d.studentRegNo !== student.registrationNumber && (
                                  <a href={d.questionImageUrl} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                                    <Download className="h-3 w-3" /> Download Image
                                  </a>
                                )}
                              </div>
                            )}
                            <div className="mt-3 p-3 rounded bg-success/10 text-sm">
                              <p className="text-xs text-muted-foreground mb-1">Answer by {d.answeredBy}:</p>
                              <p>{d.answer}</p>
                              {d.answerImageUrl && (
                                <div>
                                  <img src={d.answerImageUrl} alt="Answer attachment" className="mt-2 max-h-48 rounded border" />
                                  {d.studentRegNo !== student.registrationNumber && (
                                    <a href={d.answerImageUrl} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                                      <Download className="h-3 w-3" /> Download Image
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
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
      </div>
    </div>
  );
};

export default StudentDashboard;
