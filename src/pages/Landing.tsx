import { GraduationCap, Shield, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center mb-12 animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-4">
          <GraduationCap className="h-10 w-10 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold font-display text-foreground tracking-tight">
            Campus-Connect
          </h1>
        </div>
        <p className="text-muted-foreground font-body text-lg max-w-md mx-auto">
          Access recorded lectures and clarify doubts with your teachers — anytime, anywhere.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl animate-fade-in">
        <PortalCard
          to="/admin/login"
          icon={<Shield className="h-8 w-8" />}
          title="Admin"
          description="Manage colleges, accounts & content"
          accentClass="bg-primary text-primary-foreground"
        />
        <PortalCard
          to="/student/login"
          icon={<BookOpen className="h-8 w-8" />}
          title="Student"
          description="Watch lectures & ask doubts"
          accentClass="bg-success text-success-foreground"
        />
        <PortalCard
          to="/teacher/login"
          icon={<GraduationCap className="h-8 w-8" />}
          title="Teacher"
          description="Answer student doubts"
          accentClass="bg-accent text-accent-foreground"
        />
      </div>
    </div>
  );
};

function PortalCard({
  to,
  icon,
  title,
  description,
  accentClass,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentClass: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-lg border bg-card p-6 text-center transition-all hover:shadow-lg hover:-translate-y-1"
    >
      <div
        className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${accentClass} transition-transform group-hover:scale-110`}
      >
        {icon}
      </div>
      <h2 className="text-xl font-semibold font-display text-card-foreground mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground font-body">{description}</p>
    </Link>
  );
}

export default Landing;
