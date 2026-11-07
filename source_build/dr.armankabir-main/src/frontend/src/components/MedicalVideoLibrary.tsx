import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/apiClient";
import { learningVideoService } from "@/services/learningVideos";
import type {
  LearningVideo,
  LearningVideoPlayback,
} from "@/services/learningVideos";
import {
  BookOpen,
  Clock3,
  LockKeyhole,
  Play,
  RefreshCw,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function MedicalVideoLibrary({
  onLoginClick,
}: {
  onLoginClick: () => void;
}) {
  const [videos, setVideos] = useState<LearningVideo[]>([]);
  const [myVideos, setMyVideos] = useState<LearningVideo[]>([]);
  const [showMyVideos, setShowMyVideos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myVideosError, setMyVideosError] = useState("");
  const [activeVideo, setActiveVideo] = useState<LearningVideoPlayback | null>(
    null,
  );
  const [openingId, setOpeningId] = useState<number | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setVideos(await learningVideoService.list());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The catalog could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const openVideo = async (video: LearningVideo) => {
    setOpeningId(video.id);
    setMyVideosError("");
    try {
      setActiveVideo(await learningVideoService.getPlayback(video.id));
    } catch (openError) {
      if (openError instanceof ApiError && openError.statusCode === 401) {
        onLoginClick();
      } else {
        setMyVideosError(
          openError instanceof Error
            ? openError.message
            : "This video is not currently available to your account.",
        );
      }
    } finally {
      setOpeningId(null);
    }
  };

  const toggleMyVideos = async () => {
    if (showMyVideos) {
      setShowMyVideos(false);
      setMyVideosError("");
      return;
    }
    setShowMyVideos(true);
    setMyVideosError("");
    try {
      const result = await learningVideoService.myVideos();
      setMyVideos(result);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.statusCode === 401) {
        onLoginClick();
      } else {
        setMyVideosError(
          loadError instanceof Error
            ? loadError.message
            : "Your video library could not be loaded.",
        );
      }
    }
  };

  const displayVideos = showMyVideos ? myVideos : videos;

  return (
    <section
      id="medical-videos"
      className="bg-slate-50 px-4 py-16 sm:px-6"
      data-ocid="medical_videos.section"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                Medical Education &amp; Advice Videos
              </h2>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Practical medical education and advice videos. YouTube hosts the
              video; this site stores only the video reference and catalog
              details.
            </p>
          </div>
          <Button
            type="button"
            variant={showMyVideos ? "default" : "outline"}
            className="shrink-0 gap-2"
            onClick={() => void toggleMyVideos()}
            data-ocid="medical_videos.my_videos.button"
          >
            <Video className="h-4 w-4" />
            {showMyVideos ? "Browse all videos" : "My Videos"}
          </Button>
        </div>

        {error && !showMyVideos && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void loadCatalog()}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {myVideosError && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>{myVideosError}</AlertDescription>
          </Alert>
        )}

        {loading && !showMyVideos && (
          <p
            className="py-8 text-center text-sm text-muted-foreground"
            aria-live="polite"
          >
            Loading videos…
          </p>
        )}

        {!loading && !error && !myVideosError && displayVideos.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-white px-6 py-10 text-center text-sm text-muted-foreground">
            {showMyVideos
              ? "No videos are available in your library yet."
              : "Educational videos will appear here soon."}
          </div>
        )}

        {displayVideos.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayVideos.map((video, index) => (
              <article
                key={`${showMyVideos ? "mine" : "catalog"}-${video.id}`}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md"
                data-ocid={`medical_videos.video.item.${index + 1}`}
              >
                <div className="relative aspect-video bg-slate-100">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-primary/70">
                      <Video className="h-12 w-12" />
                    </div>
                  )}
                  {video.duration_seconds > 0 && (
                    <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-1 text-xs text-white">
                      {formatDuration(video.duration_seconds)}
                    </span>
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        video.access_type === "free" ? "secondary" : "outline"
                      }
                    >
                      {video.access_type === "free"
                        ? "Free"
                        : `${video.currency} ${Number(video.price).toFixed(2)}`}
                    </Badge>
                    <Badge variant="outline">{video.category}</Badge>
                    {showMyVideos && video.grant_type && (
                      <Badge variant="outline" className="capitalize">
                        {video.grant_type.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold leading-snug text-foreground">
                      {video.title}
                    </h3>
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                      {video.description}
                    </p>
                  </div>
                  {showMyVideos && video.seconds_watched !== undefined && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      Watched {formatDuration(video.seconds_watched)}
                    </p>
                  )}
                  <Button
                    type="button"
                    className="w-full gap-2"
                    variant={
                      video.access_type === "paid" ? "outline" : "default"
                    }
                    disabled={openingId === video.id}
                    onClick={() => void openVideo(video)}
                    data-ocid={`medical_videos.video.watch_button.${index + 1}`}
                  >
                    {video.access_type === "paid" ? (
                      <LockKeyhole className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {openingId === video.id
                      ? "Checking access…"
                      : video.access_type === "paid"
                        ? "Check paid access"
                        : "Watch video"}
                  </Button>
                  {video.access_type === "paid" && (
                    <p className="text-xs text-muted-foreground">
                      Checkout is not enabled until a payment provider can
                      verify purchases.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={activeVideo !== null}
        onOpenChange={(open) => !open && setActiveVideo(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{activeVideo?.title}</DialogTitle>
          </DialogHeader>
          {activeVideo && (
            <div className="space-y-3">
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(activeVideo.youtube_video_id)}?rel=0`}
                  title={activeVideo.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {activeVideo.description}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
