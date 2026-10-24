import { useMutation, useQuery } from "@apollo/client";
import { IconSettings } from "@tabler/icons-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button, Card, Input, Label, Skeleton, Textarea } from "erxes-ui";
import manifest from "../../../erxes.json" with { type: "json" };
import { notifyError, notifySuccess } from "../modules/cases/components/shared";
import { formatDateTime } from "../modules/shared/format";
import { SETTINGS_QUERY, SETTINGS_SAVE_MUTATION } from "../modules/shared/graphql";
import { SEVERITY_LABELS } from "../modules/shared/labels";
import { DemoDataCard } from "../modules/settings/DemoDataCard";
import { PluginPageHeader } from "../modules/shared/PluginPageHeader";

const base = `/${manifest.ui.path}`;

type SettingsForm = {
  critical: string;
  high: string;
  medium: string;
  low: string;
  organizationName: string;
  escalationLevel1Label: string;
  escalationLevel1Contact: string;
  escalationLevel2Label: string;
  escalationLevel2Contact: string;
  helplineText: string;
};

const SLA_KEYS = ["critical", "high", "medium", "low"] as const;

const Field = ({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) => (
  <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    {children}
    {hint && <p className="edutechbrave:text-xs edutechbrave:text-muted-foreground">{hint}</p>}
  </div>
);

const toHours = (value: string): number | null => {
  const hours = Number(value);
  return Number.isInteger(hours) && hours >= 1 ? hours : null;
};

// "= 3 өдөр": staff agree deadlines in days, the API stores hours.
const slaHint = (value: string): string | undefined => {
  const hours = toHours(value);
  return hours && hours >= 24 ? `= ${Number.isInteger(hours / 24) ? hours / 24 : (hours / 24).toFixed(1)} өдөр` : undefined;
};

export const SettingsPage = () => {
  const { data, loading, error, refetch } = useQuery(SETTINGS_QUERY);
  const settings = data?.eduTechBraveSettings;
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [save, { loading: saving }] = useMutation(SETTINGS_SAVE_MUTATION, {
    refetchQueries: ["eduTechBraveSettings"],
    onError: notifyError,
    onCompleted: () => notifySuccess("Тохиргоо хадгалагдлаа"),
  });

  useEffect(() => {
    if (settings) {
      setForm({
        critical: String(settings.slaHours.critical),
        high: String(settings.slaHours.high),
        medium: String(settings.slaHours.medium),
        low: String(settings.slaHours.low),
        organizationName: settings.organizationName,
        escalationLevel1Label: settings.escalationLevel1Label,
        escalationLevel1Contact: settings.escalationLevel1Contact,
        escalationLevel2Label: settings.escalationLevel2Label,
        escalationLevel2Contact: settings.escalationLevel2Contact,
        helplineText: settings.helplineText,
      });
    }
  }, [settings]);

  const set = (key: keyof SettingsForm, value: string) =>
    setForm((previous) => (previous ? { ...previous, [key]: value } : previous));

  const invalidSla = form ? SLA_KEYS.filter((key) => toHours(form[key]) === null) : [];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form || invalidSla.length) {
      return;
    }
    void save({
      variables: {
        input: {
          slaHours: {
            critical: toHours(form.critical),
            high: toHours(form.high),
            medium: toHours(form.medium),
            low: toHours(form.low),
          },
          organizationName: form.organizationName,
          escalationLevel1Label: form.escalationLevel1Label,
          escalationLevel1Contact: form.escalationLevel1Contact,
          escalationLevel2Label: form.escalationLevel2Label,
          escalationLevel2Contact: form.escalationLevel2Contact,
          helplineText: form.helplineText,
        },
      },
    });
  };

  return (
    <div className="edutechbrave:flex edutechbrave:h-full edutechbrave:flex-col">
      <PluginPageHeader
        crumbs={[
          { label: "Эрх хамгаалал", to: base },
          { label: "Тохиргоо", to: `${base}/settings` },
        ]}
        icon={IconSettings}
        favoriteIcon="IconSettings"
      />
      <div className="edutechbrave:flex-1 edutechbrave:overflow-auto">
        <div className="edutechbrave:mx-auto edutechbrave:flex edutechbrave:w-full edutechbrave:max-w-3xl edutechbrave:flex-col edutechbrave:gap-6 edutechbrave:p-6">
          {loading && !form ? (
            <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-4" role="status">
              <Skeleton className="edutechbrave:h-40 edutechbrave:w-full" />
              <Skeleton className="edutechbrave:h-40 edutechbrave:w-full" />
            </div>
          ) : error ? (
            <div role="alert" className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-3">
              <p className="edutechbrave:text-sm edutechbrave:text-destructive">{error.message}</p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Дахин оролдох
              </Button>
            </div>
          ) : form ? (
            <form onSubmit={submit} className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-6">
              <Card>
                <Card.Header>
                  <Card.Title>Шийдвэрлэх хугацаа (цаг)</Card.Title>
                  <Card.Description>
                    Хэрэг бүртгэгдсэнээс хойш энэ хугацаанд шийдвэрлэгдээгүй бол дараагийн шатанд
                    автоматаар шилжинэ. Шинэ хэрэгт хамаарна.
                  </Card.Description>
                </Card.Header>
                <Card.Content className="edutechbrave:grid edutechbrave:gap-4 edutechbrave:sm:grid-cols-4">
                  {SLA_KEYS.map((key) => (
                    <Field key={key} id={`etb-sla-${key}`} label={SEVERITY_LABELS[key] ?? key} hint={slaHint(form[key])}>
                      <Input
                        id={`etb-sla-${key}`}
                        type="number"
                        min={1}
                        step={1}
                        value={form[key]}
                        onChange={(event) => set(key, event.target.value)}
                        aria-invalid={invalidSla.includes(key)}
                      />
                    </Field>
                  ))}
                  {invalidSla.length > 0 && (
                    <p className="edutechbrave:text-xs edutechbrave:text-destructive edutechbrave:sm:col-span-4" role="alert">
                      Хугацаа 1-ээс их бүхэл тоо байх ёстой.
                    </p>
                  )}
                </Card.Content>
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title>Шатлал</Card.Title>
                  <Card.Description>
                    Хугацаа хэтэрсэн хэрэг эхлээд 1-р шат, дахин 24 цагийн дотор шийдвэрлэгдэхгүй бол
                    2-р шатанд очно.
                  </Card.Description>
                </Card.Header>
                <Card.Content className="edutechbrave:grid edutechbrave:gap-4 edutechbrave:sm:grid-cols-2">
                  <Field id="etb-l1-label" label="1-р шат">
                    <Input id="etb-l1-label" value={form.escalationLevel1Label} maxLength={500} onChange={(event) => set("escalationLevel1Label", event.target.value)} />
                  </Field>
                  <Field id="etb-l1-contact" label="1-р шатны холбоо барих">
                    <Input id="etb-l1-contact" value={form.escalationLevel1Contact} maxLength={500} onChange={(event) => set("escalationLevel1Contact", event.target.value)} />
                  </Field>
                  <Field id="etb-l2-label" label="2-р шат">
                    <Input id="etb-l2-label" value={form.escalationLevel2Label} maxLength={500} onChange={(event) => set("escalationLevel2Label", event.target.value)} />
                  </Field>
                  <Field id="etb-l2-contact" label="2-р шатны холбоо барих">
                    <Input id="etb-l2-contact" value={form.escalationLevel2Contact} maxLength={500} onChange={(event) => set("escalationLevel2Contact", event.target.value)} />
                  </Field>
                </Card.Content>
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title>Байгууллага ба тусламжийн утас</Card.Title>
                </Card.Header>
                <Card.Content className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-4">
                  <Field id="etb-org" label="Байгууллагын нэр" hint="жишээ нь: Нийслэлийн Боловсролын газар">
                    <Input id="etb-org" value={form.organizationName} maxLength={500} onChange={(event) => set("organizationName", event.target.value)} />
                  </Field>
                  <Field id="etb-helpline" label="Тусламжийн утасны текст">
                    <Textarea id="etb-helpline" rows={2} value={form.helplineText} maxLength={500} onChange={(event) => set("helplineText", event.target.value)} />
                  </Field>
                </Card.Content>
              </Card>

              <div className="edutechbrave:flex edutechbrave:items-center edutechbrave:justify-between edutechbrave:gap-3">
                <span className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
                  {settings?.updatedAt ? `Сүүлд шинэчилсэн: ${formatDateTime(settings.updatedAt)}` : "Анхдагч тохиргоо"}
                </span>
                <Button type="submit" disabled={saving || invalidSla.length > 0}>
                  {saving ? "Хадгалж байна…" : "Хадгалах"}
                </Button>
              </div>
            </form>
          ) : null}
          <DemoDataCard />
        </div>
      </div>
    </div>
  );
};
