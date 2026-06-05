import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { storeSession } from "@/lib/authGuard";

const StudentLogin = () => {
  const [regNo, setRegNo] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const doubtId = searchParams.get("doubtId");

  const handleRegNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegNo(e.target.value.replace(/\D/g, ""));
    setError("");
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 8) val = val.slice(0, 8);
    if (val.length >= 5) val = val.slice(0, 2) + "-" + val.slice(2, 4) + "-" + val.slice(4);
    else if (val.length >= 3) val = val.slice(0, 2) + "-" + val.slice(2);
    setDob(val);
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("auth-login", {
        body: { type: "student", registrationNumber: regNo, dob },
      });
      if (fnError || !data?.success || !data?.token) {
        setError("Invalid credentials. Contact your admin.");
      } else {
        storeSession("student", data.token, JSON.stringify({
          id: data.user.id,
          registrationNumber: data.user.registrationNumber,
          name: data.user.name,
          collegeName: data.user.collegeName,
          department: data.user.department,
          year: data.user.year,
        }));
        navigate(doubtId ? `/student/dashboard?doubtId=${doubtId}` : "/student/dashboard");
      }
    } catch {
      setError("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-4">
      <div className="flex items-center gap-2 p-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center">
      <Card className="w-full max-w-sm animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-success text-success-foreground">
            <BookOpen className="h-7 w-7" />
          </div>
          <CardTitle className="font-display text-2xl">Student Login</CardTitle>
          <CardDescription>Use credentials provided by your admin</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input placeholder="Registration Number (numbers only)" value={regNo} onChange={handleRegNoChange} inputMode="numeric" />
            <Input placeholder="Date of Birth (DD-MM-YYYY)" value={dob} onChange={handleDobChange} inputMode="numeric" maxLength={10} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default StudentLogin;
