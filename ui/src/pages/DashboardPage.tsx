import { useMutation, useQuery } from "@apollo/client";
import { IconFlask, IconPlus, IconRefreshAlert, IconShieldCheck } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { Button, useQueryState } from "erxes-ui";
import { Link } from "react-router";
import { currentUserState } from "ui-modules";
import { CaseCreateSheet } from "../modules/cases/components/CaseCreateSheet";
import { CaseDetailSheet } from "../modules/cases/components/CaseDetailSheet";
import { CASE_REFETCH, notifyError, notifySuccess } from "../modules/cases/components/shared";
import { CASE_STATS_QUERY, CASES_ESCALATE_MUTATION } from "../modules/cases/graphql";
import { PLUGIN_BASE, viewHref } from "../modules/cases/views";
import { CaseListCard } from "../modules/dashboard/components/CaseListCard";
import { CategoryBreakdown } from "../modules/dashboard/components/CategoryBreakdown";
import { GettingStartedCard } from "../modules/dashboard/components/GettingStartedCard";
import { HelplineCard } from "../modules/dashboard/components/HelplineCard";
import { PublicChannelCard } from "../modules/dashboard/components/PublicChannelCard";
import { StatTiles } from "../modules/dashboard/components/StatTiles";
import { SETTINGS_QUERY } from "../modules/shared/graphql";
import { PluginPageHeader } from "../modules/shared/PluginPageHeader";

// The dashboard answers "what needs attention now?": headline numbers that
// open the matching list, then the handler's own queue and the cases nobody
// owns yet. Reference material (helpline, public link) sits to the side.
export const DashboardPage = () => {
  const [creating, setCreating] = useState(false);
  const [, setCaseId] = useQueryState<string>("caseId");
  const currentUser = useAtomValue(currentUserState);
  const stats = useQuery(CASE_STATS_QUERY);
  const settings = useQuery(SETTINGS_QUERY);
  const [escalate, { loading: escalating }] = useMutation(CASES_ESCALATE_MUTATION, {
    refetchQueries: CASE_REFETCH,
    onError: notifyError,
    onCompleted: (data) =>
      notifySuccess(
        "Хугацаа шалгагдлаа",
        data.eduTechBraveCasesEscalateOverdue > 0
          ? `${data.eduTechBraveCasesEscalateOverdue} хэрэг дээд шатанд шилжлээ`
          : "Шинээр шатлах хэрэг алга",
      ),
  });

  const data = stats.data?.eduTechBraveCaseStats;
  const organization = settings.data?.eduTechBraveSettings.organizationName;
  const totalCases = data ? data.byStatus.reduce((sum, bucket) => sum + bucket.count, 0) : null;
  const isEmpty = totalCases === 0;

  return (
    <div className="edutechbrave:flex edutechbrave:h-full edutechbrave:flex-col">
      <PluginPageHeader
        crumbs={[{ label: "Эрх хамгаалал", to: PLUGIN_BASE }]}
        icon={IconShieldCheck}
        favoriteIcon="IconShieldCheck"
      >
        <Button
          variant="ghost"
          disabled={escalating}
          onClick={() => void escalate()}
          title="Хугацаа хэтэрсэн хэргийг одоо дээд шатанд шилжүүлнэ. Жагсаалт нээх бүрт автоматаар хийгддэг."
        >
          <IconRefreshAlert />
          Хугацаа шалгах
        </Button>
        <Button onClick={() => setCreating(true)}>
          <IconPlus />
          Шинэ хэрэг
        </Button>
      </PluginPageHeader>
      <div className="edutechbrave:flex-1 edutechbrave:overflow-auto">
        <div className="edutechbrave:mx-auto edutechbrave:flex edutechbrave:w-full edutechbrave:max-w-6xl edutechbrave:flex-col edutechbrave:gap-6 edutechbrave:p-6">
          <section className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-1">
            <h1 className="edutechbrave:text-2xl edutechbrave:font-semibold edutechbrave:tracking-tight">
              {organization || "Эрх хамгаалал"}
            </h1>
            <p className="edutechbrave:max-w-3xl edutechbrave:text-sm edutechbrave:text-muted-foreground">
              Багш, сурагчдын эрхийн зөрчлийн мэдэгдлийг сургуулиас хараат бусаар хүлээн авч, хугацаанд нь
              шийдвэрлэнэ.
            </p>
          </section>

          {(data?.demoCount ?? 0) > 0 && (
            <div className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-2 edutechbrave:rounded-lg edutechbrave:border edutechbrave:border-border edutechbrave:bg-muted edutechbrave:px-4 edutechbrave:py-2 edutechbrave:text-sm">
              <IconFlask className="edutechbrave:size-4 edutechbrave:shrink-0 edutechbrave:text-muted-foreground" />
              <span>
                Энэ орчинд {data?.demoCount} жишээ хэрэг байна. Тэдгээр нь «Жишээ» тэмдэгтэй, сургууль, хүмүүс нь
                зохиомол.
              </span>
            </div>
          )}

          {stats.error ? (
            <div role="alert" className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-3 edutechbrave:rounded-lg edutechbrave:border edutechbrave:border-destructive/40 edutechbrave:p-4">
              <p className="edutechbrave:text-sm edutechbrave:text-destructive">{stats.error.message}</p>
              <Button variant="outline" size="sm" onClick={() => void stats.refetch()}>
                Дахин оролдох
              </Button>
            </div>
          ) : (
            <StatTiles stats={data} loading={stats.loading} />
          )}

          <div className="edutechbrave:grid edutechbrave:items-start edutechbrave:gap-4 edutechbrave:lg:grid-cols-3">
            <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-4 edutechbrave:lg:col-span-2">
              {isEmpty ? (
                <GettingStartedCard onCreate={() => setCreating(true)} />
              ) : (
                <>
                  <CaseListCard
                    title="Миний хэрэг"
                    description="Танд оноогдсон нээлттэй хэрэг"
                    filters={{ assigneeId: currentUser?._id, openOnly: true }}
                    skip={!currentUser?._id}
                    href={viewHref("mine")}
                    empty={
                      <span>
                        Танд оноогдсон нээлттэй хэрэг алга.{" "}
                        <Link className="edutechbrave:font-medium edutechbrave:text-primary edutechbrave:hover:underline" to={viewHref("unassigned")}>
                          Томилоогүй хэргүүдийг харах
                        </Link>
                      </span>
                    }
                  />
                  <CaseListCard
                    title="Томилоогүй хэрэг"
                    description="Хариуцагчгүй нээлттэй хэрэг. Нээгээд «Өөрөө хариуцах» эсвэл өөр ажилтанд онооно."
                    filters={{ unassignedOnly: true, openOnly: true }}
                    href={viewHref("unassigned")}
                    empty="Бүх нээлттэй хэрэг хариуцагчтай."
                  />
                </>
              )}
            </div>
            <div className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-4">
              <HelplineCard text={settings.data?.eduTechBraveSettings.helplineText} />
              <CategoryBreakdown buckets={data?.byCategory ?? []} loading={stats.loading} />
              <PublicChannelCard />
            </div>
          </div>
        </div>
      </div>
      <CaseCreateSheet open={creating} onOpenChange={setCreating} onCreated={(id) => setCaseId(id)} />
      <CaseDetailSheet />
    </div>
  );
};
