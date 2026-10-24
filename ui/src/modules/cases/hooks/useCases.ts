import { useQuery } from "@apollo/client";
import { useAtomValue } from "jotai";
import { useCallback, useRef } from "react";
import {
  EnumCursorDirection,
  mergeCursorData,
  useMultiQueryState,
  useRecordTableCursor,
  validateFetchMore,
} from "erxes-ui";
import { currentUserState } from "ui-modules";
import type {
  EduTechBraveCaseCategory,
  EduTechBraveCaseSeverity,
  EduTechBraveCaseStatus,
  EduTechBraveCasesQuery,
} from "~/gql/graphql";
import { asCaseCategory, asCaseSeverity, asCaseStatus } from "../../shared/enums";
import { CASES_QUERY } from "../graphql";

export type CaseRow = EduTechBraveCasesQuery["eduTechBraveCases"]["list"][number];

export type CaseFilters = {
  search?: string;
  status?: EduTechBraveCaseStatus;
  severity?: EduTechBraveCaseSeverity;
  category?: EduTechBraveCaseCategory;
  assigneeId?: string;
  overdueOnly?: boolean;
  escalatedOnly?: boolean;
  openOnly?: boolean;
  unassignedOnly?: boolean;
};

export const CASES_PAGE_SIZE = 30;
export const CASES_CURSOR_SESSION_KEY = "edu_tech_brave_cases_cursor";

export const FILTER_KEYS = [
  "search",
  "status",
  "severity",
  "category",
  "overdue",
  "escalated",
  "open",
  "unassigned",
  "assignee",
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

export type FilterState = Record<FilterKey, string>;

// `?assignee=me` resolves to the signed-in user, so "Миний хэрэг" links can
// be shared and still mean "mine" for whoever opens them.
export const ASSIGNEE_ME = "me";

// URL query values are JSON-parsed by erxes-ui ("1" comes back as 1), so
// compare them as strings.
export const isOn = (value: unknown): boolean => String(value) === "1";
const text = (value: unknown): string => (value === null || value === undefined ? "" : String(value));

const forgetScrollPosition = () => {
  try {
    sessionStorage.removeItem(CASES_CURSOR_SESSION_KEY);
    sessionStorage.removeItem(`${CASES_CURSOR_SESSION_KEY}_scroll`);
  } catch {
    // Storage can be unavailable (private mode); the cursor reset below is enough.
  }
};

// Filters live in the URL so a filtered list can be shared or bookmarked.
// Changing any filter also drops the remembered scroll cursor; otherwise the
// new list would start from a row of the old one.
export const useCaseFilterState = () => {
  const [filters, setQuery] = useMultiQueryState<FilterState>([...FILTER_KEYS]);
  const { setCursor } = useRecordTableCursor({ sessionKey: CASES_CURSOR_SESSION_KEY });
  const setFilters = useCallback(
    (values: Partial<Record<FilterKey, string | null>>) => {
      forgetScrollPosition();
      setCursor("");
      setQuery(values);
    },
    [setCursor, setQuery],
  );
  return [filters, setFilters] as const;
};

export const useCaseFilters = (): CaseFilters => {
  const [filters] = useCaseFilterState();
  const currentUser = useAtomValue(currentUserState);
  const search = text(filters.search).trim();
  const mine = text(filters.assignee) === ASSIGNEE_ME;
  return {
    search: search.length ? search : undefined,
    status: asCaseStatus(filters.status),
    severity: asCaseSeverity(filters.severity),
    category: asCaseCategory(filters.category),
    // "-" matches no case: better an empty list than everyone's cases under "mine".
    assigneeId: mine ? (currentUser?._id ?? "-") : undefined,
    overdueOnly: isOn(filters.overdue) || undefined,
    escalatedOnly: isOn(filters.escalated) || undefined,
    openOnly: isOn(filters.open) || undefined,
    unassignedOnly: (!mine && isOn(filters.unassigned)) || undefined,
  };
};

export const hasActiveFilters = (filters: Partial<Record<FilterKey, unknown>>): boolean =>
  FILTER_KEYS.some((key) => text(filters[key]).trim() !== "");

export const useCases = (filters: CaseFilters) => {
  const { cursor } = useRecordTableCursor({ sessionKey: CASES_CURSOR_SESSION_KEY });
  const fetchingMore = useRef(false);
  const variables = { ...filters, limit: CASES_PAGE_SIZE, cursor: cursor || undefined };

  const { data, loading, error, fetchMore, refetch } = useQuery(CASES_QUERY, {
    variables,
    notifyOnNetworkStatusChange: true,
  });

  const result = data?.eduTechBraveCases;
  const pageInfo = result?.pageInfo;

  const handleFetchMore = async ({ direction }: { direction: EnumCursorDirection }) => {
    if (loading || fetchingMore.current || !pageInfo || !validateFetchMore({ direction, pageInfo })) {
      return;
    }
    const forward = direction === EnumCursorDirection.FORWARD;
    fetchingMore.current = true;
    try {
      await fetchMore({
        variables: {
          ...variables,
          cursor: forward ? pageInfo.endCursor : pageInfo.startCursor,
          direction: forward ? "forward" : "backward",
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) {
            return prev;
          }
          const merged = mergeCursorData({
            direction,
            prevResult: prev.eduTechBraveCases,
            fetchMoreResult: fetchMoreResult.eduTechBraveCases,
          });
          return {
            ...prev,
            eduTechBraveCases: {
              ...prev.eduTechBraveCases,
              list: merged.list,
              pageInfo: { ...prev.eduTechBraveCases.pageInfo, ...merged.pageInfo },
              totalCount: fetchMoreResult.eduTechBraveCases.totalCount,
            },
          };
        },
      });
    } finally {
      fetchingMore.current = false;
    }
  };

  return {
    cases: result?.list ?? [],
    totalCount: result?.totalCount ?? 0,
    hasData: Boolean(result),
    pageInfo,
    loading,
    error,
    handleFetchMore,
    refetch,
  };
};

export type CasesResult = ReturnType<typeof useCases>;
