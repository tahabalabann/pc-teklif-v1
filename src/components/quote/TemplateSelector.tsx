import type { QuoteTemplate } from "../../types/quote";
import { Card } from "../ui/Card";

interface TemplateSelectorProps {
  templates: QuoteTemplate[];
  onApply: (templateId: string) => void;
}

export function TemplateSelector({ templates, onApply }: TemplateSelectorProps) {
  return (
    <Card className="p-5 print:hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">{"Haz\u0131r Sistem \u015eablonlar\u0131"}</h2>
          <p className="mt-1 text-sm text-ink-600">
            {"Tek t\u0131kla stok sistem y\u00fckleyin, sonra sat\u0131r baz\u0131nda \u00f6zelle\u015ftirin."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {templates.map((template) => (
          <button
            key={template.id}
            className="rounded-2xl border border-ink-200 bg-ink-50/80 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"
            onClick={() => onApply(template.id)}
            type="button"
          >
            <p className="text-sm font-semibold text-brand-600">{template.name}</p>
            <p className="mt-2 text-sm text-ink-700">{template.description}</p>
          </button>
        ))}
      </div>
    </Card>
  );
}
