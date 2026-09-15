import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BadgeCheck, ImagePlus, Paperclip, Loader2, Pencil, Trash2, X, Check } from "lucide-react";
import { useCampusHub } from "@/hooks/useCampusHub";

interface AdminCampusHubProps {
  colleges: { id: string; name: string }[];
}

const AdminCampusHub = ({ colleges }: AdminCampusHubProps) => {
  const [collegeName, setCollegeName] = useState("");
  const hub = useCampusHub("admin", collegeName || undefined);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCollege, setEditCollege] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editDoc, setEditDoc] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const officialPosts = hub.posts.filter((p) => p.authorRole === "college");
  const communityPosts = hub.posts.filter((p) => p.authorRole !== "college");

  const publish = async () => {
    if (!collegeName || !title.trim() || !description.trim()) return;
    setPosting(true);
    const imageUrl = imageFile ? await hub.uploadImage(imageFile) : null;
    const fileUrl = docFile ? await hub.uploadFile(docFile) : null;
    await hub.createPost({
      authorRole: "college",
      authorId: null,
      authorName: collegeName,
      collegeName,
      title: title.trim(),
      description: description.trim(),
      imageUrl,
      fileUrl,
      fileName: docFile?.name || null,
    });
    setTitle(""); setDescription(""); setImageFile(null); setDocFile(null);
    setPosting(false);
  };

  const startEdit = (p: typeof hub.posts[number]) => {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditDescription(p.description);
    setEditCollege(p.collegeName);
    setEditImage(null);
    setEditDoc(null);
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    const patch: Record<string, unknown> = {
      title: editTitle.trim(),
      description: editDescription.trim(),
      college_name: editCollege,
      author_name: editCollege,
    };
    if (editImage) patch.image_url = await hub.uploadImage(editImage);
    if (editDoc) {
      patch.file_url = await hub.uploadFile(editDoc);
      patch.file_name = editDoc.name;
    }
    await hub.updatePost(id, patch);
    setEditingId(null);
    setSavingEdit(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Create Official College Post</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">College</label>
            <Select value={collegeName} onValueChange={setCollegeName}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select college" /></SelectTrigger>
              <SelectContent>
                {colleges.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {collegeName && (
            <>
              <Input placeholder="Post title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea
                placeholder="Post description — event details, announcement, opportunity…"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-primary">
                  <ImagePlus className="h-4 w-4" /> Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                </label>
                <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-primary">
                  <Paperclip className="h-4 w-4" /> Upload File
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
                <Button className="ml-auto" size="sm" disabled={posting || !title.trim() || !description.trim()} onClick={publish}>
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Post"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!collegeName ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Select a college to manage its Campus Hub.</CardContent></Card>
      ) : hub.loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Official College Posts ({officialPosts.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {officialPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No official posts yet.</p>
              ) : officialPosts.map((p) => (
                <div key={p.id} className="border rounded-md p-3 space-y-2">
                  {editingId === p.id ? (
                    <div className="space-y-2">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      <Textarea rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                      <Select value={editCollege} onValueChange={setEditCollege}>
                        <SelectTrigger><SelectValue placeholder="College" /></SelectTrigger>
                        <SelectContent>
                          {colleges.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-primary">
                          <ImagePlus className="h-4 w-4" /> Replace Image
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => setEditImage(e.target.files?.[0] || null)} />
                        </label>
                        <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-primary">
                          <Paperclip className="h-4 w-4" /> Replace File
                          <input type="file" className="hidden" onChange={(e) => setEditDoc(e.target.files?.[0] || null)} />
                        </label>
                        <Button size="sm" className="ml-auto" disabled={savingEdit} onClick={() => saveEdit(p.id)}>
                          {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Save</>}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold flex items-center gap-1">
                            {p.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            {p.collegeName}
                            <span className="inline-flex items-center gap-0.5 text-primary"><BadgeCheck className="h-3 w-3" /> Verified College</span>
                            • {new Date(p.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="ml-auto flex gap-1">
                          <Button size="icon" variant="outline" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="outline"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure you want to delete this post?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This official post will be removed from Campus Hub immediately.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => hub.deletePost(p.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{p.description}</p>
                      {p.imageUrl && <img src={p.imageUrl} alt={p.title} loading="lazy" className="rounded border max-h-64 object-cover w-full" />}
                      {p.fileUrl && (
                        <a href={p.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <Paperclip className="h-3 w-3" /> {p.fileName || "Attachment"}
                        </a>
                      )}
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Student & Teacher Posts ({communityPosts.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {communityPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No community posts yet.</p>
              ) : communityPosts.map((p) => (
                <div key={p.id} className="border rounded-md p-3 space-y-1">
                  <p className="text-sm font-semibold">{p.authorName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {[p.authorRole === "student" ? "Student" : "Teacher", p.department, p.studentYear ? `${p.studentYear} Year` : null, new Date(p.createdAt).toLocaleDateString()]
                      .filter(Boolean).join(" • ")}
                  </p>
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-sm whitespace-pre-wrap">{p.description}</p>
                  {p.imageUrl && <img src={p.imageUrl} alt={p.title} loading="lazy" className="rounded border max-h-64 object-cover w-full" />}
                  {p.fileUrl && (
                    <a href={p.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Paperclip className="h-3 w-3" /> {p.fileName || "Attachment"}
                    </a>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminCampusHub;
