import { Card, Skeleton } from "erxes-ui";
import { Link } from "react-router";
import { casesHref } from "../../cases/views";
import { CATEGORY_LABELS } from "../../shared/labels";

type Bucket = { key: string; count: number };

// Plain horizontal bars: one hue, sorted by size, value printed at the end.
// Easier to read than a pie for ten categories with very different counts.
// Each row opens the case list for that category (all statuses, like the
// counts here), so a spike can be looked at straight away.
export const CategoryBreakdown = ({ buckets, loading }: { buckets: Bucket[]; loading: boolean }) => {
  const rows = [...buckets].filter((bucket) => bucket.count > 0).sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <Card>
      <Card.Header>
        <Card.Title className="edutechbrave:text-sm">Зөрчлийн төрлөөр</Card.Title>
        <Card.Description>Бүх хугацааны бүртгэл</Card.Description>
      </Card.Header>
      <Card.Content>
        {loading && !buckets.length ? (
          <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-3" role="status">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="edutechbrave:h-5 edutechbrave:w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="edutechbrave:text-sm edutechbrave:text-muted-foreground">Одоогоор бүртгэл алга.</p>
        ) : (
          <ul className="edutechbrave:-mx-2 edutechbrave:flex edutechbrave:flex-col">
            {rows.map((row) => (
              <li key={row.key}>
                <Link
                  to={casesHref({ category: row.key })}
                  className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-1 edutechbrave:rounded-md edutechbrave:px-2 edutechbrave:py-1.5 edutechbrave:hover:bg-accent edutechbrave:focus-visible:outline-none edutechbrave:focus-visible:ring-2 edutechbrave:focus-visible:ring-ring"
                >
                  <span className="edutechbrave:flex edutechbrave:items-center edutechbrave:justify-between edutechbrave:gap-3 edutechbrave:text-sm">
                    <span className="edutechbrave:truncate">{CATEGORY_LABELS[row.key] ?? row.key}</span>
                    <span className="edutechbrave:font-medium edutechbrave:tabular-nums">{row.count}</span>
                  </span>
                  <span className="edutechbrave:h-1.5 edutechbrave:w-full edutechbrave:overflow-hidden edutechbrave:rounded-full edutechbrave:bg-muted">
                    <span
                      className="edutechbrave:block edutechbrave:h-full edutechbrave:rounded-full edutechbrave:bg-primary"
                      style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card.Content>
    </Card>
  );
};
