import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Heart, MessageSquare, Bookmark, BadgeCheck, ImagePlus, Paperclip, Loader2, Send, X,
} from "lucide-react";
import { useCampusHub, type PostRole } from "@/hooks/useCampusHub";

export interface CampusHubViewer {
  role: PostRole;            // who is posting: student | teacher | college(admin)
  key: string;               // reg no / staff id / "admin"
  name: string;
  collegeName: string;
  department?: string;
  year?: number;
}

interface CampusHubProps {
  viewer: CampusHubViewer;
  canPost?: boolean;
}

type Filter = "all" | "student" | "college";

const CampusHub = ({ viewer, canPost = true }: CampusHubProps) => {
  const hub = useCampusHub(viewer.key, viewer.collegeName);
  const [filter, setFilter] = useState<Filter>("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<Record<string, string | null>>({});

  const visible = hub.posts.filter((p) => {
    if (filter === "student") return p.authorRole === "student";
    if (filter === "college") return p.authorRole !== "student";
    return true;
  });

  const submit = async () => {
    if (!title.trim() || !description.trim()) return;
    setPosting(true);
    const imageUrl = imageFile ? await hub.uploadImage(imageFile) : null;
    const fileUrl = docFile ? await hub.uploadFile(docFile) : null;
    await hub.createPost({
      authorRole: viewer.role,
      authorId: viewer.role === "college" ? null : viewer.key,
      authorName: viewer.role === "college" ? viewer.collegeName : viewer.name,
      collegeName: viewer.collegeName,
      department: viewer.department || null,
      studentYear: viewer.role === "student" ? viewer.year ?? null : null,
      title: title.trim(),
      description: description.trim(),
      imageUrl,
      fileUrl,
      fileName: docFile?.name || null,
    });
    setTitle(""); setDescription(""); setImageFile(null); setDocFile(null);
    setPosting(false);
  };

  return (
    <div className="space-y-4">
      {canPost && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Share an update</p>
            <Input placeholder="Post title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea
              placeholder="Describe your achievement, project, event or announcement…"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-primary">
                <ImagePlus className="h-4 w-4" /> Image
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </label>
              <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-primary">
                <Paperclip className="h-4 w-4" /> File
                <input type="file" className="hidden" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
              </label>
              {imageFile && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  {imageFile.name}
                  <button onClick={() => setImageFile(null)}><X className="h-3 w-3" /></button>
                </span>
              )}
              {docFile && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  {docFile.name}
                  <button onClick={() => setDocFile(null)}><X className="h-3 w-3" /></button>
                </span>
              )}
              <Button size="sm" className="ml-auto" onClick={submit} disabled={posting || !title.trim() || !description.trim()}>
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Post"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {(["all", "student", "college"] as Filter[]).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "student" ? "Student" : "College"}
          </Button>
        ))}
      </div>

      {hub.loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : visible.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No posts yet.</CardContent></Card>
      ) : (
        visible.map((p) => {
          const postComments = hub.comments.filter((c) => c.postId === p.id);
          const roots = postComments.filter((c) => !c.parentCommentId);
          return (
            <Card key={p.id} className="animate-fade-in">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    {p.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold flex items-center gap-1">
                      {p.authorName}
                      {p.authorRole === "college" && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-primary">
                          <BadgeCheck className="h-3.5 w-3.5" /> Verified College
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {[p.department, p.studentYear ? `${p.studentYear} Year` : null, p.authorRole !== "student" ? p.collegeName : null]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-semibold text-sm">{p.title}</h3>
                <p className="text-sm whitespace-pre-wrap">{p.description}</p>
                {p.imageUrl && <img src={p.imageUrl} alt={p.title} loading="lazy" className="rounded border max-h-80 w-full object-cover" />}
                {p.fileUrl && (
                  <a href={p.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Paperclip className="h-3 w-3" /> {p.fileName || "Attachment"}
                  </a>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button onClick={() => hub.toggleLike(p.id)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                    <Heart className={`h-4 w-4 ${hub.likedByMe(p.id) ? "fill-primary text-primary" : ""}`} /> {hub.likeCount(p.id)}
                  </button>
                  <button
                    onClick={() => setOpenComments((s) => ({ ...s, [p.id]: !s[p.id] }))}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                  >
                    <MessageSquare className="h-4 w-4" /> {postComments.length}
                  </button>
                  <button onClick={() => hub.toggleSave(p.id)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary ml-auto">
                    <Bookmark className={`h-4 w-4 ${hub.savedIds.includes(p.id) ? "fill-primary text-primary" : ""}`} />
                    {hub.savedIds.includes(p.id) ? "Saved" : "Save"}
                  </button>
                </div>

                {openComments[p.id] && (
                  <div className="space-y-2 pt-2 border-t">
                    {roots.map((c) => (
                      <div key={c.id} className="text-xs space-y-1">
                        <p><span className="font-semibold">{c.authorName}</span> {c.text}</p>
                        <div className="pl-4 space-y-1">
                          {postComments.filter((r) => r.parentCommentId === c.id).map((r) => (
                            <p key={r.id}><span className="font-semibold">{r.authorName}</span> {r.text}</p>
                          ))}
                        </div>
                        <button
                          className="text-[11px] text-primary"
                          onClick={() => setReplyTo((s) => ({ ...s, [p.id]: s[p.id] === c.id ? null : c.id }))}
                        >
                          {replyTo[p.id] === c.id ? "Cancel reply" : "Reply"}
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder={replyTo[p.id] ? "Write a reply…" : "Write a comment…"}
                        value={commentText[p.id] || ""}
                        onChange={(e) => setCommentText((s) => ({ ...s, [p.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        disabled={!(commentText[p.id] || "").trim()}
                        onClick={async () => {
                          await hub.addComment(
                            p.id,
                            commentText[p.id].trim(),
                            { role: viewer.role, name: viewer.role === "college" ? viewer.collegeName : viewer.name },
                            replyTo[p.id] || undefined
                          );
                          setCommentText((s) => ({ ...s, [p.id]: "" }));
                          setReplyTo((s) => ({ ...s, [p.id]: null }));
                        }}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default CampusHub;
