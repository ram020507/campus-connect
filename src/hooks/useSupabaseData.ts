import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Types matching the nested structure the UI expects
export interface VideoLecture {
  id: string;
  title: string;
  url: string;
  addedAt: string;
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
  collegeName: string;
  department: string;
  year: number;
}

export interface TeacherAccount {
  id: string;
  staffId: string;
  name: string;
  dob: string;
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
  answer?: string;
  answeredBy?: string;
  claimedBy?: string;
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
      // Fetch all data in parallel
      const [collegesRes, yearsRes, deptsRes, subjectsRes, videosRes, studentsRes, teachersRes, doubtsRes] =
        await Promise.all([
          supabase.from("colleges").select("*"),
          supabase.from("years").select("*"),
          supabase.from("departments").select("*"),
          supabase.from("subjects").select("*"),
          supabase.from("videos").select("*"),
          supabase.from("students").select("*"),
          supabase.from("teachers").select("*"),
          supabase.from("doubts").select("*"),
        ]);

      // Build nested college structure
      const videosData = videosRes.data || [];
      const subjectsData = (subjectsRes.data || []).map((s) => ({
        id: s.id,
        name: s.name,
        semester: s.semester as "odd" | "even",
        videos: videosData
          .filter((v) => v.subject_id === s.id)
          .map((v) => ({ id: v.id, title: v.title, url: v.url, addedAt: v.added_at })),
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
          answer: d.answer || undefined,
          answeredBy: d.answered_by || undefined,
          claimedBy: d.claimed_by || undefined,
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

  // ---- MUTATIONS ----

  const addCollege = async (name: string) => {
    const { error } = await supabase.from("colleges").insert({ name });
    if (!error) await fetchAll();
  };

  const removeCollege = async (id: string) => {
    // Delete cascade: years -> departments -> subjects -> videos
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

  const addStudent = async (student: Omit<StudentAccount, "id">) => {
    const { error } = await supabase.from("students").insert({
      registration_number: student.registrationNumber,
      name: student.name,
      dob: student.dob,
      college_name: student.collegeName,
      department: student.department,
      year: student.year,
    });
    if (!error) await fetchAll();
  };

  const removeStudent = async (id: string) => {
    await supabase.from("students").delete().eq("id", id);
    await fetchAll();
  };

  const addTeacher = async (teacher: Omit<TeacherAccount, "id">) => {
    const { error } = await supabase.from("teachers").insert({
      staff_id: teacher.staffId,
      name: teacher.name,
      dob: teacher.dob,
      college_name: teacher.collegeName,
      subject_name: teacher.subjectName,
    });
    if (!error) await fetchAll();
  };

  const removeTeacher = async (id: string) => {
    await supabase.from("teachers").delete().eq("id", id);
    await fetchAll();
  };

  const addDoubt = async (doubt: Omit<Doubt, "id" | "createdAt">) => {
    const { error } = await supabase.from("doubts").insert({
      student_name: doubt.studentName,
      student_reg_no: doubt.studentRegNo,
      student_year: doubt.studentYear,
      student_department: doubt.studentDepartment,
      student_college: doubt.studentCollege,
      subject_name: doubt.subjectName,
      question: doubt.question,
    });
    if (!error) await fetchAll();
  };

  const claimDoubt = async (doubtId: string, teacherStaffId: string) => {
    await supabase.from("doubts").update({ claimed_by: teacherStaffId }).eq("id", doubtId);
    await fetchAll();
  };

  const answerDoubt = async (doubtId: string, answer: string, teacherName: string) => {
    await supabase.from("doubts").update({
      answer,
      answered_by: teacherName,
      answered_at: new Date().toISOString(),
    }).eq("id", doubtId);
    await fetchAll();
  };

  return {
    colleges, students, teachers, doubts, loading,
    addCollege, removeCollege,
    addYear, removeYear,
    addDepartment, removeDepartment,
    addSubject, removeSubject,
    addVideo, removeVideo,
    addStudent, removeStudent,
    addTeacher, removeTeacher,
    addDoubt, claimDoubt, answerDoubt,
    refetch: fetchAll,
  };
}
