import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, Pencil, Trash2, Upload, X } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useSiteConfig } from "../hooks/useSiteConfig";
import type { GalleryPhoto } from "../services/landing";

export default function GallerySection({ isAdmin }: { isAdmin: boolean }) {
  const { config, updateGallery, isLoading, isError, isSaving } = useSiteConfig();
  const { photos, heading } = config.gallerySection;
  const [editHeading, setEditHeading] = useState(false);
  const [headingDraft, setHeadingDraft] = useState(heading);
  const [headingDraftBn, setHeadingDraftBn] = useState(config.gallerySection.headingBn ?? "");
  const [editCaptionId, setEditCaptionId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [captionDraftBn, setCaptionDraftBn] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const save = useCallback(
    (list: GalleryPhoto[]) => updateGallery({ photos: list }),
    [updateGallery],
  );

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const readers: Promise<GalleryPhoto>[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      readers.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              dataUrl: e.target?.result as string,
              caption: file.name.replace(/\.[^.]+$/, ""),
            });
          };
          reader.readAsDataURL(file);
        }),
      );
    }
    Promise.all(readers).then((newPhotos) => {
      const updated = [...photos, ...newPhotos];
      save(updated)
        .then(() => toast.success(`${newPhotos.length} photo(s) uploaded.`))
        .catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : "Could not save gallery photos.");
        })
        .finally(() => setUploading(false));
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (id: string) => {
    try {
      await save(photos.filter((p) => p.id !== id));
      toast.success("Photo removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove photo.");
    }
  };

  const startEditCaption = (p: GalleryPhoto) => {
    setEditCaptionId(p.id);
    setCaptionDraft(p.caption);
    setCaptionDraftBn(p.captionBn ?? "");
  };

  const saveCaption = async (id: string) => {
    try {
      await save(
        photos.map((p) => (p.id === id ? { ...p, caption: captionDraft, captionBn: captionDraftBn } : p)),
      );
      setEditCaptionId(null);
      toast.success("Caption updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save caption.");
    }
  };

  const saveHeading = async () => {
    try {
      await updateGallery({ heading: headingDraft.trim(), headingBn: headingDraftBn.trim() });
      setEditHeading(false);
      toast.success("Gallery heading updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save gallery heading.");
    }
  };

  return (
    <section
      id="gallery"
      className="py-16 px-4 sm:px-6"
      data-ocid="gallery.section"
    >
      <div className="max-w-6xl mx-auto">
        {isLoading && (
          <p className="mb-4 text-sm text-muted-foreground" role="status">
            Loading gallery from the server…
          </p>
        )}
        {isError && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            Could not load the saved gallery.
          </p>
        )}
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              {editHeading ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={headingDraft}
                    onChange={(e) => setHeadingDraft(e.target.value)}
                    className="text-lg font-bold h-9 w-64"
                    data-ocid="gallery.heading.input"
                    autoFocus
                  />
                  <Input
                    value={headingDraftBn}
                    onChange={(e) => setHeadingDraftBn(e.target.value)}
                    className="text-lg font-bold h-9 w-64"
                    lang="bn"
                    style={{ fontFamily: "'Noto Sans Bengali', Arial, sans-serif" }}
                    aria-label="Bangla gallery heading"
                  />
                  <Button
                    size="sm"
                    onClick={saveHeading}
                    disabled={isSaving}
                    data-ocid="gallery.heading.save_button"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditHeading(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    {heading}
                  </h2>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setHeadingDraft(heading);
                        setHeadingDraftBn(config.gallerySection.headingBn ?? "");
                        setEditHeading(true);
                      }}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      aria-label="Edit heading"
                      data-ocid="gallery.heading.edit_button"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}
            </div>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                data-ocid="gallery.upload_button"
              >
                <Upload className="w-4 h-4" />
                Upload Photos
              </Button>
            )}
          </div>
          {config.gallerySection.headingBn && !editHeading && (
            <p className="mt-1 text-lg text-foreground" lang="bn" style={{ fontFamily: "'Noto Sans Bengali', Arial, sans-serif" }}>
              {config.gallerySection.headingBn}
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            A glimpse of our clinic and facilities.
          </p>
        </motion.div>

        {/* Hidden file input */}
        {isAdmin && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        )}

        {/* Drop zone or grid */}
        {photos.length === 0 ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (isAdmin && (e.key === "Enter" || e.key === " "))
                fileInputRef.current?.click();
            }}
            role={isAdmin ? "button" : undefined}
            tabIndex={isAdmin ? 0 : undefined}
            className={`border-2 border-dashed rounded-2xl p-16 text-center transition-colors ${
              isAdmin
                ? "border-primary/30 hover:border-primary/60 cursor-pointer"
                : "border-muted"
            }`}
            onClick={() => isAdmin && fileInputRef.current?.click()}
            data-ocid="gallery.empty_state"
          >
            <ImageIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            {isAdmin ? (
              <>
                <p className="text-sm font-medium text-muted-foreground">
                  Drop photos here or click to upload
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  JPEG, PNG, WebP supported
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No photos yet.</p>
            )}
          </div>
        ) : (
          <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {photos.map((photo, idx) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: idx * 0.06 }}
                  className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  data-ocid={`gallery.item.${idx + 1}`}
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption || `Gallery photo ${idx + 1}`}
                    className="w-full aspect-[4/3] object-cover"
                    loading="lazy"
                  />
                  {/* Caption */}
                  <div className="bg-background/90 px-3 py-2">
                    {isAdmin && editCaptionId === photo.id ? (
                      <div className="space-y-1">
                        <Input
                          value={captionDraft}
                          onChange={(e) => setCaptionDraft(e.target.value)}
                          className="h-7 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveCaption(photo.id);
                            if (e.key === "Escape") setEditCaptionId(null);
                          }}
                          data-ocid={`gallery.caption.input.${idx + 1}`}
                        />
                        <Input
                          value={captionDraftBn}
                          onChange={(e) => setCaptionDraftBn(e.target.value)}
                          className="h-7 text-xs"
                          lang="bn"
                          style={{ fontFamily: "'Noto Sans Bengali', Arial, sans-serif" }}
                          aria-label="Bangla image caption"
                        />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" onClick={() => saveCaption(photo.id)}>Save</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditCaptionId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground truncate">{photo.caption || ""}</p>
                          {photo.captionBn && <p className="text-xs text-muted-foreground truncate" lang="bn">{photo.captionBn}</p>}
                        </div>
                        {isAdmin && (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => startEditCaption(photo)}
                              className="p-1 rounded hover:bg-muted transition-colors"
                              aria-label="Edit caption"
                              data-ocid={`gallery.edit_button.${idx + 1}`}
                            >
                              <Pencil className="w-3 h-3 text-primary" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(photo.id)}
                              className="p-1 rounded hover:bg-destructive/10 transition-colors"
                              aria-label="Delete photo"
                              data-ocid={`gallery.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {/* Upload tile for admin */}
              {isAdmin && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-2 border-dashed border-primary/30 rounded-2xl aspect-[4/3] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  data-ocid="gallery.add_more.button"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-xs font-medium">Add more</span>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
