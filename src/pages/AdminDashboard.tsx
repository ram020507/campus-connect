import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseData, StudentAccount, TeacherAccount } from "@/hooks/useSupabaseData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2, ChevronRight, Plus, Trash2, LogOut, Users, GraduationCap,
  FolderOpen, BookOpen, Video, ArrowLeft, Loader2, RefreshCw, Pencil, X, Check, Upload, FileText
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { Checkbox } from "@/components/ui/checkbox";
import { getTeacherSubjects } from "@/hooks/useSupabaseData";

type View = "colleges" | "years" | "departments" | "subjects" | "videos" | "students" | "students-college" | "students-year" | "students-dept" | "teachers" | "teachers-college";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const store = useSupabaseData();

  const [view, setView] = useState<View>("colleges");
  const [selectedCollege, setSelectedCollege] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  // Form states
  const [newCollegeName, setNewCollegeName] = useState("");
  const [newYearNum, setNewYearNum] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectSemester, setNewSubjectSemester] = useState<"odd" | "even">("odd");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");

  // Selected college for student/teacher folder navigation
  const [selectedStudentCollegeId, setSelectedStudentCollegeId] = useState("");
  const [selectedStudentYearId, setSelectedStudentYearId] = useState("");
  const [selectedStudentDeptId, setSelectedStudentDeptId] = useState("");
  const [selectedTeacherCollegeId, setSelectedTeacherCollegeId] = useState("");
  const [teacherSelectedSubjects, setTeacherSelectedSubjects] = useState<string[]>([]);

  // Student form
  const [studentRegNo, setStudentRegNo] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentDob, setStudentDob] = useState("");
  const [studentDept, setStudentDept] = useState("");
  const [studentYear, setStudentYear] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  // Teacher form
  const [teacherStaffId, setTeacherStaffId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherDob, setTeacherDob] = useState("");
  const [teacherSubject, setTeacherSubject] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");

  // Edit states
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editStudentData, setEditStudentData] = useState<Partial<Omit<StudentAccount, "id">>>({});
  const [editingTeacher, setEditingTeacher] = useState<string | null>(null);
  const [editTeacherData, setEditTeacherData] = useState<Partial<Omit<TeacherAccount, "id">>>({});

  // File upload states
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleLogout = () => {
    sessionStorage.removeItem("admin-auth");
    navigate("/");
  };

  const college = store.colleges.find((c) => c.id === selectedCollege);
  const year = college?.years.find((y) => y.id === selectedYear);
  const dept = year?.departments.find((d) => d.id === selectedDept);
  const subject = dept?.subjects.find((s) => s.id === selectedSubject);

  // Get college for student/teacher folder views
  const studentFolderCollege = store.colleges.find((c) => c.id === selectedStudentCollegeId);
  const teacherFolderCollege = store.colleges.find((c) => c.id === selectedTeacherCollegeId);

  // Breadcrumb
  const breadcrumbs: { label: string; onClick: () => void }[] = [
    { label: "Colleges", onClick: () => { setView("colleges"); setSelectedCollege(""); } },
  ];
  if (view !== "colleges" && view !== "students" && view !== "teachers" && college) {
    breadcrumbs.push({ label: college.name, onClick: () => { setView("years"); setSelectedYear(""); } });
  }
  if ((view === "departments" || view === "subjects" || view === "videos") && year) {
    breadcrumbs.push({ label: `Year ${year.yearNumber}`, onClick: () => { setView("departments"); setSelectedDept(""); } });
  }
  if ((view === "subjects" || view === "videos") && dept) {
    breadcrumbs.push({ label: dept.name, onClick: () => { setView("subjects"); setSelectedSubject(""); } });
  }
  if (view === "videos" && subject) {
    breadcrumbs.push({ label: subject.name, onClick: () => {} });
  }

  const formatDob = (val: string) => {
    let v = val.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length >= 5) return v.slice(0, 2) + "-" + v.slice(2, 4) + "-" + v.slice(4);
    if (v.length >= 3) return v.slice(0, 2) + "-" + v.slice(2);
    return v;
  };

  const handleFileUpload = async (videoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading((prev) => ({ ...prev, [videoId]: true }));
    await store.uploadVideoFile(videoId, file);
    setUploading((prev) => ({ ...prev, [videoId]: false }));
    if (fileInputRefs.current[videoId]) fileInputRefs.current[videoId]!.value = "";
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
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold font-display text-foreground">Admin Panel</h1>
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

      {/* Navigation Tabs */}
      <div className="border-b bg-card px-4 flex gap-1 overflow-x-auto">
        {[
          { key: "colleges" as View, label: "Content", icon: FolderOpen, matches: ["colleges", "years", "departments", "subjects", "videos"] },
          { key: "students" as View, label: "Students", icon: Users, matches: ["students", "students-college", "students-year", "students-dept"] },
          { key: "teachers" as View, label: "Teachers", icon: GraduationCap, matches: ["teachers", "teachers-college"] },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab.matches.includes(view)
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Breadcrumb */}
        {!["students", "students-college", "students-year", "students-dept", "teachers", "teachers-college", "teachers-subject"].includes(view) && (
          <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4 flex-wrap">
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <button onClick={bc.onClick} className="hover:text-primary transition-colors">
                  {bc.label}
                </button>
              </span>
            ))}
          </nav>
        )}

        {/* COLLEGES VIEW */}
        {view === "colleges" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex gap-2">
              <Input placeholder="New college name" value={newCollegeName} onChange={(e) => setNewCollegeName(e.target.value)} />
              <Button onClick={() => { if (newCollegeName.trim()) { store.addCollege(newCollegeName.trim()); setNewCollegeName(""); } }}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {store.colleges.map((c) => (
              <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedCollege(c.id); setView("years"); }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">({c.years.length} years)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); store.removeCollege(c.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
            {store.colleges.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No colleges added yet. Create one above.</p>
            )}
          </div>
        )}

        {/* YEARS VIEW */}
        {view === "years" && college && (
          <div className="space-y-4 animate-fade-in">
            <Button variant="ghost" size="sm" onClick={() => { setView("colleges"); setSelectedCollege(""); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex gap-2">
              <Select value={newYearNum} onValueChange={setNewYearNum}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].filter((y) => !college.years.find((yr) => yr.yearNumber === y)).map((y) => (
                    <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => { if (newYearNum) { store.addYear(selectedCollege, Number(newYearNum)); setNewYearNum(""); } }}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {college.years.sort((a, b) => a.yearNumber - b.yearNumber).map((y) => (
              <Card key={y.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedYear(y.id); setView("departments"); }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <span className="font-medium">Year {y.yearNumber}</span>
                    <span className="text-xs text-muted-foreground">({y.departments.length} depts)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); store.removeYear(selectedCollege, y.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* DEPARTMENTS VIEW */}
        {view === "departments" && college && year && (
          <div className="space-y-4 animate-fade-in">
            <Button variant="ghost" size="sm" onClick={() => { setView("years"); setSelectedYear(""); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex gap-2">
              <Input placeholder="Department name (e.g., CSE)" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} />
              <Button onClick={() => { if (newDeptName.trim()) { store.addDepartment(selectedCollege, selectedYear, newDeptName.trim()); setNewDeptName(""); } }}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {year.departments.map((d) => (
              <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedDept(d.id); setView("subjects"); }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <span className="font-medium">{d.name}</span>
                    <span className="text-xs text-muted-foreground">({d.subjects.length} subjects)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); store.removeDepartment(selectedCollege, selectedYear, d.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* SUBJECTS VIEW */}
        {view === "subjects" && college && year && dept && (
          <div className="space-y-4 animate-fade-in">
            <Button variant="ghost" size="sm" onClick={() => { setView("departments"); setSelectedDept(""); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex gap-2 flex-wrap">
              <Input placeholder="Subject name" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} className="flex-1 min-w-[120px]" />
              <Select value={newSubjectSemester} onValueChange={(v) => setNewSubjectSemester(v as "odd" | "even")}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="odd">Odd Sem</SelectItem>
                  <SelectItem value="even">Even Sem</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => {
                if (newSubjectName.trim()) {
                  store.addSubject(selectedCollege, selectedYear, selectedDept, newSubjectName.trim(), newSubjectSemester);
                  setNewSubjectName("");
                }
              }}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {dept.subjects.map((s) => (
              <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedSubject(s.id); setView("videos"); }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {s.semester === "odd" ? "Odd" : "Even"} Semester
                    </span>
                    <span className="text-xs text-muted-foreground">({s.videos.length} videos)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); store.removeSubject(selectedCollege, selectedYear, selectedDept, s.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* VIDEOS VIEW */}
        {view === "videos" && college && year && dept && subject && (
          <div className="space-y-4 animate-fade-in">
            <Button variant="ghost" size="sm" onClick={() => { setView("subjects"); setSelectedSubject(""); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex gap-2 flex-wrap">
              <Input placeholder="Video title" value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} className="flex-1 min-w-[120px]" />
              <Input placeholder="Video URL" value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} className="flex-1 min-w-[120px]" />
              <Button onClick={() => {
                if (newVideoTitle.trim() && newVideoUrl.trim()) {
                  store.addVideo(selectedCollege, selectedYear, selectedDept, selectedSubject, newVideoTitle.trim(), newVideoUrl.trim());
                  setNewVideoTitle("");
                  setNewVideoUrl("");
                }
              }}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {subject.videos.map((v) => (
              <Card key={v.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Video className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{v.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{v.url}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon"
                      onClick={() => store.removeVideo(selectedCollege, selectedYear, selectedDept, selectedSubject, v.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {/* File upload section */}
                  <div className="border-t pt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="file"
                        accept=".pdf,.ppt,.pptx,.doc,.docx"
                        className="hidden"
                        ref={(el) => { fileInputRefs.current[v.id] = el; }}
                        onChange={(e) => handleFileUpload(v.id, e)}
                      />
                      <Button variant="outline" size="sm" onClick={() => fileInputRefs.current[v.id]?.click()} disabled={uploading[v.id]}>
                        {uploading[v.id] ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                        Upload File
                      </Button>
                      <span className="text-xs text-muted-foreground">PDF, PPT, DOC</span>
                    </div>
                    {v.files.length > 0 && (
                      <div className="space-y-1">
                        {v.files.map((f) => (
                          <div key={f.id} className="flex items-center gap-2 text-sm">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex-1 truncate">{f.fileName}</a>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => store.removeVideoFile(f.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {subject.videos.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No videos yet. Add video links above.</p>
            )}
          </div>
        )}

        {/* STUDENTS - College List */}
        {view === "students" && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-display font-semibold text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Select College to Manage Students
            </h3>
            {store.colleges.map((c) => {
              const count = store.students.filter((s) => s.collegeName === c.name).length;
              return (
                <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setSelectedStudentCollegeId(c.id); setView("students-college"); }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">({count} students)</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}
            {store.colleges.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No colleges. Create colleges in the Content tab first.</p>
            )}
          </div>
        )}

        {/* STUDENTS - Year List inside College */}
        {view === "students-college" && studentFolderCollege && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setView("students"); setSelectedStudentCollegeId(""); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-display font-semibold text-lg">{studentFolderCollege.name} — Years</span>
            </div>
            {studentFolderCollege.years.sort((a, b) => a.yearNumber - b.yearNumber).map((y) => {
              const count = store.students.filter((s) => s.collegeName === studentFolderCollege.name && s.year === y.yearNumber).length;
              return (
                <Card key={y.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setSelectedStudentYearId(y.id); setView("students-year"); }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      <span className="font-medium">Year {y.yearNumber}</span>
                      <span className="text-xs text-muted-foreground">({count} students)</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}
            {studentFolderCollege.years.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No years configured for this college. Add years in the Content tab.</p>
            )}
          </div>
        )}

        {/* STUDENTS - Department List inside Year */}
        {view === "students-year" && studentFolderCollege && (() => {
          const sYear = studentFolderCollege.years.find((y) => y.id === selectedStudentYearId);
          if (!sYear) return null;
          return (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setView("students-college"); setSelectedStudentYearId(""); }}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <FolderOpen className="h-5 w-5 text-primary" />
                <span className="font-display font-semibold text-lg">{studentFolderCollege.name} — Year {sYear.yearNumber} — Departments</span>
              </div>
              {sYear.departments.map((d) => {
                const count = store.students.filter((s) => s.collegeName === studentFolderCollege.name && s.year === sYear.yearNumber && s.department === d.name).length;
                return (
                  <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => { setSelectedStudentDeptId(d.id); setStudentYear(String(sYear.yearNumber)); setStudentDept(d.name); setView("students-dept"); }}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        <span className="font-medium">{d.name}</span>
                        <span className="text-xs text-muted-foreground">({count} students)</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                );
              })}
              {sYear.departments.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No departments in this year. Add departments in the Content tab.</p>
              )}
            </div>
          );
        })()}

        {/* STUDENTS - Inside Year+Dept folder */}
        {view === "students-dept" && studentFolderCollege && (() => {
          const sYear = studentFolderCollege.years.find((y) => y.id === selectedStudentYearId);
          const sDept = sYear?.departments.find((d) => d.id === selectedStudentDeptId);
          if (!sYear || !sDept) return null;
          const folderStudents = store.students.filter((s) => s.collegeName === studentFolderCollege.name && s.year === sYear.yearNumber && s.department === sDept.name);
          return (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setView("students-year"); setSelectedStudentDeptId(""); }}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <FolderOpen className="h-5 w-5 text-primary" />
                <span className="font-display font-semibold text-lg">{studentFolderCollege.name} — Year {sYear.yearNumber} — {sDept.name}</span>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-lg font-display">Create Student Account</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input placeholder="Registration Number (numbers only)" value={studentRegNo}
                      onChange={(e) => setStudentRegNo(e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
                    <Input placeholder="Student Name" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                    <Input placeholder="DOB (DD-MM-YYYY)" value={studentDob} maxLength={10} inputMode="numeric"
                      onChange={(e) => setStudentDob(formatDob(e.target.value))} />
                    <Input placeholder="Email (optional)" type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Year: {sYear.yearNumber} · Department: {sDept.name} · College: {studentFolderCollege.name}</p>
                  <Button className="mt-3" onClick={() => {
                    if (studentRegNo && studentName && studentDob) {
                      store.addStudent({
                        registrationNumber: studentRegNo, name: studentName, dob: studentDob,
                        email: studentEmail, collegeName: studentFolderCollege.name, department: sDept.name, year: sYear.yearNumber,
                      });
                      setStudentRegNo(""); setStudentName(""); setStudentDob(""); setStudentEmail("");
                    }
                  }}>
                    <Plus className="h-4 w-4 mr-1" /> Create Account
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <h3 className="font-display font-semibold text-lg">Students ({folderStudents.length})</h3>
                {folderStudents.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="p-3">
                      {editingStudent === s.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input placeholder="Registration Number" value={editStudentData.registrationNumber ?? ""} onChange={(e) => setEditStudentData(d => ({ ...d, registrationNumber: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" />
                            <Input placeholder="Name" value={editStudentData.name ?? ""} onChange={(e) => setEditStudentData(d => ({ ...d, name: e.target.value }))} />
                            <Input placeholder="DOB (DD-MM-YYYY)" value={editStudentData.dob ?? ""} maxLength={10} inputMode="numeric" onChange={(e) => setEditStudentData(d => ({ ...d, dob: formatDob(e.target.value) }))} />
                            <Input placeholder="Email" type="email" value={editStudentData.email ?? ""} onChange={(e) => setEditStudentData(d => ({ ...d, email: e.target.value }))} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={async () => { await store.updateStudent(s.id, editStudentData); setEditingStudent(null); }}>
                              <Check className="h-4 w-4 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingStudent(null)}>
                              <X className="h-4 w-4 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <p className="font-medium">{s.name} <span className="text-muted-foreground">#{s.registrationNumber}</span></p>
                            <p className="text-xs text-muted-foreground">{s.department} · Year {s.year}</p>
                            {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingStudent(s.id); setEditStudentData({ registrationNumber: s.registrationNumber, name: s.name, dob: s.dob, email: s.email, collegeName: s.collegeName, department: s.department, year: s.year }); }}>
                              <Pencil className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => store.removeStudent(s.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {folderStudents.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No students in this folder yet.</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* TEACHERS - College List */}
        {view === "teachers" && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-display font-semibold text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" /> Select College to Manage Teachers
            </h3>
            {store.colleges.map((c) => {
              const count = store.teachers.filter((t) => t.collegeName === c.name).length;
              return (
                <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setSelectedTeacherCollegeId(c.id); setView("teachers-college"); }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">({count} teachers)</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}
            {store.colleges.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No colleges. Create colleges in the Content tab first.</p>
            )}
          </div>
        )}

        {/* TEACHERS - Subject folders inside College */}
        {view === "teachers-college" && teacherFolderCollege && (() => {
          const collegeTeachers = store.teachers.filter((t) => t.collegeName === teacherFolderCollege.name);
          const subjectNames = [...new Set(collegeTeachers.map((t) => t.subjectName))].sort();
          // Also include subjects from content hierarchy that have no teachers yet
          const allSubjects = new Set(subjectNames);
          teacherFolderCollege.years.forEach((y) =>
            y.departments.forEach((d) =>
              d.subjects.forEach((s) => allSubjects.add(s.name))
            )
          );
          const sortedSubjects = [...allSubjects].sort();
          return (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setView("teachers"); setSelectedTeacherCollegeId(""); }}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-display font-semibold text-lg">{teacherFolderCollege.name} — Subjects</span>
              </div>
              {sortedSubjects.map((subj) => {
                const count = collegeTeachers.filter((t) => t.subjectName === subj).length;
                return (
                  <Card key={subj} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => { setSelectedTeacherSubject(subj); setTeacherSubject(subj); setView("teachers-subject"); }}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <span className="font-medium">{subj}</span>
                        <span className="text-xs text-muted-foreground">({count} teachers)</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                );
              })}
              {sortedSubjects.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No subjects configured. Add subjects in the Content tab first.</p>
              )}
            </div>
          );
        })()}

        {/* TEACHERS - Inside Subject folder */}
        {view === "teachers-subject" && teacherFolderCollege && (() => {
          const subjectTeachers = store.teachers.filter((t) => t.collegeName === teacherFolderCollege.name && t.subjectName === selectedTeacherSubject);
          return (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setView("teachers-college"); setSelectedTeacherSubject(""); }}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-display font-semibold text-lg">{teacherFolderCollege.name} — {selectedTeacherSubject}</span>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-lg font-display">Create Teacher Account</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input placeholder="Staff ID (numbers only)" value={teacherStaffId}
                      onChange={(e) => setTeacherStaffId(e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
                    <Input placeholder="Teacher Name" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
                    <Input placeholder="DOB (DD-MM-YYYY)" value={teacherDob} maxLength={10} inputMode="numeric"
                      onChange={(e) => setTeacherDob(formatDob(e.target.value))} />
                    <Input placeholder="Email (optional)" type="email" value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Subject: {selectedTeacherSubject} · College: {teacherFolderCollege.name}</p>
                  <Button className="mt-3" onClick={() => {
                    if (teacherStaffId && teacherName && teacherDob) {
                      store.addTeacher({
                        staffId: teacherStaffId, name: teacherName, dob: teacherDob,
                        email: teacherEmail, collegeName: teacherFolderCollege.name, subjectName: selectedTeacherSubject,
                      });
                      setTeacherStaffId(""); setTeacherName(""); setTeacherDob(""); setTeacherEmail("");
                    }
                  }}>
                    <Plus className="h-4 w-4 mr-1" /> Create Account
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <h3 className="font-display font-semibold text-lg">Teachers ({subjectTeachers.length})</h3>
                {subjectTeachers.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="p-3">
                      {editingTeacher === t.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input placeholder="Staff ID" value={editTeacherData.staffId ?? ""} onChange={(e) => setEditTeacherData(d => ({ ...d, staffId: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" />
                            <Input placeholder="Name" value={editTeacherData.name ?? ""} onChange={(e) => setEditTeacherData(d => ({ ...d, name: e.target.value }))} />
                            <Input placeholder="DOB (DD-MM-YYYY)" value={editTeacherData.dob ?? ""} maxLength={10} inputMode="numeric" onChange={(e) => setEditTeacherData(d => ({ ...d, dob: formatDob(e.target.value) }))} />
                            <Input placeholder="Email" type="email" value={editTeacherData.email ?? ""} onChange={(e) => setEditTeacherData(d => ({ ...d, email: e.target.value }))} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={async () => { await store.updateTeacher(t.id, editTeacherData); setEditingTeacher(null); }}>
                              <Check className="h-4 w-4 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingTeacher(null)}>
                              <X className="h-4 w-4 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <p className="font-medium">{t.name} <span className="text-muted-foreground">#{t.staffId}</span></p>
                            <p className="text-xs text-muted-foreground">{t.subjectName}</p>
                            {t.email && <p className="text-xs text-muted-foreground">{t.email}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingTeacher(t.id); setEditTeacherData({ staffId: t.staffId, name: t.name, dob: t.dob, email: t.email, collegeName: t.collegeName, subjectName: t.subjectName }); }}>
                              <Pencil className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => store.removeTeacher(t.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {subjectTeachers.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No teachers for this subject yet.</p>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default AdminDashboard;
