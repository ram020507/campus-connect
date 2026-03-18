import { create } from 'zustand';

// Types
export interface College {
  id: string;
  name: string;
  years: Year[];
}

export interface Year {
  id: string;
  yearNumber: number;
  departments: Department[];
}

export interface Department {
  id: string;
  name: string;
  subjects: Subject[];
}

export interface Subject {
  id: string;
  name: string;
  semester: 'odd' | 'even';
  videos: VideoLecture[];
}

export interface VideoLecture {
  id: string;
  title: string;
  url: string;
  addedAt: string;
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

interface AppState {
  colleges: College[];
  students: StudentAccount[];
  teachers: TeacherAccount[];
  doubts: Doubt[];

  // Admin actions
  addCollege: (name: string) => void;
  removeCollege: (id: string) => void;
  addYear: (collegeId: string, yearNumber: number) => void;
  removeYear: (collegeId: string, yearId: string) => void;
  addDepartment: (collegeId: string, yearId: string, name: string) => void;
  removeDepartment: (collegeId: string, yearId: string, deptId: string) => void;
  addSubject: (collegeId: string, yearId: string, deptId: string, name: string, semester: 'odd' | 'even') => void;
  removeSubject: (collegeId: string, yearId: string, deptId: string, subjectId: string) => void;
  addVideo: (collegeId: string, yearId: string, deptId: string, subjectId: string, title: string, url: string) => void;
  removeVideo: (collegeId: string, yearId: string, deptId: string, subjectId: string, videoId: string) => void;
  addStudent: (student: Omit<StudentAccount, 'id'>) => void;
  removeStudent: (id: string) => void;
  addTeacher: (teacher: Omit<TeacherAccount, 'id'>) => void;
  removeTeacher: (id: string) => void;

  // Doubt actions
  addDoubt: (doubt: Omit<Doubt, 'id' | 'createdAt'>) => void;
  claimDoubt: (doubtId: string, teacherStaffId: string) => void;
  answerDoubt: (doubtId: string, answer: string, teacherName: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

// Persist to localStorage
const loadState = () => {
  try {
    const saved = localStorage.getItem('campus-connect-state');
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
};

const saveState = (state: Partial<AppState>) => {
  try {
    localStorage.setItem('campus-connect-state', JSON.stringify({
      colleges: state.colleges,
      students: state.students,
      teachers: state.teachers,
      doubts: state.doubts,
    }));
  } catch {}
};

const initial = loadState();

export const useAppStore = create<AppState>((set, get) => ({
  colleges: initial?.colleges || [],
  students: initial?.students || [],
  teachers: initial?.teachers || [],
  doubts: initial?.doubts || [],

  addCollege: (name) => {
    set((s) => {
      const next = { ...s, colleges: [...s.colleges, { id: generateId(), name, years: [] }] };
      saveState(next);
      return next;
    });
  },
  removeCollege: (id) => {
    set((s) => {
      const next = { ...s, colleges: s.colleges.filter((c) => c.id !== id) };
      saveState(next);
      return next;
    });
  },
  addYear: (collegeId, yearNumber) => {
    set((s) => {
      const next = {
        ...s,
        colleges: s.colleges.map((c) =>
          c.id === collegeId
            ? { ...c, years: [...c.years, { id: generateId(), yearNumber, departments: [] }] }
            : c
        ),
      };
      saveState(next);
      return next;
    });
  },
  removeYear: (collegeId, yearId) => {
    set((s) => {
      const next = {
        ...s,
        colleges: s.colleges.map((c) =>
          c.id === collegeId ? { ...c, years: c.years.filter((y) => y.id !== yearId) } : c
        ),
      };
      saveState(next);
      return next;
    });
  },
  addDepartment: (collegeId, yearId, name) => {
    set((s) => {
      const next = {
        ...s,
        colleges: s.colleges.map((c) =>
          c.id === collegeId
            ? {
                ...c,
                years: c.years.map((y) =>
                  y.id === yearId
                    ? { ...y, departments: [...y.departments, { id: generateId(), name, subjects: [] }] }
                    : y
                ),
              }
            : c
        ),
      };
      saveState(next);
      return next;
    });
  },
  removeDepartment: (collegeId, yearId, deptId) => {
    set((s) => {
      const next = {
        ...s,
        colleges: s.colleges.map((c) =>
          c.id === collegeId
            ? {
                ...c,
                years: c.years.map((y) =>
                  y.id === yearId ? { ...y, departments: y.departments.filter((d) => d.id !== deptId) } : y
                ),
              }
            : c
        ),
      };
      saveState(next);
      return next;
    });
  },
  addSubject: (collegeId, yearId, deptId, name, semester) => {
    set((s) => {
      const next = {
        ...s,
        colleges: s.colleges.map((c) =>
          c.id === collegeId
            ? {
                ...c,
                years: c.years.map((y) =>
                  y.id === yearId
                    ? {
                        ...y,
                        departments: y.departments.map((d) =>
                          d.id === deptId
                            ? { ...d, subjects: [...d.subjects, { id: generateId(), name, semester, videos: [] }] }
                            : d
                        ),
                      }
                    : y
                ),
              }
            : c
        ),
      };
      saveState(next);
      return next;
    });
  },
  removeSubject: (collegeId, yearId, deptId, subjectId) => {
    set((s) => {
      const next = {
        ...s,
        colleges: s.colleges.map((c) =>
          c.id === collegeId
            ? {
                ...c,
                years: c.years.map((y) =>
                  y.id === yearId
                    ? {
                        ...y,
                        departments: y.departments.map((d) =>
                          d.id === deptId
                            ? { ...d, subjects: d.subjects.filter((sub) => sub.id !== subjectId) }
                            : d
                        ),
                      }
                    : y
                ),
              }
            : c
        ),
      };
      saveState(next);
      return next;
    });
  },
  addVideo: (collegeId, yearId, deptId, subjectId, title, url) => {
    set((s) => {
      const next = {
        ...s,
        colleges: s.colleges.map((c) =>
          c.id === collegeId
            ? {
                ...c,
                years: c.years.map((y) =>
                  y.id === yearId
                    ? {
                        ...y,
                        departments: y.departments.map((d) =>
                          d.id === deptId
                            ? {
                                ...d,
                                subjects: d.subjects.map((sub) =>
                                  sub.id === subjectId
                                    ? { ...sub, videos: [...sub.videos, { id: generateId(), title, url, addedAt: new Date().toISOString() }] }
                                    : sub
                                ),
                              }
                            : d
                        ),
                      }
                    : y
                ),
              }
            : c
        ),
      };
      saveState(next);
      return next;
    });
  },
  removeVideo: (collegeId, yearId, deptId, subjectId, videoId) => {
    set((s) => {
      const next = {
        ...s,
        colleges: s.colleges.map((c) =>
          c.id === collegeId
            ? {
                ...c,
                years: c.years.map((y) =>
                  y.id === yearId
                    ? {
                        ...y,
                        departments: y.departments.map((d) =>
                          d.id === deptId
                            ? {
                                ...d,
                                subjects: d.subjects.map((sub) =>
                                  sub.id === subjectId
                                    ? { ...sub, videos: sub.videos.filter((v) => v.id !== videoId) }
                                    : sub
                                ),
                              }
                            : d
                        ),
                      }
                    : y
                ),
              }
            : c
        ),
      };
      saveState(next);
      return next;
    });
  },
  addStudent: (student) => {
    set((s) => {
      const next = { ...s, students: [...s.students, { ...student, id: generateId() }] };
      saveState(next);
      return next;
    });
  },
  removeStudent: (id) => {
    set((s) => {
      const next = { ...s, students: s.students.filter((st) => st.id !== id) };
      saveState(next);
      return next;
    });
  },
  addTeacher: (teacher) => {
    set((s) => {
      const next = { ...s, teachers: [...s.teachers, { ...teacher, id: generateId() }] };
      saveState(next);
      return next;
    });
  },
  removeTeacher: (id) => {
    set((s) => {
      const next = { ...s, teachers: s.teachers.filter((t) => t.id !== id) };
      saveState(next);
      return next;
    });
  },
  addDoubt: (doubt) => {
    set((s) => {
      const next = { ...s, doubts: [...s.doubts, { ...doubt, id: generateId(), createdAt: new Date().toISOString() }] };
      saveState(next);
      return next;
    });
  },
  claimDoubt: (doubtId, teacherStaffId) => {
    set((s) => {
      const next = {
        ...s,
        doubts: s.doubts.map((d) => (d.id === doubtId ? { ...d, claimedBy: teacherStaffId } : d)),
      };
      saveState(next);
      return next;
    });
  },
  answerDoubt: (doubtId, answer, teacherName) => {
    set((s) => {
      const next = {
        ...s,
        doubts: s.doubts.map((d) =>
          d.id === doubtId ? { ...d, answer, answeredBy: teacherName, answeredAt: new Date().toISOString() } : d
        ),
      };
      saveState(next);
      return next;
    });
  },
}));
