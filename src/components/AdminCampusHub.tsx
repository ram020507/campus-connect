import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CampusHub from "@/components/CampusHub";

interface AdminCampusHubProps {
  colleges: { id: string; name: string }[];
}

const AdminCampusHub = ({ colleges }: AdminCampusHubProps) => {
  const [collegeName, setCollegeName] = useState("");

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm font-semibold">Select College</p>
          <Select value={collegeName} onValueChange={setCollegeName}>
            <SelectTrigger className="sm:w-80">
              <SelectValue placeholder="Choose a college" />
            </SelectTrigger>
            <SelectContent>
              {colleges.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {collegeName ? (
        <CampusHub
          key={collegeName}
          viewer={{ role: "college", key: "admin", name: collegeName, collegeName }}
        />
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Select a college to view and publish Campus Hub posts.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminCampusHub;
