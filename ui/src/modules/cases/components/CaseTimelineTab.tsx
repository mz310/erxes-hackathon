import { useMutation, useQuery } from "@apollo/client";
import {
  IconArrowUpRight,
  IconCategory,
  IconCirclePlus,
  IconEye,
  IconFileCertificate,
  IconListCheck,
  IconMessage,
  IconProgress,
  IconScale,
  IconSparkles,
  IconUserCheck,
} from "@tabler/icons-react";
import { useState, type ComponentType, type FormEvent } from "react";
import { Badge, Button, Label, Skeleton, Switch, Textarea } from "erxes-ui";
import { MembersInline } from "ui-modules";
import { formatDateTime } from "../../shared/format";
import { EVENT_TYPE_LABELS } from "../../shared/labels";
import { CASE_ADD_NOTE_MUTATION, CASE_EVENTS_QUERY } from "../graphql";
import { CaseGateNotice } from "./CaseGateNotice";
import { CASE_REFETCH, notifyError, notifySuccess, type CaseAccess, type CaseDetail } from "./shared";

const EVENT_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  created: IconCirclePlus,
  status_changed: IconProgress,
  assigned: IconUserCheck,
  note: IconMessage,
  evidence_added: IconFileCertificate,
  escalated: IconArrowUpRight,
  protocol_step: IconListCheck,
  conflict_declared: IconScale,
  reclassified: IconCategory,
  ai_assist: IconSparkles,
};

const AddNoteForm = ({ caseId }: { caseId: string }) => {
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [addNote, { loading }] = useMutation(CASE_ADD_NOTE_MUTATION, {
    refetchQueries: CASE_REFETCH,
    onError: notifyError,
    onCompleted: () => {
      setContent("");
      setIsPublic(false);
      notifySuccess("Тэмдэглэл нэмэгдлээ");
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim()) {
      return;
    }
    void addNote({ variables: { _id: caseId, content: content.trim(), isPublic } });
  };

  return (
    <form onSubmit={submit} className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2">
      <Textarea
        rows={3}
        value={content}
        maxLength={5000}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Тэмдэглэл, уулзалт, авсан арга хэмжээ…"
        aria-label="Тэмдэглэл"
      />
      <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:items-center edutechbrave:justify-between edutechbrave:gap-2">
        <div className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-2">
          <Switch id="etb-note-public" checked={isPublic} onCheckedChange={setIsPublic} />
          <Label htmlFor="etb-note-public">Мэдэгдэгчид харуулах</Label>
        </div>
        <Button type="submit" disabled={loading || !content.trim()}>
          {isPublic ? "Мэдэгдэгчид илгээх" : "Тэмдэглэл нэмэх"}
        </Button>
      </div>
      <p className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
        {isPublic
          ? "Мэдэгдэгч хяналтын кодоороо энэ бичгийг харна. Нэр, утас зэрэг хувийн мэдээлэл бүү бичээрэй."
          : "Зөвхөн ажилтнууд харна. Түүхийг засах, устгах боломжгүй."}
      </p>
    </form>
  );
};

export const CaseTimelineTab = ({
  item,
  access,
  onDeclare,
}: {
  item: CaseDetail;
  access: CaseAccess;
  onDeclare: () => void;
}) => {
  const { data, loading, error, refetch } = useQuery(CASE_EVENTS_QUERY, {
    variables: { caseId: item._id },
  });
  const events = data?.eduTechBraveCaseEvents ?? [];

  return (
    <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-5">
      {access === "ok" ? (
        <AddNoteForm caseId={item._id} />
      ) : (
        <CaseGateNotice access={access} onDeclare={onDeclare} />
      )}
      {loading && !data ? (
        <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-3" role="status">
          <Skeleton className="edutechbrave:h-12 edutechbrave:w-full" />
          <Skeleton className="edutechbrave:h-12 edutechbrave:w-full" />
          <Skeleton className="edutechbrave:h-12 edutechbrave:w-full" />
        </div>
      ) : error ? (
        <div role="alert" className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-3">
          <p className="edutechbrave:text-sm edutechbrave:text-destructive">{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Дахин оролдох
          </Button>
        </div>
      ) : events.length === 0 ? (
        <p className="edutechbrave:text-sm edutechbrave:text-muted-foreground">Түүх хоосон байна.</p>
      ) : (
        <ol className="edutechbrave:relative edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-4 edutechbrave:border-l edutechbrave:border-border edutechbrave:pl-6">
          {[...events].reverse().map((event) => {
            const Icon = EVENT_ICONS[event.type] ?? IconMessage;
            return (
              <li key={event._id} className="edutechbrave:relative">
                <span className="edutechbrave:absolute edutechbrave:-left-[37px] edutechbrave:flex edutechbrave:size-6 edutechbrave:items-center edutechbrave:justify-center edutechbrave:rounded-full edutechbrave:border edutechbrave:border-border edutechbrave:bg-background">
                  <Icon className="edutechbrave:size-3.5 edutechbrave:text-muted-foreground" />
                </span>
                <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:items-center edutechbrave:gap-2 edutechbrave:text-xs edutechbrave:text-muted-foreground">
                  <span className="edutechbrave:font-medium edutechbrave:text-foreground">
                    {EVENT_TYPE_LABELS[event.type] ?? event.type}
                  </span>
                  <span>{formatDateTime(event.createdAt)}</span>
                  {event.actorId ? (
                    <MembersInline memberIds={[event.actorId]} size="sm" />
                  ) : (
                    <span>Систем / мэдэгдэгч</span>
                  )}
                  {event.isPublic && (
                    <Badge variant="secondary">
                      <IconEye className="edutechbrave:size-3" />
                      Нийтэд харагдана
                    </Badge>
                  )}
                </div>
                <p className="edutechbrave:mt-1 edutechbrave:whitespace-pre-wrap edutechbrave:text-sm">{event.message}</p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
