import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconCategory,
  IconClock,
  IconFolderOff,
  IconHash,
  IconProgress,
  IconSchool,
  IconUser,
  IconFileText,
} from "@tabler/icons-react";
import type { ComponentProps, ReactNode } from "react";
import {
  Button,
  RecordTable,
  RecordTableInlineCell,
  TextOverflowTooltip,
  useQueryState,
} from "erxes-ui";
import { MembersInline } from "ui-modules";
import { CASES_CURSOR_SESSION_KEY, type CaseRow, type CasesResult } from "../hooks/useCases";
import {
  CategoryLabel,
  DemoBadge,
  DueBadge,
  EscalationBadge,
  SeverityBadge,
  StatusBadge,
  isOpenStatus,
} from "./badges";

type Column = ComponentProps<typeof RecordTable.Provider>["columns"][number];

const rowOf = (original: unknown): CaseRow => original as CaseRow;

const OpenCaseCell = ({ item, children }: { item: CaseRow; children: ReactNode }) => {
  const [, setCaseId] = useQueryState<string>("caseId");
  return (
    <RecordTableInlineCell
      className="edutechbrave:cursor-pointer edutechbrave:font-medium"
      onClick={() => setCaseId(item._id)}
    >
      {children}
    </RecordTableInlineCell>
  );
};

// Column order follows the triage question "what needs me first?": the case,
// where it stands, how long is left, how serious, and who owns it.
const columns: Column[] = [
  {
    id: "caseNumber",
    accessorKey: "caseNumber",
    header: () => <RecordTable.InlineHead icon={IconHash} label="Дугаар" />,
    cell: ({ row }) => {
      const item = rowOf(row.original);
      return (
        <OpenCaseCell item={item}>
          <span className="edutechbrave:font-mono edutechbrave:text-xs">{item.caseNumber}</span>
        </OpenCaseCell>
      );
    },
    size: 130,
  },
  {
    id: "title",
    accessorKey: "title",
    header: () => <RecordTable.InlineHead icon={IconFileText} label="Гарчиг" />,
    cell: ({ row }) => {
      const item = rowOf(row.original);
      return (
        <OpenCaseCell item={item}>
          {item.isDemo && <DemoBadge />}
          <TextOverflowTooltip value={item.title} />
        </OpenCaseCell>
      );
    },
    size: 300,
  },
  {
    id: "status",
    accessorKey: "status",
    header: () => <RecordTable.InlineHead icon={IconProgress} label="Төлөв" />,
    cell: ({ row }) => (
      <RecordTableInlineCell>
        <StatusBadge status={rowOf(row.original).status} />
      </RecordTableInlineCell>
    ),
    size: 150,
  },
  {
    id: "dueAt",
    accessorKey: "dueAt",
    header: () => <RecordTable.InlineHead icon={IconClock} label="Хугацаа" />,
    cell: ({ row }) => {
      const item = rowOf(row.original);
      return (
        <RecordTableInlineCell>
          <DueBadge dueAt={item.dueAt} isOverdue={item.isOverdue} status={item.status} />
        </RecordTableInlineCell>
      );
    },
    size: 150,
  },
  {
    id: "severity",
    accessorKey: "severity",
    header: () => <RecordTable.InlineHead icon={IconAlertTriangle} label="Ноцтой байдал" />,
    cell: ({ row }) => (
      <RecordTableInlineCell>
        <SeverityBadge severity={rowOf(row.original).severity} />
      </RecordTableInlineCell>
    ),
    size: 140,
  },
  {
    id: "assigneeId",
    accessorKey: "assigneeId",
    header: () => <RecordTable.InlineHead icon={IconUser} label="Хариуцагч" />,
    cell: ({ row }) => {
      const { assigneeId, status } = rowOf(row.original);
      return (
        <RecordTableInlineCell>
          {assigneeId ? (
            <MembersInline memberIds={[assigneeId]} />
          ) : isOpenStatus(status) ? (
            <span className="edutechbrave:font-medium edutechbrave:text-destructive">Томилоогүй</span>
          ) : (
            <span className="edutechbrave:text-muted-foreground">—</span>
          )}
        </RecordTableInlineCell>
      );
    },
    size: 180,
  },
  {
    id: "schoolName",
    accessorKey: "schoolName",
    header: () => <RecordTable.InlineHead icon={IconSchool} label="Сургууль" />,
    cell: ({ row }) => {
      const item = rowOf(row.original);
      return (
        <RecordTableInlineCell>
          <TextOverflowTooltip value={item.grade ? `${item.schoolName}, ${item.grade}` : item.schoolName} />
        </RecordTableInlineCell>
      );
    },
    size: 200,
  },
  {
    id: "category",
    accessorKey: "category",
    header: () => <RecordTable.InlineHead icon={IconCategory} label="Төрөл" />,
    cell: ({ row }) => (
      <RecordTableInlineCell>
        <CategoryLabel category={rowOf(row.original).category} />
      </RecordTableInlineCell>
    ),
    size: 220,
  },
  {
    id: "escalationLevel",
    accessorKey: "escalationLevel",
    header: () => <RecordTable.InlineHead icon={IconArrowUpRight} label="Шатлал" />,
    cell: ({ row }) => (
      <RecordTableInlineCell>
        <EscalationBadge level={rowOf(row.original).escalationLevel} />
      </RecordTableInlineCell>
    ),
    size: 110,
  },
];

const EmptyState = ({ title, text, action }: { title: string; text: string; action?: ReactNode }) => (
  <div className="edutechbrave:pointer-events-none edutechbrave:absolute edutechbrave:inset-0 edutechbrave:flex edutechbrave:items-center edutechbrave:justify-center">
    <div className="edutechbrave:pointer-events-auto edutechbrave:flex edutechbrave:max-w-sm edutechbrave:flex-col edutechbrave:items-center edutechbrave:gap-2 edutechbrave:text-center">
      <IconFolderOff className="edutechbrave:size-12 edutechbrave:text-muted-foreground" />
      <h3 className="edutechbrave:text-lg edutechbrave:font-semibold">{title}</h3>
      <p className="edutechbrave:text-sm edutechbrave:text-muted-foreground">{text}</p>
      {action}
    </div>
  </div>
);

export const CasesTable = ({
  result,
  filtered,
  onClearFilters,
  onCreate,
}: {
  result: CasesResult;
  filtered: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
}) => {
  const { cases, loading, error, pageInfo, handleFetchMore, refetch } = result;

  if (error && !cases.length) {
    return (
      <div className="edutechbrave:flex edutechbrave:h-full edutechbrave:flex-col edutechbrave:items-center edutechbrave:justify-center edutechbrave:gap-3 edutechbrave:p-8 edutechbrave:text-center" role="alert">
        <p className="edutechbrave:font-medium">Хэргүүдийг ачаалж чадсангүй</p>
        <p className="edutechbrave:text-sm edutechbrave:text-muted-foreground">{error.message}</p>
        <Button variant="outline" onClick={() => refetch()}>
          Дахин оролдох
        </Button>
      </div>
    );
  }

  return (
    <RecordTable.Provider
      columns={columns}
      data={cases}
      className="edutechbrave:h-full edutechbrave:min-h-0"
      stickyColumns={["caseNumber"]}
      tableId="edu_tech_brave_cases_table"
    >
      <RecordTable.CursorProvider
        hasPreviousPage={pageInfo?.hasPreviousPage}
        hasNextPage={pageInfo?.hasNextPage}
        loading={loading}
        dataLength={cases.length}
        sessionKey={CASES_CURSOR_SESSION_KEY}
      >
        <RecordTable>
          <RecordTable.Header />
          <RecordTable.Body>
            <RecordTable.CursorBackwardSkeleton handleFetchMore={handleFetchMore} />
            {loading && !cases.length && <RecordTable.RowSkeleton rows={20} />}
            <RecordTable.RowList />
            <RecordTable.CursorForwardSkeleton handleFetchMore={handleFetchMore} />
          </RecordTable.Body>
        </RecordTable>
        {!loading && !cases.length &&
          (filtered ? (
            <EmptyState
              title="Тохирох хэрэг алга"
              text="Энэ жагсаалт эсвэл шүүлтүүрт таарах хэрэг одоогоор алга."
              action={
                <Button variant="outline" size="sm" onClick={onClearFilters}>
                  Бүх хэргийг харах
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="Хэрэг бүртгэгдээгүй байна"
              text="Олон нийтийн сувгаар ирсэн мэдэгдэл энд автоматаар орно. Утсаар, биечлэн ирсэн мэдэгдлийг өөрөө бүртгэнэ."
              action={
                <Button size="sm" onClick={onCreate}>
                  Шинэ хэрэг бүртгэх
                </Button>
              }
            />
          ))}
      </RecordTable.CursorProvider>
    </RecordTable.Provider>
  );
};
