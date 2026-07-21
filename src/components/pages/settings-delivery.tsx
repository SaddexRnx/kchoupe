import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck, Plus, Trash2, Edit2, MapPin } from "lucide-react";
import { Panel, PrimaryButton, GhostButton, TextField, Chip, useToast, useConfirm, Modal } from "./_shared";
import { listCarriers, upsertCarrier, deleteCarrier, listShippingZones, upsertShippingZone, deleteShippingZone, bulkSetShippingZones, listWilayas, type Carrier, type ShippingZone, type Wilaya } from "@/lib/delivery.functions";
import { useT } from "@/lib/i18n";

export function DeliverySection() {
  const t = useT();
  const { push: toast } = useToast();
  const { ask: confirm } = useConfirm();
  const qc = useQueryClient();

  const carriers = useQuery({ queryKey: ["carriers"], queryFn: () => listCarriers() });
  const zones = useQuery({ queryKey: ["shipping-zones"], queryFn: () => listShippingZones() });
  const wilayas = useQuery({ queryKey: ["wilayas"], queryFn: () => listWilayas() });

  const [editingCarrier, setEditingCarrier] = useState<Partial<Carrier> | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFee, setBulkFee] = useState("500");
  const [bulkFree, setBulkFree] = useState("");
  const [editingZone, setEditingZone] = useState<Partial<ShippingZone> | null>(null);

  const wilayaMap = useMemo(() => {
    const m = new Map<number, Wilaya>();
    (wilayas.data ?? []).forEach((w) => m.set(w.code, w));
    return m;
  }, [wilayas.data]);

  async function saveCarrier(input: Partial<Carrier> & { name: string }) {
    try {
      await upsertCarrier({ data: input });
      await qc.invalidateQueries({ queryKey: ["carriers"] });
      toast({ title: t("delivery.carrierSaved") || "Carrier saved", tone: "success" });
      setEditingCarrier(null);
    } catch (e: any) { toast({ title: e.message, tone: "danger" }); }
  }

  async function removeCarrier(id: string) {
    if (!(await confirm({ title: t("delivery.deleteCarrier") || "Delete carrier?", body: t("common.cannotUndo") || "This cannot be undone." }))) return;
    await deleteCarrier({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["carriers"] });
    toast({ title: "Deleted", tone: "success" });
  }

  async function saveZone(input: Partial<ShippingZone> & { wilaya_code: number; home_fee: number }) {
    try {
      await upsertShippingZone({ data: input });
      await qc.invalidateQueries({ queryKey: ["shipping-zones"] });
      toast({ title: "Saved", tone: "success" });
      setEditingZone(null);
    } catch (e: any) { toast({ title: e.message, tone: "danger" }); }
  }

  async function removeZone(id: string) {
    await deleteShippingZone({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["shipping-zones"] });
  }

  async function applyBulk() {
    const fee = Number(bulkFee); const th = bulkFree ? Number(bulkFree) : null;
    if (!Number.isFinite(fee)) { toast({ title: "Invalid fee", tone: "danger" }); return; }
    await bulkSetShippingZones({ data: { fee, free_shipping_threshold: th } });
    await qc.invalidateQueries({ queryKey: ["shipping-zones"] });
    toast({ title: t("delivery.bulkApplied") || "Applied to all wilayas", tone: "success" });
    setBulkOpen(false);
  }

  const zonesByCode = useMemo(() => {
    const m = new Map<number, ShippingZone>();
    (zones.data ?? []).forEach((z) => m.set(z.wilaya_code, z));
    return m;
  }, [zones.data]);

  return (
    <div className="space-y-6">
      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-display text-lg font-semibold flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /> {t("delivery.carriers") || "Carriers"}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{t("delivery.carriersDesc") || "Manage the delivery partners you use (Yalidine, ZR Express, manual, etc.)"}</div>
          </div>
          <PrimaryButton onClick={() => setEditingCarrier({ mode: "manual", active: true, default_fee: 0 })}><Plus className="h-4 w-4" /> {t("delivery.newCarrier") || "New carrier"}</PrimaryButton>
        </div>

        {carriers.isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> :
        !carriers.data?.length ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
            {t("delivery.noCarriers") || "No carriers yet. Add Yalidine, ZR Express, or a manual carrier."}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {carriers.data.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 font-medium">{c.name} {c.is_default && <Chip>default</Chip>}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{c.mode === "api" ? "API mode" : "Manual"} · default fee {c.default_fee} DZD</div>
                    {c.tracking_url_template && <div className="mt-1 text-[11px] text-muted-foreground truncate">{c.tracking_url_template}</div>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingCarrier(c)} className="rounded p-1.5 hover:bg-white/10"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => removeCarrier(c.id)} className="rounded p-1.5 text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-display text-lg font-semibold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> {t("delivery.zones") || "Shipping zones"}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{t("delivery.zonesDesc") || "Set delivery price per wilaya. AI uses this to quote customers."}</div>
          </div>
          <div className="flex gap-2">
            <GhostButton onClick={() => setBulkOpen(true)}>{t("delivery.bulkPricing") || "Bulk pricing"}</GhostButton>
            <PrimaryButton onClick={() => setEditingZone({ wilaya_code: 16, home_fee: 500, active: true })}><Plus className="h-4 w-4" /> {t("delivery.addZone") || "Add zone"}</PrimaryButton>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 pr-3">{t("delivery.wilaya") || "Wilaya"}</th>
                <th className="pb-2 pr-3">{t("delivery.home") || "Home"}</th>
                <th className="pb-2 pr-3">{t("delivery.desk") || "Desk"}</th>
                <th className="pb-2 pr-3">{t("delivery.freeThreshold") || "Free above"}</th>
                <th className="pb-2 pr-3">{t("delivery.days") || "Days"}</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {(zones.data ?? []).map((z) => {
                const w = wilayaMap.get(z.wilaya_code);
                return (
                  <tr key={z.id} className="border-t border-white/5">
                    <td className="py-2 pr-3">{z.wilaya_code}. {w?.name_fr ?? "—"}</td>
                    <td className="py-2 pr-3">{z.home_fee} DZD</td>
                    <td className="py-2 pr-3">{z.desk_fee ?? "—"}</td>
                    <td className="py-2 pr-3">{z.free_shipping_threshold ?? "—"}</td>
                    <td className="py-2 pr-3">{z.estimated_days ?? "—"}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => setEditingZone(z)} className="rounded p-1 hover:bg-white/10"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => removeZone(z.id)} className="rounded p-1 text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
              {!zones.data?.length && (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">{t("delivery.noZones") || "No zones yet. Use 'Bulk pricing' to seed all 58 wilayas at once."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {editingCarrier && (
        <CarrierModal
          initial={editingCarrier}
          onClose={() => setEditingCarrier(null)}
          onSave={saveCarrier}
        />
      )}

      {editingZone && (
        <ZoneModal
          initial={editingZone}
          wilayas={wilayas.data ?? []}
          existing={zonesByCode}
          onClose={() => setEditingZone(null)}
          onSave={saveZone}
        />
      )}

      {bulkOpen && (
        <Modal open={true} onClose={() => setBulkOpen(false)} title={t("delivery.bulkPricing") || "Bulk pricing"}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("delivery.bulkDesc") || "Set the same fee for every Algerian wilaya. You can then fine-tune individual wilayas."}</p>
            <TextField label={t("delivery.homeFee") || "Home delivery fee (DZD)"} value={bulkFee} onChange={setBulkFee} />
            <TextField label={t("delivery.freeThreshold") || "Free shipping above (DZD, optional)"} value={bulkFree} onChange={setBulkFree} />
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton onClick={() => setBulkOpen(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={applyBulk}>{t("delivery.applyAll") || "Apply to 58 wilayas"}</PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CarrierModal({ initial, onClose, onSave }: { initial: Partial<Carrier>; onClose: () => void; onSave: (c: any) => void }) {
  const t = useT();
  const [name, setName] = useState(initial.name ?? "");
  const [mode, setMode] = useState<"manual" | "api">(initial.mode ?? "manual");
  const [provider, setProvider] = useState(initial.provider ?? "");
  const [fee, setFee] = useState(String(initial.default_fee ?? 0));
  const [tpl, setTpl] = useState(initial.tracking_url_template ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [isDefault, setIsDefault] = useState(!!initial.is_default);
  return (
    <Modal open={true} onClose={onClose} title={initial.id ? t("delivery.editCarrier") || "Edit carrier" : t("delivery.newCarrier") || "New carrier"}>
      <div className="space-y-3">
        <TextField label={t("delivery.name") || "Name"} value={name} onChange={setName} placeholder="Yalidine Alger, ZR Express, Manual…" />
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">{t("delivery.mode") || "Mode"}</div>
          <div className="flex gap-2">
            {(["manual","api"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={"rounded-lg border px-3 py-1.5 text-sm " + (mode === m ? "border-primary bg-primary/20" : "border-white/10")}>{m === "manual" ? "Manual (paste tracking)" : "API (auto)"}</button>
            ))}
          </div>
        </div>
        {mode === "api" && <TextField label={t("delivery.provider") || "Provider key"} value={provider} onChange={setProvider} placeholder="yalidine, zr-express, custom" />}
        <TextField label={t("delivery.defaultFee") || "Default fee (DZD)"} value={fee} onChange={setFee} />
        <TextField label={t("delivery.trackingUrl") || "Tracking URL template"} value={tpl} onChange={setTpl} placeholder="https://yalidine.com/track/{tracking}" />
        <TextField label={t("delivery.notes") || "Notes"} value={notes} onChange={setNotes} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> {t("delivery.setDefault") || "Set as default carrier"}</label>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={() => onSave({ id: initial.id, name, mode, provider: provider || null, default_fee: Number(fee) || 0, tracking_url_template: tpl || null, notes: notes || null, is_default: isDefault, active: true })}>Save</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function ZoneModal({ initial, wilayas, existing, onClose, onSave }: {
  initial: Partial<ShippingZone>; wilayas: Wilaya[]; existing: Map<number, ShippingZone>;
  onClose: () => void; onSave: (z: any) => void;
}) {
  const t = useT();
  const [code, setCode] = useState<number>(initial.wilaya_code ?? 16);
  const [home, setHome] = useState(String(initial.home_fee ?? 500));
  const [desk, setDesk] = useState(initial.desk_fee != null ? String(initial.desk_fee) : "");
  const [free, setFree] = useState(initial.free_shipping_threshold != null ? String(initial.free_shipping_threshold) : "");
  const [days, setDays] = useState(initial.estimated_days != null ? String(initial.estimated_days) : "");
  return (
    <Modal open={true} onClose={onClose} title={initial.id ? "Edit zone" : t("delivery.addZone") || "Add zone"}>
      <div className="space-y-3">
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">{t("delivery.wilaya") || "Wilaya"}</div>
          <select value={code} onChange={(e) => setCode(Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm">
            {wilayas.map((w) => <option key={w.code} value={w.code}>{w.code}. {w.name_fr} {existing.has(w.code) && !initial.id ? "(exists)" : ""}</option>)}
          </select>
        </div>
        <TextField label={t("delivery.homeFee") || "Home delivery fee (DZD)"} value={home} onChange={setHome} />
        <TextField label={(t("delivery.deskFee") || "Desk fee (DZD, optional)")} value={desk} onChange={setDesk} />
        <TextField label={t("delivery.freeThreshold") || "Free shipping above (DZD, optional)"} value={free} onChange={setFree} />
        <TextField label={t("delivery.estimatedDays") || "Estimated days"} value={days} onChange={setDays} />
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={() => onSave({
            id: initial.id, wilaya_code: code, home_fee: Number(home) || 0,
            desk_fee: desk ? Number(desk) : null,
            free_shipping_threshold: free ? Number(free) : null,
            estimated_days: days ? Number(days) : null, active: true,
          })}>Save</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
