import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CampusJobCompany {
  id: string;
  company_name: string;
  created_at: string;
  updated_at: string;
}

export interface CampusJobEligibility {
  id: string;
  company_id: string;
  criteria: string;
  updated_at: string;
}

export interface CampusJobRole {
  id: string;
  company_id: string;
  role_name: string;
  created_at: string;
  updated_at: string;
}

export interface CampusJobSkill {
  id: string;
  role_id: string;
  skill_name: string;
  created_at: string;
}

export interface CampusJobSelectedStudent {
  id: string;
  company_id: string;
  job_role_id: string | null;
  student_name: string;
  academic_batch: string;
  department: string;
  linkedin_url: string | null;
  linkedin_approved: boolean;
  created_at: string;
  updated_at: string;
}

export function useCampusJobs() {
  const [companies, setCompanies] = useState<CampusJobCompany[]>([]);
  const [eligibility, setEligibility] = useState<CampusJobEligibility[]>([]);
  const [roles, setRoles] = useState<CampusJobRole[]>([]);
  const [skills, setSkills] = useState<CampusJobSkill[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<CampusJobSelectedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [companyResult, eligibilityResult, roleResult, skillResult, studentResult] = await Promise.all([
      supabase.from("campus_job_companies").select("*").order("company_name"),
      supabase.from("campus_job_eligibility").select("*"),
      supabase.from("campus_job_roles").select("*").order("role_name"),
      supabase.from("campus_job_skills").select("*").order("skill_name"),
      supabase.from("campus_job_selected_students").select("*").order("student_name"),
    ]);

    const failure = [companyResult.error, eligibilityResult.error, roleResult.error, skillResult.error, studentResult.error].find(Boolean);
    if (failure) {
      toast.error("Campus Jobs could not be loaded. Please try again.");
      setLoading(false);
      return;
    }

    setCompanies(companyResult.data || []);
    setEligibility(eligibilityResult.data || []);
    setRoles(roleResult.data || []);
    setSkills(skillResult.data || []);
    setSelectedStudents(studentResult.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel("campus-jobs-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "campus_job_companies" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "campus_job_eligibility" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "campus_job_roles" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "campus_job_skills" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "campus_job_selected_students" }, () => void refresh())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const manage = useCallback(async (action: string, payload: Record<string, unknown>) => {
    const token = sessionStorage.getItem("admin-token");
    if (!token) {
      toast.error("Your admin session has expired. Please sign in again.");
      throw new Error("Admin session required");
    }

    const { data, error } = await supabase.functions.invoke("manage-campus-jobs", {
      body: { token, action, payload },
    });
    if (error || !data?.success) {
      const message = data?.error || error?.message || "The change could not be saved.";
      toast.error(message);
      throw new Error(message);
    }

    await refresh();
    return data;
  }, [refresh]);

  return { companies, eligibility, roles, skills, selectedStudents, loading, refresh, manage };
}