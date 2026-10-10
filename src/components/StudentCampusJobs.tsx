import { useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCampusJobs } from "@/hooks/useCampusJobs";

const StudentCampusJobs = ({ onBack }: { onBack: () => void }) => {
  const jobs = useCampusJobs();
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const company = jobs.companies.find((item) => item.id === selectedCompanyId) ?? null;
  const roles = useMemo(() => jobs.roles.filter((role) => role.company_id === selectedCompanyId), [jobs.roles, selectedCompanyId]);
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null;
  const roleSkills = selectedRole ? jobs.skills.filter((skill) => skill.role_id === selectedRole.id) : [];
  const companyEligibility = jobs.eligibility.find((item) => item.company_id === selectedCompanyId);
  const students = jobs.selectedStudents.filter((record) => record.company_id === selectedCompanyId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><BriefcaseBusiness className="h-5 w-5 text-primary" />Campus Jobs</h2>
      </div>

      {!company ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Explore recruitment details shared by your college.</p>
          {jobs.loading && <p className="py-6 text-center text-sm text-muted-foreground">Loading companies…</p>}
          {!jobs.loading && jobs.companies.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No companies are listed yet.</CardContent></Card>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.companies.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 shrink-0 text-primary" />{item.company_name}</CardTitle></CardHeader>
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