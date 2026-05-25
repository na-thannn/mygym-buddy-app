import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Heart,
  MessageSquare,
  Share2,
  MoreHorizontal,
  User,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Community Feed — HL Fitness" }] }),
  component: Feed,
});

type Post = {
  id: string;
  authorName?: string;
  content: string;
  imageBase64?: string | null;
  likesCount?: number;
  likes?: number;
  liked?: boolean;
  createdAt: string;
};

function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const fetchPosts = async () => {
    const res = await fetch("/api/feed", { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  };

  const load = useCallback(async () => {
    try {
      const rows = await fetchPosts();
      setPosts(rows as Post[]);
    } catch (err) {
      toast.error("Failed to load feed");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePost = async (imageBase64?: string | null) => {
    if (!newPost.trim() && !imageBase64) return;
    setBusy(true);
    try {
      await fetch("/api/feed", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: newPost.trim() || "", imageBase64: imageBase64 ?? null }),
      });
      setNewPost("");
      await load();
      toast.success("Posted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Post failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleLike = (id: string) => {
    setPosts(
      posts.map((p) =>
        p.id === id
          ? ({
              ...p,
              liked: !p.liked,
              likes: ((p.likes ?? 0) + (p.liked ? -1 : 1)) as number,
            } as Post)
          : p,
      ),
    );
  };

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6 pb-24 md:pb-6">
      <PageHeader
        title="Community Feed"
        description="See what's happening at HL Fitness 303 Le Thanh Nghi"
      />

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="size-10 bg-yellow-400/20 text-yellow-400 rounded-full flex-shrink-0 grid place-items-center">
            <User className="size-5" />
          </div>
          <div className="flex-1">
            <textarea
              placeholder="Share your workout, new PR, or progress..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="w-full bg-transparent border-none rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none min-h-[60px] resize-none pt-1 leading-6"
            />
          </div>
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 4 * 1024 * 1024) {
                  toast.error("Image too large (max 4MB)");
                  return;
                }
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const base64 = ev.target?.result as string;
                  await handlePost(base64);
                };
                reader.readAsDataURL(file);
                e.currentTarget.value = "";
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10"
              onClick={() => fileRef.current?.click()}
            >
              <ImageIcon className="size-4 mr-2" /> Add Photo
            </Button>
            <div className="text-xs text-slate-400">Optional image or text post</div>
          </div>
          <Button
            onClick={() => handlePost(null)}
            size="sm"
            disabled={busy}
            className="bg-yellow-400 text-yellow-950 font-semibold hover:bg-yellow-300 rounded-full px-6"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Post"}
          </Button>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {posts.map((post) => (
          <div
            key={post.id}
            className="rounded-2xl border border-white/10 bg-black/30 p-5 animate-fade-up"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-slate-800 text-slate-300 rounded-full flex-shrink-0 grid place-items-center font-bold text-sm">
                  {post.authorName?.charAt(0) ?? "U"}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-slate-200">
                    {post.authorName ?? "Unknown"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(post.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-slate-300"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </div>
            <p className="mt-4 text-slate-300 text-sm leading-relaxed">{post.content}</p>
            {post.imageBase64 && (
              <div className="mt-3 rounded-md overflow-hidden">
                <img
                  src={post.imageBase64}
                  alt="upload"
                  className="w-full h-auto object-cover rounded-md"
                />
              </div>
            )}
            <div className="mt-5 flex gap-1 border-t border-white/5 pt-3">
              <div className="flex-1 text-slate-400">{post.likesCount ?? 0} likes</div>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-slate-400 hover:text-slate-200 hover:bg-white/5"
              >
                <MessageSquare className="size-4 mr-2" /> Comment
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-slate-400 hover:text-slate-200 hover:bg-white/5"
              >
                <Share2 className="size-4 mr-2" /> Share
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
