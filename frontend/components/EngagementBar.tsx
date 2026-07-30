"use client";

import { useState } from "react";
import { TipModal } from "./TipModal";
import { ShareModal } from "./ShareModal";
import { ReportModal } from "./ReportModal";

export function EngagementBar({
  likes = 1247,
  creator,
  creatorAddress,
  videoId,
  videoTitle,
}: {
  likes?: number;
  creator?: string;
  creatorAddress?: string;
  videoId?: number;
  videoTitle?: string;
}) {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const likeCount = likes + (liked ? 1 : 0);

  const Btn = ({
    icon,
    label,
    onClick,
    active = false,
    fill = false,
  }: {
    icon: string;
    label: string;
    onClick?: () => void;
    active?: boolean;
    fill?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-4 py-2 font-ui text-[12px] uppercase tracking-[0.08em] transition ${
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-white/10 bg-card-2 text-muted hover:border-white/30 hover:text-white"
      }`}
    >
      <span
        className="material-symbols-outlined text-[18px]"
        style={fill ? { fontVariationSettings: "'FILL' 1" } : {}}
      >
        {icon}
      </span>
      {label}
    </button>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Btn
          icon="thumb_up"
          label={likeCount.toLocaleString()}
          active={liked}
          fill={liked}
          onClick={() => {
            setLiked((v) => !v);
            if (disliked) setDisliked(false);
          }}
        />
        <Btn
          icon="thumb_down"
          label=""
          active={disliked}
          fill={disliked}
          onClick={() => {
            setDisliked((v) => !v);
            if (liked) setLiked(false);
          }}
        />
        <Btn
          icon="paid"
          label="Tip STX"
          onClick={() => setTipOpen(true)}
        />
        <Btn icon="share" label="Share" onClick={() => setShareOpen(true)} />
        <Btn
          icon="bookmark"
          label={saved ? "Saved" : "Save"}
          active={saved}
          fill={saved}
          onClick={() => setSaved((v) => !v)}
        />
        {videoId != null && (
          <Btn
            icon="flag"
            label="Report"
            onClick={() => setReportOpen(true)}
          />
        )}
      </div>
      <TipModal
        open={tipOpen}
        onClose={() => setTipOpen(false)}
        creator={creator}
        creatorAddress={creatorAddress}
      />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
      {videoId != null && (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          videoId={videoId}
          videoTitle={videoTitle}
        />
      )}
    </>
  );
}
