import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useNotifications() {
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") {
      permissionRef.current = "granted";
      return true;
    }
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result === "granted";
  }, []);

  const showNotification = useCallback((title: string, body: string, url?: string) => {
    if (permissionRef.current !== "granted") return;
    const notification = new Notification(title, {
      body,
      icon: "/placeholder.svg",
      tag: `campus-connect-${Date.now()}`,
    });
    if (url) {
      notification.onclick = () => {
        window.focus();
        window.location.href = url;
      };
    }
  }, []);

  return { requestPermission, showNotification };
}

/** Hook for teachers: listens for new pending doubts matching any of their subjects */
export function useTeacherNotifications(
  teacherSubjects: string[] | undefined,
  teacherStaffId: string | undefined
) {
  const { requestPermission, showNotification } = useNotifications();
  const knownDoubtIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!teacherSubjects || teacherSubjects.length === 0 || !teacherStaffId) return;
    requestPermission();

    // Load initial doubt IDs so we don't notify on page load
    supabase
      .from("doubts")
      .select("id, subject_name")
      .eq("status", "pending")
      .then(({ data }) => {
        (data || []).forEach((d) => {
          if (teacherSubjects.some(s => s.toLowerCase() === d.subject_name.toLowerCase())) {
            knownDoubtIds.current.add(d.id);
          }
        });
        initialized.current = true;
      });

    const channel = supabase
      .channel("teacher-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "doubts" },
        (payload) => {
          if (!initialized.current) return;
          const row = payload.new as any;
          if (
            teacherSubjects.some(s => s.toLowerCase() === row.subject_name?.toLowerCase()) &&
            row.status === "pending" &&
            !knownDoubtIds.current.has(row.id)
          ) {
            knownDoubtIds.current.add(row.id);
            const question = row.question?.substring(0, 100) || "New doubt";
            showNotification(
              `New Doubt – ${row.subject_name}`,
              `${row.student_name}: ${question}`,
              `/teacher/login?doubtId=${row.id}`
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherSubjects?.join(","), teacherStaffId, requestPermission, showNotification]);
}

/** Hook for students: listens for answers to their doubts */
export function useStudentNotifications(studentRegNo: string | undefined) {
  const { requestPermission, showNotification } = useNotifications();
  const knownAnsweredIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!studentRegNo) return;
    requestPermission();

    // Load initial answered doubt IDs
    supabase
      .from("doubts")
      .select("id")
      .eq("student_reg_no", studentRegNo)
      .not("answer", "is", null)
      .then(({ data }) => {
        (data || []).forEach((d) => knownAnsweredIds.current.add(d.id));
        initialized.current = true;
      });

    const channel = supabase
      .channel("student-notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "doubts" },
        (payload) => {
          if (!initialized.current) return;
          const row = payload.new as any;
          if (
            row.student_reg_no === studentRegNo &&
            row.answer &&
            !knownAnsweredIds.current.has(row.id)
          ) {
            knownAnsweredIds.current.add(row.id);
            const answer = row.answer?.substring(0, 100) || "Your doubt was answered";
            showNotification(
              `Doubt Answered – ${row.subject_name}`,
              `${row.answered_by}: ${answer}`,
              `/student/login?doubtId=${row.id}`
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentRegNo, requestPermission, showNotification]);
}
