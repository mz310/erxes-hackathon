import { IconFolderOpen, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { Button, useQueryState } from "erxes-ui";
import { CaseCreateSheet } from "../modules/cases/components/CaseCreateSheet";
import { CaseDetailSheet } from "../modules/cases/components/CaseDetailSheet";
import { CasesFilterBar } from "../modules/cases/components/CasesFilterBar";
import { CasesTable } from "../modules/cases/components/CasesTable";
import { hasActiveFilters, useCaseFilterState, useCaseFilters, useCases } from "../modules/cases/hooks/useCases";
import { CLEAR_VIEW_KEYS, PLUGIN_BASE } from "../modules/cases/views";
import { PluginPageHeader } from "../modules/shared/PluginPageHeader";

export const CasesPage = () => {
  const [creating, setCreating] = useState(false);
  const [, setCaseId] = useQueryState<string>("caseId");
  const [filterState, setFilters] = useCaseFilterState();
  const result = useCases(useCaseFilters());

  return (
    <div className="edutechbrave:flex edutechbrave:h-full edutechbrave:flex-col">
      <PluginPageHeader
        crumbs={[
          { label: "Эрх хамгаалал", to: PLUGIN_BASE },
          { label: "Хэргүүд", to: `${PLUGIN_BASE}/cases` },
        ]}
        icon={IconFolderOpen}
        favoriteIcon="IconFolderOpen"
      >
        <Button onClick={() => setCreating(true)}>
          <IconPlus />
          Шинэ хэрэг
        </Button>
      </PluginPageHeader>
      <CasesFilterBar totalCount={result.totalCount} counting={result.loading && !result.hasData} />
      <div className="edutechbrave:relative edutechbrave:flex edutechbrave:min-h-0 edutechbrave:flex-1 edutechbrave:flex-col edutechbrave:p-3">
        <CasesTable
          result={result}
          filtered={hasActiveFilters(filterState)}
          onClearFilters={() =>
            setFilters({ ...CLEAR_VIEW_KEYS, search: null, status: null, severity: null, category: null })
          }
          onCreate={() => setCreating(true)}
        />
      </div>
      <CaseCreateSheet open={creating} onOpenChange={setCreating} onCreated={(id) => setCaseId(id)} />
      <CaseDetailSheet />
    </div>
  );
};
