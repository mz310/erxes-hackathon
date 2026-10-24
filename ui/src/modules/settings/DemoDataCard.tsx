import { useMutation, useQuery } from "@apollo/client";
import { IconDatabaseImport, IconExternalLink, IconInfoCircle } from "@tabler/icons-react";
import { Alert, Button, Card, REACT_APP_API_URL, Skeleton } from "erxes-ui";
import manifest from "../../../../erxes.json" with { type: "json" };
import { CASE_REFETCH, notifyError, notifySuccess } from "../cases/components/shared";
import { CASE_STATS_QUERY, SEED_DEMO_MUTATION } from "../cases/graphql";

const intakeUrl = (): string =>
  `${(REACT_APP_API_URL || window.location.origin).replace(/\/+$/, "")}/pl:${manifest.name}/intake#track`;

// Loads a realistic set of fictional cases (with timelines, protocol steps,
// evidence and escalations) so the plugin can be explored or demonstrated.
// Nothing can be deleted in this plugin, so demo data is loaded once, marked
// «Жишээ», and refused by the API on production deployments.
export const DemoDataCard = () => {
  const stats = useQuery(CASE_STATS_QUERY);
  const [seed, { data, loading }] = useMutation(SEED_DEMO_MUTATION, {
    refetchQueries: CASE_REFETCH,
    onError: notifyError,
    onCompleted: (result) => {
      const created = result.eduTechBraveSeedDemoData.created;
      notifySuccess(
        created > 0 ? "Жишээ өгөгдөл ачаалагдлаа" : "Жишээ өгөгдөл аль хэдийн байна",
        created > 0 ? `${created} хэрэг үүслээ` : undefined,
      );
    },
  });

  const demoCount = stats.data?.eduTechBraveCaseStats.demoCount ?? 0;
  const sample = data?.eduTechBraveSeedDemoData;

  return (
    <Card>
      <Card.Header>
        <Card.Title className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-2">
          <IconDatabaseImport className="edutechbrave:size-4" />
          Жишээ өгөгдөл
        </Card.Title>
        <Card.Description>
          Сургалт, танилцуулгад зориулсан 14 зохиомол хэрэг: бүх төрөл, төлөв, шатлал, яаралтай
          протокол, нотлох баримт, түүхтэй. Сургууль, хүмүүс нь зохиомол. Хэргүүд «Жишээ» гэсэн
          тэмдэгтэй харагдана. Таныг хариуцагчаар томилно.
        </Card.Description>
      </Card.Header>
      <Card.Content className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-3">
        <Alert variant="warning">
          <IconInfoCircle />
          <Alert.Title>Устгах боломжгүй</Alert.Title>
          <Alert.Description>
            Энэ plugin-д хэрэг устгах боломж байхгүй. Жишээ өгөгдлийг зөвхөн туршилтын орчинд
            ачаална уу. Production орчинд систем татгалзана.
          </Alert.Description>
        </Alert>

        {stats.loading && !stats.data ? (
          <Skeleton className="edutechbrave:h-9 edutechbrave:w-48" />
        ) : stats.error ? (
          <div role="alert" className="edutechbrave:flex edutechbrave:items-center edutechbrave:gap-3">
            <p className="edutechbrave:text-sm edutechbrave:text-destructive">{stats.error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void stats.refetch()}>
              Дахин оролдох
            </Button>
          </div>
        ) : demoCount > 0 ? (
          <p className="edutechbrave:text-sm">
            Жишээ өгөгдөл ачаалагдсан: <span className="edutechbrave:font-semibold">{demoCount} хэрэг</span>.
          </p>
        ) : (
          <div>
            <Button disabled={loading} onClick={() => void seed()}>
              <IconDatabaseImport />
              {loading ? "Ачаалж байна…" : "Жишээ өгөгдөл ачаалах"}
            </Button>
          </div>
        )}

        {sample?.sampleTrackingCode && sample.samplePin && (
          <Alert>
            <IconInfoCircle />
            <Alert.Title>Олон нийтийн хуудсаар явц шалгаж үзэх</Alert.Title>
            <Alert.Description className="edutechbrave:flex edutechbrave:flex-col edutechbrave:gap-2">
              <span>
                {sample.sampleCaseNumber}: хяналтын код{" "}
                <code className="edutechbrave:rounded edutechbrave:bg-muted edutechbrave:px-1.5 edutechbrave:font-mono">
                  {sample.sampleTrackingCode}
                </code>
                , PIN{" "}
                <code className="edutechbrave:rounded edutechbrave:bg-muted edutechbrave:px-1.5 edutechbrave:font-mono">
                  {sample.samplePin}
                </code>
                . PIN-г дахин харуулахгүй тул тэмдэглэж аваарай.
              </span>
              <Button variant="outline" size="sm" asChild className="edutechbrave:self-start">
                <a href={intakeUrl()} target="_blank" rel="noreferrer">
                  <IconExternalLink />
                  Олон нийтийн хуудас нээх
                </a>
              </Button>
            </Alert.Description>
          </Alert>
        )}
      </Card.Content>
    </Card>
  );
};
