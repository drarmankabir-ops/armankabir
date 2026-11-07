import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Edit,
  MessageSquareQuote,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useSiteConfig } from "../hooks/useSiteConfig";
import type { Testimonial } from "../services/landing";

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange?: (v: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={`transition-colors ${
            onChange ? "cursor-pointer hover:scale-110" : "cursor-default"
          }`}
          aria-label={`Rate ${n} stars`}
        >
          <Star
            className={`w-4 h-4 ${
              n <= value
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const emptyForm = { patientName: "", patientNameBn: "", quote: "", quoteBn: "", rating: 5, date: "" };

export default function TestimonialsSection({
  isAdmin,
}: {
  isAdmin: boolean;
}) {
  const {
    config,
    updateTestimonials,
    isLoading,
    isError,
    error,
    isSaving,
  } = useSiteConfig();
  const { testimonials, heading } = config.testimonialsSection;
  const [editHeading, setEditHeading] = useState(false);
  const [headingDraft, setHeadingDraft] = useState(heading);
  const [headingDraftBn, setHeadingDraftBn] = useState(config.testimonialsSection.headingBn ?? "");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setHeadingDraft(heading);
  }, [heading]);

  useEffect(() => {
    setHeadingDraftBn(config.testimonialsSection.headingBn ?? "");
  }, [config.testimonialsSection.headingBn]);

  const save = useCallback(
    async (list: Testimonial[]) => {
      await updateTestimonials({ testimonials: list });
    },
    [updateTestimonials],
  );

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditId(t.id);
    setForm({
      patientName: t.patientName,
      patientNameBn: t.patientNameBn ?? "",
      quote: t.quote,
      quoteBn: t.quoteBn ?? "",
      rating: t.rating,
      date: t.date || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.patientName.trim() || !form.quote.trim()) {
      toast.error("Name and quote are required.");
      return;
    }
    if (editId) {
      const updated = testimonials.map((t) =>
        t.id === editId ? { ...t, ...form } : t,
      );
      try {
        await save(updated);
        toast.success("Testimonial updated.");
      } catch (saveError) {
        toast.error(
          saveError instanceof Error
            ? `Could not update testimonial: ${saveError.message}`
            : "Could not update testimonial.",
        );
        return;
      }
    } else {
      const newT: Testimonial = {
        id: Date.now().toString(36),
        ...form,
      };
      try {
        await save([...testimonials, newT]);
        toast.success("Testimonial added.");
      } catch (saveError) {
        toast.error(
          saveError instanceof Error
            ? `Could not add testimonial: ${saveError.message}`
            : "Could not add testimonial.",
        );
        return;
      }
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await save(testimonials.filter((t) => t.id !== id));
      toast.success("Testimonial removed.");
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? `Could not remove testimonial: ${saveError.message}`
          : "Could not remove testimonial.",
      );
    }
  };

  const saveHeading = async () => {
    const h = headingDraft.trim();
    try {
      await updateTestimonials({ heading: h, headingBn: headingDraftBn.trim() });
      setEditHeading(false);
      toast.success("Heading updated.");
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? `Could not update heading: ${saveError.message}`
          : "Could not update heading.",
      );
    }
  };

  return (
    <section
      id="testimonials"
      className="py-16 px-4 sm:px-6 bg-blue-50/40 border-y border-blue-100"
      data-ocid="testimonials.section"
    >
      <div className="max-w-6xl mx-auto">
        {isLoading && (
          <p className="mb-4 text-sm text-muted-foreground" role="status">
            Loading testimonials from the server…
          </p>
        )}
        {isError && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            Could not load saved testimonials
            {error instanceof Error ? `: ${error.message}` : "."}
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
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <MessageSquareQuote className="w-5 h-5 text-amber-600" />
              </div>
              {editHeading ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={headingDraft}
                    onChange={(e) => setHeadingDraft(e.target.value)}
                    className="text-lg font-bold h-9 w-64"
                    data-ocid="testimonials.heading.input"
                    autoFocus
                  />
                  <Input
                    value={headingDraftBn}
                    onChange={(e) => setHeadingDraftBn(e.target.value)}
                    className="h-9 w-64"
                    style={{ fontFamily: "'Noto Sans Bengali', Arial, sans-serif" }}
                    aria-label="Bangla testimonial heading"
                    lang="bn"
                  />
                  <Button
                    size="sm"
                    onClick={saveHeading}
                    disabled={isSaving}
                    data-ocid="testimonials.heading.save_button"
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
                        setEditHeading(true);
                      }}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      aria-label="Edit heading"
                      data-ocid="testimonials.heading.edit_button"
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
                onClick={openAdd}
                className="gap-1.5"
                data-ocid="testimonials.add_button"
              >
                <Plus className="w-4 h-4" />
                Add Testimonial
              </Button>
            )}
          </div>
          {config.testimonialsSection.headingBn && !editHeading && (
            <p className="mt-1 text-lg text-foreground" lang="bn" style={{ fontFamily: "'Noto Sans Bengali', Arial, sans-serif" }}>
              {config.testimonialsSection.headingBn}
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            {testimonials.length > 0 ? "Real feedback from our patients." : ""}
          </p>
        </motion.div>

        {/* Cards */}
        {testimonials.length === 0 ? (
          <div
            className="text-center py-16 text-muted-foreground"
            data-ocid="testimonials.empty_state"
          >
            <MessageSquareQuote className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No testimonials yet.</p>
            {isAdmin && (
              <Button size="sm" className="mt-4" onClick={openAdd}>
                Add First Testimonial
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t, idx) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.07 }}
                data-ocid={`testimonials.item.${idx + 1}`}
              >
                <Card className="h-full border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex flex-col h-full">
                    <StarRating value={t.rating} />
                    <blockquote className="mt-3 text-sm text-foreground/80 leading-relaxed flex-1 italic">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                    {t.quoteBn && (
                      <blockquote className="mt-2 text-sm text-foreground/80 leading-relaxed" lang="bn" style={{ fontFamily: "'Noto Sans Bengali', Arial, sans-serif" }}>
                        {t.quoteBn}
                      </blockquote>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {t.patientName}
                        </p>
                        {t.patientNameBn && <p className="text-sm text-muted-foreground" lang="bn">{t.patientNameBn}</p>}
                        {t.date && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(t.date).toLocaleDateString("en-BD", {
                              year: "numeric",
                              month: "short",
                            })}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(t)}
                            className="p-1.5 rounded hover:bg-muted transition-colors"
                            aria-label="Edit"
                            data-ocid={`testimonials.edit_button.${idx + 1}`}
                          >
                            <Edit className="w-3.5 h-3.5 text-primary" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                            aria-label="Delete"
                            data-ocid={`testimonials.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => !v && setDialogOpen(false)}
      >
        <DialogContent className="max-w-md" data-ocid="testimonials.dialog">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Testimonial" : "Add Testimonial"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Patient Name *</Label>
              <Input
                id="t-name"
                value={form.patientName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, patientName: e.target.value }))
                }
                placeholder="e.g. Rahim Uddin"
                data-ocid="testimonials.name.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-name-bn">Patient Name (Bangla)</Label>
              <Input
                id="t-name-bn"
                value={form.patientNameBn}
                onChange={(e) => setForm((f) => ({ ...f, patientNameBn: e.target.value }))}
                lang="bn"
                style={{ fontFamily: "'Noto Sans Bengali', Arial, sans-serif" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-quote">Quote *</Label>
              <Textarea
                id="t-quote"
                value={form.quote}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quote: e.target.value }))
                }
                placeholder="Patient's feedback..."
                rows={3}
                data-ocid="testimonials.quote.textarea"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-quote-bn">Quote (Bangla)</Label>
              <Textarea
                id="t-quote-bn"
                value={form.quoteBn}
                onChange={(e) => setForm((f) => ({ ...f, quoteBn: e.target.value }))}
                rows={3}
                lang="bn"
                style={{ fontFamily: "'Noto Sans Bengali', Arial, sans-serif" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rating</Label>
              <StarRating
                value={form.rating}
                onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-date">Date (optional)</Label>
              <Input
                id="t-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                data-ocid="testimonials.date.input"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
                data-ocid="testimonials.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={isSaving}
                data-ocid="testimonials.submit_button"
              >
                {editId ? "Save Changes" : "Add Testimonial"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
