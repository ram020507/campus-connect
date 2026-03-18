import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const TeacherLogin = () => {
  const [staffId, setStaffId] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const teachers = useAppStore((s) => s.teachers);

  const handleStaffIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setStaffId(val);
    setError("");
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 8) val = val.slice(0, 8);
    if (val.length >= 5) {
      val = val.slice(0, 2) + "-" + val.slice(2, 4) + "-" + val.slice(4);
    } else if (val.length >= 3) {
      val = val.slice(0, 2) + "-" + val.slice(2);
    }
    setDob(val);
    setError("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find(
      (t) => t.staffId === staffId && t.dob === dob
    );
    if (teacher) {
      sessionStorage.setItem("teacher-auth", JSON.stringify(teacher));
      navigate("/teacher/dashboard");
    } else {
      setError("Invalid credentials. Contact your admin.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <GraduationCap className="h-7 w-7" />
          </div>
          <CardTitle className="font-display text-2xl">Teacher Login</CardTitle>
          <CardDescription>Use credentials provided by your admin</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              placeholder="Staff ID (numbers only)"
              value={staffId}
              onChange={handleStaffIdChange}
              inputMode="numeric"
            />
            <Input
              placeholder="Date of Birth (DD-MM-YYYY)"
              value={dob}
              onChange={handleDobChange}
              inputMode="numeric"
              maxLength={10}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Sign In</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherLogin;
