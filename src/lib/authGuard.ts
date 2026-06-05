import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "student" | "teacher";

const TOKEN_KEYS: Record<Role, string> = {
  admin: "admin-token",
  student: "student-token",
  teacher: "teacher-token",
};

const AUTH_KEYS: Record<Role, string> = {
  admin: "admin-auth",
  student: "student-auth",
  teacher: "teacher-auth",
};

export function storeSession(role: Role, token: string, authValue: string) {
  sessionStorage.setItem(TOKEN_KEYS[role], token);
  sessionStorage.setItem(AUTH_KEYS[role], authValue);
}

export function clearSession(role: Role) {
  sessionStorage.removeItem(TOKEN_KEYS[role]);
  sessionStorage.removeItem(AUTH_KEYS[role]);
}

export async function verifySession(role: Role): Promise<boolean> {
  const token = sessionStorage.getItem(TOKEN_KEYS[role]);
  if (!token) return false;
  try {
    const { data, error } = await supabase.functions.invoke("auth-verify", {
      body: { token, role },
    });
    if (error || !data?.valid) {
      clearSession(role);
      return false;
    }
    return true;
  } catch {
    clearSession(role);
    return false;
  }
}
