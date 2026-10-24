import { useMutation, useQuery } from "@apollo/client";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Alert, Button, Input, Label, Select, Sheet, Switch, Textarea, toast } from "erxes-ui";
import {
  asAccusedRole,
  asCaseCategory,
  asCaseSeverity,
  asReporterRole,
  asVictimRole,
} from "../../shared/enums";
import { formatHours, toDateInputValue } from "../../shared/format";
import { SETTINGS_QUERY } from "../../shared/graphql";
import {
  ACCUSED_ROLE_OPTIONS,
  CATEGORY_OPTIONS,
  PROTOCOL_CATEGORIES,
  REPORTER_ROLE_OPTIONS,
  SEVERITY_OPTIONS,
  VICTIM_ROLE_OPTIONS,
  type Option,
} from "../../shared/labels";
import { AiDraftTriage } from "../../ai/AiDraftTriage";
import { CASE_CREATE_MUTATION } from "../graphql";

type ReportForm = {
  title: string;
  description: string;
  category: string;
  severity: string;
  reporterRole: string;
  isAnonymous: boolean;
  reporterContact: string;
  victimRole: string;
  schoolName: string;
  grade: string;
  incidentDate: string;
  incidentLocation: string;
  accusedRole: string;
  accusedDescription: string;
};

type FieldKey = keyof ReportForm;
type FieldErrors = Partial<Record<FieldKey, string>>;

// Category and severity start empty on purpose: a preselected "physical
// violence, high" was easy to submit unchanged and set the wrong deadline.
const emptyForm = (): ReportForm => ({
  title: "",
  description: "",
  category: "",
  severity: "",
  reporterRole: "parent",
  isAnonymous: false,
  reporterContact: "",
  victimRole: "student",
  schoolName: "",
  grade: "",
  incidentDate: toDateInputValue(new Date()),
  incidentLocation: "",
  accusedRole: "",
  accusedDescription: "",
});

// What each severity means in practice, so staff pick it the same way.
const SEVERITY_HINTS: Record<string, string> = {
  critical: "Гэмтэл учирсан эсвэл аюул үргэлжилж байна",
  high: "Бие махбодид халдсан, ноцтой дарамт",
  medium: "Давтагдсан дарамт, ялгаварлал",
  low: "Үнэлгээ, ёс зүйн зөрчил",
};

// Mirrors api/src/modules/cases/domain.ts validateReportInput so mistakes
// show next to the field before a round trip; the API stays authoritative.
const validate = (form: ReportForm): FieldErrors => {
  const errors: FieldErrors = {};
  const title = form.title.trim().length;
  const description = form.description.trim().length;
  if (title < 3 || title > 200) errors.title = "Гарчиг 3–200 тэмдэгт байна";
  if (description < 10 || description > 5000) errors.description = "Юу болсныг 10-аас дээш тэмдэгтээр бичнэ үү";
  if (!asCaseCategory(form.category)) errors.category = "Зөрчлийн төрлийг сонгоно уу";
  if (!asCaseSeverity(form.severity)) errors.severity = "Ноцтой байдлыг сонгоно уу";
  if (!form.schoolName.trim()) errors.schoolName = "Сургуулийн нэрийг бичнэ үү";
  // Compare calendar dates in the user's own timezone: "today" is valid at any
  // hour, which a UTC-midnight Date comparison would reject before 08:00 in UB.
  const date = new Date(form.incidentDate);
  if (!form.incidentDate || Number.isNaN(date.getTime()) || form.incidentDate > toDateInputValue(new Date())) {
    errors.incidentDate = "Өнөөдөр эсвэл өмнөх өдрийг сонгоно уу";
  }
  return errors;
};

const Field = ({
  label,
  htmlFor,
  children,
  hint,
  error,
  optional,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
}) => (
  <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-1.5">
    <Label htmlFor={htmlFor}>
      {label}
      {optional && <span className="edutechbrave:font-normal edutechbrave:text-muted-foreground"> (заавал биш)</span>}
    </Label>
    {children}
    {error ? (
      <p id={`${htmlFor}-error`} className="edutechbrave:text-xs edutechbrave:text-destructive">
        {error}
      </p>
    ) : (
      hint && <p className="edutechbrave:text-xs edutechbrave:text-muted-foreground">{hint}</p>
    )}
  </div>
);

const FormSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <fieldset className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-4 edutechbrave:border-t edutechbrave:border-border edutechbrave:pt-5 edutechbrave:first:border-t-0 edutechbrave:first:pt-0">
    <legend className="edutechbrave:float-left edutechbrave:mb-1 edutechbrave:w-full edutechbrave:text-sm edutechbrave:font-semibold">
      {title}
    </legend>
    {children}
  </fieldset>
);

const SelectField = ({
  id,
  value,
  options,
  onChange,
  placeholder,
  allowEmpty,
  invalid,
  hints,
}: {
  id: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  invalid?: boolean;
  hints?: Record<string, string>;
}) => (
  <Select value={value || (allowEmpty ? "none" : undefined)} onValueChange={(next) => onChange(next === "none" ? "" : next)}>
    <Select.Trigger id={id} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : undefined}>
      <Select.Value placeholder={placeholder ?? "Сонгоно уу"} />
    </Select.Trigger>
    <Select.Content>
      {allowEmpty && <Select.Item value="none">Мэдэхгүй / сонгоогүй</Select.Item>}
      {options.map((option) => (
        <Select.Item key={option.value} value={option.value}>
          {option.label}
          {hints?.[option.value] && (
            <span className="edutechbrave:text-muted-foreground"> — {hints[option.value]}</span>
          )}
        </Select.Item>
      ))}
    </Select.Content>
  </Select>
);

export const CaseCreateSheet = ({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) => {
  const [form, setForm] = useState<ReportForm>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const settings = useQuery(SETTINGS_QUERY, { skip: !open });
  const [createCase, { loading }] = useMutation(CASE_CREATE_MUTATION, {
    refetchQueries: ["eduTechBraveCases", "eduTechBraveCaseStats"],
  });

  const set = <K extends FieldKey>(key: K, value: ReportForm[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    // Clear a field's message as soon as it is being fixed.
    setErrors((previous) => (previous[key] ? { ...previous, [key]: undefined } : previous));
  };

  const close = (next: boolean) => {
    if (!next) {
      setForm(emptyForm());
      setErrors({});
      setServerError(null);
    }
    onOpenChange(next);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const problems = validate(form);
    const category = asCaseCategory(form.category);
    const severity = asCaseSeverity(form.severity);
    const reporterRole = asReporterRole(form.reporterRole);
    const victimRole = asVictimRole(form.victimRole);
    setErrors(problems);
    setServerError(null);
    if (Object.values(problems).some(Boolean) || !category || !severity || !reporterRole || !victimRole) {
      return;
    }
    try {
      const { data } = await createCase({
        variables: {
          input: {
            title: form.title.trim(),
            description: form.description.trim(),
            category,
            severity,
            reporterRole,
            isAnonymous: form.isAnonymous,
            reporterContact: form.isAnonymous ? null : form.reporterContact.trim() || null,
            victimRole,
            schoolName: form.schoolName.trim(),
            grade: form.grade.trim() || null,
            incidentDate: form.incidentDate,
            incidentLocation: form.incidentLocation.trim() || null,
            accusedRole: asAccusedRole(form.accusedRole) ?? null,
            accusedDescription: form.accusedDescription.trim() || null,
          },
        },
      });
      const created = data?.eduTechBraveCaseCreate;
      if (created) {
        toast({ title: "Хэрэг бүртгэгдлээ", description: created.caseNumber, variant: "success" });
        close(false);
        onCreated(created._id);
      }
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Хэргийг бүртгэж чадсангүй. Дахин оролдоно уу.");
    }
  };

  const needsProtocol = PROTOCOL_CATEGORIES.includes(form.category);
  const severity = asCaseSeverity(form.severity);
  const slaHours = severity ? settings.data?.eduTechBraveSettings.slaHours[severity] : undefined;
  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={close}>
      <Sheet.View className="edutechbrave:w-full edutechbrave:p-0 edutechbrave:sm:max-w-2xl">
        <form onSubmit={submit} noValidate className="edutechbrave:flex edutechbrave:h-full edutechbrave:flex-col">
          {/* erxes Sheet.Header is a fixed 40px bar: title and close only. */}
          <Sheet.Header className="edutechbrave:gap-2">
            <Sheet.Title className="edutechbrave:text-sm">Шинэ хэрэг бүртгэх</Sheet.Title>
            <Sheet.Close />
          </Sheet.Header>
          <Sheet.Content className="edutechbrave:min-h-0 edutechbrave:flex-1 edutechbrave:overflow-y-auto edutechbrave:p-5">
            <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-5">
              <Sheet.Description className="edutechbrave:text-sm edutechbrave:text-muted-foreground">
                Утсаар, биечлэн эсвэл бичгээр ирсэн мэдэгдлийг бүртгэнэ. Дугаар, шийдвэрлэх хугацааг систем өгнө.
              </Sheet.Description>
              <FormSection title="Юу болсон">
                <Field label="Товч гарчиг" htmlFor="etb-title" error={errors.title}>
                  <Input
                    id="etb-title"
                    value={form.title}
                    maxLength={200}
                    aria-invalid={Boolean(errors.title) || undefined}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="жишээ нь: Багш сурагчийг зодсон"
                  />
                </Field>
                <Field label="Дэлгэрэнгүй" htmlFor="etb-description" error={errors.description} hint="Хэзээ, хаана, хэн, яаж. Гэрч, гэмтэл, авсан арга хэмжээ.">
                  <Textarea
                    id="etb-description"
                    rows={5}
                    value={form.description}
                    maxLength={5000}
                    aria-invalid={Boolean(errors.description) || undefined}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </Field>
                <AiDraftTriage
                  title={form.title}
                  description={form.description}
                  incidentLocation={form.incidentLocation}
                  victimRole={asVictimRole(form.victimRole)}
                  accusedRole={asAccusedRole(form.accusedRole)}
                  accusedDescription={form.accusedDescription}
                  onApply={(category, severity) => {
                    set("category", category);
                    set("severity", severity);
                  }}
                />
                <div className="edutechbrave:grid edutechbrave:gap-4 edutechbrave:sm:grid-cols-2">
                  <Field label="Зөрчлийн төрөл" htmlFor="etb-category" error={errors.category}>
                    <SelectField id="etb-category" value={form.category} options={CATEGORY_OPTIONS} invalid={Boolean(errors.category)} onChange={(v) => set("category", v)} />
                  </Field>
                  <Field
                    label="Ноцтой байдал"
                    htmlFor="etb-severity"
                    error={errors.severity}
                    hint={slaHours ? `Шийдвэрлэх хугацаа: ${formatHours(slaHours)}` : undefined}
                  >
                    <SelectField id="etb-severity" value={form.severity} options={SEVERITY_OPTIONS} hints={SEVERITY_HINTS} invalid={Boolean(errors.severity)} onChange={(v) => set("severity", v)} />
                  </Field>
                </div>
                {needsProtocol && (
                  <Alert variant="warning">
                    <IconAlertTriangle />
                    <Alert.Title>Яаралтай протокол идэвхжинэ</Alert.Title>
                    <Alert.Description>
                      Эмнэлгийн тусламж, эцэг эхэд мэдэгдэх, тусгаарлах, эрх бүхий байгууллагад мэдээлэх 4 алхмыг
                      хийхээс өмнө хэргийг хаахгүй.
                    </Alert.Description>
                  </Alert>
                )}
              </FormSection>

              <FormSection title="Хаана, хэзээ">
                <div className="edutechbrave:grid edutechbrave:gap-4 edutechbrave:sm:grid-cols-2">
                  <Field label="Сургууль" htmlFor="etb-school" error={errors.schoolName}>
                    <Input id="etb-school" value={form.schoolName} maxLength={200} aria-invalid={Boolean(errors.schoolName) || undefined} onChange={(e) => set("schoolName", e.target.value)} placeholder="Сургуулийн нэр, дүүрэг" />
                  </Field>
                  <Field label="Анги" htmlFor="etb-grade" optional>
                    <Input id="etb-grade" value={form.grade} maxLength={50} onChange={(e) => set("grade", e.target.value)} placeholder="5а" />
                  </Field>
                  <Field label="Хэрэг болсон өдөр" htmlFor="etb-date" error={errors.incidentDate}>
                    <Input id="etb-date" type="date" max={toDateInputValue(new Date())} value={form.incidentDate} aria-invalid={Boolean(errors.incidentDate) || undefined} onChange={(e) => set("incidentDate", e.target.value)} />
                  </Field>
                  <Field label="Хаана" htmlFor="etb-location" optional>
                    <Input id="etb-location" value={form.incidentLocation} maxLength={200} onChange={(e) => set("incidentLocation", e.target.value)} placeholder="анги, коридор, заал…" />
                  </Field>
                </div>
              </FormSection>

              <FormSection title="Оролцогчид">
                <div className="edutechbrave:grid edutechbrave:gap-4 edutechbrave:sm:grid-cols-2">
                  <Field label="Хохирогч" htmlFor="etb-victim">
                    <SelectField id="etb-victim" value={form.victimRole} options={VICTIM_ROLE_OPTIONS} onChange={(v) => set("victimRole", v)} />
                  </Field>
                  <Field label="Буруутгагдагч" htmlFor="etb-accused" optional>
                    <SelectField id="etb-accused" value={form.accusedRole} options={ACCUSED_ROLE_OPTIONS} onChange={(v) => set("accusedRole", v)} allowEmpty />
                  </Field>
                </div>
                <Field
                  label="Буруутгагдагчийн тухай"
                  htmlFor="etb-accused-description"
                  optional
                  hint="Албан тушаал, удирдлагатай холбоотой эсэх (жишээ нь: захирлын гэр бүлийн гишүүн)."
                >
                  <Input id="etb-accused-description" value={form.accusedDescription} maxLength={1000} onChange={(e) => set("accusedDescription", e.target.value)} />
                </Field>
              </FormSection>

              <FormSection title="Мэдэгдэгч">
                <Field label="Хэн мэдэгдсэн" htmlFor="etb-reporter">
                  <SelectField id="etb-reporter" value={form.reporterRole} options={REPORTER_ROLE_OPTIONS} onChange={(v) => set("reporterRole", v)} />
                </Field>
                <div className="edutechbrave:flex edutechbrave:items-start edutechbrave:gap-3 edutechbrave:rounded-md edutechbrave:border edutechbrave:border-border edutechbrave:p-3">
                  <Switch id="etb-anonymous" checked={form.isAnonymous} onCheckedChange={(checked) => set("isAnonymous", checked)} />
                  <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-0.5">
                    <Label htmlFor="etb-anonymous">Нэрээ нууцлахыг хүссэн</Label>
                    <span className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
                      Холбоо барих мэдээлэл хадгалахгүй.
                    </span>
                  </div>
                </div>
                {!form.isAnonymous && (
                  <Field label="Холбоо барих" htmlFor="etb-contact" optional hint="Зөвхөн хариуцагч ажилтнууд харна.">
                    <Input id="etb-contact" value={form.reporterContact} maxLength={200} onChange={(e) => set("reporterContact", e.target.value)} placeholder="утас, и-мэйл" />
                  </Field>
                )}
              </FormSection>

              {serverError && (
                <Alert variant="destructive" role="alert">
                  <Alert.Title>Хэргийг бүртгэж чадсангүй</Alert.Title>
                  <Alert.Description>{serverError}</Alert.Description>
                </Alert>
              )}
            </div>
          </Sheet.Content>
          <Sheet.Footer className="edutechbrave:flex-none edutechbrave:items-center edutechbrave:justify-between edutechbrave:gap-3 edutechbrave:border-t edutechbrave:border-border edutechbrave:bg-background">
            <span className="edutechbrave:text-xs edutechbrave:text-destructive" role="status">
              {errorCount > 0 ? `${errorCount} талбарыг засна уу` : ""}
            </span>
            <div className="edutechbrave:flex edutechbrave:gap-2">
              <Button type="button" variant="ghost" onClick={() => close(false)}>
                Болих
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Бүртгэж байна…" : "Хэрэг бүртгэх"}
              </Button>
            </div>
          </Sheet.Footer>
        </form>
      </Sheet.View>
    </Sheet>
  );
};
