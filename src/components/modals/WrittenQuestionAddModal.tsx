import { useMemo, useState } from "react";
import {
  PenLine,
  CheckSquare,
  ListChecks,
  FileEdit,
  Link2,
  ArrowUpDown,
  Table2,
  GitBranch,
  Tag,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useEditorStore,
  type WrittenQuestionTypeId,
  type WrittenTemplateItem,
} from "../../store/editorStore";

type QuestionTypeCard = {
  id: WrittenQuestionTypeId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconClass: string;
};

const QUESTION_TYPES: QuestionTypeCard[] = [
  {
    id: "open-ended",
    title: "Açık Uçlu",
    subtitle: "Soru metni + boş cevap alanı",
    icon: PenLine,
    iconClass: "text-sky-600",
  },
  {
    id: "true-false",
    title: "Doğru / Yanlış",
    subtitle: "İfadeler + D/Y işaretleme",
    icon: CheckSquare,
    iconClass: "text-emerald-600",
  },
  {
    id: "multiple-choice",
    title: "Çoktan Seçmeli",
    subtitle: "Soru kökü + A/B/C/D/E şıkları",
    icon: ListChecks,
    iconClass: "text-violet-600",
  },
  {
    id: "fill-blank",
    title: "Boşluk Doldurma",
    subtitle: "Metin içinde boşluklar",
    icon: FileEdit,
    iconClass: "text-orange-500",
  },
  {
    id: "matching",
    title: "Eşleştirme",
    subtitle: "İki sütun, öğeleri eşleştir",
    icon: Link2,
    iconClass: "text-pink-500",
  },
  {
    id: "ordering",
    title: "Sıralama",
    subtitle: "Öğeleri doğru sıraya koy",
    icon: ArrowUpDown,
    iconClass: "text-teal-600",
  },
  {
    id: "table-box",
    title: "Tablo / Kutucuk",
    subtitle: "Tablo hücreleri doldurma",
    icon: Table2,
    iconClass: "text-indigo-600",
  },
  {
    id: "grouping",
    title: "Gruplama",
    subtitle: "Öğeleri kategorilere ayır",
    icon: GitBranch,
    iconClass: "text-sky-500",
  },
  {
    id: "image-label",
    title: "Resim Etiketleme",
    subtitle: "Görsel üzerine boşluk koy",
    icon: Tag,
    iconClass: "text-fuchsia-500",
  },
  {
    id: "reading",
    title: "Okuduğunu Anlama",
    subtitle: "Metin parçası + alt sorular",
    icon: BookOpen,
    iconClass: "text-orange-600",
  },
];

type TabId = "types" | "templates";

type Props = {
  onClose: () => void;
  templates?: WrittenTemplateItem[];
  onSelectType?: (typeId: WrittenQuestionTypeId) => void;
  onSelectTemplate?: (templateId: string) => void;
};

export default function WrittenQuestionAddModal({
  onClose,
  templates,
  onSelectType,
  onSelectTemplate,
}: Props) {
  const storeTemplates = useEditorStore((s) => s.writtenTemplates);
  const setPendingWrittenQuestionType = useEditorStore((s) => s.setPendingWrittenQuestionType);
  const addWrittenQuestion = useEditorStore((s) => s.addWrittenQuestion);
  const list = templates ?? storeTemplates;
  const [tab, setTab] = useState<TabId>("types");

  const templateCount = list.length;

  const handleType = (id: WrittenQuestionTypeId) => {
    if (id === "open-ended") {
      addWrittenQuestion(id);
      onSelectType?.(id);
      onClose();
      return;
    }
    setPendingWrittenQuestionType(id);
    onSelectType?.(id);
    onClose();
  };

  const handleTemplate = (id: string) => {
    onSelectTemplate?.(id);
    onClose();
  };

  const heading = useMemo(
    () =>
      tab === "types"
        ? "Oluşturmak istediğiniz soru tipini seçin"
        : "Sınıf ve derse göre hazır yazılı şablonu seçin",
    [tab],
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="written-add-heading"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-100 p-4 pb-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTab("types")}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                tab === "types"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-transparent text-slate-600 hover:text-slate-800"
              }`}
            >
              Soru Tipi Ekle
            </button>
            <button
              type="button"
              onClick={() => setTab("templates")}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                tab === "templates"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-transparent text-slate-600 hover:text-slate-800"
              }`}
            >
              Hazır Şablon
            </button>
          </div>
          <p id="written-add-heading" className="mt-3 text-sm text-slate-500">
            {heading}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {tab === "types" ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {QUESTION_TYPES.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleType(item.id)}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition hover:border-blue-300 hover:bg-sky-50/60 hover:shadow-sm"
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 ${item.iconClass}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-800">{item.title}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                        {item.subtitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : templateCount === 0 ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">Henüz hazır şablon yok</p>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
                Yazılıyı hazırladıktan sonra Kaydet ile şablon oluşturduğunuzda burada
                listelenir.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {list.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleTemplate(tpl.id)}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition hover:border-blue-300 hover:bg-sky-50/60"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-blue-700">{tpl.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{tpl.description}</span>
                    <span className="mt-2 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[0.65rem] font-semibold text-sky-700">
                      {tpl.badge}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
