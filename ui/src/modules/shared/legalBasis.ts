// Reference material shown next to a case: which Mongolian laws speak to the
// category. Names only, no article numbers — this is orientation for the
// handler, not legal advice, and the disclaimer says so on screen.

export type LegalReference = { law: string; right: string };

export const LEGAL_DISCLAIMER = "Лавлагаа, хууль зүйн зөвлөгөө биш";

const CHILD_RIGHTS: LegalReference = {
  law: "Хүүхдийн эрхийн тухай хууль (2016)",
  right: "Хүүхэд хүчирхийлэл, дарамт, үл хайхрах байдлаас ангид байх эрхтэй",
};
const CHILD_PROTECTION: LegalReference = {
  law: "Хүүхэд хамгааллын тухай хууль (2016)",
  right: "Хүчирхийлэлд өртсөн хүүхдийг хамгаалах, мэдээлэх үүрэг; мэдээлсэн хүнийг хамгаалах",
};
const EDUCATION: LegalReference = {
  law: "Боловсролын ерөнхий хууль (2023)",
  right: "Суралцагч аюулгүй, ялгаварлалгүй орчинд суралцах эрх; багшийн ёс зүй, сургуулийн удирдлагын үүрэг",
};
const ETHICS: LegalReference = {
  law: "Багш, ажилтны ёс зүйн дүрэм (БШУ-ын сайдын тушаал)",
  right: "Суралцагчид бие махбодийн, сэтгэл зүйн шийтгэл хэрэглэхийг хориглох; ёс зүйн зөвлөлийн журам",
};
const CRIMINAL: LegalReference = {
  law: "Эрүүгийн хууль (2015)",
  right: "Бие махбодид гэмтэл учруулах, бэлгийн хүчирхийлэл нь гэмт хэрэг",
};
const LABOR: LegalReference = {
  law: "Хөдөлмөрийн тухай хууль (2021)",
  right: "Цалин хөлс, ажлын цаг, амралт, дарамтгүй ажлын байр",
};
const TEACHER_SUPPORT: LegalReference = {
  law: "Багшийн хөгжлийг дэмжих тухай хууль (2018)",
  right: "Багшийн эрх, нийгмийн хамгаалал, мэргэжлийн нэр хүндийг хамгаалах",
};
const PRIVACY: LegalReference = {
  law: "Хүний хувийн мэдээлэл хамгаалах тухай хууль (2021)",
  right: "Хувийн мэдээллийг зөвшөөрөлгүй цуглуулах, задруулахыг хориглох",
};
const GENDER: LegalReference = {
  law: "Жендэрийн эрх тэгш байдлыг хангах тухай хууль (2011)",
  right: "Ажлын байр, боловсролын орчинд бэлгийн дарамтыг хориглох",
};
const CONSTITUTION: LegalReference = {
  law: "Монгол Улсын Үндсэн хууль",
  right: "Хүнийг үндэс, хэл, шашин, нийгмийн гарал зэргээр ялгаварлан гадуурхахыг хориглох",
};
const CIVIL_SERVICE: LegalReference = {
  law: "Төрийн албаны тухай хууль (2017)",
  right: "Албан тушаалтны үүргээ биелүүлээгүй, нуун дарагдуулсны хариуцлага",
};
const ASSESSMENT: LegalReference = {
  law: "Суралцагчийн үнэлгээний журам (БШУ-ын сайдын тушаал)",
  right: "Үнэлгээ шударга, ил тод, тайлбарлагдах боломжтой байх",
};

export const LEGAL_BASIS: Record<string, LegalReference[]> = {
  physical_violence: [CHILD_PROTECTION, CHILD_RIGHTS, CRIMINAL, EDUCATION, ETHICS],
  psychological_violence: [CHILD_RIGHTS, CHILD_PROTECTION, EDUCATION, ETHICS],
  bullying: [EDUCATION, CHILD_PROTECTION, CHILD_RIGHTS],
  sexual_harassment: [CRIMINAL, CHILD_PROTECTION, GENDER, ETHICS],
  discrimination: [CONSTITUTION, EDUCATION, CHILD_RIGHTS],
  neglect_of_duty: [CHILD_PROTECTION, EDUCATION, CIVIL_SERVICE, ETHICS],
  teacher_labor_rights: [LABOR, TEACHER_SUPPORT, EDUCATION],
  unfair_assessment: [EDUCATION, ASSESSMENT],
  privacy_breach: [PRIVACY, CHILD_RIGHTS],
  other: [EDUCATION, CHILD_RIGHTS, LABOR],
};
