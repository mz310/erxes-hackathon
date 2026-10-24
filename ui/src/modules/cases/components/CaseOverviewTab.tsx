import { useQuery } from "@apollo/client";
import { IconArrowUpRight, IconScale } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Accordion, Alert, Badge } from "erxes-ui";
import { SETTINGS_QUERY } from "../../shared/graphql";
import { formatDate, formatDateTime } from "../../shared/format";
import {
  ACCUSED_ROLE_LABELS,
  CATEGORY_LABELS,
  ESCALATION_LABELS,
  REPORTER_ROLE_LABELS,
  SOURCE_LABELS,
  VICTIM_ROLE_LABELS,
} from "../../shared/labels";
import { LEGAL_BASIS, LEGAL_DISCLAIMER } from "../../shared/legalBasis";
import { CaseAiSummaryCard } from "../../ai/CaseAiSummaryCard";
import { CaseClassificationCard } from "../../ai/CaseClassificationCard";
import type { CaseDetail } from "./shared";

// Joins the parts that exist; an all-empty fact reads «—», never blank.
const joined = (...parts: (string | null | undefined | false)[]): string =>
  parts.filter((part): part is string => Boolean(part && part.trim())).join(", ") || "—";

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-0.5">
    <dt className="edutechbrave:text-xs edutechbrave:text-muted-foreground">{label}</dt>
    <dd className="edutechbrave:text-sm edutechbrave:font-medium">{value}</dd>
  </div>
);

const FactGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-3">
    <h3 className="edutechbrave:text-sm edutechbrave:font-semibold">{title}</h3>
    <dl className="edutechbrave:grid edutechbrave:grid-cols-2 edutechbrave:gap-x-4 edutechbrave:gap-y-3 edutechbrave:md:grid-cols-3">
      {children}
    </dl>
  </section>
);

const EscalationNotice = ({ item }: { item: CaseDetail }) => {
  const { data } = useQuery(SETTINGS_QUERY);
  if (item.escalationLevel === 0) {
    return null;
  }
  const settings = data?.eduTechBraveSettings;
  const label =
    item.escalationLevel === 1 ? settings?.escalationLevel1Label : settings?.escalationLevel2Label;
  const contact =
    item.escalationLevel === 1 ? settings?.escalationLevel1Contact : settings?.escalationLevel2Contact;
  return (
    <Alert variant="warning">
      <IconArrowUpRight />
      <Alert.Title>
        {ESCALATION_LABELS[item.escalationLevel]}: {label ?? "дээд шат"}
      </Alert.Title>
      <Alert.Description>
        Шийдвэрлэх хугацаа хэтэрсэн тул {formatDateTime(item.escalatedAt)}-д автоматаар шатлав.
        {contact ? ` Холбоо барих: ${contact}.` : ""}
      </Alert.Description>
    </Alert>
  );
};

const LegalBasis = ({ category }: { category: string }) => {
  const references = LEGAL_BASIS[category] ?? [];
  return (
    <Accordion type="single" collapsible>
      <Accordion.Item value="legal">
        <Accordion.Trigger>
          <span className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-2">
            <IconScale className="edutechbrave:size-4" />
            Хууль зүйн үндэслэл
            <Badge variant="secondary">{LEGAL_DISCLAIMER}</Badge>
          </span>
        </Accordion.Trigger>
        <Accordion.Content>
          <ul className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2">
            {references.map((reference) => (
              <li key={reference.law} className="edutechbrave:text-sm">
                <span className="edutechbrave:font-medium">{reference.law}</span>
                <span className="edutechbrave:text-muted-foreground"> — {reference.right}</span>
              </li>
            ))}
          </ul>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
};

// What happened, to whom, and who reported it. Actions on the case live in
// the «Ажлын явц» card above this tab, so this view only reads.
export const CaseOverviewTab = ({ item }: { item: CaseDetail }) => (
  <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-5">
    <EscalationNotice item={item} />
    <section className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2">
      <h3 className="edutechbrave:text-sm edutechbrave:font-semibold">Юу болсон</h3>
      <p className="edutechbrave:whitespace-pre-wrap edutechbrave:rounded-lg edutechbrave:border edutechbrave:border-border edutechbrave:p-4 edutechbrave:text-sm edutechbrave:leading-relaxed">
        {item.description}
      </p>
    </section>
    <FactGroup title="Хэрэг">
      <Fact label="Зөрчлийн төрөл" value={CATEGORY_LABELS[item.category] ?? item.category} />
      <Fact label="Хэрэг болсон өдөр" value={formatDate(item.incidentDate)} />
      <Fact label="Хаана" value={joined(item.incidentLocation)} />
      <Fact label="Сургууль" value={joined(item.schoolName, item.grade && `${item.grade} анги`)} />
    </FactGroup>
    <FactGroup title="Оролцогчид">
      <Fact label="Хохирогч" value={VICTIM_ROLE_LABELS[item.victimRole] ?? item.victimRole} />
      <Fact
        label="Буруутгагдагч"
        value={joined(item.accusedRole && ACCUSED_ROLE_LABELS[item.accusedRole], item.accusedDescription)}
      />
      <Fact
        label="Мэдэгдэгч"
        value={joined(
          REPORTER_ROLE_LABELS[item.reporterRole],
          item.isAnonymous ? "нэрээ нууцалсан" : item.reporterContact,
        )}
      />
    </FactGroup>
    <FactGroup title="Бүртгэл">
      <Fact label="Суваг" value={SOURCE_LABELS[item.source] ?? item.source} />
      <Fact label="Бүртгэсэн" value={formatDateTime(item.createdAt)} />
      <Fact label="Шийдвэрлэх хугацаа" value={formatDateTime(item.dueAt)} />
    </FactGroup>
    <LegalBasis category={item.category} />
    <CaseClassificationCard item={item} />
    <CaseAiSummaryCard item={item} />
  </div>
);
