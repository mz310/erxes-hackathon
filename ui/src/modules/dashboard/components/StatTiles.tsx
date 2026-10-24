import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconChevronRight,
  IconCircleCheck,
  IconClockExclamation,
  IconFolderOpen,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { Card, Skeleton, cn } from "erxes-ui";
import { Link } from "react-router";
import type { EduTechBraveCaseStatsQuery } from "~/gql/graphql";
import { casesHref, viewHref } from "../../cases/views";

type Stats = EduTechBraveCaseStatsQuery["eduTechBraveCaseStats"];

type Tile = {
  key: keyof Pick<Stats, "open" | "overdue" | "escalated" | "critical" | "resolvedLast30Days">;
  label: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  alarm?: boolean;
  // Every link opens a list whose count equals the tile's number.
  href?: string;
};

const TILES: Tile[] = [
  { key: "open", label: "Нээлттэй", hint: "шийдвэрлэгдээгүй хэрэг", icon: IconFolderOpen, href: viewHref("open") },
  {
    key: "overdue",
    label: "Хугацаа хэтэрсэн",
    hint: "шийдвэрлэх хугацаа өнгөрсөн",
    icon: IconClockExclamation,
    alarm: true,
    href: viewHref("overdue"),
  },
  {
    key: "escalated",
    label: "Шатласан",
    hint: "дээд шатанд шилжсэн",
    icon: IconArrowUpRight,
    alarm: true,
    href: viewHref("escalated"),
  },
  {
    key: "critical",
    label: "Онц ноцтой",
    hint: "нээлттэй, онц ноцтой",
    icon: IconAlertTriangle,
    alarm: true,
    href: casesHref({ severity: "critical", open: "1" }),
  },
  { key: "resolvedLast30Days", label: "Шийдвэрлэсэн", hint: "сүүлийн 30 хоногт", icon: IconCircleCheck },
];

const TileBody = ({ tile, stats, loading }: { tile: Tile; stats?: Stats; loading: boolean }) => {
  const { key, label, hint, icon: Icon, alarm, href } = tile;
  const value = stats?.[key] ?? 0;
  const hot = Boolean(alarm) && value > 0;
  return (
    <Card
      className={cn(
        "edutechbrave:h-full edutechbrave:transition-colors",
        hot && "edutechbrave:border-destructive/40",
        href && "edutechbrave:group-hover:border-primary",
      )}
    >
      <Card.Content className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2 edutechbrave:p-4">
        <div className="edutechbrave:flex edutechbrave:items-center edutechbrave:justify-between">
          <span className="edutechbrave:text-sm edutechbrave:text-muted-foreground">{label}</span>
          <Icon className={cn("edutechbrave:size-4", hot ? "edutechbrave:text-destructive" : "edutechbrave:text-muted-foreground")} />
        </div>
        {loading && !stats ? (
          <Skeleton className="edutechbrave:h-8 edutechbrave:w-12" />
        ) : (
          <span className={cn("edutechbrave:text-2xl edutechbrave:font-semibold edutechbrave:tabular-nums", hot && "edutechbrave:text-destructive")}>
            {value}
          </span>
        )}
        <span className="edutechbrave:flex edutechbrave:items-center edutechbrave:justify-between edutechbrave:gap-1 edutechbrave:text-xs edutechbrave:text-muted-foreground">
          {hint}
          {href && (
            <IconChevronRight className="edutechbrave:size-3.5 edutechbrave:opacity-0 edutechbrave:transition-opacity edutechbrave:group-hover:opacity-100 edutechbrave:group-focus-visible:opacity-100" />
          )}
        </span>
      </Card.Content>
    </Card>
  );
};

export const StatTiles = ({ stats, loading }: { stats?: Stats; loading: boolean }) => (
  <div className="edutechbrave:grid edutechbrave:grid-cols-2 edutechbrave:gap-3 edutechbrave:md:grid-cols-3 edutechbrave:xl:grid-cols-5">
    {TILES.map((tile) =>
      tile.href ? (
        <Link
          key={tile.key}
          to={tile.href}
          aria-label={`${tile.label}: ${stats?.[tile.key] ?? 0}. Жагсаалтыг нээх`}
          className="edutechbrave:group edutechbrave:rounded-lg edutechbrave:focus-visible:outline-none edutechbrave:focus-visible:ring-2 edutechbrave:focus-visible:ring-ring"
        >
          <TileBody tile={tile} stats={stats} loading={loading} />
        </Link>
      ) : (
        <TileBody key={tile.key} tile={tile} stats={stats} loading={loading} />
      ),
    )}
  </div>
);
