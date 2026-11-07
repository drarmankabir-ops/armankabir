import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type AdminLearningVideo,
  type LearningVideoInput,
  learningVideoService,
} from "@/services/learningVideos";
import { Pencil, Plus, RefreshCw, Trash2, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface VideoForm {
  title: string;
  description: string;
  category: string;
  youtube_url: string;
  thumbnail_url: string;
  duration_minutes: string;
  access_type: "free" | "paid";
  price: string;
  currency: string;
  is_published: boolean;
}

const blankForm: VideoForm = {
  title: "",
  description: "",
  category: "",
  youtube_url: "",
  thumbnail_url: "",
  duration_minutes: "",
  access_type: "free",
  price: "0",
  currency: "BDT",
  is_published: false,
};

function toInput(video: AdminLearningVideo): VideoForm {
  return {
    title: video.title,
    description: video.description,
    category: video.category,
    youtube_url: video.youtube_url,
    thumbnail_url: video.thumbnail_url ?? "",
    duration_minutes: String(video.duration_seconds / 60),
    access_type: video.access_type,
    price: String(video.price),
    currency: video.currency,
    is_published: Boolean(video.is_published),
  };
}

function toPayload(form: VideoForm): LearningVideoInput {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    youtube_url: form.youtube_url.trim(),
    thumbnail_url: form.thumbnail_url.trim(),
    duration_seconds: Math.round(Number(form.duration_minutes || 0) * 60),
    access_type: form.access_type,
    price: form.access_type === "free" ? 0 : Number(form.price),
    currency: form.currency.trim().toUpperCase(),
    is_published: form.is_published,
  };
}

export default function AdminVideoLibrary() {
  const [videos, setVideos] = useState<AdminLearningVideo[]>([]);
  const [form, setForm] = useState<VideoForm>(blankForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setVideos(await learningVideoService.adminList());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load videos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  const updateForm = <K extends keyof VideoForm>(
    key: K,
    value: VideoForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(blankForm);
  };

  const saveVideo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await learningVideoService.save({
        ...toPayload(form),
        ...(editingId === null ? {} : { id: editingId }),
      });
      toast.success(editingId === null ? "Video created." : "Video updated.");
      resetForm();
      await loadVideos();
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this video.",
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (video: AdminLearningVideo) => {
    try {
      await learningVideoService.save({
        ...toPayload(toInput(video)),
        id: video.id,
        is_published: !video.is_published,
      });
      toast.success(
        video.is_published ? "Video unpublished." : "Video published.",
      );
      await loadVideos();
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Could not update publication.",
      );
    }
  };

  const deleteVideo = async (video: AdminLearningVideo) => {
    if (
      !window.confirm(
        `Delete “${video.title}”? Purchase and progress history will be retained.`,
      )
    ) {
      return;
    }
    try {
      await learningVideoService.remove(video.id);
      toast.success("Video deleted.");
      if (editingId === video.id) resetForm();
      await loadVideos();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this video.",
      );
    }
  };

  return (
    <Card data-ocid="admin_video_library.panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Medical Education Videos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage YouTube references and catalog details. Paid playback stays
          locked until a real payment verifier is configured.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void loadVideos()}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={saveVideo}
          className="grid gap-4 rounded-xl border bg-muted/20 p-4 md:grid-cols-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor="learning-video-title">Title</Label>
            <Input
              id="learning-video-title"
              maxLength={255}
              required
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="learning-video-category">Category</Label>
            <Input
              id="learning-video-category"
              maxLength={120}
              required
              value={form.category}
              onChange={(event) => updateForm("category", event.target.value)}
              placeholder="e.g. Cardiology"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="learning-video-description">Description</Label>
            <Textarea
              id="learning-video-description"
              maxLength={10000}
              rows={3}
              value={form.description}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="learning-video-youtube">
              YouTube video ID or URL
            </Label>
            <Input
              id="learning-video-youtube"
              required
              value={form.youtube_url}
              onChange={(event) =>
                updateForm("youtube_url", event.target.value)
              }
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="learning-video-thumbnail">
              Thumbnail URL (optional)
            </Label>
            <Input
              id="learning-video-thumbnail"
              type="url"
              value={form.thumbnail_url}
              onChange={(event) =>
                updateForm("thumbnail_url", event.target.value)
              }
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="learning-video-duration">Duration (minutes)</Label>
            <Input
              id="learning-video-duration"
              type="number"
              min="0"
              max="1440"
              step="0.1"
              value={form.duration_minutes}
              onChange={(event) =>
                updateForm("duration_minutes", event.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="learning-video-access">Access</Label>
            <select
              id="learning-video-access"
              value={form.access_type}
              onChange={(event) => {
                const accessType = event.target
                  .value as VideoForm["access_type"];
                updateForm("access_type", accessType);
                if (accessType === "free") updateForm("price", "0");
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="learning-video-price">Price</Label>
            <div className="flex gap-2">
              <Input
                id="learning-video-price"
                type="number"
                min="0"
                step="0.01"
                required={form.access_type === "paid"}
                disabled={form.access_type === "free"}
                value={form.price}
                onChange={(event) => updateForm("price", event.target.value)}
              />
              <Input
                aria-label="Currency code"
                maxLength={3}
                className="w-24 uppercase"
                value={form.currency}
                onChange={(event) => updateForm("currency", event.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(event) =>
                updateForm("is_published", event.target.checked)
              }
            />
            Published on homepage
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={saving} className="gap-2">
              <Plus className="h-4 w-4" />
              {saving
                ? "Saving…"
                : editingId === null
                  ? "Create video"
                  : "Save changes"}
            </Button>
            {editingId !== null && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </div>
        </form>

        {loading ? (
          <p
            className="py-4 text-center text-sm text-muted-foreground"
            aria-live="polite"
          >
            Loading video records…
          </p>
        ) : videos.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No videos yet.
          </p>
        ) : (
          <div className="space-y-3">
            {videos.map((video) => (
              <div
                key={video.id}
                className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{video.title}</h3>
                    <Badge
                      variant={video.is_published ? "secondary" : "outline"}
                    >
                      {video.is_published ? "Published" : "Unpublished"}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {video.access_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {video.category} · {Math.ceil(video.duration_seconds / 60)}{" "}
                    min
                    {video.access_type === "paid" &&
                      ` · ${video.currency} ${Number(video.price).toFixed(2)}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(video.id);
                      setForm(toInput(video));
                    }}
                  >
                    <Pencil className="mr-1.5 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void togglePublished(video)}
                  >
                    {video.is_published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => void deleteVideo(video)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
