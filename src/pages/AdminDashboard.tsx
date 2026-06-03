import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseData, StudentAccount, TeacherAccount, getTeacherSubjects } from "@/hooks/useSupabaseData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2, Plus, Trash2, LogOut, Users, GraduationCap,
  FolderOpen, Video, ArrowLeft, Loader2, RefreshCw, Pencil, X, Check, Upload, FileText
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Tab = "content" | "students" | "teachers";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const store = useSupabaseData();
  const [tab, setTab] = useState<Tab>("content");

  // ===== CONTENT tab filters =====
  const [cCollegeId, setCCollegeId] = useState("");
  const [cYearId, setCYearId] = useState("");
  const [cDeptId, setCDeptId] = useState("");
  const [cSubjectId, setCSubjectId] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ===== STUDENTS tab filters & form =====
  const [sCollegeId, setSCollegeId] = useState("");
  const [sYearId, setSYearId] = useState("");
  const [sDeptId, setSDeptId] = useState("");
  const [studentRegNo, setStudentRegNo] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentDob, setStudentDob] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editStudentData, setEditStudentData] = useState<Partial<Omit<StudentAccount, "id">>>({});

  // ===== TEACHERS tab filters & form =====
  const [tCollegeId, setTCollegeId] = useState("");
  const [tFilterSubject, setTFilterSubject] = useState<string>("all");
  const [teacherStaffId, setTeacherStaffId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherDob, setTeacherDob] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherSelectedSubjects, setTeacherSelectedSubjects] = useState<string[]>([]);
  const [editingTeacher, setEditingTeacher] = useState<string | null>(null);
  const [editTeacherData, setEditTeacherData] = useState<Partial<Omit<TeacherAccount, "id">>>({});

  const handleLogout = () => { sessionStorage.removeItem("admin-auth"); navigate("/"); };

  const formatDob = (val: string) => {
    let v = val.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length >= 5) return v.slice(0, 2) + "-" + v.slice(2, 4) + "-" + v.slice(4);
    if (v.length >= 3) return v.slice(0, 2) + "-" + v.slice(2);
    return v;
  };

  // CONTENT lookups
  const cCollege = store.colleges.find((c) => c.id === cCollegeId);
  const cYear = cCollege?.years.find((y) => y.id === cYearId);
  const cDept = cYear?.departments.find((d) => d.id === cDeptId);
  const cSubject = cDept?.subjects.find((s) => s.id === cSubjectId);

  // STUDENTS lookups
  const sCollege = store.colleges.find((c) => c.id === sCollegeId);
  const sYear = sCollege?.years.find((y) => y.id === sYearId);
  const sDept = sYear?.departments.find((d) => d.id === sDeptId);

  // TEACHERS lookups
  const tCollege = store.colleges.find((c) => c.id === tCollegeId);
  const teacherCollegeSubjects = useMemo(() => {
    if (!tCollege) return [] as string[];
    const out: string[] = [];
    tCollege.years.forEach((y) =>
      y.departments.forEach((d) =>
        d.subjects.forEach((s) => { if (!out.includes(s.name)) out.push(s.name); })
      )
    );
    return out.sort();
  }, [tCollege]);

  const handleFileUpload = async (videoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading((p) => ({ ...p, [videoId]: true }));
    await store.uploadVideoFile(videoId, file);
    setUploading((p) => ({ ...p, [videoId]: false }));
    if (fileInputRefs.current[videoId]) fileInputRefs.current[videoId]!.value = "";
  };

  // Quick-add helpers (so dropdowns can still be populated without leaving page)
  const quickAddCollege = async () => {
    const name = prompt("New college name");
    if (name?.trim()) await store.addCollege(name.trim());
  };
  const quickAddYear = async (collegeId: string, existing: number[]) => {
    const opts = [1, 2, 3, 4].filter((y) => !existing.includes(y));
    if (!opts.length) return alert("All years already added");
    const yr = prompt(`New year (${opts.join(", ")})`);
    const n = Number(yr);
    if (opts.includes(n)) await store.addYear(collegeId, n);
  };
  const quickAddDept = async (collegeId: string, yearId: string) => {
    const name = prompt("Department name (e.g., CSE)");
    if (name?.trim()) await store.addDepartment(collegeId, yearId, name.trim());
  };
  const quickAddSubject = async (collegeId: string, yearId: string, deptId: string) => {
    const name = prompt("Subject name");
    if (!name?.trim()) return;
    const sem = prompt("Semester (odd / even)", "odd");
    const semester = sem === "even" ? "even" : "odd";
    await store.addSubject(collegeId, yearId, deptId, name.trim(), semester);
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
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-10">
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

      {/* Tabs */}
      <div className="border-b bg-card px-2 sm:px-4 flex gap-1 overflow-x-auto sticky top-[57px] z-10">
        {([
          { key: "content", label: "Content Management", icon: FolderOpen },
          { key: "students", label: "Student Accounts", icon: Users },
          { key: "teachers", label: "Teacher Management", icon: GraduationCap },
        ] as { key: Tab; label: string; icon: typeof FolderOpen }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">

        {/* ============================ CONTENT MANAGEMENT ============================ */}
        {tab === "content" && (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader><CardTitle className="text-lg font-display">Select Location</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* College */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">College</label>
                    <div className="flex gap-1 mt-1">
                      <Select value={cCollegeId} onValueChange={(v) => { setCCollegeId(v); setCYearId(""); setCDeptId(""); setCSubjectId(""); }}>
                        <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
                        <SelectContent>
                          {store.colleges.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" onClick={quickAddCollege} title="Add college"><Plus className="h-4 w-4" /></Button>
                      {cCollege && (
                        <>
                          <Button variant="outline" size="icon" title="Rename college" onClick={() => {
                            const name = prompt("New college name", cCollege.name);
                            if (name?.trim()) store.updateCollege(cCollege.id, name.trim());
                          }}><Pencil className="h-4 w-4" /></Button>
                          <ConfirmDelete title={`Delete ${cCollege.name}?`}
                            desc="This permanently removes the college and all its years, departments, subjects, and videos."
                            onConfirm={() => { store.removeCollege(cCollege.id); setCCollegeId(""); setCYearId(""); setCDeptId(""); setCSubjectId(""); }} />
                        </>
                      )}
                    </div>
                  </div>
                  {/* Year */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Year</label>
                    <div className="flex gap-1 mt-1">
                      <Select value={cYearId} onValueChange={(v) => { setCYearId(v); setCDeptId(""); setCSubjectId(""); }} disabled={!cCollege}>
                        <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                        <SelectContent>
                          {cCollege?.years.slice().sort((a, b) => a.yearNumber - b.yearNumber).map((y) => (
                            <SelectItem key={y.id} value={y.id}>Year {y.yearNumber}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" disabled={!cCollege}
                        onClick={() => cCollege && quickAddYear(cCollege.id, cCollege.years.map((y) => y.yearNumber))}><Plus className="h-4 w-4" /></Button>
                      {cYear && (
                        <>
                          <Button variant="outline" size="icon" title="Change year number" onClick={() => {
                            const v = prompt("New year number (1-4)", String(cYear.yearNumber));
                            const n = Number(v);
                            if ([1,2,3,4].includes(n)) store.updateYear(cYear.id, n);
                          }}><Pencil className="h-4 w-4" /></Button>
                          <ConfirmDelete title={`Delete Year ${cYear.yearNumber}?`}
                            desc="This permanently removes the year and all its departments, subjects, and videos."
                            onConfirm={() => { store.removeYear(cCollege!.id, cYear.id); setCYearId(""); setCDeptId(""); setCSubjectId(""); }} />
                        </>
                      )}
                    </div>
                  </div>
                  {/* Department */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Department</label>
                    <div className="flex gap-1 mt-1">
                      <Select value={cDeptId} onValueChange={(v) => { setCDeptId(v); setCSubjectId(""); }} disabled={!cYear}>
                        <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                        <SelectContent>
                          {cYear?.departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" disabled={!cYear}
                        onClick={() => cCollege && cYear && quickAddDept(cCollege.id, cYear.id)}><Plus className="h-4 w-4" /></Button>
                      {cDept && (
                        <>
                          <Button variant="outline" size="icon" title="Rename department" onClick={() => {
                            const name = prompt("New department name", cDept.name);
                            if (name?.trim()) store.updateDepartment(cDept.id, name.trim());
                          }}><Pencil className="h-4 w-4" /></Button>
                          <ConfirmDelete title={`Delete ${cDept.name}?`}
                            desc="This permanently removes the department and all its subjects and videos."
                            onConfirm={() => { store.removeDepartment(cCollege!.id, cYear!.id, cDept.id); setCDeptId(""); setCSubjectId(""); }} />
                        </>
                      )}
                    </div>
                  </div>
                  {/* Subject */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Subject</label>
                    <div className="flex gap-1 mt-1">
                      <Select value={cSubjectId} onValueChange={setCSubjectId} disabled={!cDept}>
                        <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                        <SelectContent>
                          {cDept?.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.semester})</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" disabled={!cDept}
                        onClick={() => cCollege && cYear && cDept && quickAddSubject(cCollege.id, cYear.id, cDept.id)}><Plus className="h-4 w-4" /></Button>
                      {cSubject && (
                        <>
                          <Button variant="outline" size="icon" title="Rename subject" onClick={() => {
                            const name = prompt("New subject name", cSubject.name);
                            if (name?.trim()) store.updateSubject(cSubject.id, name.trim());
                          }}><Pencil className="h-4 w-4" /></Button>
                          <ConfirmDelete title={`Delete ${cSubject.name}?`}
                            desc="This permanently removes the subject and all its videos and notes."
                            onConfirm={() => { store.removeSubject(cCollege!.id, cYear!.id, cDept!.id, cSubject.id); setCSubjectId(""); }} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload section */}
            {cSubject ? (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-lg font-display">Add Video</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Video Title</label>
                        <Input value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} placeholder="e.g., Intro to Variables" className="mt-1" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Video URL</label>
                        <Input value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} placeholder="https://..." className="mt-1" />
                      </div>
                    </div>
                    <Button onClick={() => {
                      if (newVideoTitle.trim() && newVideoUrl.trim()) {
                        store.addVideo(cCollegeId, cYearId, cDeptId, cSubjectId, newVideoTitle.trim(), newVideoUrl.trim());
                        setNewVideoTitle(""); setNewVideoUrl("");
                      }
                    }}>
                      <Plus className="h-4 w-4 mr-1" /> Add Video
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <h3 className="font-display font-semibold text-lg">Uploaded Content ({cSubject.videos.length})</h3>
                  {cSubject.videos.map((v) => (
                    <Card key={v.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <Video className="h-5 w-5 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{v.title}</p>
                              <a href={v.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground truncate block hover:text-primary">{v.url}</a>
                            </div>
                          </div>
                          <ConfirmDelete title="Delete Video?" desc="This will remove the video and its notes."
                            onConfirm={() => store.removeVideo(cCollegeId, cYearId, cDeptId, cSubjectId, v.id)} />
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx" className="hidden"
                              ref={(el) => { fileInputRefs.current[v.id] = el; }}
                              onChange={(e) => handleFileUpload(v.id, e)} />
                            <Button variant="outline" size="sm" onClick={() => fileInputRefs.current[v.id]?.click()} disabled={uploading[v.id]}>
                              {uploading[v.id] ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                              Upload Notes
                            </Button>
                            <span className="text-xs text-muted-foreground">PDF, DOCX, PPT</span>
                          </div>
                          {v.files.length > 0 && (
                            <div className="space-y-1">
                              {v.files.map((f) => (
                                <div key={f.id} className="flex items-center gap-2 text-sm bg-muted/40 rounded px-2 py-1">
                                  <FileText className="h-3 w-3 text-muted-foreground" />
                                  <a href={f.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex-1 truncate">{f.fileName}</a>
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
                  {cSubject.videos.length === 0 && <p className="text-center text-muted-foreground py-6">No videos yet.</p>}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Select college, year, department, and subject to upload content.
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ============================ STUDENT ACCOUNTS ============================ */}
        {tab === "students" && (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader><CardTitle className="text-lg font-display">Select Location</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">College</label>
                    <Select value={sCollegeId} onValueChange={(v) => { setSCollegeId(v); setSYearId(""); setSDeptId(""); }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select college" /></SelectTrigger>
                      <SelectContent>
                        {store.colleges.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Year</label>
                    <Select value={sYearId} onValueChange={(v) => { setSYearId(v); setSDeptId(""); }} disabled={!sCollege}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select year" /></SelectTrigger>
                      <SelectContent>
                        {sCollege?.years.slice().sort((a, b) => a.yearNumber - b.yearNumber).map((y) => (
                          <SelectItem key={y.id} value={y.id}>Year {y.yearNumber}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Department</label>
                    <Select value={sDeptId} onValueChange={setSDeptId} disabled={!sYear}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select dept" /></SelectTrigger>
                      <SelectContent>
                        {sYear?.departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {sCollege && sYear && sDept ? (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-lg font-display">Create Student Account</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input placeholder="Registration Number" value={studentRegNo} inputMode="numeric"
                        onChange={(e) => setStudentRegNo(e.target.value.replace(/\D/g, ""))} />
                      <Input placeholder="Student Name" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                      <Input placeholder="DOB (DD-MM-YYYY)" value={studentDob} maxLength={10} inputMode="numeric"
                        onChange={(e) => setStudentDob(formatDob(e.target.value))} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {sCollege.name} · Year {sYear.yearNumber} · {sDept.name}
                    </p>
                    <Button className="mt-3" onClick={() => {
                      if (studentRegNo && studentName && studentDob) {
                        store.addStudent({
                          registrationNumber: studentRegNo, name: studentName, dob: studentDob,
                          email: "", collegeName: sCollege.name, department: sDept.name, year: sYear.yearNumber,
                        });
                        setStudentRegNo(""); setStudentName(""); setStudentDob("");
                      }
                    }}><Plus className="h-4 w-4 mr-1" /> Create Account</Button>
                  </CardContent>
                </Card>

                {(() => {
                  const list = store.students.filter((s) => s.collegeName === sCollege.name && s.year === sYear.yearNumber && s.department === sDept.name);
                  return (
                    <div className="space-y-2">
                      <h3 className="font-display font-semibold text-lg">Students ({list.length})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {list.map((s) => (
                          <Card key={s.id}>
                            <CardContent className="p-3">
                              {editingStudent === s.id ? (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <Input placeholder="Reg No" value={editStudentData.registrationNumber ?? ""} inputMode="numeric"
                                      onChange={(e) => setEditStudentData((d) => ({ ...d, registrationNumber: e.target.value.replace(/\D/g, "") }))} />
                                    <Input placeholder="Name" value={editStudentData.name ?? ""}
                                      onChange={(e) => setEditStudentData((d) => ({ ...d, name: e.target.value }))} />
                                    <Input placeholder="DOB" value={editStudentData.dob ?? ""} maxLength={10} inputMode="numeric"
                                      onChange={(e) => setEditStudentData((d) => ({ ...d, dob: formatDob(e.target.value) }))} />
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
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm min-w-0">
                                    <p className="font-medium truncate">{s.name} <span className="text-muted-foreground">#{s.registrationNumber}</span></p>
                                    <p className="text-xs text-muted-foreground">Year {s.year} · {s.department}</p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button variant="ghost" size="icon" onClick={() => {
                                      setEditingStudent(s.id);
                                      setEditStudentData({ registrationNumber: s.registrationNumber, name: s.name, dob: s.dob, email: s.email, collegeName: s.collegeName, department: s.department, year: s.year });
                                    }}><Pencil className="h-4 w-4 text-primary" /></Button>
                                    <ConfirmDelete title={`Delete ${s.name}?`}
                                      desc="This removes the student account, their doubts, and related data from teacher and learning feed sections."
                                      onConfirm={() => store.removeStudent(s.id)} />
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {list.length === 0 && <p className="text-center text-muted-foreground py-6">No students yet.</p>}
                    </div>
                  );
                })()}
              </>
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Select college, year and department to manage students.</CardContent></Card>
            )}
          </div>
        )}

        {/* ============================ TEACHER MANAGEMENT ============================ */}
        {tab === "teachers" && (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader><CardTitle className="text-lg font-display">Select Location</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">College</label>
                    <Select value={tCollegeId} onValueChange={(v) => { setTCollegeId(v); setTFilterSubject("all"); }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select college" /></SelectTrigger>
                      <SelectContent>
                        {store.colleges.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Subject (filter)</label>
                    <Select value={tFilterSubject} onValueChange={setTFilterSubject} disabled={!tCollege}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="All subjects" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All subjects</SelectItem>
                        {teacherCollegeSubjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {tCollege ? (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-lg font-display">Create Teacher Account</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input placeholder="Staff ID" value={teacherStaffId} inputMode="numeric"
                        onChange={(e) => setTeacherStaffId(e.target.value.replace(/\D/g, ""))} />
                      <Input placeholder="Teacher Name" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
                      <Input placeholder="DOB (DD-MM-YYYY)" value={teacherDob} maxLength={10} inputMode="numeric"
                        onChange={(e) => setTeacherDob(formatDob(e.target.value))} />
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Assign Subjects</p>
                      {teacherCollegeSubjects.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No subjects in this college. Add some in Content Management.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {teacherCollegeSubjects.map((subj) => (
                            <label key={subj} className="flex items-center gap-2 cursor-pointer border rounded-md px-2 py-1.5 hover:bg-muted/40">
                              <Checkbox checked={teacherSelectedSubjects.includes(subj)}
                                onCheckedChange={() => setTeacherSelectedSubjects((prev) => prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj])} />
                              <span className="text-sm truncate">{subj}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">College: {tCollege.name}</p>
                    <Button className="mt-3" onClick={() => {
                      if (teacherStaffId && teacherName && teacherDob && teacherSelectedSubjects.length > 0) {
                        store.addTeacher({
                          staffId: teacherStaffId, name: teacherName, dob: teacherDob,
                          email: "", collegeName: tCollege.name,
                          subjectName: teacherSelectedSubjects.join(","),
                        });
                        setTeacherStaffId(""); setTeacherName(""); setTeacherDob("");
                        setTeacherSelectedSubjects([]);
                      }
                    }}><Plus className="h-4 w-4 mr-1" /> Create Account</Button>
                  </CardContent>
                </Card>

                {(() => {
                  const list = store.teachers.filter((t) => {
                    if (t.collegeName !== tCollege.name) return false;
                    if (tFilterSubject === "all") return true;
                    return getTeacherSubjects(t).includes(tFilterSubject);
                  });
                  return (
                    <div className="space-y-2">
                      <h3 className="font-display font-semibold text-lg">Teachers ({list.length})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {list.map((t) => (
                          <Card key={t.id}>
                            <CardContent className="p-3">
                              {editingTeacher === t.id ? (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <Input placeholder="Staff ID" value={editTeacherData.staffId ?? ""} inputMode="numeric"
                                      onChange={(e) => setEditTeacherData((d) => ({ ...d, staffId: e.target.value.replace(/\D/g, "") }))} />
                                    <Input placeholder="Name" value={editTeacherData.name ?? ""}
                                      onChange={(e) => setEditTeacherData((d) => ({ ...d, name: e.target.value }))} />
                                    <Input placeholder="DOB" value={editTeacherData.dob ?? ""} maxLength={10} inputMode="numeric"
                                      onChange={(e) => setEditTeacherData((d) => ({ ...d, dob: formatDob(e.target.value) }))} />
                                    <Input placeholder="Email" type="email" value={editTeacherData.email ?? ""}
                                      onChange={(e) => setEditTeacherData((d) => ({ ...d, email: e.target.value }))} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium mb-2">Subjects</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {teacherCollegeSubjects.map((subj) => {
                                        const cur = (editTeacherData.subjectName || "").split(",").map((s) => s.trim()).filter(Boolean);
                                        return (
                                          <label key={subj} className="flex items-center gap-2 cursor-pointer border rounded-md px-2 py-1.5">
                                            <Checkbox checked={cur.includes(subj)} onCheckedChange={() => {
                                              const next = cur.includes(subj) ? cur.filter((s) => s !== subj) : [...cur, subj];
                                              setEditTeacherData((d) => ({ ...d, subjectName: next.join(",") }));
                                            }} />
                                            <span className="text-sm truncate">{subj}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
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
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm min-w-0">
                                    <p className="font-medium truncate">{t.name} <span className="text-muted-foreground">#{t.staffId}</span></p>
                                    <p className="text-xs text-muted-foreground truncate">Subjects: {getTeacherSubjects(t).join(", ") || "—"}</p>
                                    {t.email && <p className="text-xs text-muted-foreground truncate">{t.email}</p>}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button variant="ghost" size="icon" onClick={() => {
                                      setEditingTeacher(t.id);
                                      setEditTeacherData({ staffId: t.staffId, name: t.name, dob: t.dob, email: t.email, collegeName: t.collegeName, subjectName: t.subjectName });
                                    }}><Pencil className="h-4 w-4 text-primary" /></Button>
                                    <ConfirmDelete title={`Delete ${t.name}?`}
                                      desc="This removes the teacher account, their answers in the doubt system and learning feed, and any active digital board sessions."
                                      onConfirm={() => store.removeTeacher(t.id)} />
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {list.length === 0 && <p className="text-center text-muted-foreground py-6">No teachers yet.</p>}
                    </div>
                  );
                })()}
              </>
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Select a college to manage teachers.</CardContent></Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable confirm-delete button with AlertDialog
function ConfirmDelete({ title, desc, onConfirm }: { title: string; desc: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AdminDashboard;
