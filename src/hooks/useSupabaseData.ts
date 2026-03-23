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
  subjectName: string;
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
  answeredBy?: string;
  claimedBy?: string;
  status: string;
  handlingTeacher?: string;
  createdAt: string;
  answeredAt?: string;
}

export function useSupabaseData() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [collegesRes, yearsRes, deptsRes, subjectsRes, videosRes, videoFilesRes, studentsRes, teachersRes, doubtsRes] =
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
        (doubtsRes.data || []).map((d: any) => ({
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
          answeredBy: d.answered_by || undefined,
          claimedBy: d.claimed_by || undefined,
          status: d.status || "pending",
          handlingTeacher: d.handling_teacher || undefined,
          createdAt: d.created_at,
          answeredAt: d.answered_at || undefined,
        }))
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
    const mapped: Record<string, unknown> = {};

    if (updates.registrationNumber !== undefined) mapped.registration_number = updates.registrationNumber;
    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.dob !== undefined) mapped.dob = updates.dob;
    if (updates.email !== undefined) mapped.email = updates.email || null;
    if (updates.collegeName !== undefined) mapped.college_name = updates.collegeName;
    if (updates.department !== undefined) mapped.department = updates.department;
    if (updates.year !== undefined) mapped.year = updates.year;

    await supabase.from("students").update(mapped).eq("id", id);

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
          .update({ answer: null, answered_by: null, answered_at: null, answer_image_url: null, claimed_by: null })
          .eq("answered_by", teacher.name),
        supabase.from("doubts").update({ claimed_by: null }).eq("claimed_by", teacher.staffId),
      ]);
    }
    await supabase.from("teachers").delete().eq("id", id);
    await fetchAll();
  };

  const updateTeacher = async (id: string, updates: Partial<Omit<TeacherAccount, "id">>) => {
    const teacher = teachers.find((t) => t.id === id);
    const mapped: Record<string, unknown> = {};

    if (updates.staffId !== undefined) mapped.staff_id = updates.staffId;
    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.dob !== undefined) mapped.dob = updates.dob;
    if (updates.email !== undefined) mapped.email = updates.email || null;
    if (updates.collegeName !== undefined) mapped.college_name = updates.collegeName;
    if (updates.subjectName !== undefined) mapped.subject_name = updates.subjectName;

    await supabase.from("teachers").update(mapped).eq("id", id);

    if (teacher) {
      await syncTeacherDoubts(teacher, updates);
    }

    await fetchAll();
  };

  const addDoubt = async (doubt: Omit<Doubt, "id" | "createdAt">) => {
    const { error, data } = await supabase.from("doubts").insert({
      student_name: doubt.studentName,
      student_reg_no: doubt.studentRegNo,
      student_year: doubt.studentYear,
      student_department: doubt.studentDepartment,
      student_college: doubt.studentCollege,
      subject_name: doubt.subjectName,
      question: doubt.question,
      question_image_url: doubt.questionImageUrl || null,
    }).select("id").single();
    if (!error && data) {
      // Fire-and-forget email notification
      supabase.functions.invoke("notify-doubt", { body: { type: "new_doubt", doubtId: data.id } }).catch(console.error);
      await fetchAll();
    }
  };

  const claimDoubt = async (doubtId: string, teacherStaffId: string, teacherName: string) => {
    await supabase.from("doubts").update({
      claimed_by: teacherStaffId,
      status: "in_progress",
      handling_teacher: teacherName,
    } as any).eq("id", doubtId);
    await fetchAll();
  };

  const answerDoubt = async (doubtId: string, answer: string, teacherName: string, answerImageUrl?: string) => {
    await supabase.from("doubts").update({
      answer,
      answered_by: teacherName,
      answered_at: new Date().toISOString(),
      answer_image_url: answerImageUrl || null,
      status: "answered",
    } as any).eq("id", doubtId);
    
    // Fire-and-forget email notification
    supabase.functions.invoke("notify-doubt", { body: { type: "doubt_answered", doubtId } }).catch(console.error);
    await fetchAll();
  };

  return {
    colleges, students, teachers, doubts, loading,
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
    refetch: fetchAll,
  };
}
