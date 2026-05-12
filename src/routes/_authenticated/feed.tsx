import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Bảng tin — HL Fitness" }] }),
  component: FeedPage,
});

type Profile = { id: string; display_name: string | null; avatar_url: string | null };
type Post = {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  profile?: Profile;
  likes: number;
  liked: boolean;
  comments: number;
};

function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: rawPosts } = await supabase
      .from("posts")
      .select("id, user_id, content, image_url, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!rawPosts) {
      setPosts([]);
      setLoading(false);
      return;
    }
    const userIds = [...new Set(rawPosts.map((p) => p.user_id))];
    const postIds = rawPosts.map((p) => p.id);
    const [{ data: profiles }, { data: likes }, { data: comments }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds),
      supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
      supabase.from("post_comments").select("post_id").in("post_id", postIds),
    ]);
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
    const likeCount = new Map<string, number>();
    const likedSet = new Set<string>();
    (likes ?? []).forEach((l) => {
      likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1);
      if (l.user_id === user?.id) likedSet.add(l.post_id);
    });
    const commentCount = new Map<string, number>();
    (comments ?? []).forEach((c) => commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1));
    setPosts(
      rawPosts.map((p) => ({
        ...p,
        profile: pmap.get(p.user_id),
        likes: likeCount.get(p.id) ?? 0,
        liked: likedSet.has(p.id),
        comments: commentCount.get(p.id) ?? 0,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePost = async () => {
    if (!user) return;
    if (!content.trim() && !file) {
      toast.error("Hãy viết gì đó hoặc thêm ảnh");
      return;
    }
    setPosting(true);
    let imageUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("posts").upload(path, file);
      if (upErr) {
        toast.error("Lỗi tải ảnh: " + upErr.message);
        setPosting(false);
        return;
      }
      imageUrl = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.trim() || null,
      image_url: imageUrl,
    });
    setPosting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setContent("");
    setFile(null);
    load();
  };

  const toggleLike = async (p: Post) => {
    if (!user) return;
    if (p.liked) {
      await supabase.from("post_likes").delete().eq("post_id", p.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: p.id, user_id: user.id });
    }
    setPosts((prev) =>
      prev.map((x) =>
        x.id === p.id ? { ...x, liked: !p.liked, likes: x.likes + (p.liked ? -1 : 1) } : x,
      ),
    );
  };

  const deletePost = async (id: string) => {
    if (!confirm("Xoá bài viết này?")) return;
    await supabase.from("posts").delete().eq("id", id);
    setPosts((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Bảng tin" subtitle="Cộng đồng HL Fitness 303 Lê Thanh Nghị" />

      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Chia sẻ buổi tập, PR mới, hay tiến bộ của bạn…"
          rows={3}
        />
        {file && (
          <div className="mt-2 text-xs text-muted-foreground">
            Đã chọn: {file.name}
          </div>
        )}
        <div className="flex items-center justify-between mt-3">
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
            <ImagePlus className="size-4" />
            <span>Thêm ảnh</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button size="sm" disabled={posting} onClick={handlePost}>
            {posting && <Loader2 className="size-3 mr-1.5 animate-spin" />}
            Đăng bài
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-8">Đang tải bảng tin…</div>
      ) : posts.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">Chưa có bài viết nào. Hãy là người đầu tiên!</div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onLike={() => toggleLike(p)} onDelete={() => deletePost(p.id)} isOwner={p.user_id === user?.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  onLike,
  onDelete,
  isOwner,
}: {
  post: Post;
  onLike: () => void;
  onDelete: () => void;
  isOwner: boolean;
}) {
  const [showComments, setShowComments] = useState(false);
  return (
    <article className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <Avatar className="size-9">
          <AvatarImage src={post.profile?.avatar_url ?? undefined} />
          <AvatarFallback>{post.profile?.display_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{post.profile?.display_name ?? "Thành viên"}</div>
          <div className="text-xs text-muted-foreground">{relativeTime(post.created_at)}</div>
        </div>
        {isOwner && (
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      {post.content && <p className="px-4 pb-3 text-sm whitespace-pre-wrap">{post.content}</p>}
      {post.image_url && (
        <img src={post.image_url} alt="" className="w-full max-h-[600px] object-cover" />
      )}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-sm">
        <button onClick={onLike} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary">
          <Heart className={`size-4 ${post.liked ? "fill-primary text-primary" : ""}`} />
          {post.likes}
        </button>
        <button onClick={() => setShowComments((v) => !v)} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <MessageCircle className="size-4" />
          {post.comments}
        </button>
      </div>
      {showComments && <Comments postId={post.id} />}
    </article>
  );
}

function Comments({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<
    { id: string; user_id: string; content: string; created_at: string; profile?: Profile }[]
  >([]);
  const [text, setText] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("id, user_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (!data) return;
    const uids = [...new Set(data.map((d) => d.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", uids);
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
    setItems(data.map((d) => ({ ...d, profile: pmap.get(d.user_id) })));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const send = async () => {
    if (!user || !text.trim()) return;
    await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, content: text.trim() });
    setText("");
    load();
  };

  return (
    <div className="border-t border-border bg-muted/30 p-3 space-y-2">
      {items.map((c) => (
        <div key={c.id} className="flex gap-2 items-start text-sm">
          <Avatar className="size-6">
            <AvatarImage src={c.profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px]">{c.profile?.display_name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <span className="font-medium mr-2">{c.profile?.display_name ?? "Thành viên"}</span>
            <span>{c.content}</span>
          </div>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Viết bình luận…" onKeyDown={(e) => e.key === "Enter" && send()} />
        <Button size="sm" onClick={send}>Gửi</Button>
      </div>
    </div>
  );
}