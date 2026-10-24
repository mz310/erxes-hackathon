import { useMutation, useQuery } from "@apollo/client";
import {
  IconExternalLink,
  IconFileCertificate,
  IconFileCheck,
  IconLock,
  IconPaperclip,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
  Empty,
  Input,
  Label,
  Select,
  Skeleton,
  Textarea,
  readImage,
  useErxesUpload,
} from "erxes-ui";
import { MembersInline } from "ui-modules";
import { asEvidenceKind } from "../../shared/enums";
import { formatDateTime, toDateTimeInputValue } from "../../shared/format";
import { EVIDENCE_KIND_LABELS, EVIDENCE_KIND_OPTIONS } from "../../shared/labels";
import { CASE_ADD_EVIDENCE_MUTATION, CASE_EVIDENCE_QUERY } from "../graphql";
import { CaseGateNotice } from "./CaseGateNotice";
import { CASE_REFETCH, notifyError, notifySuccess, type CaseAccess, type CaseDetail } from "./shared";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "image/*",
  "audio/*",
  "video/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

type EvidenceForm = {
  kind: string;
  title: string;
  description: string;
  recordedAt: string;
  fileUrl: string;
  fileName: string;
};

const emptyForm = (): EvidenceForm => ({
  kind: "photo",
  title: "",
  description: "",
  recordedAt: toDateTimeInputValue(new Date()),
  fileUrl: "",
  fileName: "",
});

const AddEvidenceForm = ({ caseId, onClose }: { caseId: string; onClose: () => void }) => {
  const [form, setForm] = useState<EvidenceForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const upload = useErxesUpload({
    maxFiles: 1,
    maxFileSize: MAX_FILE_BYTES,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    onFilesAdded: (added) => {
      const file = added[0];
      if (file) {
        setForm((previous) => ({ ...previous, fileUrl: file.url, fileName: file.name }));
      }
    },
  });
  const { files, loading: uploading, onUpload, setFiles, errors: uploadErrors } = upload;

  // Upload each dropped selection once, as soon as it is valid. Keying on the
  // files array (not on "no file yet") means a failed upload is not retried in
  // a loop and a replacement file is uploaded instead of silently ignored.
  const attempted = useRef<unknown>(null);
  useEffect(() => {
    const valid = files.length > 0 && files.every((file) => file.errors.length === 0);
    if (valid && !uploading && attempted.current !== files) {
      attempted.current = files;
      void onUpload();
    }
  }, [files, uploading, onUpload]);

  const removeFile = () => {
    setForm((previous) => ({ ...previous, fileUrl: "", fileName: "" }));
    setFiles([]);
  };

  const [addEvidence, { loading }] = useMutation(CASE_ADD_EVIDENCE_MUTATION, {
    refetchQueries: CASE_REFETCH,
    onError: notifyError,
    onCompleted: () => {
      notifySuccess("Нотлох баримт хадгалагдлаа");
      setForm(emptyForm());
      setFiles([]);
      setFormError(null);
      onClose();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const kind = asEvidenceKind(form.kind);
    const recordedAt = new Date(form.recordedAt);
    if (!kind || !form.title.trim()) {
      setFormError("Төрөл болон нэр заавал");
      return;
    }
    if (Number.isNaN(recordedAt.getTime()) || recordedAt.getTime() > Date.now()) {
      setFormError("Баримт бүрдүүлсэн огноо буруу эсвэл ирээдүйд байна");
      return;
    }
    if (uploading) {
      setFormError("Файл байршиж дуусаагүй байна");
      return;
    }
    setFormError(null);
    void addEvidence({
      variables: {
        input: {
          caseId,
          kind,
          title: form.title.trim(),
          description: form.description.trim() || null,
          fileUrl: form.fileUrl || null,
          fileName: form.fileName || null,
          recordedAt: recordedAt.toISOString(),
        },
      },
    });
  };

  return (
    <form onSubmit={submit} className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-3 edutechbrave:rounded-lg edutechbrave:border edutechbrave:border-dashed edutechbrave:border-border edutechbrave:p-4">
      <div className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-2 edutechbrave:text-sm edutechbrave:font-medium">
        <IconPaperclip className="edutechbrave:size-4" />
        Нотлох баримт нэмэх
      </div>
      <p className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
        Хадгалсны дараа засах, устгах боломжгүй. Төрөл, нэр, огноогоо шалгаад хадгална уу.
      </p>
      <div className="edutechbrave:grid edutechbrave:gap-3 edutechbrave:sm:grid-cols-2">
        <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-1.5">
          <Label htmlFor="etb-evidence-kind">Төрөл</Label>
          <Select value={form.kind} onValueChange={(kind) => setForm((previous) => ({ ...previous, kind }))}>
            <Select.Trigger id="etb-evidence-kind">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {EVIDENCE_KIND_OPTIONS.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-1.5">
          <Label htmlFor="etb-evidence-recorded">Бүрдүүлсэн огноо, цаг</Label>
          <Input
            id="etb-evidence-recorded"
            type="datetime-local"
            max={toDateTimeInputValue(new Date())}
            value={form.recordedAt}
            onChange={(event) => setForm((previous) => ({ ...previous, recordedAt: event.target.value }))}
          />
        </div>
      </div>
      <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-1.5">
        <Label htmlFor="etb-evidence-title">Нэр</Label>
        <Input
          id="etb-evidence-title"
          value={form.title}
          maxLength={200}
          onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
          placeholder="жишээ нь: Гэмтлийн зураг, эмчийн үзлэгийн хуудас"
        />
      </div>
      <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-1.5">
        <Label htmlFor="etb-evidence-description">Тайлбар</Label>
        <Textarea
          id="etb-evidence-description"
          rows={2}
          value={form.description}
          maxLength={2000}
          onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
          placeholder="Хэн, хэзээ бүрдүүлсэн, гэрчийн мэдүүлгийн товч"
        />
      </div>
      {form.fileUrl ? (
        <div className="edutechbrave:flex edutechbrave:items-center edutechbrave:justify-between edutechbrave:gap-3 edutechbrave:rounded-md edutechbrave:border edutechbrave:border-border edutechbrave:bg-muted edutechbrave:px-3 edutechbrave:py-2">
          <span className="edutechbrave:flex edutechbrave:min-w-0 edutechbrave:items-center edutechbrave:gap-2 edutechbrave:text-sm">
            <IconFileCheck className="edutechbrave:size-4 edutechbrave:shrink-0 edutechbrave:text-success" />
            <span className="edutechbrave:truncate">{form.fileName || "Хавсаргасан файл"}</span>
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={removeFile}>
            <IconX />
            Солих
          </Button>
        </div>
      ) : (
        <>
          <Dropzone {...upload}>
            <DropzoneEmptyState />
            <DropzoneContent />
          </Dropzone>
          {uploading && (
            <p className="edutechbrave:text-xs edutechbrave:text-muted-foreground" role="status">
              Файл байршуулж байна…
            </p>
          )}
          {uploadErrors.length > 0 && (
            <p className="edutechbrave:text-xs edutechbrave:text-destructive" role="alert">
              Файл байршуулж чадсангүй: {uploadErrors.map((error) => error.message ?? error.name).join(", ")}
            </p>
          )}
        </>
      )}
      {formError && (
        <p className="edutechbrave:text-sm edutechbrave:text-destructive" role="alert">
          {formError}
        </p>
      )}
      <div className="edutechbrave:flex edutechbrave:justify-end edutechbrave:gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Болих
        </Button>
        <Button type="submit" disabled={loading || uploading}>
          {loading ? "Хадгалж байна…" : "Нотлох баримт хадгалах"}
        </Button>
      </div>
    </form>
  );
};

// List first, form on demand: most visits are to read the evidence, and an
// always-open form invites half-finished records that can never be edited.
export const CaseEvidenceTab = ({
  item,
  access,
  onDeclare,
}: {
  item: CaseDetail;
  access: CaseAccess;
  onDeclare: () => void;
}) => {
  const { data, loading, error, refetch } = useQuery(CASE_EVIDENCE_QUERY, {
    variables: { caseId: item._id },
  });
  const [adding, setAdding] = useState(false);
  const evidence = data?.eduTechBraveCaseEvidence ?? [];
  const canAdd = access === "ok";

  return (
    <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-4">
      <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:items-start edutechbrave:justify-between edutechbrave:gap-3">
        <p className="edutechbrave:flex edutechbrave:max-w-md edutechbrave:items-start edutechbrave:gap-2 edutechbrave:text-sm edutechbrave:text-muted-foreground">
          <IconLock className="edutechbrave:mt-0.5 edutechbrave:size-4 edutechbrave:shrink-0" />
          Баримт бүр бүртгэсэн цаг, нэмсэн хүн, хяналтын нийлбэр (SHA-256)-тэй хадгалагдана. Засах, устгах
          боломжгүй.
        </p>
        {canAdd && !adding && (
          <Button onClick={() => setAdding(true)}>
            <IconPlus />
            Нотлох баримт нэмэх
          </Button>
        )}
      </div>

      <CaseGateNotice access={access} onDeclare={onDeclare} />
      {canAdd && adding && <AddEvidenceForm caseId={item._id} onClose={() => setAdding(false)} />}

      {loading && !data ? (
        <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2" role="status">
          <Skeleton className="edutechbrave:h-16 edutechbrave:w-full" />
          <Skeleton className="edutechbrave:h-16 edutechbrave:w-full" />
        </div>
      ) : error ? (
        <div role="alert" className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-3">
          <p className="edutechbrave:text-sm edutechbrave:text-destructive">{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Дахин оролдох
          </Button>
        </div>
      ) : evidence.length === 0 ? (
        adding ? null : (
          <Empty>
            <Empty.Header>
              <Empty.Media variant="icon">
                <IconFileCertificate />
              </Empty.Media>
              <Empty.Title>Нотлох баримт алга</Empty.Title>
              <Empty.Description>
                Гэмтлийн зураг, эмчийн үзлэг, гэрчийн мэдүүлгийг аль болох эрт бүртгэнэ үү.
              </Empty.Description>
            </Empty.Header>
          </Empty>
        )
      ) : (
        <ul className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2">
          {evidence.map((record) => (
            <li
              key={record._id}
              className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2 edutechbrave:rounded-lg edutechbrave:border edutechbrave:border-border edutechbrave:p-4"
            >
              <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:items-center edutechbrave:gap-2">
                <Badge variant="info">{EVIDENCE_KIND_LABELS[record.kind] ?? record.kind}</Badge>
                <span className="edutechbrave:font-medium">{record.title}</span>
              </div>
              {record.description && (
                <p className="edutechbrave:whitespace-pre-wrap edutechbrave:text-sm edutechbrave:text-muted-foreground">
                  {record.description}
                </p>
              )}
              <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:items-center edutechbrave:gap-3 edutechbrave:text-xs edutechbrave:text-muted-foreground">
                {record.fileUrl && (
                  <a
                    href={readImage(record.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="edutechbrave:inline-flex edutechbrave:items-center edutechbrave:gap-1 edutechbrave:font-medium edutechbrave:text-primary edutechbrave:underline-offset-2 edutechbrave:hover:underline"
                  >
                    <IconExternalLink className="edutechbrave:size-3.5" />
                    {record.fileName ?? "Файл нээх"}
                  </a>
                )}
                <span>Бүрдүүлсэн: {formatDateTime(record.recordedAt)}</span>
                <span>Бүртгэсэн: {formatDateTime(record.createdAt)}</span>
                <MembersInline memberIds={[record.addedBy]} size="sm" />
                <code
                  className="edutechbrave:rounded edutechbrave:bg-muted edutechbrave:px-1.5 edutechbrave:py-0.5 edutechbrave:font-mono"
                  title={record.checksum}
                >
                  SHA-256 {record.checksum.slice(0, 12)}…
                </code>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
