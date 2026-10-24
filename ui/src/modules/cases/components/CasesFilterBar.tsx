import { useQuery } from "@apollo/client";
import { IconSearch, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Badge, Button, Input, Select, cn } from "erxes-ui";
import { CATEGORY_OPTIONS, SEVERITY_OPTIONS, STATUS_OPTIONS, type Option } from "../../shared/labels";
import { CASE_STATS_QUERY } from "../graphql";
import { hasActiveFilters, useCaseFilterState } from "../hooks/useCases";
import { CASE_VIEWS, CLEAR_VIEW_KEYS, activeViewOf } from "../views";

const ALL = "all";

const FilterSelect = ({
  value,
  placeholder,
  allLabel,
  options,
  onChange,
  className,
}: {
  value: unknown;
  placeholder: string;
  allLabel: string;
  options: Option[];
  onChange: (value: string | null) => void;
  className?: string;
}) => {
  const current = value === null || value === undefined || value === "" ? ALL : String(value);
  return (
    <Select value={current} onValueChange={(next) => onChange(next === ALL ? null : next)}>
      <Select.Trigger
        className={cn("edutechbrave:w-40", current !== ALL && "edutechbrave:border-primary", className)}
        aria-label={placeholder}
      >
        <Select.Value placeholder={placeholder} />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value={ALL}>{allLabel}</Select.Item>
        {options.map((option) => (
          <Select.Item key={option.value} value={option.value}>
            {option.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  );
};

// Two rows: saved views first (what most handlers need), then search and
// narrowing selects. The total on the right always describes the list below.
export const CasesFilterBar = ({ totalCount, counting }: { totalCount: number; counting: boolean }) => {
  const [filters, setFilters] = useCaseFilterState();
  const current = filters.search === null || filters.search === undefined ? "" : String(filters.search);
  const [search, setSearch] = useState(current);
  const stats = useQuery(CASE_STATS_QUERY);
  const overdue = stats.data?.eduTechBraveCaseStats.overdue ?? 0;

  useEffect(() => {
    setSearch(current);
  }, [current]);

  // Debounce typing so every keystroke does not hit the API.
  useEffect(() => {
    if (search === current) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setFilters({ search: search.trim() ? search.trim() : null });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search, current, setFilters]);

  const activeView = activeViewOf(filters);
  const narrowed =
    Boolean(current) || Boolean(filters.status) || Boolean(filters.severity) || Boolean(filters.category);

  return (
    <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:border-b edutechbrave:border-border">
      <div className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-3 edutechbrave:px-3 edutechbrave:pt-2">
        <nav
          aria-label="Хэргийн жагсаалт"
          className="edutechbrave:-mb-px edutechbrave:flex edutechbrave:min-w-0 edutechbrave:flex-1 edutechbrave:gap-1 edutechbrave:overflow-x-auto"
        >
          {CASE_VIEWS.map((view) => {
            const active = view.key === activeView;
            return (
              <button
                key={view.key}
                type="button"
                title={view.hint}
                aria-current={active ? "page" : undefined}
                onClick={() => setFilters({ ...CLEAR_VIEW_KEYS, ...view.patch })}
                className={cn(
                  "edutechbrave:inline-flex edutechbrave:shrink-0 edutechbrave:items-center edutechbrave:gap-1.5 edutechbrave:border-b-2 edutechbrave:px-2.5 edutechbrave:pb-2 edutechbrave:pt-1 edutechbrave:text-sm edutechbrave:font-medium edutechbrave:transition-colors",
                  "edutechbrave:focus-visible:outline-none edutechbrave:focus-visible:ring-2 edutechbrave:focus-visible:ring-ring edutechbrave:rounded-t-sm",
                  active
                    ? "edutechbrave:border-primary edutechbrave:text-foreground"
                    : "edutechbrave:border-transparent edutechbrave:text-muted-foreground edutechbrave:hover:text-foreground",
                )}
              >
                {view.label}
                {view.key === "overdue" && overdue > 0 && (
                  <Badge variant="destructive" className="edutechbrave:px-1.5">
                    {overdue}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
        <span
          className="edutechbrave:shrink-0 edutechbrave:pb-2 edutechbrave:text-sm edutechbrave:text-muted-foreground edutechbrave:tabular-nums"
          aria-live="polite"
        >
          {counting ? "…" : `${totalCount} хэрэг`}
        </span>
      </div>
      <div className="edutechbrave:flex edutechbrave:flex-wrap edutechbrave:items-center edutechbrave:gap-2 edutechbrave:border-t edutechbrave:border-border edutechbrave:px-3 edutechbrave:py-2">
        <div className="edutechbrave:relative edutechbrave:w-full edutechbrave:sm:w-72">
          <IconSearch className="edutechbrave:absolute edutechbrave:left-2 edutechbrave:top-1/2 edutechbrave:size-4 edutechbrave:-translate-y-1/2 edutechbrave:text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Хэргийн дугаар, гарчиг, сургууль…"
            className="edutechbrave:pl-8"
            aria-label="Хэрэг хайх"
          />
        </div>
        <FilterSelect
          value={filters.status}
          placeholder="Төлөв"
          allLabel="Бүх төлөв"
          options={STATUS_OPTIONS}
          onChange={(status) => setFilters({ status })}
        />
        <FilterSelect
          value={filters.severity}
          placeholder="Ноцтой байдал"
          allLabel="Бүх зэрэг"
          options={SEVERITY_OPTIONS}
          onChange={(severity) => setFilters({ severity })}
        />
        <FilterSelect
          value={filters.category}
          placeholder="Зөрчлийн төрөл"
          allLabel="Бүх төрөл"
          options={CATEGORY_OPTIONS}
          onChange={(category) => setFilters({ category })}
          className="edutechbrave:w-56"
        />
        {narrowed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setFilters({ search: null, status: null, severity: null, category: null });
            }}
          >
            <IconX />
            Шүүлтүүр цэвэрлэх
          </Button>
        )}
        {!narrowed && hasActiveFilters(filters) && activeView !== "all" && (
          <span className="edutechbrave:text-xs edutechbrave:text-muted-foreground">
            {CASE_VIEWS.find((view) => view.key === activeView)?.hint}
          </span>
        )}
      </div>
    </div>
  );
};
