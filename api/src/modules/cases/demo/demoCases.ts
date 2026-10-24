import {
  ESCALATION_GRACE_HOURS,
  EVIDENCE_KIND_LABELS_MN,
  MAX_ESCALATION_LEVEL,
  PROTOCOL_STEP_KEYS,
  PROTOCOL_STEP_LABELS_MN,
  STATUS_LABELS_MN,
  computeDueAt,
  requiresProtocol,
  type CaseSource,
  type CaseStatus,
  type ConflictDeclaration,
  type EventType,
  type EvidenceKind,
  type ProtocolStep,
  type ReportInput,
  type SlaHours,
} from "../domain.ts";

// Demo cases for a training or demo tenant. Pure and deterministic: given a
// clock and the acting user, it returns fully formed cases whose history
// (status changes, protocol, evidence, escalations) is exactly what the live
// rules would have produced. Schools and people are fictional; contact
// addresses use the reserved example.com domain.

export type DemoEvent = {
  type: EventType;
  message: string;
  payload: Record<string, unknown> | null;
  actorId: string | null;
  isPublic: boolean;
  createdAt: Date;
};

export type DemoEvidence = {
  kind: EvidenceKind;
  title: string;
  description: string | null;
  fileUrl: null;
  fileName: null;
  recordedAt: Date;
  addedBy: string;
  createdAt: Date;
};

export type DemoCase = {
  featured: boolean;
  report: ReportInput & { incidentDate: Date };
  source: CaseSource;
  status: CaseStatus;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  dueAt: Date;
  escalationLevel: number;
  escalatedAt: Date | null;
  resolvedAt: Date | null;
  resolution: string | null;
  conflictDeclarations: ConflictDeclaration[];
  protocolSteps: ProtocolStep[];
  events: DemoEvent[];
  evidence: DemoEvidence[];
};

type Transition = { to: CaseStatus; afterHours: number; note?: string };

type Spec = {
  featured?: boolean;
  createdHoursAgo: number;
  incidentDaysBefore: number;
  source: CaseSource;
  report: Omit<ReportInput, "incidentDate">;
  assignAfterHours: number | null;
  transitions: Transition[];
  protocolDoneAfterHours: number[];
  evidence: {
    kind: EvidenceKind;
    title: string;
    description?: string;
    afterHours: number;
    recordedBeforeHours: number;
  }[];
  notes: { afterHours: number; text: string; isPublic: boolean }[];
  resolution?: string;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const SPECS: Spec[] = [
  {
    featured: true,
    createdHoursAgo: 146,
    incidentDaysBefore: 1,
    source: "public",
    report: {
      title: "Ширээн дээрээс сандал унагаасан гэж сурагчийг зодсон",
      description:
        "Хүү маань ширээн дээрээс сандал унагаасан гэх шалтгаанаар орос хэлний багш түүнийг цохиж, өшиглөсөн. Өмд нь урагдаж, уйлсаар гэртээ ирсэн бөгөөд тэр багшийн хичээлд дахиж явахгүй гэж байна. Сургуулийн удирдлага эмнэлгийн тусламж үзүүлээгүй, бидэнд мэдэгдээгүй. Багш нь захирлын гэр бүлийн хүн тул сургуульд гомдол гаргахаас эмээж байна.",
      category: "physical_violence",
      severity: "critical",
      reporterRole: "parent",
      isAnonymous: true,
      reporterContact: null,
      victimRole: "student",
      schoolName: "Нарлаг ЕБС (Баянзүрх дүүрэг)",
      grade: "6б",
      incidentLocation: "Орос хэлний кабинет",
      accusedRole: "teacher",
      accusedDescription: "Орос хэлний цагийн багш; сургуулийн захирлын гэр бүлийн гишүүн",
    },
    assignAfterHours: 1.5,
    transitions: [
      { to: "under_review", afterHours: 2 },
      { to: "investigating", afterHours: 26, note: "Сургуулиас хараат бусаар газраас шууд шалгана." },
    ],
    protocolDoneAfterHours: [3, 4],
    evidence: [
      {
        kind: "photo",
        title: "Гэмтлийн зураг (гуя, шилбэ)",
        description: "Эх нь хэрэг болсон өдрийн орой авсан 4 зураг.",
        afterHours: 3.5,
        recordedBeforeHours: 22,
      },
      {
        kind: "medical_record",
        title: "Өрхийн эмчийн үзлэгийн хуудас",
        description: "Хөхөрсөн 2 голомт, зөөлөн эдийн гэмтэл.",
        afterHours: 5,
        recordedBeforeHours: 2,
      },
      {
        kind: "witness_statement",
        title: "Ангийн 2 сурагчийн мэдүүлэг",
        description: "Эцэг эхийн зөвшөөрөлтэйгөөр, нийгмийн ажилтны дэргэд авсан.",
        afterHours: 30,
        recordedBeforeHours: 1,
      },
    ],
    notes: [
      {
        afterHours: 2.2,
        text: "Таны мэдэгдлийг хүлээн авлаа. Хэргийг сургуулиас хараат бусаар Боловсролын газраас шууд шалгана.",
        isPublic: true,
      },
      {
        afterHours: 6,
        text: "Буруутгагдагч нь сургуулийн захирлын гэр бүлийн гишүүн тул сургуулийн ёс зүйн зөвлөлөөр шалгуулах боломжгүй. Захирлыг энэ хэргийн шийдвэрээс хөндийрүүлэв.",
        isPublic: false,
      },
      {
        afterHours: 50,
        text: "Багшийг шалгалт дуустал 6б ангид хичээл заалгахгүй байхыг сургуульд бичгээр мэдэгдсэн. Сургуулиас хариу ирээгүй тул тусгаарлах алхам баталгаажаагүй.",
        isPublic: false,
      },
    ],
  },
  {
    createdHoursAgo: 70,
    incidentDaysBefore: 2,
    source: "public",
    report: {
      title: "Ангийн хүүхдүүд байнга дээрэлхэж, юмыг минь нууж байна",
      description:
        "Сүүлийн 2 сар ангийн гурван хүүхэд намайг завсарлагаар түлхэж, цүнх, утсыг минь нууж, бусдын өмнө шоолж байна. Ангийн багшид хэлсэн ч 'өөрсдөө эвлэр' гэсэн. Сургууль руу явахаас айж байна.",
      category: "bullying",
      severity: "medium",
      reporterRole: "student",
      isAnonymous: true,
      reporterContact: null,
      victimRole: "student",
      schoolName: "Өглөөний од сургууль (Сонгинохайрхан дүүрэг)",
      grade: "7б",
      incidentLocation: "Анги, завсарлага",
      accusedRole: "student",
      accusedDescription: "Ангийн 3 сурагч",
    },
    assignAfterHours: 3,
    transitions: [{ to: "under_review", afterHours: 20 }],
    protocolDoneAfterHours: [],
    evidence: [],
    notes: [
      {
        afterHours: 21,
        text: "Мэдэгдлийг хянаж, ангийн багш болон сургуулийн нийгмийн ажилтантай уулзалт товлосон.",
        isPublic: true,
      },
      {
        afterHours: 22,
        text: "Нийгмийн ажилтантай утсаар ярьсан: энэ ангид дээрэлхэлтийн өмнөх 2 тэмдэглэл байгаа.",
        isPublic: false,
      },
    ],
  },
  {
    createdHoursAgo: 240,
    incidentDaysBefore: 30,
    source: "public",
    report: {
      title: "Гурван сарын илүү цагийн хөлс олгоогүй",
      description:
        "2026 оны 6–8 сард хичээлийн хуваарийн дагуу долоо хоногт 6 цаг илүү цаг заасан боловч хөлсийг олгоогүй. Захиргаанд 2 удаа бичгээр хандсан, хариу өгөөгүй. Цагийн бүртгэл, хуваарийн хуулбар надад байгаа.",
      category: "teacher_labor_rights",
      severity: "high",
      reporterRole: "teacher",
      isAnonymous: false,
      reporterContact: "teacher.demo@example.com",
      victimRole: "teacher",
      schoolName: "Хөх тэнгэр цогцолбор сургууль (Чингэлтэй дүүрэг)",
      grade: null,
      incidentLocation: null,
      accusedRole: "administrator",
      accusedDescription: "Сургуулийн захиргаа, нягтлан бодогч",
    },
    assignAfterHours: 4,
    transitions: [
      {
        to: "under_review",
        afterHours: 20,
        note: "Цагийн бүртгэл, цалингийн хуудсыг сургуулиас албан бичгээр гаргуулж авна.",
      },
      { to: "investigating", afterHours: 30 },
      { to: "resolved", afterHours: 68 },
    ],
    protocolDoneAfterHours: [],
    evidence: [
      {
        kind: "document",
        title: "Хичээлийн хуваарь ба цагийн бүртгэлийн хуулбар",
        afterHours: 25,
        recordedBeforeHours: 0.5,
      },
      {
        kind: "document",
        title: "Илүү цагийн хөлс шилжүүлсэн төлбөрийн баримт",
        afterHours: 67,
        recordedBeforeHours: 1,
      },
    ],
    notes: [],
    resolution:
      "Сургуулийн захиргаа илүү цагийн хөлсийг 10-р сарын цалинтай хамт бүрэн олгож, төлбөрийн баримтыг газарт ирүүлэв. Цаашид илүү цагийн бүртгэлийг сар бүр хянана.",
  },
  {
    createdHoursAgo: 600,
    incidentDaysBefore: 5,
    source: "public",
    report: {
      title: "Гомдол гаргасны дараа хүүхдийн улирлын дүнг бууруулсан",
      description:
        "Ангийн хурал дээр багшийн харилцааны талаар санал хэлсний дараа хүүхдийн монгол хэлний улирлын дүнг B-ээс D болгосон. Шалгалт, даалгаврын оноог харуулахыг хүссэн ч өгөөгүй.",
      category: "unfair_assessment",
      severity: "low",
      reporterRole: "parent",
      isAnonymous: false,
      reporterContact: "parent.demo@example.com",
      victimRole: "student",
      schoolName: "Алтан гадас ЕБС (Хан-Уул дүүрэг)",
      grade: "9а",
      incidentLocation: null,
      accusedRole: "teacher",
      accusedDescription: "Монгол хэлний багш",
    },
    assignAfterHours: 10,
    transitions: [
      { to: "under_review", afterHours: 30 },
      { to: "investigating", afterHours: 120 },
      { to: "resolved", afterHours: 350 },
    ],
    protocolDoneAfterHours: [],
    evidence: [
      {
        kind: "document",
        title: "Улирлын дүнгийн хуудас (засварын өмнө, дараа)",
        afterHours: 31,
        recordedBeforeHours: 1,
      },
    ],
    notes: [
      {
        afterHours: 121,
        text: "Сургуулийн арга зүйн нэгдлээс шалгалтын материалыг дахин хянуулахаар хүсэлт явуулсан.",
        isPublic: true,
      },
    ],
    resolution:
      "Шалгалтын материал, онооны бүртгэлийг арга зүйн нэгдлээр дахин хянуулж, дүнг B болгож засварлав. Багшид үнэлгээний журам зөрчсөн тул сануулга өгөв.",
  },
  {
    createdHoursAgo: 290,
    incidentDaysBefore: 3,
    source: "public",
    report: {
      title: "Биеийн тамирын багш зүй бусаар хүрч, тааламжгүй үг хэлдэг",
      description:
        "Биеийн тамирын багш охидыг хувцас солих үед өрөөнд орж ирж, биеийн талаар тааламжгүй үг хэлдэг. Надад 2 удаа зүй бусаар хүрсэн. Бусад охид ч адилхан гэж хэлдэг ч айгаад хэлж чадахгүй байна.",
      category: "sexual_harassment",
      severity: "critical",
      reporterRole: "student",
      isAnonymous: true,
      reporterContact: null,
      victimRole: "student",
      schoolName: "Мөнх-Ирээдүй сургууль (Сүхбаатар дүүрэг)",
      grade: "10в",
      incidentLocation: "Биеийн тамирын заал, хувцас солих өрөө",
      accusedRole: "teacher",
      accusedDescription: "Биеийн тамирын багш",
    },
    assignAfterHours: 1,
    transitions: [
      { to: "under_review", afterHours: 1.5 },
      { to: "investigating", afterHours: 4 },
      { to: "resolved", afterHours: 20 },
    ],
    protocolDoneAfterHours: [2, 3, 5, 6],
    evidence: [
      {
        kind: "document",
        title: "Цагдаагийн хэлтэст хүргүүлсэн албан бичиг",
        afterHours: 7,
        recordedBeforeHours: 0.5,
      },
      {
        kind: "witness_statement",
        title: "Ангийн 3 охины бичгээр өгсөн мэдүүлэг",
        description: "Нэрийг нууцалж, хувийн хэрэгт хадгалсан.",
        afterHours: 8,
        recordedBeforeHours: 1,
      },
    ],
    notes: [
      {
        afterHours: 5.5,
        text: "Багшийг шалгалт дуустал хичээлээс түр чөлөөлөхийг сургуульд үүрэг болгов. Сургууль биелэлтээ ирүүлсэн.",
        isPublic: false,
      },
      {
        afterHours: 6.5,
        text: "Хэргийг эрх бүхий байгууллагад шилжүүлсэн. Таны нэр нууц хэвээр байна.",
        isPublic: true,
      },
    ],
    resolution:
      "Багшийг ажлаас түр чөлөөлж, хэргийг цагдаагийн байгууллагад шилжүүлэв. Хохирогч сурагчдад сэтгэл зүйчийн тусламж үзүүлж, сургуулийн бүх ажилтанд бэлгийн дарамтын талаарх сургалт хийхийг даалгав.",
  },
  {
    createdHoursAgo: 96,
    incidentDaysBefore: 2,
    source: "public",
    report: {
      title: "Хөгжлийн бэрхшээлтэй хүүхдийг ангид бүртгэхээс татгалзсан",
      description:
        "Хүүхэд маань сонсголын бэрхшээлтэй. Сургалтын менежер 'манай сургууль тохирох нөхцөлгүй' гээд 1-р ангид бүртгэхээс татгалзсан. Бичгээр шийдвэр өгөөгүй. Хамгийн ойр өөр сургууль 8 км зайтай.",
      category: "discrimination",
      severity: "high",
      reporterRole: "parent",
      isAnonymous: false,
      reporterContact: "mother.demo@example.com",
      victimRole: "student",
      schoolName: "Цэнхэр нуур ЕБС (Налайх дүүрэг)",
      grade: "1а",
      incidentLocation: null,
      accusedRole: "administrator",
      accusedDescription: "Сургуулийн сургалтын менежер",
    },
    assignAfterHours: null,
    transitions: [],
    protocolDoneAfterHours: [],
    evidence: [],
    notes: [],
  },
  {
    createdHoursAgo: 480,
    incidentDaysBefore: 1,
    source: "staff",
    report: {
      title: "Хүүхдийн дүн, зургийг эцэг эхийн нээлттэй группт нийтэлсэн",
      description:
        "Эцэг эх газрын утсаар мэдэгдсэн: ангийн багш улирлын шалгалтад муу дүн авсан 5 хүүхдийн нэр, дүн, зургийг 'анхаарах хүүхдүүд' гэж 120 гишүүнтэй нээлттэй группт нийтэлсэн. Хүүхэд нь ангидаа шоолуулж байна.",
      category: "privacy_breach",
      severity: "medium",
      reporterRole: "parent",
      isAnonymous: false,
      reporterContact: "parent2.demo@example.com",
      victimRole: "student",
      schoolName: "Нарлаг ЕБС (Баянзүрх дүүрэг)",
      grade: "4а",
      incidentLocation: "Эцэг эхийн цахим групп",
      accusedRole: "teacher",
      accusedDescription: "Ангийн багш",
    },
    assignAfterHours: 1,
    transitions: [
      { to: "under_review", afterHours: 3 },
      { to: "investigating", afterHours: 24 },
      { to: "resolved", afterHours: 100 },
    ],
    protocolDoneAfterHours: [],
    evidence: [
      {
        kind: "photo",
        title: "Нийтлэлийн дэлгэцийн зураг",
        description: "Нийтлэл устгагдахаас өмнө эцэг эхийн авсан зураг.",
        afterHours: 1.2,
        recordedBeforeHours: 2,
      },
    ],
    notes: [],
    resolution:
      "Нийтлэлийг устгуулж, багшид Хүний хувийн мэдээлэл хамгаалах тухай хуулийн дагуу сануулга өгөв. Ангийн эцэг эхчүүдэд хүүхдийн хувийн мэдээллийн талаар мэдээлэл хийж, сургуулийн дотоод журамд өөрчлөлт оруулахыг даалгав.",
  },
  {
    createdHoursAgo: 50,
    incidentDaysBefore: 1,
    source: "public",
    report: {
      title: "Багш ангийн өмнө байнга доромжилж, 'тэнэг' гэж дууддаг",
      description:
        "Математикийн багш бодлого буруу бодсон хүүхдүүдийг самбарын өмнө зогсоож, 'тэнэг', 'юу ч болохгүй' гэж бүх ангийн өмнө загнадаг. Хэд хэдэн хүүхэд хичээлд орохоос айдаг болсон.",
      category: "psychological_violence",
      severity: "high",
      reporterRole: "student",
      isAnonymous: true,
      reporterContact: null,
      victimRole: "student",
      schoolName: "Хөх тэнгэр цогцолбор сургууль (Чингэлтэй дүүрэг)",
      grade: "8б",
      incidentLocation: "Математикийн хичээл",
      accusedRole: "teacher",
      accusedDescription: "Математикийн багш",
    },
    assignAfterHours: 2,
    transitions: [
      { to: "under_review", afterHours: 4 },
      { to: "investigating", afterHours: 30 },
    ],
    protocolDoneAfterHours: [],
    evidence: [
      {
        kind: "witness_statement",
        title: "Ангийн 4 сурагчийн мэдүүлэг",
        description: "Нэрээ нууцлах нөхцөлтэйгөөр авсан.",
        afterHours: 32,
        recordedBeforeHours: 1,
      },
    ],
    notes: [
      {
        afterHours: 31,
        text: "Шалгалт эхэлсэн. Ангийн сурагчдаас нэрээ нууцлан мэдүүлэг авч байна.",
        isPublic: true,
      },
    ],
  },
  {
    createdHoursAgo: 190,
    incidentDaysBefore: 14,
    source: "public",
    report: {
      title: "Дээрэлхэлтийн талаар 3 удаа мэдэгдсэн ч удирдлага арга хэмжээ аваагүй",
      description:
        "Хүүхэд маань ангидаа дээрэлхүүлж байгаа талаар 9-р сараас хойш ангийн багш, сургалтын менежер, захиралд 3 удаа хандсан. Ямар ч хариу, арга хэмжээ аваагүй. Сүүлд хүүхэд маань сургууль дээр гэмтэл авсан.",
      category: "neglect_of_duty",
      severity: "high",
      reporterRole: "parent",
      isAnonymous: false,
      reporterContact: "father.demo@example.com",
      victimRole: "student",
      schoolName: "Өглөөний од сургууль (Сонгинохайрхан дүүрэг)",
      grade: "5в",
      incidentLocation: null,
      accusedRole: "administrator",
      accusedDescription: "Сургуулийн захирал, сургалтын менежер",
    },
    assignAfterHours: 6,
    transitions: [
      { to: "under_review", afterHours: 8 },
      { to: "investigating", afterHours: 60 },
    ],
    protocolDoneAfterHours: [],
    evidence: [
      {
        kind: "document",
        title: "Эцэг эхийн өмнө нь сургуульд өгсөн 3 өргөдлийн хуулбар",
        afterHours: 9,
        recordedBeforeHours: 1,
      },
    ],
    notes: [
      {
        afterHours: 61,
        text: "Захиралд албан бичиг хүргүүлж, 3 хоногт багтаан тайлбар ирүүлэхийг шаардсан. Хариу ирээгүй.",
        isPublic: false,
      },
    ],
  },
  {
    createdHoursAgo: 7,
    incidentDaysBefore: 0,
    source: "public",
    report: {
      title: "Ангийн чат группт зургийг минь засварлаж шоолж байна",
      description:
        "Ангийнхан минь миний зургийг засварлаж, муухай хоч өгөөд ангийн чат группт тараасан. Одоо өөр ангийнхан ч харсан. Сургуульд очихоос ичиж байна.",
      category: "bullying",
      severity: "high",
      reporterRole: "student",
      isAnonymous: true,
      reporterContact: null,
      victimRole: "student",
      schoolName: "Алтан гадас ЕБС (Хан-Уул дүүрэг)",
      grade: "9б",
      incidentLocation: "Ангийн чат групп",
      accusedRole: "student",
      accusedDescription: "Ангийн хэсэг сурагч",
    },
    assignAfterHours: null,
    transitions: [],
    protocolDoneAfterHours: [],
    evidence: [],
    notes: [],
  },
  {
    createdHoursAgo: 360,
    incidentDaysBefore: 10,
    source: "public",
    report: {
      title: "Амралтын өдрүүдэд цалингүйгээр арга хэмжээнд ажиллуулдаг",
      description:
        "Сүүлийн 2 сард 4 удаа бямба гарагт сургуулийн арга хэмжээ, бүртгэлийн ажилд заавал ирүүлсэн. Нөхөж амраах, цалин олгох талаар хариу өгөөгүй. Ирэхгүй бол 'үнэлгээнд нөлөөлнө' гэсэн.",
      category: "teacher_labor_rights",
      severity: "medium",
      reporterRole: "teacher",
      isAnonymous: false,
      reporterContact: "teacher2.demo@example.com",
      victimRole: "teacher",
      schoolName: "Мөнх-Ирээдүй сургууль (Сүхбаатар дүүрэг)",
      grade: null,
      incidentLocation: null,
      accusedRole: "administrator",
      accusedDescription: "Сургуулийн захиргаа",
    },
    assignAfterHours: 5,
    transitions: [
      { to: "under_review", afterHours: 24 },
      {
        to: "dismissed",
        afterHours: 60,
        note: "Цалин, нөхөн амралтын маргааныг Хөдөлмөрийн маргаан таслах комисс шийдвэрлэх тул эрх зүйн чиглэл өгч, мэдэгдэгчид бичгээр хариулав.",
      },
    ],
    protocolDoneAfterHours: [],
    evidence: [],
    notes: [
      {
        afterHours: 61,
        text: "Таны хүсэлтийг Хөдөлмөрийн маргаан таслах комисст хандах чиглэлтэйгээр хаалаа. 'Үнэлгээнд нөлөөлнө' гэсэн дарамтын талаар тусад нь мэдэгдэж болно.",
        isPublic: true,
      },
    ],
  },
  {
    createdHoursAgo: 720,
    incidentDaysBefore: 0,
    source: "staff",
    report: {
      title: "Завсарлагаар ахлах ангийн сурагч 6-р ангийн хүүхдийг цохиж гэмтээсэн",
      description:
        "Сургуулийн сэтгэл зүйчийн мэдээлснээр завсарлагаар 9-р ангийн сурагч 6-р ангийн сурагчийг цохиж, хамар нь гэмтсэн. Хохирогчийг эмнэлэгт хүргэсэн. Хоёр хүүхдийн эцэг эхэд мэдэгдсэн.",
      category: "physical_violence",
      severity: "high",
      reporterRole: "staff",
      isAnonymous: false,
      reporterContact: "psychologist.demo@example.com",
      victimRole: "student",
      schoolName: "Цэнхэр нуур ЕБС (Налайх дүүрэг)",
      grade: "6а",
      incidentLocation: "Коридор, завсарлага",
      accusedRole: "student",
      accusedDescription: "9-р ангийн сурагч",
    },
    assignAfterHours: 0.5,
    transitions: [
      { to: "under_review", afterHours: 1 },
      { to: "investigating", afterHours: 3 },
      { to: "resolved", afterHours: 60 },
    ],
    protocolDoneAfterHours: [1, 1.5, 2, 2.5],
    evidence: [
      {
        kind: "medical_record",
        title: "Эмнэлгийн яаралтай тусламжийн үзлэгийн дүгнэлт",
        afterHours: 4,
        recordedBeforeHours: 2,
      },
      {
        kind: "photo",
        title: "Коридорын камерын бичлэгээс авсан зураг",
        afterHours: 5,
        recordedBeforeHours: 4.5,
      },
    ],
    notes: [],
    resolution:
      "Хохирогч эмчилгээ хийлгэж, хичээлдээ эргэн орсон. Хоёр талын эцэг эх, нийгмийн ажилтны оролцоотой уулзалт хийж, үйлдэл гаргасан сурагчид сэтгэл зүйн зөвлөгөө, хяналтын төлөвлөгөө гаргав. Завсарлагын жижүүрийн хуваарийг шинэчлэв.",
  },
  {
    createdHoursAgo: 120,
    incidentDaysBefore: 7,
    source: "public",
    report: {
      title: "'Ангийн сан' нэрээр мөнгө заавал төлүүлж, төлөөгүй хүүхдийг ялгадаг",
      description:
        "Ангийн багш сар бүр 20,000₮ 'ангийн сан' заавал төлөхийг шаарддаг. Төлөөгүй хүүхдүүдийн нэрийг ангид чангаар уншиж, арга хэмжээнд оролцуулдаггүй. Мөнгөний зарцуулалтын тайлан гаргадаггүй.",
      category: "other",
      severity: "medium",
      reporterRole: "parent",
      isAnonymous: true,
      reporterContact: null,
      victimRole: "student",
      schoolName: "Нарлаг ЕБС (Баянзүрх дүүрэг)",
      grade: "3б",
      incidentLocation: null,
      accusedRole: "teacher",
      accusedDescription: "Ангийн багш",
    },
    assignAfterHours: 20,
    transitions: [{ to: "under_review", afterHours: 30 }],
    protocolDoneAfterHours: [],
    evidence: [],
    notes: [
      {
        afterHours: 31,
        text: "Сургуулиас ангийн сангийн журам, зарцуулалтын тайланг гаргуулахаар албан бичиг явуулсан.",
        isPublic: false,
      },
    ],
  },
  {
    createdHoursAgo: 26,
    incidentDaysBefore: 1,
    source: "public",
    report: {
      title: "Сурагчийн эцэг ангид орж ирж багшийг доромжилж, заналхийлсэн",
      description:
        "Хүүхдийнхээ дүнд дургүйцсэн эцэг хичээлийн үеэр ангид орж ирж, сурагчдын өмнө намайг доромжилж, 'ажлаас чинь халуулна' гэж заналхийлсэн. Сургуулийн харуул саатуулаагүй. Үүнээс хойш ажилдаа ирэхээс айж байна.",
      category: "psychological_violence",
      severity: "high",
      reporterRole: "teacher",
      isAnonymous: false,
      reporterContact: "teacher3.demo@example.com",
      victimRole: "teacher",
      schoolName: "Хөх тэнгэр цогцолбор сургууль (Чингэлтэй дүүрэг)",
      grade: null,
      incidentLocation: "Анги, хичээлийн үеэр",
      accusedRole: "other",
      accusedDescription: "Сурагчийн эцэг",
    },
    assignAfterHours: 3,
    transitions: [],
    protocolDoneAfterHours: [],
    evidence: [],
    notes: [
      {
        afterHours: 3.5,
        text: "Мэдэгдлийг хүлээн авлаа. Хариуцагч таньтай удахгүй холбогдоно.",
        isPublic: true,
      },
    ],
  },
];

const at = (base: Date, hours: number): Date => new Date(base.getTime() + hours * HOUR_MS);

const utcMidnight = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const CLOSED: readonly CaseStatus[] = ["resolved", "dismissed"];

const buildCase = (spec: Spec, now: Date, actorId: string, sla: SlaHours): DemoCase => {
  const createdAt = at(now, -spec.createdHoursAgo);
  const incidentDate = utcMidnight(new Date(createdAt.getTime() - spec.incidentDaysBefore * DAY_MS));
  const events: DemoEvent[] = [];

  events.push({
    type: "created",
    message: "Мэдэгдэл бүртгэгдлээ",
    payload: { source: spec.source },
    actorId: spec.source === "staff" ? actorId : null,
    isPublic: true,
    createdAt,
  });

  const protocolSteps: ProtocolStep[] = requiresProtocol(spec.report.category)
    ? PROTOCOL_STEP_KEYS.map((key, index) => {
        const hours = spec.protocolDoneAfterHours[index];
        return hours === undefined
          ? { key, doneAt: null, doneBy: null }
          : { key, doneAt: at(createdAt, hours), doneBy: actorId };
      })
    : [];

  // The handler declares no conflict just before their first action.
  const actionHours = [
    ...(spec.assignAfterHours === null ? [] : [spec.assignAfterHours]),
    ...spec.transitions.map((transition) => transition.afterHours),
    ...spec.protocolDoneAfterHours,
    ...spec.evidence.map((item) => item.afterHours),
    ...spec.notes.map((note) => note.afterHours),
  ];
  const conflictDeclarations: ConflictDeclaration[] = [];
  if (actionHours.length) {
    const declaredAt = at(createdAt, Math.max(0, Math.min(...actionHours) - 0.25));
    conflictDeclarations.push({ userId: actorId, hasConflict: false, note: null, declaredAt });
    events.push({
      type: "conflict_declared",
      message: "Ашиг сонирхлын зөрчилгүй гэж мэдүүлэв",
      payload: { hasConflict: false, note: null },
      actorId,
      isPublic: false,
      createdAt: declaredAt,
    });
  }

  if (spec.assignAfterHours !== null) {
    events.push({
      type: "assigned",
      message: "Хариуцагч томилогдлоо",
      payload: { assigneeId: actorId, previousAssigneeId: null },
      actorId,
      isPublic: true,
      createdAt: at(createdAt, spec.assignAfterHours),
    });
  }

  let status: CaseStatus = "new";
  let closedAt: Date | null = null;
  for (const transition of spec.transitions) {
    const when = at(createdAt, transition.afterHours);
    events.push({
      type: "status_changed",
      message: `Төлөв: ${STATUS_LABELS_MN[transition.to]}`,
      payload: { from: status, to: transition.to, note: transition.note ?? null },
      actorId,
      isPublic: true,
      createdAt: when,
    });
    status = transition.to;
    closedAt = CLOSED.includes(status) ? when : null;
  }

  protocolSteps.forEach((step) => {
    if (step.doneAt) {
      events.push({
        type: "protocol_step",
        message: `Протокол: ${PROTOCOL_STEP_LABELS_MN[step.key]} — гүйцэтгэсэн`,
        payload: { key: step.key },
        actorId,
        isPublic: true,
        createdAt: step.doneAt,
      });
    }
  });

  const evidence: DemoEvidence[] = spec.evidence.map((item) => {
    const created = at(createdAt, item.afterHours);
    events.push({
      type: "evidence_added",
      message: `Нотлох баримт нэмэгдлээ: ${EVIDENCE_KIND_LABELS_MN[item.kind]}`,
      payload: { kind: item.kind },
      actorId,
      isPublic: false,
      createdAt: created,
    });
    return {
      kind: item.kind,
      title: item.title,
      description: item.description ?? null,
      fileUrl: null,
      fileName: null,
      recordedAt: at(created, -item.recordedBeforeHours),
      addedBy: actorId,
      createdAt: created,
    };
  });

  for (const note of spec.notes) {
    events.push({
      type: "note",
      message: note.text,
      payload: null,
      actorId,
      isPublic: note.isPublic,
      createdAt: at(createdAt, note.afterHours),
    });
  }

  // Replay the lazy escalation: an overdue open case is escalated the next
  // time anyone looks (simulated as one hour after its deadline), at most to
  // level 2, and never after it was closed.
  let dueAt = computeDueAt(createdAt, spec.report.severity, sla);
  let escalationLevel = 0;
  let escalatedAt: Date | null = null;
  const limit = closedAt ?? now;
  while (escalationLevel < MAX_ESCALATION_LEVEL && dueAt.getTime() < limit.getTime()) {
    const when = new Date(Math.min(dueAt.getTime() + HOUR_MS, now.getTime()));
    if (closedAt && when.getTime() >= closedAt.getTime()) {
      break;
    }
    escalationLevel += 1;
    escalatedAt = when;
    const previousDueAt = dueAt;
    dueAt = at(when, ESCALATION_GRACE_HOURS);
    events.push({
      type: "escalated",
      message: `Хугацаа хэтэрсэн тул ${escalationLevel}-р шатанд шилжүүлэв`,
      payload: { level: escalationLevel, previousDueAt, dueAt },
      actorId: null,
      isPublic: true,
      createdAt: when,
    });
  }

  events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const updatedAt = new Date(Math.max(...events.map((event) => event.createdAt.getTime())));

  return {
    featured: Boolean(spec.featured),
    report: { ...spec.report, incidentDate },
    source: spec.source,
    status,
    assigneeId: spec.assignAfterHours === null ? null : actorId,
    createdAt,
    updatedAt,
    dueAt,
    escalationLevel,
    escalatedAt,
    resolvedAt: status === "resolved" ? closedAt : null,
    resolution: status === "resolved" ? (spec.resolution ?? null) : null,
    conflictDeclarations,
    protocolSteps,
    events,
    evidence,
  };
};

export const buildDemoCases = (now: Date, actorId: string, sla: SlaHours): DemoCase[] =>
  SPECS.map((spec) => buildCase(spec, now, actorId, sla)).sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
