import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Images, Loader2, MapPin, Trash2, Upload, Users } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { AccessDenied } from "@/components/AccessDenied";

export const Route = createFileRoute("/_authenticated/site")({
  head: () => ({ meta: [{ title: "Site Content - HL Fitness" }] }),
  component: SiteContentPage,
});

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

type BranchInfo = {
  nameEn: string;
  addressEn: string;
  phone: string;
  hoursEn: string;
  mapUrl: string;
  facebookUrl: string;
};

type PtRow = {
  id: string;
  email: string;
  displayName: string;
  bioEn: string | null;
  specialtiesEn: string | null;
  photoPath: string | null;
  photoBase64: string | null;
  yearsExperience: number | null;
  isPublic: number | null;
};

type GymPhoto = {
  id: string;
  imageBase64: string;
  caption: string | null;
  sortOrder: number;
  isPublic: number;
};

const EMPTY_BRANCH: BranchInfo = {
  nameEn: "",
  addressEn: "",
  phone: "",
  hoursEn: "",
  mapUrl: "",
  facebookUrl: "",
};

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("Image must be 4MB or smaller"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image file"));
    reader.readAsDataURL(file);
  });
}

function SectionCard({
  eyebrow,
  title,
  description,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111612]/95 p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-lg font-semibold text-slate-100">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-300">
          {icon}
        </div>
      </div>
      {children}
    </section>
  );
}

function SiteContentPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState<BranchInfo>(EMPTY_BRANCH);
  const [pts, setPts] = useState<PtRow[]>([]);
  const [photos, setPhotos] = useState<GymPhoto[]>([]);
  const [savingBranch, setSavingBranch] = useState(false);
  const [savingPtId, setSavingPtId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-content", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load site content");
      const data = await res.json();
      if (data.branch) {
        setBranch({
          nameEn: data.branch.nameEn ?? "",
          addressEn: data.branch.addressEn ?? "",
          phone: data.branch.phone ?? "",
          hoursEn: data.branch.hoursEn ?? "",
          mapUrl: data.branch.mapUrl ?? "",
          facebookUrl: data.branch.facebookUrl ?? "",
        });
      }
      setPts((data.pts as PtRow[]) ?? []);
      setPhotos((data.photos as GymPhoto[]) ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load site content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveBranch = async () => {
    setSavingBranch(true);
    try {
      const res = await fetch("/api/admin/site-content", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(branch),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Save failed");
      toast.success("Branch info saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingBranch(false);
    }
  };

  const updatePt = (id: string, patch: Partial<PtRow>) => {
    setPts((prev) => prev.map((pt) => (pt.id === id ? { ...pt, ...patch } : pt)));
  };

  const savePt = async (pt: PtRow) => {
    setSavingPtId(pt.id);
    try {
      const res = await fetch("/api/admin/pt-profiles", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ptId: pt.id,
          bioEn: pt.bioEn ?? "",
          specialtiesEn: pt.specialtiesEn ?? "",
          yearsExperience: pt.yearsExperience ?? 0,
          isPublic: (pt.isPublic ?? 1) === 1,
          photoBase64: pt.photoBase64 ?? null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Save failed");
      toast.success(`${pt.displayName} updated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingPtId(null);
    }
  };

  const onPtPhoto = async (id: string, file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await readImageFile(file);
      updatePt(id, { photoBase64: dataUrl });
      toast.message("Photo ready - click Save to publish");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read image");
    }
  };

  const addPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const dataUrl = await readImageFile(file);
      const res = await fetch("/api/admin/gym-photos", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Upload failed");
      toast.success("Photo added to gallery");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const togglePhotoPublic = async (photo: GymPhoto, isPublic: boolean) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, isPublic: isPublic ? 1 : 0 } : p)),
    );
    try {
      const res = await fetch("/api/admin/gym-photos", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: photo.id, isPublic }),
      });
      if (!res.ok) throw new Error("Update failed");
    } catch {
      toast.error("Could not update photo");
      await load();
    }
  };

  const deletePhoto = async (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    try {
      const res = await fetch("/api/admin/gym-photos", {
        method: "DELETE",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Photo removed");
    } catch {
      toast.error("Could not delete photo");
      await load();
    }
  };

  if (user?.role !== "admin") {
    return <AccessDenied title="Admin access required" />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Site content"
        subtitle="Edit what visitors see on the public landing page: trainers, gym photos, and branch details."
      />

      {loading && <div className="text-sm text-slate-400">Loading site content...</div>}

      {!loading && (
        <>
          <SectionCard
            eyebrow="Landing page"
            title="Branch details"
            description="Shown in the header, contact section, and footer of the public site."
            icon={<MapPin className="size-5" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address">
                <Input
                  value={branch.addressEn}
                  onChange={(e) => setBranch({ ...branch, addressEn: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={branch.phone}
                  onChange={(e) => setBranch({ ...branch, phone: e.target.value })}
                />
              </Field>
              <Field label="Opening hours">
                <Input
                  value={branch.hoursEn}
                  onChange={(e) => setBranch({ ...branch, hoursEn: e.target.value })}
                />
              </Field>
              <Field label="Google Maps URL">
                <Input
                  value={branch.mapUrl}
                  onChange={(e) => setBranch({ ...branch, mapUrl: e.target.value })}
                />
              </Field>
              <Field label="Facebook URL">
                <Input
                  value={branch.facebookUrl}
                  onChange={(e) => setBranch({ ...branch, facebookUrl: e.target.value })}
                />
              </Field>
            </div>
            <div className="mt-5">
              <Button
                onClick={saveBranch}
                disabled={savingBranch}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {savingBranch ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Save branch details
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Landing page"
            title="Trainer cards"
            description="Photos and bios shown in the PT team section. Turn off 'Show on landing' to hide a coach."
            icon={<Users className="size-5" />}
          >
            {pts.length === 0 ? (
              <div className="text-sm text-slate-400">
                No trainers yet. Add PT users from Admin.
              </div>
            ) : (
              <div className="space-y-4">
                {pts.map((pt) => (
                  <div
                    key={pt.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="flex flex-col items-center gap-3 sm:w-40">
                        <img
                          src={
                            pt.photoBase64 ||
                            pt.photoPath ||
                            `https://api.dicebear.com/7.x/notionists/svg?seed=${pt.displayName.replace(/ /g, "")}`
                          }
                          alt={pt.displayName}
                          className="size-24 rounded-full border-2 border-primary/40 object-cover"
                        />
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.08]">
                          <Upload className="size-3.5" />
                          Change photo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => onPtPhoto(pt.id, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-100">
                              {pt.displayName}
                            </div>
                            <div className="text-xs text-slate-400">{pt.email}</div>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-slate-300">
                            <Switch
                              checked={(pt.isPublic ?? 1) === 1}
                              onCheckedChange={(v) => updatePt(pt.id, { isPublic: v ? 1 : 0 })}
                            />
                            Show on landing
                          </label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Bio">
                            <Textarea
                              rows={2}
                              value={pt.bioEn ?? ""}
                              onChange={(e) => updatePt(pt.id, { bioEn: e.target.value })}
                            />
                          </Field>
                          <Field label="Specialties">
                            <Input
                              value={pt.specialtiesEn ?? ""}
                              onChange={(e) => updatePt(pt.id, { specialtiesEn: e.target.value })}
                            />
                          </Field>
                          <Field label="Years of experience">
                            <Input
                              type="number"
                              min={0}
                              value={pt.yearsExperience ?? 0}
                              onChange={(e) =>
                                updatePt(pt.id, { yearsExperience: Number(e.target.value) || 0 })
                              }
                            />
                          </Field>
                        </div>
                        <Button
                          onClick={() => savePt(pt)}
                          disabled={savingPtId === pt.id}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {savingPtId === pt.id ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : null}
                          Save trainer
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="Landing page"
            title="Gym photo album"
            description="Photos shown in the 'See the gym before you visit' gallery. Hidden photos stay saved but are not public."
            icon={<Images className="size-5" />}
          >
            <label className="mb-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20">
              {uploadingPhoto ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Add photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingPhoto}
                onChange={(e) => addPhoto(e.target.files?.[0])}
              />
            </label>

            {photos.length === 0 ? (
              <div className="text-sm text-slate-400">
                No uploaded photos yet. The landing page shows the default gym photos until you add
                your own.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#0d1110]"
                  >
                    <img
                      src={photo.imageBase64}
                      alt={photo.caption ?? "Gym photo"}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-2 p-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <Switch
                          checked={photo.isPublic === 1}
                          onCheckedChange={(v) => togglePhotoPublic(photo, v)}
                        />
                        Public
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-slate-300 hover:bg-red-500/20 hover:text-red-300"
                        onClick={() => deletePhoto(photo.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-400">{label}</Label>
      {children}
    </div>
  );
}
