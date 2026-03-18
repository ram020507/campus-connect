import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2, ChevronRight, Plus, Trash2, LogOut, Users, GraduationCap,
  FolderOpen, BookOpen, Video, ArrowLeft
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import * as db from "@/lib/supabase-helpers";
import type { College, Year, Department, Subject, VideoLecture, StudentAccount, TeacherAccount } from "@/lib/supabase-helpers";

type View = "colleges" | "years" | "departments" | "subjects" | "videos" | "students" | "teachers";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [view, setView] = useState<View>("colleges");
  const [colleges, setColleges] = useState<College[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [videos, setVideos] = useState<VideoLecture[]>([]);
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);

  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Form states
  const [newCollegeName, setNewCollegeName] = useState("");
  const [newYearNum, setNewYearNum] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectSemester, setNewSubjectSemester] = useState<"odd" | "even">("odd");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");

  const [studentRegNo, setStudentRegNo] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentDob, setStudentDob] = useState("");
  const [studentCollege, setStudentCollege] = useState("");
  const [studentDept, setStudentDept] = useState("");
  const [studentYear, setStudentYear] = useState("");

  const [teacherStaffId, setTeacherStaffId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherDob, setTeacherDob] = useState("");
  const [teacherCollege, setTeacherCollege] = useState("");
  const [teacherSubject, setTeacherSubject] = useState("");

  // Load data
  const loadColleges = useCallback(async () => {
    try { setColleges(await db.fetchColleges()); } catch (e: any) { toast.error(e.message); }
  }, []);

  const loadYears = useCallback(async (collegeId: string) => {
    try { setYears(await db.fetchYears(collegeId)); } catch (e: any) { toast.error(e.message); }
  }, []);

  const loadDepartments = useCallback(async (yearId: string) => {
    try { setDepartments(await db.fetchDepartments(yearId)); } catch (e: any) { toast.error(e.message); }
  }, []);

  const loadSubjects = useCallback(async (deptId: string) => {
    try { setSubjects(await db.fetchSubjects(deptId)); } catch (e: any) { toast.error(e.message); }
  }, []);

  const loadVideos = useCallback(async (subjectId: string) => {
    try { setVideos(await db.fetchVideos(subjectId)); } catch (e: any) { toast.error(e.message); }
  }, []);

  const loadStudents = useCallback(async () => {
    try { setStudents(await db.fetchStudents()); } catch (e: any) { toast.error(e.message); }
  }, []);

  const loadTeachers = useCallback(async () => {
    try { setTeachers(await db.fetchTeachers()); } catch (e: any) { toast.error(e.message); }
  }, []);

  useEffect(() => { loadColleges(); loadStudents(); loadTeachers(); }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("admin-auth");
    navigate("/");
  };

  const formatDob = (val: string) => {
    let v = val.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length >= 5) return v.slice(0, 2) + "-" + v.slice(2, 4) + "-" + v.slice(4);
    if (v.length >= 3) return v.slice(0, 2) + "-" + v.slice(2);
    return v;
  };

  // Breadcrumb
  const breadcrumbs: { label: string; onClick: () => void }[] = [
    { label: "Colleges", onClick: () => { setView("colleges"); setSelectedCollege(null); } },
  ];
  if (view !== "colleges" && view !== "students" && view !== "teachers" && selectedCollege) {
    breadcrumbs.push({ label: selectedCollege.name, onClick: () => { setView("years"); setSelectedYear(null); } });
  }
  if ((view === "departments" || view === "subjects" || view === "videos") && selectedYear) {
    breadcrumbs.push({ label: `Year ${selectedYear.year_number}`, onClick: () => { setView("departments"); setSelectedDept(null); } });
  }
  if ((view === "subjects" || view === "videos") && selectedDept) {
    breadcrumbs.push({ label: selectedDept.name, onClick: () => { setView("subjects"); setSelectedSubject(null); } });
  }
  if (view === "videos" && selectedSubject) {
    breadcrumbs.push({ label: selectedSubject.name, onClick: () => {} });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold font-display text-foreground">Admin Panel</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-1" /> Logout
        </Button>
      </header>

      <div className="border-b bg-card px-4 flex gap-1 overflow-x-auto">
        {[
          { key: "colleges" as View, label: "Content", icon: FolderOpen },
          { key: "students" as View, label: "Students", icon: Users },
          { key: "teachers" as View, label: "Teachers", icon: GraduationCap },
        ].map((tab) => (
          <button key={tab.key}
            onClick={() => setView(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              (view === tab.key || (tab.key === "colleges" && !["students", "teachers"].includes(view)))
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
        {!["students", "teachers"].includes(view) && (
          <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4 flex-wrap">
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <button onClick={bc.onClick} className="hover:text-primary transition-colors">{bc.label}</button>
              </span>
            ))}
          </nav>
        )}

        {/* COLLEGES */}
        {view === "colleges" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex gap-2">
              <Input placeholder="New college name" value={newCollegeName} onChange={(e) => setNewCollegeName(e.target.value)} />
              <Button onClick={async () => {
                if (newCollegeName.trim()) {
                  try { await db.addCollege(newCollegeName.trim()); setNewCollegeName(""); loadColleges(); toast.success("College added"); }
                  catch (e: any) { toast.error(e.message); }
                }
              }}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {colleges.map((c) => (
              <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={async () => { setSelectedCollege(c); setView("years"); await loadYears(c.id); }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-medium">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={async (e) => {
                      e.stopPropagation();
                      try { await db.removeCollege(c.id); loadColleges(); toast.success("College removed"); }
                      catch (e: any) { toast.error(e.message); }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
            {colleges.length === 0 && <p className="text-center text-muted-foreground py-8">No colleges added yet.</p>}
          </div>
        )}

        {/* YEARS */}
        {view === "years" && selectedCollege && (
          <div className="space-y-4 animate-fade-in">
            <Button variant="ghost" size="sm" onClick={() => { setView("colleges"); setSelectedCollege(null); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex gap-2">
              <Select value={newYearNum} onValueChange={setNewYearNum}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].filter((y) => !years.find((yr) => yr.year_number === y)).map((y) => (
                    <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={async () => {
                if (newYearNum && selectedCollege) {
                  try { await db.addYear(selectedCollege.id, Number(newYearNum)); setNewYearNum(""); loadYears(selectedCollege.id); toast.success("Year added"); }
                  catch (e: any) { toast.error(e.message); }
                }
              }}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {years.map((y) => (
              <Card key={y.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={async () => { setSelectedYear(y); setView("departments"); await loadDepartments(y.id); }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <span className="font-medium">Year {y.year_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={async (e) => {
                      e.stopPropagation();
                      try { await db.removeYear(y.id); loadYears(selectedCollege.id); toast.success("Year removed"); }
                      catch (e: any) { toast.error(e.message); }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* DEPARTMENTS */}
        {view === "departments" && selectedCollege && selectedYear && (
          <div className="space-y-4 animate-fade-in">
            <Button variant="ghost" size="sm" onClick={() => { setView("years"); setSelectedYear(null); loadYears(selectedCollege.id); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex gap-2">
              <Input placeholder="Department name (e.g., CSE)" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} />
              <Button onClick={async () => {
                if (newDeptName.trim()) {
                  try { await db.addDepartment(selectedYear.id, newDeptName.trim()); setNewDeptName(""); loadDepartments(selectedYear.id); toast.success("Department added"); }
                  catch (e: any) { toast.error(e.message); }
                }
              }}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {departments.map((d) => (
              <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={async () => { setSelectedDept(d); setView("subjects"); await loadSubjects(d.id); }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <span className="font-medium">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={async (e) => {
                      e.stopPropagation();
                      try { await db.removeDepartment(d.id); loadDepartments(selectedYear.id); toast.success("Department removed"); }
                      catch (e: any) { toast.error(e.message); }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* SUBJECTS */}
        {view === "subjects" && selectedDept && (
          <div className="space-y-4 animate-fade-in">
            <Button variant="ghost" size="sm" onClick={() => { setView("departments"); setSelectedDept(null); selectedYear && loadDepartments(selectedYear.id); }}>
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
              <Button onClick={async () => {
                if (newSubjectName.trim()) {
                  try { await db.addSubject(selectedDept.id, newSubjectName.trim(), newSubjectSemester); setNewSubjectName(""); loadSubjects(selectedDept.id); toast.success("Subject added"); }
                  catch (e: any) { toast.error(e.message); }
                }
              }}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {subjects.map((s) => (
              <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={async () => { setSelectedSubject(s); setView("videos"); await loadVideos(s.id); }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {s.semester === "odd" ? "Odd" : "Even"} Semester
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={async (e) => {
                      e.stopPropagation();
                      try { await db.removeSubject(s.id); loadSubjects(selectedDept.id); toast.success("Subject removed"); }
                      catch (e: any) { toast.error(e.message); }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* VIDEOS */}
        {view === "videos" && selectedSubject && (
          <div className="space-y-4 animate-fade-in">
            <Button variant="ghost" size="sm" onClick={() => { setView("subjects"); setSelectedSubject(null); selectedDept && loadSubjects(selectedDept.id); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex gap-2 flex-wrap">
              <Input placeholder="Video title" value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} className="flex-1 min-w-[120px]" />
              <Input placeholder="Video URL" value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} className="flex-1 min-w-[120px]" />
              <Button onClick={async () => {
                if (newVideoTitle.trim() && newVideoUrl.trim()) {
                  try { await db.addVideo(selectedSubject.id, newVideoTitle.trim(), newVideoUrl.trim()); setNewVideoTitle(""); setNewVideoUrl(""); loadVideos(selectedSubject.id); toast.success("Video added"); }
                  catch (e: any) { toast.error(e.message); }
                }
              }}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {videos.map((v) => (
              <Card key={v.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{v.title}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{v.url}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={async () => {
                    try { await db.removeVideo(v.id); loadVideos(selectedSubject.id); toast.success("Video removed"); }
                    catch (e: any) { toast.error(e.message); }
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {videos.length === 0 && <p className="text-center text-muted-foreground py-8">No videos yet. Add video links above.</p>}
          </div>
        )}

        {/* STUDENTS */}
        {view === "students" && (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader><CardTitle className="text-lg font-display">Create Student Account</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="Registration Number (numbers only)" value={studentRegNo}
                    onChange={(e) => setStudentRegNo(e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
                  <Input placeholder="Student Name" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                  <Input placeholder="DOB (DD-MM-YYYY)" value={studentDob} maxLength={10} inputMode="numeric"
                    onChange={(e) => setStudentDob(formatDob(e.target.value))} />
                  <Select value={studentCollege} onValueChange={setStudentCollege}>
                    <SelectTrigger><SelectValue placeholder="Select College" /></SelectTrigger>
                    <SelectContent>
                      {colleges.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Department (e.g., CSE)" value={studentDept} onChange={(e) => setStudentDept(e.target.value)} />
                  <Select value={studentYear} onValueChange={setStudentYear}>
                    <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((y) => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="mt-3" onClick={async () => {
                  if (studentRegNo && studentName && studentDob && studentCollege && studentDept && studentYear) {
                    try {
                      await db.addStudent({
                        registration_number: studentRegNo, name: studentName, dob: studentDob,
                        college_name: studentCollege, department: studentDept, year: Number(studentYear),
                      });
                      setStudentRegNo(""); setStudentName(""); setStudentDob("");
                      setStudentCollege(""); setStudentDept(""); setStudentYear("");
                      loadStudents();
                      toast.success("Student account created");
                    } catch (e: any) { toast.error(e.message); }
                  }
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Create Account
                </Button>
              </CardContent>
            </Card>
            <div className="space-y-2">
              <h3 className="font-display font-semibold text-lg">Student Accounts ({students.length})</h3>
              {students.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium">{s.name} <span className="text-muted-foreground">#{s.registration_number}</span></p>
                      <p className="text-xs text-muted-foreground">{s.college_name} · {s.department} · Year {s.year}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={async () => {
                      try { await db.removeStudent(s.id); loadStudents(); toast.success("Student removed"); }
                      catch (e: any) { toast.error(e.message); }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TEACHERS */}
        {view === "teachers" && (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader><CardTitle className="text-lg font-display">Create Teacher Account</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="Staff ID (numbers only)" value={teacherStaffId}
                    onChange={(e) => setTeacherStaffId(e.target.value.replace(/\D/g, ""))} inputMode="numeric" />
                  <Input placeholder="Teacher Name" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
                  <Input placeholder="DOB (DD-MM-YYYY)" value={teacherDob} maxLength={10} inputMode="numeric"
                    onChange={(e) => setTeacherDob(formatDob(e.target.value))} />
                  <Select value={teacherCollege} onValueChange={setTeacherCollege}>
                    <SelectTrigger><SelectValue placeholder="Select College" /></SelectTrigger>
                    <SelectContent>
                      {colleges.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Subject Name (e.g., M3)" value={teacherSubject} onChange={(e) => setTeacherSubject(e.target.value)} />
                </div>
                <Button className="mt-3" onClick={async () => {
                  if (teacherStaffId && teacherName && teacherDob && teacherCollege && teacherSubject) {
                    try {
                      await db.addTeacher({
                        staff_id: teacherStaffId, name: teacherName, dob: teacherDob,
                        college_name: teacherCollege, subject_name: teacherSubject,
                      });
                      setTeacherStaffId(""); setTeacherName(""); setTeacherDob("");
                      setTeacherCollege(""); setTeacherSubject("");
                      loadTeachers();
                      toast.success("Teacher account created");
                    } catch (e: any) { toast.error(e.message); }
                  }
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Create Account
                </Button>
              </CardContent>
            </Card>
            <div className="space-y-2">
              <h3 className="font-display font-semibold text-lg">Teacher Accounts ({teachers.length})</h3>
              {teachers.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium">{t.name} <span className="text-muted-foreground">#{t.staff_id}</span></p>
                      <p className="text-xs text-muted-foreground">{t.college_name} · {t.subject_name}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={async () => {
                      try { await db.removeTeacher(t.id); loadTeachers(); toast.success("Teacher removed"); }
                      catch (e: any) { toast.error(e.message); }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
