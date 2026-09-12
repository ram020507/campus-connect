import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PostRole = "student" | "teacher" | "college";

export interface CampusPost {
  id: string;
  authorRole: PostRole;
  authorId: string | null;
  authorName: string;
  collegeName: string;
  department: string | null;
  studentYear: number | null;
  title: string;
  description: string;
  imageUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
}

export interface CampusComment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  authorRole: string;
  authorKey: string;
  authorName: string;
  text: string;
  createdAt: string;
}

const mapPost = (p: any): CampusPost => ({
  id: p.id,
  authorRole: p.author_role,
  authorId: p.author_id,
  authorName: p.author_name,
  collegeName: p.college_name,
  department: p.department,
  studentYear: p.student_year,
  title: p.title,
  description: p.description,
  imageUrl: p.image_url,
  fileUrl: p.file_url,
  fileName: p.file_name,
  createdAt: p.created_at,
});

/**
 * Campus Hub data: posts, likes, saves and comments.
 * `userKey` identifies the current viewer (reg no / staff id / "admin").
 */
export function useCampusHub(userKey: string, collegeName?: string) {
  const [posts, setPosts] = useState<CampusPost[]>([]);
  const [comments, setComments] = useState<CampusComment[]>([]);
  const [likes, setLikes] = useState<{ postId: string; userKey: string }[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const client = supabase as any;
    let postQuery = client.from("campus_posts").select("*").order("created_at", { ascending: false });
    if (collegeName) postQuery = postQuery.eq("college_name", collegeName);
    const [postsRes, commentsRes, likesRes, savesRes] = await Promise.all([
      postQuery,
      client.from("campus_post_comments").select("*").order("created_at", { ascending: true }),
      client.from("campus_post_likes").select("post_id, user_key"),
      client.from("campus_post_saves").select("post_id").eq("user_key", userKey),
    ]);
    setPosts((postsRes.data || []).map(mapPost));
    setComments(
      (commentsRes.data || []).map((c: any) => ({
        id: c.id,
        postId: c.post_id,
        parentCommentId: c.parent_comment_id,
        authorRole: c.author_role,
        authorKey: c.author_key,
        authorName: c.author_name,
        text: c.text,
        createdAt: c.created_at,
      }))
    );
    setLikes((likesRes.data || []).map((l: any) => ({ postId: l.post_id, userKey: l.user_key })));
    setSavedIds((savesRes.data || []).map((s: any) => s.post_id));
    setLoading(false);
  }, [userKey, collegeName]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const uploadImage = async (file: File): Promise<string | null> => {
    const path = `campus-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("doubt-images").upload(path, file);
    if (error) return null;
    return supabase.storage.from("doubt-images").getPublicUrl(path).data.publicUrl;
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const path = `campus-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("video-files").upload(path, file);
    if (error) return null;
    return supabase.storage.from("video-files").getPublicUrl(path).data.publicUrl;
  };

  const createPost = async (post: {
    authorRole: PostRole;
    authorId?: string | null;
    authorName: string;
    collegeName: string;
    department?: string | null;
    studentYear?: number | null;
    title: string;
    description: string;
    imageUrl?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
  }) => {
    await (supabase as any).from("campus_posts").insert({
      author_role: post.authorRole,
      author_id: post.authorId || null,
      author_name: post.authorName,
      college_name: post.collegeName,
      department: post.department || null,
      student_year: post.studentYear ?? null,
      title: post.title,
      description: post.description,
      image_url: post.imageUrl || null,
      file_url: post.fileUrl || null,
      file_name: post.fileName || null,
    });
    await fetchAll();
  };

  const updatePost = async (id: string, patch: Record<string, any>) => {
    await (supabase as any).from("campus_posts").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    await fetchAll();
  };

  const deletePost = async (id: string) => {
    await (supabase as any).from("campus_posts").delete().eq("id", id);
    await fetchAll();
  };

  const toggleLike = async (postId: string) => {
    const mine = likes.some((l) => l.postId === postId && l.userKey === userKey);
    if (mine) {
      await (supabase as any).from("campus_post_likes").delete().eq("post_id", postId).eq("user_key", userKey);
    } else {
      await (supabase as any).from("campus_post_likes").insert({ post_id: postId, user_key: userKey });
    }
    await fetchAll();
  };

  const toggleSave = async (postId: string) => {
    if (savedIds.includes(postId)) {
      await (supabase as any).from("campus_post_saves").delete().eq("post_id", postId).eq("user_key", userKey);
    } else {
      await (supabase as any).from("campus_post_saves").insert({ post_id: postId, user_key: userKey });
    }
    await fetchAll();
  };

  const addComment = async (
    postId: string,
    text: string,
    author: { role: string; name: string },
    parentCommentId?: string
  ) => {
    await (supabase as any).from("campus_post_comments").insert({
      post_id: postId,
      parent_comment_id: parentCommentId || null,
      author_role: author.role,
      author_key: userKey,
      author_name: author.name,
      text,
    });
    await fetchAll();
  };

  const likeCount = (postId: string) => likes.filter((l) => l.postId === postId).length;
  const likedByMe = (postId: string) => likes.some((l) => l.postId === postId && l.userKey === userKey);

  return {
    posts, comments, savedIds, loading,
    likeCount, likedByMe,
    createPost, updatePost, deletePost,
    toggleLike, toggleSave, addComment,
    uploadImage, uploadFile,
    refetch: fetchAll,
  };
}
