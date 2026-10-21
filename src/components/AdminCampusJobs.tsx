import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { BriefcaseBusiness, Building2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useCampusJobs, type CampusJobSelectedStudent } from "@/hooks/useCampusJobs";
import { toast } from "sonner";

const companySchema = z.string().trim().min(1, "Enter a company name.").max(120, "Company name must be 120 characters or fewer.");
const roleSchema = z.string().trim().min(1, "Enter a job role.").max(160, "Job role must be 160 characters or fewer.");
const criteriaSchema = z.string().trim().min(1, "Enter eligibility criteria.").max(10000, "Eligibility criteria is too long.");
const studentSchema = z.object({
  student_name: z.string().trim().min(1, "Enter the student's name.").max(160),
  academic_batch: z.string().trim().min(1, "Enter the academic batch.").max(80),
  department: z.string().trim().min(1, "Enter the department.").max(160),
  linkedin_url: z.string().trim().max(2048).refine((value) => !value || /^https:\/\/(www\.)?linkedin\.com\//i.test(value), "Use a secure LinkedIn profile link.").or(z.literal("")),
});

type StudentDraft = { student_name: string; academic_batch: string; department: string; job_role_id: string; linkedin_url: string; linkedin_approved: boolean };
const emptyStudent: StudentDraft = { student_name: "", academic_batch: "", department: "", job_role_id: "", linkedin_url: "", linkedin_approved: false };

const AdminCampusJobs = () => {
  const jobs = useCampusJobs();
  const [colleges, setColleges] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [companyEdit, setCompanyEdit] = useState("");
  const [roleName, setRoleName] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleEdit, setRoleEdit] = useState("");
  const [criteriaDraft, setCriteriaDraft] = useState("");
  const [eligibilityEditing, setEligibilityEditing] = useState(false);
  const [skillsDraft, setSkillsDraft] = useState<Record<string, string>>({});
  const [studentDraft, setStudentDraft] = useState<StudentDraft>(emptyStudent);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const college = colleges.find((item) => item.id === selectedCollegeId) ?? null;
  const collegeCompanies = useMemo(
    () => jobs.companies.filter((item) => item.college_id === selectedCollegeId),
    [jobs.companies, selectedCollegeId],
  );
  const company = jobs.companies.find((item) => item.id === selectedCompanyId) ?? null;
  const companyEligibility = jobs.eligibility.find((item) => item.company_id === selectedCompanyId);
  const companyRoles = useMemo(() => jobs.roles.filter((role) => role.company_id === selectedCompanyId), [jobs.roles, selectedCompanyId]);
  const companyStudents = useMemo(() => jobs.selectedStudents.filter((record) => record.company_id === selectedCompanyId), [jobs.selectedStudents, selectedCompanyId]);

  useEffect(() => {
    supabase.from("colleges").select("id, name").order("name")
      .then(({ data, error }) => {
        if (error) return toast.error("Colleges could not be loaded. Please try again.");
        setColleges(data || []);
      });
  }, []);

  useEffect(() => {
    setCriteriaDraft(companyEligibility?.criteria || "");
    setEligibilityEditing(false);
    setEditingRoleId(null);
    setRoleName("");
  }, [selectedCompanyId, companyEligibility?.criteria]);

  useEffect(() => {
    setSkillsDraft((current) => {
      const next = { ...current };
      companyRoles.forEach((role) => {
        if (!(role.id in next)) next[role.id] = jobs.skills.filter((skill) => skill.role_id === role.id).map((skill) => skill.skill_name).join("\n");
      });
      return next;
    });
  }, [companyRoles, jobs.skills]);

  const run = async (action: string, payload: Record<string, unknown>, successMessage: string) => {
    setSaving(true);
    try {
      await jobs.manage(action, payload);
      toast.success(successMessage);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  const createCompany = async () => {
    if (!college) return toast.error("Select a college first.");
    const parsed = companySchema.safeParse(companyName);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message || "Enter a valid company name.");
    const result = await run("company.create", { company_name: parsed.data, college_id: college.id }, "Company created.");
    if (result) setCompanyName("");
  };

  const saveCompanyName = async (id: string) => {
    const parsed = companySchema.safeParse(companyEdit);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message || "Enter a valid company name.");
    if (await run("company.update", { id, company_name: parsed.data }, "Company name updated.")) setEditingCompanyId(null);
  };

  const deleteCompany = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this company and its recruitment information?")) return;
    if (await run("company.delete", { id }, "Company and recruitment information deleted.")) {
      setSelectedCompanyId((current) => current === id ? "" : current);
      setEditingCompanyId(null);
    }
  };

  const saveEligibility = async () => {
    if (!company) return;
    const parsed = criteriaSchema.safeParse(criteriaDraft);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message || "Enter eligibility criteria.");
    if (await run("eligibility.save", { company_id: company.id, criteria: parsed.data }, "Eligibility criteria saved.")) setEligibilityEditing(false);
  };

  const deleteEligibility = async () => {
    if (!company || !companyEligibility) return;
    if (!window.confirm("Delete this company's eligibility criteria?")) return;
    if (await run("eligibility.delete", { company_id: company.id }, "Eligibility criteria deleted.")) {
      setCriteriaDraft("");
      setEligibilityEditing(false);
    }
  };

  const addRole = async () => {
    if (!company) return;
    const parsed = roleSchema.safeParse(roleName);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message || "Enter a role name.");
    if (await run("role.create", { company_id: company.id, role_name: parsed.data }, "Job role added.")) setRoleName("");
  };

  const saveRoleCard = async (role: { id: string; role_name: string }) => {
    const names = (skillsDraft[role.id] || "").split("\n").map((skill) => skill.trim()).filter(Boolean);
    if (names.some((skill) => skill.length > 160)) return toast.error("Each skill must be 160 characters or fewer.");
    if (names.length > 50) return toast.error("Add no more than 50 skills to a role.");
    const nameChanged = roleEdit.trim() !== role.role_name;
    if (nameChanged) {
      const parsed = roleSchema.safeParse(roleEdit);
      if (!parsed.success) return toast.error(parsed.error.issues[0]?.message || "Enter a role name.");
    }
    if (nameChanged && !(await run("role.update", { id: role.id, role_name: roleEdit.trim() }, "Job role updated."))) return;
    if (await run("skills.save", { role_id: role.id, skills: names }, "Job role and required skills saved.")) setEditingRoleId(null);
  };

  const deleteRole = async (role: { id: string; role_name: string }) => {
    if (!window.confirm("Delete this job role and its skills? Any selected-student records linked to it will remain, with the role removed.")) return;
    if (await run("role.delete", { id: role.id }, "Job role deleted.")) {
      setEditingRoleId(null);
      setSkillsDraft((current) => {
        const next = { ...current };
        delete next[role.id];
        return next;
      });
    }
  };

  const startEditStudent = (record: CampusJobSelectedStudent) => {
    setEditingStudentId(record.id);
    setStudentDraft({
      student_name: record.student_name,
      academic_batch: record.academic_batch,
      department: record.department,
      job_role_id: record.job_role_id || "",
      linkedin_url: record.linkedin_url || "",
      linkedin_approved: record.linkedin_approved,
    });
  };

  const saveStudent = async () => {
    if (!company) return;
    const parsed = studentSchema.safeParse(studentDraft);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message || "Check the selected-student details.");
    const payload = {
      company_id: company.id,
      job_role_id: studentDraft.job_role_id || null,
      ...parsed.data,
      linkedin_approved: studentDraft.linkedin_approved && !!parsed.data.linkedin_url,
    };
    const action = editingStudentId ? "selected_student.update" : "selected_student.create";
    if (await run(action, editingStudentId ? { id: editingStudentId, ...payload } : payload, editingStudentId ? "Selected-student record updated." : "Selected student added.")) {
      setEditingStudentId(null);
      setStudentDraft(emptyStudent);
    }
  };

  const deleteStudent = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this selected student record?")) return;
    await run("selected_student.delete", { id }, "Selected-student record deleted.");
  };

  const eligibilityLocked = !!companyEligibility && !eligibilityEditing;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <BriefcaseBusiness className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-semibold">Campus Jobs</h2>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Select College</CardTitle></CardHeader>
        <CardContent>
          <Select value={selectedCollegeId} onValueChange={(value) => { setSelectedCollegeId(value); setSelectedCompanyId(""); setEditingCompanyId(null); }}>
            <SelectTrigger aria-label="Select college"><SelectValue placeholder="Choose a college" /></SelectTrigger>
            <SelectContent>
              {colleges.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {!colleges.length && <p className="mt-2 text-sm text-muted-foreground">No colleges have been created yet.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.78fr)_minmax(0,1.7fr)]">
        <section className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{college ? `Add Company — ${college.name}` : "Add Company"}</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Input aria-label="Company name" maxLength={120} disabled={!college || saving} value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Company name" onKeyDown={(event) => { if (event.key === "Enter" && college) void createCompany(); }} />
              <Button onClick={() => void createCompany()} disabled={!college || saving} aria-label="Create company"><Plus className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {!college && <p className="py-5 text-center text-sm text-muted-foreground">Select a college to see its companies.</p>}
            {college && collegeCompanies.map((item) => (
              <Card key={item.id} className={selectedCompanyId === item.id ? "border-primary" : ""}>
                <CardContent className="flex min-w-0 items-center gap-2 p-3">
                  {editingCompanyId === item.id ? (
                    <>
                      <Input aria-label="Edit company name" maxLength={120} value={companyEdit} onChange={(event) => setCompanyEdit(event.target.value)} />
                      <Button variant="ghost" size="icon" disabled={saving} onClick={() => void saveCompanyName(item.id)} aria-label="Save company name">✓</Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditingCompanyId(null)} aria-label="Cancel company edit"><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <Button variant={selectedCompanyId === item.id ? "secondary" : "ghost"} className="min-w-0 flex-1 justify-start truncate px-2" onClick={() => setSelectedCompanyId(item.id)}>
                        <Building2 className="mr-2 h-4 w-4 shrink-0" />{item.company_name}
                      </Button>
                      <Button variant="ghost" size="icon" title="Edit company" aria-label={`Edit ${item.company_name}`} onClick={() => { setEditingCompanyId(item.id); setCompanyEdit(item.company_name); }}>✎</Button>
                      <Button variant="ghost" size="icon" title="Delete company" aria-label={`Delete ${item.company_name}`} disabled={saving} onClick={() => void deleteCompany(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
            {college && jobs.loading && <p className="py-5 text-center text-sm text-muted-foreground">Loading companies…</p>}
            {college && !jobs.loading && collegeCompanies.length === 0 && <p className="py-5 text-center text-sm text-muted-foreground">No companies have been added for this college yet.</p>}
          </div>
        </section>

        <section className="min-w-0">
          {!college ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Select a college to manage its Campus Jobs.</CardContent></Card>
          ) : !company ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Choose a company to manage its recruitment information.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              <div><h2 className="font-display text-xl font-semibold">{company.company_name}</h2><p className="text-sm text-muted-foreground">{college.name} · Company recruitment information</p></div>
              <Tabs defaultValue="eligibility">
                <TabsList className="h-auto w-full flex-wrap justify-start">
                  <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
                  <TabsTrigger value="roles">Job Roles & Skills</TabsTrigger>
                  <TabsTrigger value="students">Selected Students</TabsTrigger>
                </TabsList>
                <TabsContent value="eligibility">
                  <Card><CardHeader><CardTitle className="text-base">Eligibility Criteria</CardTitle></CardHeader><CardContent className="space-y-3">
                    <Textarea
                      aria-label="Eligibility criteria"
                      maxLength={10000}
                      rows={8}
                      disabled={saving || eligibilityLocked}
                      value={criteriaDraft}
                      onChange={(event) => setCriteriaDraft(event.target.value)}
                      placeholder="Eligible departments, academic batches, minimum CGPA, qualifications, and other conditions"
                    />
                    {eligibilityLocked && <p className="text-xs text-muted-foreground">Saved — click Edit to modify.</p>}
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => void saveEligibility()} disabled={saving || eligibilityLocked}>Save</Button>
                      <Button variant="outline" disabled={saving || !companyEligibility || eligibilityEditing} onClick={() => setEligibilityEditing(true)}>Edit</Button>
                      <Button variant="destructive" disabled={saving || !companyEligibility} onClick={() => void deleteEligibility()}>Delete</Button>
                    </div>
                  </CardContent></Card>
                </TabsContent>
                <TabsContent value="roles" className="space-y-4">
                  <Card><CardHeader><CardTitle className="text-base">Add Job Role</CardTitle></CardHeader><CardContent className="flex gap-2">
                    <Input aria-label="Job role name" maxLength={160} value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="e.g. Software Developer" onKeyDown={(event) => { if (event.key === "Enter") void addRole(); }} />
                    <Button onClick={() => void addRole()} disabled={saving}>Save Role</Button>
                  </CardContent></Card>
                  {companyRoles.map((role) => {
                    const roleLocked = editingRoleId !== role.id;
                    const roleSkills = jobs.skills.filter((skill) => skill.role_id === role.id);
                    return (
                      <Card key={role.id}>
                        <CardHeader className="pb-3"><div className="flex min-w-0 items-center gap-2">
                          {roleLocked ? <CardTitle className="min-w-0 flex-1 text-base">{role.role_name}</CardTitle> : <Input aria-label="Edit job role" value={roleEdit} maxLength={160} onChange={(event) => setRoleEdit(event.target.value)} />}
                        </div></CardHeader>
                        <CardContent className="space-y-2">
                          <label className="text-sm font-medium" htmlFor={`skills-${role.id}`}>Required Skills</label>
                          <Textarea id={`skills-${role.id}`} rows={4} maxLength={8192} disabled={saving || roleLocked} value={skillsDraft[role.id] ?? roleSkills.map((skill) => skill.skill_name).join("\n")} onChange={(event) => setSkillsDraft((current) => ({ ...current, [role.id]: event.target.value }))} placeholder={"One skill per line\nJava\nProblem-solving\nSQL"} />
                          <p className="text-xs text-muted-foreground">Enter one skill per line. Saved data is locked — click Edit to modify.</p>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" disabled={saving || roleLocked} onClick={() => void saveRoleCard(role)}>Save</Button>
                            <Button size="sm" variant="outline" disabled={saving || !roleLocked} onClick={() => { setEditingRoleId(role.id); setRoleEdit(role.role_name); }}>Edit</Button>
                            <Button size="sm" variant="destructive" disabled={saving} onClick={() => void deleteRole(role)}>Delete</Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {!companyRoles.length && <p className="py-5 text-center text-sm text-muted-foreground">Add a job role to manage its required skills.</p>}
                </TabsContent>
                <TabsContent value="students" className="space-y-4">
                  <Card><CardHeader><CardTitle className="text-base">{editingStudentId ? "Edit Selected Student" : "Add Selected Student"}</CardTitle></CardHeader><CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input aria-label="Student name" maxLength={160} placeholder="Student name" value={studentDraft.student_name} onChange={(event) => setStudentDraft({ ...studentDraft, student_name: event.target.value })} />
                      <Input aria-label="Academic batch" maxLength={80} placeholder="Academic batch" value={studentDraft.academic_batch} onChange={(event) => setStudentDraft({ ...studentDraft, academic_batch: event.target.value })} />
                      <Input aria-label="Department" maxLength={160} placeholder="Department" value={studentDraft.department} onChange={(event) => setStudentDraft({ ...studentDraft, department: event.target.value })} />
                      <Select value={studentDraft.job_role_id || "none"} onValueChange={(value) => setStudentDraft({ ...studentDraft, job_role_id: value === "none" ? "" : value })}>
                        <SelectTrigger aria-label="Selected job role"><SelectValue placeholder="Selected job role" /></SelectTrigger><SelectContent><SelectItem value="none">Role not specified</SelectItem>{companyRoles.map((role) => <SelectItem key={role.id} value={role.id}>{role.role_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Input aria-label="LinkedIn profile URL" type="url" maxLength={2048} placeholder="LinkedIn profile URL (optional)" value={studentDraft.linkedin_url} onChange={(event) => setStudentDraft({ ...studentDraft, linkedin_url: event.target.value })} />
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={studentDraft.linkedin_approved} onCheckedChange={(checked) => setStudentDraft({ ...studentDraft, linkedin_approved: checked === true })} />LinkedIn link approved for publication</label>
                    <div className="flex gap-2"><Button disabled={saving} onClick={() => void saveStudent()}>{editingStudentId ? "Save Student" : "Add Student"}</Button>{editingStudentId && <Button variant="outline" onClick={() => { setEditingStudentId(null); setStudentDraft(emptyStudent); }}>Cancel</Button>}</div>
                  </CardContent></Card>
                  <div className="space-y-2">
                    {companyStudents.map((record) => (
                      <Card key={record.id}><CardContent className="flex flex-wrap items-start justify-between gap-3 p-4"><div className="min-w-0"><p className="font-medium">{record.student_name}</p><p className="text-sm text-muted-foreground">{record.academic_batch} · {record.department}{record.job_role_id ? ` · ${companyRoles.find((role) => role.id === record.job_role_id)?.role_name || "Role"}` : ""}</p>{record.linkedin_url && record.linkedin_approved && <a href={record.linkedin_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-primary underline">LinkedIn Profile</a>}</div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => startEditStudent(record)} aria-label={`Edit ${record.student_name}`}>✎</Button><Button variant="ghost" size="icon" disabled={saving} onClick={() => void deleteStudent(record.id)} aria-label={`Delete ${record.student_name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></CardContent></Card>
                    ))}
                    {!companyStudents.length && <p className="py-5 text-center text-sm text-muted-foreground">No selected-student records yet.</p>}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminCampusJobs;
