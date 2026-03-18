import { supabase } from "@/integrations/supabase/client";

// Types matching the database schema
export interface College {
  id: string;
  name: string;
  created_at?: string;
}

export interface Year {
  id: string;
  college_id: string;
  year_number: number;
  created_at?: string;
}

export interface Department {
  id: string;
  year_id: string;
  name: string;
  created_at?: string;
}

export interface Subject {
  id: string;
  department_id: string;
  name: string;
  semester: 'odd' | 'even';
  created_at?: string;
}

export interface VideoLecture {
  id: string;
  subject_id: string;
  title: string;
  url: string;
  added_at?: string;
}

export interface StudentAccount {
  id: string;
  registration_number: string;
  name: string;
  dob: string;
  college_name: string;
  department: string;
  year: number;
}

export interface TeacherAccount {
  id: string;
  staff_id: string;
  name: string;
  dob: string;
  college_name: string;
  subject_name: string;
}

export interface Doubt {
  id: string;
  student_name: string;
  student_reg_no: string;
  student_year: number;
  student_department: string;
  student_college: string;
  subject_name: string;
  question: string;
  answer?: string | null;
  answered_by?: string | null;
  claimed_by?: string | null;
  created_at: string;
  answered_at?: string | null;
}

// College operations
export const fetchColleges = async () => {
  const { data, error } = await supabase.from('colleges').select('*').order('created_at');
  if (error) throw error;
  return data as College[];
};

export const addCollege = async (name: string) => {
  const { data, error } = await supabase.from('colleges').insert({ name }).select().single();
  if (error) throw error;
  return data as College;
};

export const removeCollege = async (id: string) => {
  const { error } = await supabase.from('colleges').delete().eq('id', id);
  if (error) throw error;
};

// Year operations
export const fetchYears = async (collegeId: string) => {
  const { data, error } = await supabase.from('years').select('*').eq('college_id', collegeId).order('year_number');
  if (error) throw error;
  return data as Year[];
};

export const addYear = async (collegeId: string, yearNumber: number) => {
  const { data, error } = await supabase.from('years').insert({ college_id: collegeId, year_number: yearNumber }).select().single();
  if (error) throw error;
  return data as Year;
};

export const removeYear = async (id: string) => {
  const { error } = await supabase.from('years').delete().eq('id', id);
  if (error) throw error;
};

// Department operations
export const fetchDepartments = async (yearId: string) => {
  const { data, error } = await supabase.from('departments').select('*').eq('year_id', yearId).order('name');
  if (error) throw error;
  return data as Department[];
};

export const addDepartment = async (yearId: string, name: string) => {
  const { data, error } = await supabase.from('departments').insert({ year_id: yearId, name }).select().single();
  if (error) throw error;
  return data as Department;
};

export const removeDepartment = async (id: string) => {
  const { error } = await supabase.from('departments').delete().eq('id', id);
  if (error) throw error;
};

// Subject operations
export const fetchSubjects = async (departmentId: string) => {
  const { data, error } = await supabase.from('subjects').select('*').eq('department_id', departmentId).order('name');
  if (error) throw error;
  return data as Subject[];
};

export const addSubject = async (departmentId: string, name: string, semester: 'odd' | 'even') => {
  const { data, error } = await supabase.from('subjects').insert({ department_id: departmentId, name, semester }).select().single();
  if (error) throw error;
  return data as Subject;
};

export const removeSubject = async (id: string) => {
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) throw error;
};

// Video operations
export const fetchVideos = async (subjectId: string) => {
  const { data, error } = await supabase.from('videos').select('*').eq('subject_id', subjectId).order('added_at');
  if (error) throw error;
  return data as VideoLecture[];
};

export const addVideo = async (subjectId: string, title: string, url: string) => {
  const { data, error } = await supabase.from('videos').insert({ subject_id: subjectId, title, url }).select().single();
  if (error) throw error;
  return data as VideoLecture;
};

export const removeVideo = async (id: string) => {
  const { error } = await supabase.from('videos').delete().eq('id', id);
  if (error) throw error;
};

// Student operations
export const fetchStudents = async () => {
  const { data, error } = await supabase.from('students').select('*').order('name');
  if (error) throw error;
  return data as StudentAccount[];
};

export const addStudent = async (student: Omit<StudentAccount, 'id'>) => {
  const { data, error } = await supabase.from('students').insert(student).select().single();
  if (error) throw error;
  return data as StudentAccount;
};

export const removeStudent = async (id: string) => {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
};

export const findStudent = async (regNo: string, dob: string) => {
  const { data, error } = await supabase.from('students').select('*')
    .eq('registration_number', regNo).eq('dob', dob).maybeSingle();
  if (error) throw error;
  return data as StudentAccount | null;
};

// Teacher operations
export const fetchTeachers = async () => {
  const { data, error } = await supabase.from('teachers').select('*').order('name');
  if (error) throw error;
  return data as TeacherAccount[];
};

export const addTeacher = async (teacher: Omit<TeacherAccount, 'id'>) => {
  const { data, error } = await supabase.from('teachers').insert(teacher).select().single();
  if (error) throw error;
  return data as TeacherAccount;
};

export const removeTeacher = async (id: string) => {
  const { error } = await supabase.from('teachers').delete().eq('id', id);
  if (error) throw error;
};

export const findTeacher = async (staffId: string, dob: string) => {
  const { data, error } = await supabase.from('teachers').select('*')
    .eq('staff_id', staffId).eq('dob', dob).maybeSingle();
  if (error) throw error;
  return data as TeacherAccount | null;
};

// Doubt operations
export const fetchDoubts = async () => {
  const { data, error } = await supabase.from('doubts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Doubt[];
};

export const addDoubt = async (doubt: Omit<Doubt, 'id' | 'created_at'>) => {
  const { data, error } = await supabase.from('doubts').insert(doubt).select().single();
  if (error) throw error;
  return data as Doubt;
};

export const claimDoubt = async (doubtId: string, teacherStaffId: string) => {
  const { error } = await supabase.from('doubts').update({ claimed_by: teacherStaffId }).eq('id', doubtId);
  if (error) throw error;
};

export const answerDoubt = async (doubtId: string, answer: string, teacherName: string) => {
  const { error } = await supabase.from('doubts').update({
    answer, answered_by: teacherName, answered_at: new Date().toISOString()
  }).eq('id', doubtId);
  if (error) throw error;
};
