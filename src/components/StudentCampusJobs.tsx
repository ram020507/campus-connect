import { useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Building2, ExternalLink, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCampusJobs } from "@/hooks/useCampusJobs";

const StudentCampusJobs = ({ onBack }: { onBack: () => void }) => {
  const jobs = useCampusJobs();
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const company = jobs.companies.find((item) => item.id === selectedCompanyId) ?? null;
  const roles = useMemo(() => jobs.roles.filter((role) => role.company_id === selectedCompanyId), [jobs.roles, selectedCompanyId]);
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null;
  const roleSkills = selectedRole ? jobs.skills.filter((skill) => skill.role_id === selectedRole.id) : [];
  const companyEligibility = jobs.eligibility.find((item) => item.company_id === selectedCompanyId);
  const students = jobs.selectedStudents.filter((record) => record.company_id === selectedCompanyId);
  const roleNames = useMemo(() => Array.from(new Set(jobs.roles.map((role) => role.role_name))).sort((a, b) => a.localeCompare(b)), [jobs.roles]);
  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return jobs.companies.filter((item) => {
      const companyRoles = jobs.roles.filter((role) => role.company_id === item.id);
      if (roleFilter !== "all" && !companyRoles.some((role) => role.role_name === roleFilter)) return false;
      if (!term) return true;

      const roleIds = companyRoles.map((role) => role.id);
      const searchable = [
        item.company_name,
        ...companyRoles.map((role) => role.role_name),
        ...jobs.skills.filter((skill) => roleIds.includes(skill.role_id)).map((skill) => skill.skill_name),
        jobs.eligibility.find((entry) => entry.company_id === item.id)?.criteria || "",
      ].join(" ").toLocaleLowerCase();
      return searchable.includes(term);
    });
  }, [jobs.companies, jobs.eligibility, jobs.roles, jobs.skills, roleFilter, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><BriefcaseBusiness className="h-5 w-5 text-primary" />Campus Jobs</h2>
      </div>

      {!company ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Explore recruitment details shared by your college.</p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.55fr)]">
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search opportunities"
                className="pl-9"
                placeholder="Company, role, skill, or eligibility"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger aria-label="Filter by job role"><SelectValue placeholder="All job roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All job roles</SelectItem>
                {roleNames.map((roleName) => <SelectItem key={roleName} value={roleName}>{roleName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {jobs.loading && <p className="py-6 text-center text-sm text-muted-foreground">Loading companies…</p>}
          {!jobs.loading && jobs.companies.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No companies are listed yet.</CardContent></Card>}
          {!jobs.loading && jobs.companies.length > 0 && filteredCompanies.length === 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-y py-5">
              <p className="text-sm text-muted-foreground">No opportunities match your search and filters.</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setRoleFilter("all"); }}>
                <X className="mr-1 h-4 w-4" />Clear filters
              </Button>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 shrink-0 text-primary" />{item.company_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {jobs.roles.filter((role) => role.company_id === item.id).map((role) => role.role_name).join(" · ") || "Roles to be announced"}
                  </p>
                </CardHeader>
                <CardContent className="mt-auto"><Button variant="outline" className="w-full" onClick={() => { setSelectedCompanyId(item.id); setSelectedRoleId(""); }}>View Details</Button></CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedCompanyId(""); setSelectedRoleId(""); }}><ArrowLeft className="mr-1 h-4 w-4" />All Companies</Button>
          <div><h3 className="font-display text-2xl font-semibold">{company.company_name}</h3><p className="text-sm text-muted-foreground">Recruitment details</p></div>
          <Tabs defaultValue="eligibility">
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="eligibility">Eligibility Criteria</TabsTrigger>
              <TabsTrigger value="roles">Job Roles & Skills</TabsTrigger>
              <TabsTrigger value="students">Selected Students</TabsTrigger>
            </TabsList>
            <TabsContent value="eligibility">
              <Card><CardHeader><CardTitle className="text-base">Eligibility Criteria</CardTitle></CardHeader><CardContent>{companyEligibility ? <p className="whitespace-pre-wrap text-sm leading-6">{companyEligibility.criteria}</p> : <p className="text-sm text-muted-foreground">Eligibility details have not been added yet.</p>}</CardContent></Card>
            </TabsContent>
            <TabsContent value="roles" className="space-y-3">
              {roles.length > 0 && <Select value={selectedRole?.id || ""} onValueChange={setSelectedRoleId}><SelectTrigger aria-label="Choose job role"><SelectValue placeholder="Choose a job role" /></SelectTrigger><SelectContent>{roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.role_name}</SelectItem>)}</SelectContent></Select>}
              {!roles.length ? <Card><CardContent className="p-6 text-sm text-muted-foreground">No job roles have been listed yet.</CardContent></Card> : <Card><CardHeader><CardTitle className="text-base">{selectedRole?.role_name}</CardTitle></CardHeader><CardContent>{roleSkills.length ? <ul className="list-inside list-disc space-y-2 text-sm">{roleSkills.map((skill) => <li key={skill.id}>{skill.skill_name}</li>)}</ul> : <p className="text-sm text-muted-foreground">Required skills have not been added for this role.</p>}</CardContent></Card>}
            </TabsContent>
            <TabsContent value="students" className="space-y-3">
              {!students.length && <Card><CardContent className="p-6 text-sm text-muted-foreground">No selected-student records have been shared yet.</CardContent></Card>}
              {students.map((record) => <Card key={record.id}><CardContent className="flex flex-wrap items-start justify-between gap-3 p-4"><div><p className="font-medium">{record.student_name}</p><p className="text-sm text-muted-foreground">{record.academic_batch} · {record.department}</p><p className="mt-1 text-sm">{roles.find((role) => role.id === record.job_role_id)?.role_name || "Job role not specified"}</p></div>{record.linkedin_url && record.linkedin_approved && <Button asChild variant="outline" size="sm"><a href={record.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn Profile<ExternalLink className="ml-2 h-4 w-4" /></a></Button>}</CardContent></Card>)}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default StudentCampusJobs;