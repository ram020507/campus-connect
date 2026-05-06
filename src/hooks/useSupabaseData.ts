import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Types matching the nested structure the UI expects
export interface VideoLecture {
  id: string;
  title: string;
  url: string;
  addedAt: string;
  files: VideoFile[];
}

export interface VideoFile {
  id: string;
  videoId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  semester: "odd" | "even";
  videos: VideoLecture[];
}

export interface Department {
  id: string;
  name: string;
  subjects: Subject[];
}

export interface Year {
  id: string;
  yearNumber: number;
  departments: Department[];
}

export interface College {
  id: string;
  name: string;
  years: Year[];
}

export interface StudentAccount {
  id: string;
  registrationNumber: string;
  name: string;
  dob: string;
  email: string;
  collegeName: string;
  department: string;
  year: number;
}

export interface TeacherAccount {
  id: string;
  staffId: string;
  name: string;
  dob: string;
  email: string;
  collegeName: string;
  subjectName: string; // comma-separated for multi-subject
}

export interface Doubt {
  id: string;
  studentName: string;
  studentRegNo: string;
  studentYear: number;
  studentDepartment: string;
  studentCollege: string;
  subjectName: string;
  question: string;
  questionImageUrl?: string;
  answer?: string;
  answerImageUrl?: string;
  answerImageUrls?: string[];
  answeredBy?: string;
  claimedBy?: string;
  createdAt: string;
  answeredAt?: string;
  ocrText?: string;
  helpfulCount: number;
  viewedByStudent: boolean;
}

export interface SavedDoubt {
  id: string;
  studentRegNo: string;
  doubtId: string;
  createdAt: string;
}

/** Get array of subject names from comma-separated string */
export function getTeacherSubjects(teacher: TeacherAccount): string[] {
  return teacher.subjectName.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Check if a teacher handles a given subject */
export function teacherHandlesSubject(teacher: TeacherAccount, subjectName: string): boolean {
  return getTeacherSubjects(teacher).some(
    (s) => s.toLowerCase() === subjectName.toLowerCase()
  );
}

export function useSupabaseData() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [savedDoubts, setSavedDoubts] = useState<SavedDoubt[]>([]);
  const [helpfulByMe, setHelpfulByMe] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [collegesRes, yearsRes, deptsRes, subjectsRes, videosRes, videoFilesRes, studentsRes, teachersRes, doubtsRes, savedRes, helpfulRes] =
        await Promise.all([
          supabase.from("colleges").select("*"),
          supabase.from("years").select("*"),
          supabase.from("departments").select("*"),
          supabase.from("subjects").select("*"),
          supabase.from("videos").select("*"),
          supabase.from("video_files").select("*"),
          supabase.from("students").select("*"),
          supabase.from("teachers").select("*"),
          supabase.from("doubts").select("*"),
          supabase.from("saved_doubts").select("*"),
          supabase.from("doubt_helpful").select("*"),
        ]);

      const videoFilesData = (videoFilesRes.data || []).map((f: any) => ({
        id: f.id,
        videoId: f.video_id,
        fileName: f.file_name,
        fileUrl: f.file_url,
        fileType: f.file_type,
        uploadedAt: f.uploaded_at,
      }));

      const videosData = videosRes.data || [];
      const subjectsData = (subjectsRes.data || []).map((s) => ({
        id: s.id,
        name: s.name,
        semester: s.semester as "odd" | "even",
        videos: videosData
          .filter((v) => v.subject_id === s.id)
          .map((v) => ({
            id: v.id,
            title: v.title,
            url: v.url,
            addedAt: v.added_at,
            files: videoFilesData.filter((f: VideoFile) => f.videoId === v.id),
          })),
      }));
      const deptsData = (deptsRes.data || []).map((d) => ({
        id: d.id,
        name: d.name,
        subjects: subjectsData.filter((s) => {
          const raw = subjectsRes.data?.find((r) => r.id === s.id);
          return raw?.department_id === d.id;
        }),
      }));
      const yearsData = (yearsRes.data || []).map((y) => ({
        id: y.id,
        yearNumber: y.year_number,
        departments: deptsData.filter((d) => {
          const raw = deptsRes.data?.find((r) => r.id === d.id);
          return raw?.year_id === y.id;
        }),
      }));
      const collegesBuilt: College[] = (collegesRes.data || []).map((c) => ({
        id: c.id,
        name: c.name,
        years: yearsData.filter((y) => {
          const raw = yearsRes.data?.find((r) => r.id === y.id);
          return raw?.college_id === c.id;
        }),
      }));

      setColleges(collegesBuilt);

      setStudents(
        (studentsRes.data || []).map((s) => ({
          id: s.id,
          registrationNumber: s.registration_number,
          name: s.name,
          dob: s.dob,
          email: s.email || "",
          collegeName: s.college_name,
          department: s.department,
          year: s.year,
        }))
      );

      setTeachers(
        (teachersRes.data || []).map((t) => ({
          id: t.id,
          staffId: t.staff_id,
          name: t.name,
          dob: t.dob,
          email: t.email || "",
          collegeName: t.college_name,
          subjectName: t.subject_name,
        }))
      );

      setDoubts(
        (doubtsRes.data || []).map((d) => ({
          id: d.id,
          studentName: d.student_name,
          studentRegNo: d.student_reg_no,
          studentYear: d.student_year,
          studentDepartment: d.student_department,
          studentCollege: d.student_college,
          subjectName: d.subject_name,
          question: d.question,
          questionImageUrl: d.question_image_url || undefined,
          answer: d.answer || undefined,
          answerImageUrl: d.answer_image_url || undefined,
          answerImageUrls: (d as any).answer_image_urls || [],
          answeredBy: d.answered_by || undefined,
          claimedBy: d.claimed_by || undefined,
          createdAt: d.created_at,
          answeredAt: d.answered_at || undefined,
          ocrText: (d as any).ocr_text || undefined,
          helpfulCount: (d as any).helpful_count || 0,
          viewedByStudent: (d as any).viewed_by_student || false,
        }))
      );

      setSavedDoubts(
        (savedRes.data || []).map((s: any) => ({
          id: s.id,
          studentRegNo: s.student_reg_no,
          doubtId: s.doubt_id,
          createdAt: s.created_at,
        }))
      );

      setHelpfulByMe(
        (helpfulRes.data || []).map((h: any) => `${h.student_reg_no}:${h.doubt_id}`)
      );
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscription for doubts
  useEffect(() => {
    const channel = supabase
      .channel("doubts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "doubts" }, () => {
        fetchAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  // ---- MUTATIONS ----

  const addCollege = async (name: string) => {
    const { error } = await supabase.from("colleges").insert({ name });
    if (!error) await fetchAll();
  };

  const removeCollege = async (id: string) => {
    const yearsRes = await supabase.from("years").select("id").eq("college_id", id);
    for (const y of yearsRes.data || []) {
      const deptsRes = await supabase.from("departments").select("id").eq("year_id", y.id);
      for (const d of deptsRes.data || []) {
        const subsRes = await supabase.from("subjects").select("id").eq("department_id", d.id);
        for (const s of subsRes.data || []) {
          await supabase.from("videos").delete().eq("subject_id", s.id);
        }
        await supabase.from("subjects").delete().eq("department_id", d.id);
      }
      await supabase.from("departments").delete().eq("year_id", y.id);
    }
    await supabase.from("years").delete().eq("college_id", id);
    const { error } = await supabase.from("colleges").delete().eq("id", id);
    if (!error) await fetchAll();
  };

  const addYear = async (collegeId: string, yearNumber: number) => {
    const { error } = await supabase.from("years").insert({ college_id: collegeId, year_number: yearNumber });
    if (!error) await fetchAll();
  };

  const removeYear = async (_collegeId: string, yearId: string) => {
    const deptsRes = await supabase.from("departments").select("id").eq("year_id", yearId);
    for (const d of deptsRes.data || []) {
      const subsRes = await supabase.from("subjects").select("id").eq("department_id", d.id);
      for (const s of subsRes.data || []) {
        await supabase.from("videos").delete().eq("subject_id", s.id);
      }
      await supabase.from("subjects").delete().eq("department_id", d.id);
    }
    await supabase.from("departments").delete().eq("year_id", yearId);
    await supabase.from("years").delete().eq("id", yearId);
    await fetchAll();
  };

  const addDepartment = async (_collegeId: string, yearId: string, name: string) => {
    const { error } = await supabase.from("departments").insert({ year_id: yearId, name });
    if (!error) await fetchAll();
  };

  const removeDepartment = async (_collegeId: string, _yearId: string, deptId: string) => {
    const subsRes = await supabase.from("subjects").select("id").eq("department_id", deptId);
    for (const s of subsRes.data || []) {
      await supabase.from("videos").delete().eq("subject_id", s.id);
    }
    await supabase.from("subjects").delete().eq("department_id", deptId);
    await supabase.from("departments").delete().eq("id", deptId);
    await fetchAll();
  };

  const addSubject = async (_collegeId: string, _yearId: string, deptId: string, name: string, semester: "odd" | "even") => {
    const { error } = await supabase.from("subjects").insert({ department_id: deptId, name, semester });
    if (!error) await fetchAll();
  };

  const removeSubject = async (_collegeId: string, _yearId: string, _deptId: string, subjectId: string) => {
    await supabase.from("videos").delete().eq("subject_id", subjectId);
    await supabase.from("subjects").delete().eq("id", subjectId);
    await fetchAll();
  };

  const addVideo = async (_collegeId: string, _yearId: string, _deptId: string, subjectId: string, title: string, url: string) => {
    const { error } = await supabase.from("videos").insert({ subject_id: subjectId, title, url });
    if (!error) await fetchAll();
  };

  const removeVideo = async (_collegeId: string, _yearId: string, _deptId: string, _subjectId: string, videoId: string) => {
    await supabase.from("videos").delete().eq("id", videoId);
    await fetchAll();
  };

  const uploadVideoFile = async (videoId: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${videoId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("video-files").upload(path, file);
    if (uploadError) { console.error("Upload error:", uploadError); return; }
    const { data: urlData } = supabase.storage.from("video-files").getPublicUrl(path);
    await supabase.from("video_files").insert({
      video_id: videoId,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_type: ext || "unknown",
    });
    await fetchAll();
  };

  const removeVideoFile = async (fileId: string) => {
    await supabase.from("video_files").delete().eq("id", fileId);
    await fetchAll();
  };

  const uploadDoubtImage = async (file: File): Promise<string | null> => {
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("doubt-images").upload(path, file);
    if (error) { console.error("Upload error:", error); return null; }
    const { data } = supabase.storage.from("doubt-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const syncStudentDoubts = async (
    currentStudent: StudentAccount,
    updates: Partial<Omit<StudentAccount, "id">>
  ) => {
    const nextStudentData = {
      student_reg_no: updates.registrationNumber ?? currentStudent.registrationNumber,
      student_name: updates.name ?? currentStudent.name,
      student_college: updates.collegeName ?? currentStudent.collegeName,
      student_department: updates.department ?? currentStudent.department,
      student_year: updates.year ?? currentStudent.year,
    };

    await supabase
      .from("doubts")
      .update(nextStudentData)
      .eq("student_reg_no", currentStudent.registrationNumber);
  };

  const syncTeacherDoubts = async (
    currentTeacher: TeacherAccount,
    updates: Partial<Omit<TeacherAccount, "id">>
  ) => {
    const nextTeacherName = updates.name ?? currentTeacher.name;
    const nextTeacherStaffId = updates.staffId ?? currentTeacher.staffId;

    await Promise.all([
      supabase
        .from("doubts")
        .update({ answered_by: nextTeacherName })
        .eq("answered_by", currentTeacher.name),
      supabase
        .from("doubts")
        .update({ claimed_by: nextTeacherStaffId })
        .eq("claimed_by", currentTeacher.staffId),
    ]);
  };

  const addStudent = async (student: Omit<StudentAccount, "id">) => {
    const { error } = await supabase.from("students").insert({
      registration_number: student.registrationNumber,
      name: student.name,
      dob: student.dob,
      email: student.email || null,
      college_name: student.collegeName,
      department: student.department,
      year: student.year,
    });
    if (!error) await fetchAll();
  };

  const removeStudent = async (id: string) => {
    const student = students.find((s) => s.id === id);
    if (student) {
      await supabase.from("doubts").delete().eq("student_reg_no", student.registrationNumber);
    }
    await supabase.from("students").delete().eq("id", id);
    await fetchAll();
  };

  const updateStudent = async (id: string, updates: Partial<Omit<StudentAccount, "id">>) => {
    const student = students.find((s) => s.id === id);
    const mapped: Record<string, string | number | null> = {};

    if (updates.registrationNumber !== undefined) mapped.registration_number = updates.registrationNumber;
    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.dob !== undefined) mapped.dob = updates.dob;
    if (updates.email !== undefined) mapped.email = updates.email || null;
    if (updates.collegeName !== undefined) mapped.college_name = updates.collegeName;
    if (updates.department !== undefined) mapped.department = updates.department;
    if (updates.year !== undefined) mapped.year = updates.year;

    await supabase.from("students").update(mapped as any).eq("id", id);

    if (student) {
      await syncStudentDoubts(student, updates);
    }

    await fetchAll();
  };

  const addTeacher = async (teacher: Omit<TeacherAccount, "id">) => {
    const { error } = await supabase.from("teachers").insert({
      staff_id: teacher.staffId,
      name: teacher.name,
      dob: teacher.dob,
      email: teacher.email || null,
      college_name: teacher.collegeName,
      subject_name: teacher.subjectName,
    });
    if (!error) await fetchAll();
  };

  const removeTeacher = async (id: string) => {
    const teacher = teachers.find((t) => t.id === id);
    if (teacher) {
      await Promise.all([
        supabase
          .from("doubts")
          .update({ answer: null, answered_by: null, answered_at: null, answer_image_url: null, answer_image_urls: [], claimed_by: null })
          .eq("answered_by", teacher.name),
        supabase.from("doubts").update({ claimed_by: null }).eq("claimed_by", teacher.staffId),
      ]);
    }
    await supabase.from("teachers").delete().eq("id", id);
    await fetchAll();
  };

  const updateTeacher = async (id: string, updates: Partial<Omit<TeacherAccount, "id">>) => {
    const teacher = teachers.find((t) => t.id === id);
    const mapped: Record<string, string | number | null> = {};

    if (updates.staffId !== undefined) mapped.staff_id = updates.staffId;
    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.dob !== undefined) mapped.dob = updates.dob;
    if (updates.email !== undefined) mapped.email = updates.email || null;
    if (updates.collegeName !== undefined) mapped.college_name = updates.collegeName;
    if (updates.subjectName !== undefined) mapped.subject_name = updates.subjectName;

    await supabase.from("teachers").update(mapped as any).eq("id", id);

    if (teacher) {
      await syncTeacherDoubts(teacher, updates);
    }

    await fetchAll();
  };

  const addDoubt = async (doubt: Omit<Doubt, "id" | "createdAt" | "helpfulCount">) => {
    const { error, data } = await supabase.from("doubts").insert({
      student_name: doubt.studentName,
      student_reg_no: doubt.studentRegNo,
      student_year: doubt.studentYear,
      student_department: doubt.studentDepartment,
      student_college: doubt.studentCollege,
      subject_name: doubt.subjectName,
      question: doubt.question,
      question_image_url: doubt.questionImageUrl || null,
      ocr_text: doubt.ocrText || null,
    } as any).select("id").single();
    if (!error && data) {
      // Fire-and-forget email notification
      supabase.functions.invoke("notify-doubt", { body: { type: "new_doubt", doubtId: data.id } }).catch(console.error);
      await fetchAll();
    }
  };

  const claimDoubt = async (doubtId: string, teacherStaffId: string) => {
    const teacher = teachers.find((t) => t.staffId === teacherStaffId);
    await supabase.from("doubts").update({
      claimed_by: teacherStaffId,
      status: "in_progress",
      handling_teacher: teacher?.name || teacherStaffId,
    }).eq("id", doubtId);
    await fetchAll();
  };

  const answerDoubt = async (doubtId: string, answer: string, teacherName: string, answerImageUrl?: string, answerImageUrls?: string[]) => {
    await supabase.from("doubts").update({
      answer,
      answered_by: teacherName,
      answered_at: new Date().toISOString(),
      answer_image_url: answerImageUrl || null,
      answer_image_urls: answerImageUrls || [],
      status: "solved",
    } as any).eq("id", doubtId);
    // Fire-and-forget email notification
    supabase.functions.invoke("notify-doubt", { body: { type: "doubt_answered", doubtId } }).catch(console.error);
    await fetchAll();
  };

  const searchSimilarDoubts = (
    text: string,
    filters?: { subjectName?: string; studentYear?: number; studentDepartment?: string }
  ): Doubt[] => {
    if (!text || text.trim().length < 5) return [];
    const q = text.toLowerCase().trim();
    const words = q.split(/\s+/).filter((w) => w.length > 2);
    if (words.length === 0) return [];
    return doubts.filter((d) => {
      if (!d.answer) return false;
      if (filters?.subjectName && d.subjectName.toLowerCase() !== filters.subjectName.toLowerCase()) return false;
      if (filters?.studentYear && d.studentYear !== filters.studentYear) return false;
      if (filters?.studentDepartment && d.studentDepartment.toLowerCase() !== filters.studentDepartment.toLowerCase()) return false;
      const target = `${d.question} ${d.ocrText || ""}`.toLowerCase();
      const matchCount = words.filter((w) => target.includes(w)).length;
      return matchCount >= Math.max(1, Math.floor(words.length * 0.4));
    }).slice(0, 5);
  };

  // Enhanced edit: resets claim so updated doubt goes back to all teachers
  const updateDoubtQuestion = async (doubtId: string, updates: { question?: string; questionImageUrl?: string | null; subjectName?: string }) => {
    const mapped: Record<string, any> = {};
    if (updates.question !== undefined) mapped.question = updates.question;
    if (updates.questionImageUrl !== undefined) mapped.question_image_url = updates.questionImageUrl;
    if (updates.subjectName !== undefined) mapped.subject_name = updates.subjectName;
    // Reset claim so it goes back to pending for teachers
    mapped.claimed_by = null;
    mapped.handling_teacher = null;
    mapped.status = "pending";
    mapped.answer = null;
    mapped.answered_by = null;
    mapped.answered_at = null;
    mapped.answer_image_url = null;
    mapped.answer_image_urls = [];
    await (supabase.from("doubts").update as any)(mapped).eq("id", doubtId);
    // Resend notification
    supabase.functions.invoke("notify-doubt", { body: { type: "new_doubt", doubtId } }).catch(console.error);
    await fetchAll();
  };

  const deleteDoubt = async (doubtId: string) => {
    await supabase.from("doubts").delete().eq("id", doubtId);
    await fetchAll();
  };

  const updateDoubtAnswer = async (doubtId: string, updates: { answer?: string; answerImageUrl?: string | null; answerImageUrls?: string[] }) => {
    const mapped: Record<string, any> = {};
    if (updates.answer !== undefined) mapped.answer = updates.answer;
    if (updates.answerImageUrl !== undefined) mapped.answer_image_url = updates.answerImageUrl;
    if (updates.answerImageUrls !== undefined) mapped.answer_image_urls = updates.answerImageUrls;
    await (supabase.from("doubts").update as any)(mapped).eq("id", doubtId);
    await fetchAll();
  };

  const deleteDoubtAnswer = async (doubtId: string) => {
    await supabase.from("doubts").update({
      answer: null,
      answered_by: null,
      answered_at: null,
      answer_image_url: null,
      answer_image_urls: [] as any,
      status: "pending",
      claimed_by: null,
      handling_teacher: null,
    } as any).eq("id", doubtId);
    await fetchAll();
  };

  // Save / unsave doubt
  const saveDoubt = async (studentRegNo: string, doubtId: string) => {
    await supabase.from("saved_doubts").insert({
      student_reg_no: studentRegNo,
      doubt_id: doubtId,
    } as any);
    await fetchAll();
  };

  const unsaveDoubt = async (studentRegNo: string, doubtId: string) => {
    await supabase.from("saved_doubts").delete()
      .eq("student_reg_no", studentRegNo)
      .eq("doubt_id", doubtId);
    await fetchAll();
  };

  // Toggle helpful
  const toggleHelpful = async (studentRegNo: string, doubtId: string) => {
    const key = `${studentRegNo}:${doubtId}`;
    if (helpfulByMe.includes(key)) {
      // Remove helpful
      await supabase.from("doubt_helpful").delete()
        .eq("student_reg_no", studentRegNo)
        .eq("doubt_id", doubtId);
      await (supabase.from("doubts").update as any)({ helpful_count: Math.max(0, (doubts.find(d => d.id === doubtId)?.helpfulCount || 1) - 1) }).eq("id", doubtId);
    } else {
      // Add helpful
      await supabase.from("doubt_helpful").insert({
        student_reg_no: studentRegNo,
        doubt_id: doubtId,
      } as any);
      await (supabase.from("doubts").update as any)({ helpful_count: (doubts.find(d => d.id === doubtId)?.helpfulCount || 0) + 1 }).eq("id", doubtId);
    }
    await fetchAll();
  };

  const extractOcrText = async (imageUrl: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke("ocr-extract", {
        body: { imageUrl },
      });
      if (error) { console.error("OCR error:", error); return ""; }
      return data?.text || "";
    } catch (e) {
      console.error("OCR error:", e);
      return "";
    }
  };

  return {
    colleges, students, teachers, doubts, savedDoubts, helpfulByMe, loading,
    addCollege, removeCollege,
    addYear, removeYear,
    addDepartment, removeDepartment,
    addSubject, removeSubject,
    addVideo, removeVideo,
    uploadVideoFile, removeVideoFile,
    uploadDoubtImage,
    addStudent, removeStudent, updateStudent,
    addTeacher, removeTeacher, updateTeacher,
    addDoubt, claimDoubt, answerDoubt,
    searchSimilarDoubts, extractOcrText,
    updateDoubtQuestion, deleteDoubt, updateDoubtAnswer, deleteDoubtAnswer,
    saveDoubt, unsaveDoubt, toggleHelpful,
    refetch: fetchAll,
  };
}
