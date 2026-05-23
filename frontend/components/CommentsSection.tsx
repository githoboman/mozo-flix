"use client";

import { useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebase";

type Comment = {
  id: string;
  author: string;
  handle: string;
  body: string;
  time: string;
  likes: number;
  pinned?: boolean;
  replies?: Comment[];
};

// Real comments come from Firestore. Empty until Firebase is wired + populated.
const SEED: Comment[] = [];

export function CommentsSection() {
  const [draft, setDraft] = useState("");
  const [sort, setSort] = useState<"top" | "new">("top");
  const [comments, setComments] = useState<Comment[]>(SEED);

  const submitComment = () => {
    if (!draft.trim()) return;
    const newComment: Comment = {
      id: String(Date.now()),
      author: "You",
      handle: "@viewer",
      body: draft.trim(),
      time: "just now",
      likes: 0,
    };
    setComments((prev) =>
      sort === "new" ? [newComment, ...prev] : [...prev, newComment],
    );
    setDraft("");
  };

  return (
    <section className="rounded-xl border border-accent-border bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-h2">
          {comments.length + (comments[0]?.replies?.length ?? 0)} Comments
        </h2>
        <div className="flex gap-2">
          {(["top", "new"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded px-3 py-1.5 font-ui text-[10px] uppercase tracking-[0.15em] transition ${
                sort === s
                  ? "bg-accent text-black"
                  : "text-muted hover:text-white"
              }`}
            >
              {s === "top" ? "Top" : "Newest"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 flex gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-accent to-orange-700" />
        <div className="flex-1">
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment..."
            className="w-full resize-none rounded-lg border border-white/10 bg-surface p-3 text-[13px] text-white placeholder-muted focus:border-accent focus:outline-none"
          />
          {draft.length > 0 && (
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setDraft("")}
                className="rounded border border-white/10 px-4 py-1.5 font-ui text-[11px] uppercase tracking-[0.1em] text-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={submitComment}
                className="rounded bg-accent px-4 py-1.5 font-ui text-[11px] font-bold uppercase tracking-[0.1em] text-black hover:bg-accent-bright"
              >
                Comment
              </button>
            </div>
          )}
        </div>
      </div>

      {comments.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-surface p-8 text-center">
          <div className="mb-2 text-3xl">💬</div>
          <div className="font-ui text-[12px] uppercase tracking-[0.15em] text-muted">
            {isFirebaseConfigured ? "Be the first to comment" : "Comments need Firebase"}
          </div>
          {!isFirebaseConfigured && (
            <p className="mx-auto mt-2 max-w-md text-[11px] font-light text-muted/60">
              Set <code className="text-accent">NEXT_PUBLIC_FIREBASE_*</code> in
              .env.local to enable comments. Until then this thread is empty.
            </p>
          )}
        </div>
      )}
      <div className="space-y-6">
        {comments.map((c) => (
          <CommentItem key={c.id} c={c} />
        ))}
      </div>
    </section>
  );
}

function CommentItem({ c, depth = 0 }: { c: Comment; depth?: number }) {
  const [liked, setLiked] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replies, setReplies] = useState<Comment[]>(c.replies ?? []);

  const submitReply = () => {
    if (!replyDraft.trim()) return;
    setReplies((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        author: "You",
        handle: "@viewer",
        body: replyDraft.trim(),
        time: "just now",
        likes: 0,
      },
    ]);
    setReplyDraft("");
    setReplying(false);
  };

  return (
    <div className={`flex gap-3 ${depth > 0 ? "ml-12 mt-4" : ""}`}>
      <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-purple-700 to-blue-700" />
      <div className="flex-1">
        {c.pinned && (
          <div className="mb-1 inline-flex items-center gap-1 font-ui text-[9px] uppercase tracking-[0.15em] text-accent">
            <span className="material-symbols-outlined text-[12px]">push_pin</span>
            Pinned
          </div>
        )}
        <div className="mb-1 flex items-baseline gap-2">
          <span className="font-ui text-[13px] font-bold text-white">
            {c.author}
          </span>
          <span className="text-[11px] text-muted">
            {c.handle} · {c.time}
          </span>
        </div>
        <p className="text-[13px] font-light leading-[1.6] text-white/90">
          {c.body}
        </p>
        <div className="mt-2 flex items-center gap-4">
          <button
            onClick={() => setLiked((v) => !v)}
            className={`flex items-center gap-1.5 text-[11px] transition ${
              liked ? "text-accent" : "text-muted hover:text-white"
            }`}
          >
            <span
              className="material-symbols-outlined text-[14px]"
              style={liked ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              thumb_up
            </span>
            {c.likes + (liked ? 1 : 0)}
          </button>
          {depth === 0 && (
            <button
              onClick={() => setReplying((v) => !v)}
              className="text-[11px] text-muted hover:text-white"
            >
              {replying ? "Cancel" : "Reply"}
            </button>
          )}
        </div>
        {replying && (
          <div className="mt-3 flex gap-2">
            <textarea
              rows={2}
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder={`Reply to ${c.author}...`}
              className="flex-1 resize-none rounded-lg border border-white/10 bg-surface p-2 text-[12px] text-white placeholder-muted focus:border-accent focus:outline-none"
            />
            <button
              onClick={submitReply}
              className="self-end rounded bg-accent px-3 py-2 font-ui text-[10px] font-bold uppercase tracking-[0.1em] text-black hover:bg-accent-bright"
            >
              Post
            </button>
          </div>
        )}
        {replies.map((r) => (
          <CommentItem key={r.id} c={r} depth={depth + 1} />
        ))}
      </div>
    </div>
  );
}
