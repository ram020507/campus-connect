import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Stroke } from "@/components/DigitalWhiteboard";

export interface CallRequest {
  id: string;
  studentRegNo: string;
  studentName: string;
  studentCollege: string;
  studentDepartment: string;
  studentYear: number;
  subjectName: string;
  mode: "whiteboard";
  doubtText: string | null;
  questionImageUrl: string | null;
  status: string;
  acceptedByStaffId: string | null;
  acceptedByName: string | null;
  sessionId: string | null;
  createdAt: string;
}

export interface BoardSession {
  id: string;
  studentRegNo: string;
  studentName: string;
  teacherStaffId: string;
  teacherName: string;
  subjectName: string;
  mode: "whiteboard";
  doubtText: string | null;
  questionImageUrl: string | null;
  canvasData: Stroke[];
  codeContent: string;
  status: string;
  collegeName: string;
  department: string;
  studentYear: number;
  startedAt: string;
  endedAt: string | null;
  teacherLocked: boolean;
}

export function useDigitalBoard() {
  const [callRequests, setCallRequests] = useState<CallRequest[]>([]);
  const [activeSession, setActiveSession] = useState<BoardSession | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch call requests
  const fetchCallRequests = useCallback(async () => {
    const { data } = await supabase
      .from("call_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (data) {
      setCallRequests(
        data.map((r: any) => ({
          id: r.id,
          studentRegNo: r.student_reg_no,
          studentName: r.student_name,
          studentCollege: r.student_college,
          studentDepartment: r.student_department,
          studentYear: r.student_year,
          subjectName: r.subject_name,
          mode: r.mode,
          doubtText: r.doubt_text,
          questionImageUrl: r.question_image_url || null,
          status: r.status,
          acceptedByStaffId: r.accepted_by_staff_id,
          acceptedByName: r.accepted_by_name,
          sessionId: r.session_id,
          createdAt: r.created_at,
        }))
      );
    }
  }, []);

  // Fetch active session
  const fetchSession = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from("digital_board_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();
    if (data) {
      setActiveSession({
        id: data.id,
        studentRegNo: data.student_reg_no,
        studentName: data.student_name,
        teacherStaffId: data.teacher_staff_id,
        teacherName: data.teacher_name,
        subjectName: data.subject_name,
        mode: data.mode as "whiteboard",
        doubtText: data.doubt_text,
        questionImageUrl: (data as any).question_image_url || null,
        canvasData: (data.canvas_data as any) || [],
        codeContent: data.code_content || "",
        status: data.status,
        collegeName: data.college_name,
        department: data.department,
        studentYear: data.student_year,
        startedAt: data.started_at,
        endedAt: data.ended_at,
        teacherLocked: (data as any).teacher_locked || false,
      });
    }
    return data;
  }, []);

  // Student: create call request
  const createCallRequest = async (params: {
    studentRegNo: string;
    studentName: string;
    studentCollege: string;
    studentDepartment: string;
    studentYear: number;
    subjectName: string;
    mode: "whiteboard" | "compiler";
    doubtText?: string;
    questionImageUrl?: string;
  }) => {
    const { data, error } = await supabase
      .from("call_requests")
      .insert({
        student_reg_no: params.studentRegNo,
        student_name: params.studentName,
        student_college: params.studentCollege,
        student_department: params.studentDepartment,
        student_year: params.studentYear,
        subject_name: params.subjectName,
        mode: params.mode,
        doubt_text: params.doubtText || null,
        question_image_url: params.questionImageUrl || null,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  // Student: cancel call request
  const cancelCallRequest = async (requestId: string) => {
    await supabase
      .from("call_requests")
      .update({ status: "cancelled", updated_at: new Date().toISOString() } as any)
      .eq("id", requestId);
  };

  // Teacher: set online status
  const setTeacherOnline = async (staffId: string, name: string, collegeName: string, subjectName: string, availability: "in" | "out" = "out") => {
    const { data: existing } = await supabase
      .from("teacher_status")
      .select("id")
      .eq("staff_id", staffId)
      .single();

    if (existing) {
      await supabase
        .from("teacher_status")
        .update({
          is_online: true,
          is_busy: false,
          availability,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("staff_id", staffId);
    } else {
      await supabase.from("teacher_status").insert({
        staff_id: staffId,
        teacher_name: name,
        college_name: collegeName,
        subject_name: subjectName,
        is_online: true,
        is_busy: false,
        availability,
      } as any);
    }
  };

  const setTeacherAvailability = async (staffId: string, availability: "in" | "out") => {
    await supabase
      .from("teacher_status")
      .update({ availability, updated_at: new Date().toISOString() } as any)
      .eq("staff_id", staffId);
  };

  const setTeacherOffline = async (staffId: string) => {
    await supabase
      .from("teacher_status")
      .update({
        is_online: false,
        is_busy: false,
        current_session_id: null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("staff_id", staffId);
  };

  const setTeacherBusy = async (staffId: string, sessionId: string) => {
    await supabase
      .from("teacher_status")
      .update({
        is_busy: true,
        current_session_id: sessionId,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("staff_id", staffId);
  };

  // Teacher: accept call request
  const acceptCallRequest = async (
    requestId: string,
    teacherStaffId: string,
    teacherName: string
  ) => {
    // Check if still pending
    const { data: req } = await supabase
      .from("call_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (!req || req.status !== "pending") {
      throw new Error("Call request is no longer available");
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from("digital_board_sessions")
      .insert({
        student_reg_no: req.student_reg_no,
        student_name: req.student_name,
        teacher_staff_id: teacherStaffId,
        teacher_name: teacherName,
        subject_name: req.subject_name,
        mode: req.mode,
        doubt_text: req.doubt_text,
        college_name: req.student_college,
        department: req.student_department,
        student_year: req.student_year,
        status: "active",
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Update call request
    await supabase
      .from("call_requests")
      .update({
        status: "accepted",
        accepted_by_staff_id: teacherStaffId,
        accepted_by_name: teacherName,
        session_id: session.id,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", requestId);

    // Set teacher as busy
    await setTeacherBusy(teacherStaffId, session.id);

    return session;
  };

  // Update canvas data (real-time sync)
  const updateCanvasData = async (sessionId: string, canvasData: Stroke[]) => {
    await supabase
      .from("digital_board_sessions")
      .update({ canvas_data: canvasData as any } as any)
      .eq("id", sessionId);
  };

  // Update code content
  const updateCodeContent = async (sessionId: string, code: string) => {
    await supabase
      .from("digital_board_sessions")
      .update({ code_content: code } as any)
      .eq("id", sessionId);
  };

  // End session
  const endSession = async (sessionId: string, teacherStaffId?: string) => {
    await supabase
      .from("digital_board_sessions")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
      } as any)
      .eq("id", sessionId);

    if (teacherStaffId) {
      await supabase
        .from("teacher_status")
        .update({
          is_busy: false,
          current_session_id: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("staff_id", teacherStaffId);
    }

    setActiveSession(null);
  };

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel("digital-board-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_requests" },
        () => fetchCallRequests()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "digital_board_sessions" },
        (payload) => {
          if (activeSession && payload.new && (payload.new as any).id === activeSession.id) {
            const d = payload.new as any;
            setActiveSession({
              id: d.id,
              studentRegNo: d.student_reg_no,
              studentName: d.student_name,
              teacherStaffId: d.teacher_staff_id,
              teacherName: d.teacher_name,
              subjectName: d.subject_name,
              mode: d.mode,
              doubtText: d.doubt_text,
              questionImageUrl: d.question_image_url || null,
              canvasData: d.canvas_data || [],
              codeContent: d.code_content || "",
              status: d.status,
              collegeName: d.college_name,
              department: d.department,
              studentYear: d.student_year,
              startedAt: d.started_at,
              endedAt: d.ended_at,
              teacherLocked: d.teacher_locked || false,
            });
          }
        }
      )
      .subscribe();

    fetchCallRequests();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession?.id]);

  return {
    callRequests,
    activeSession,
    loading,
    createCallRequest,
    cancelCallRequest,
    acceptCallRequest,
    setTeacherOnline,
    setTeacherAvailability,
    setTeacherOffline,
    setTeacherBusy,
    updateCanvasData,
    updateCodeContent,
    endSession,
    fetchSession,
    fetchCallRequests,
    setActiveSession,
  };
}
