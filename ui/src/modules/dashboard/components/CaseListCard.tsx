import { useQuery } from "@apollo/client";
import { IconChevronRight } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Button, Card, Skeleton, useQueryState } from "erxes-ui";
import { Link } from "react-router";
import { DemoBadge, DueBadge, SeverityBadge, StatusBadge } from "../../cases/components/badges";
import { CASES_QUERY } from "../../cases/graphql";
import type { CaseFilters } from "../../cases/hooks/useCases";

const PREVIEW_LIMIT = 20;
const SHOWN = 6;

// A short work queue on the dashboard: the cases from one saved view,
// soonest deadline first, each opening the detail sheet in place.
export const CaseListCard = ({
  title,
  description,
  filters,
  href,
  empty,
  skip,
}: {
  title: string;
  description: string;
  filters: CaseFilters;
  href: string;
  empty: ReactNode;
  skip?: boolean;
}) => {
  const [, setCaseId] = useQueryState<string>("caseId");
  const { data, loading, error, refetch } = useQuery(CASES_QUERY, {
    variables: { ...filters, limit: PREVIEW_LIMIT },
    skip,
  });
  const result = data?.eduTechBraveCases;
  const total = result?.totalCount ?? 0;
  // The server returns newest first. Re-sorting by deadline is only honest
  // when the whole queue fits in this page; otherwise the oldest (and most
  // overdue) cases would be missing, so keep server order and say so.
  const complete = total <= PREVIEW_LIMIT;
  const list = [...(result?.list ?? [])];
  const cases = (
    complete ? list.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()) : list
  ).slice(0, SHOWN);
  const order = complete ? "Хугацаа дөхсөнөөр" : "Сүүлд ирснээр";

  return (
    <Card>
      <Card.Header className="edutechbrave:flex edutechbrave:flex-row edutechbrave:items-start edutechbrave:justify-between edutechbrave:gap-3">
        <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-1">
          <Card.Title className="edutechbrave:text-sm">
            {title}
            {result && <span className="edutechbrave:ml-2 edutechbrave:font-normal edutechbrave:text-muted-foreground">{total}</span>}
          </Card.Title>
          <Card.Description>
            {description}
            {cases.length > 1 && <span className="edutechbrave:block">{order} эрэмбэлсэн</span>}
          </Card.Description>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to={href}>
            Бүгдийг харах
            <IconChevronRight />
          </Link>
        </Button>
      </Card.Header>
      <Card.Content>
        {(loading || skip) && !data ? (
          <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2" role="status">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="edutechbrave:h-10 edutechbrave:w-full" />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-3">
            <p className="edutechbrave:text-sm edutechbrave:text-destructive">{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Дахин оролдох
            </Button>
          </div>
        ) : cases.length === 0 ? (
          <div className="edutechbrave:text-sm edutechbrave:text-muted-foreground">{empty}</div>
        ) : (
          <ul className="edutechbrave:-mx-2 edutechbrave:flex edutechbrave:flex-col edutechbrave:divide-y edutechbrave:divide-border">
            {cases.map((item) => (
              <li key={item._id}>
                <button
                  type="button"
                  onClick={() => setCaseId(item._id)}
                  className="edutechbrave:flex edutechbrave:w-full edutechbrave:flex-col edutechbrave:gap-1 edutechbrave:rounded-md edutechbrave:px-2 edutechbrave:py-2.5 edutechbrave:text-left edutechbrave:hover:bg-accent edutechbrave:focus-visible:outline-none edutechbrave:focus-visible:ring-2 edutechbrave:focus-visible:ring-ring"
                >
                  <span className="edutechbrave:flex edutechbrave:min-w-0 edutechbrave:items-center edutechbrave:gap-2">
                    <span className="edutechbrave:min-w-0 edutechbrave:flex-1 edutechbrave:truncate edutechbrave:text-sm edutechbrave:font-medium">
                      {item.title}
                    </span>
                    <span className="edutechbrave:shrink-0 edutechbrave:text-xs">
                      <DueBadge dueAt={item.dueAt} isOverdue={item.isOverdue} status={item.status} />
                    </span>
                  </span>
                  <span className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:items-center edutechbrave:gap-2 edutechbrave:text-xs edutechbrave:text-muted-foreground">
                    <span className="edutechbrave:font-mono">{item.caseNumber}</span>
                    <span className="edutechbrave:truncate">{item.schoolName}</span>
                    <StatusBadge status={item.status} />
                    <SeverityBadge severity={item.severity} />
                    {item.isDemo && <DemoBadge />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card.Content>
    </Card>
  );
};
