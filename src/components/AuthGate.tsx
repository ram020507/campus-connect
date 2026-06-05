import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { verifySession, clearSession, type Role } from "@/lib/authGuard";

interface AuthGateProps {
  role: Role;
  loginPath: string;
  children: ReactNode;
}

const AuthGate = ({ role, loginPath, children }: AuthGateProps) => {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    verifySession(role).then((ok) => {
      if (cancelled) return;
      if (!ok) {
        clearSession(role);
        navigate(loginPath);
      } else {
        setChecked(true);
      }
    });
    return () => { cancelled = true; };
  }, [navigate, role, loginPath]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
};

export default AuthGate;
