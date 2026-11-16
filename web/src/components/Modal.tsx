import { useEffect, type ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

/** Centered dialog on desktop, bottom sheet on phones. Closes on Escape or backdrop click. */
export function Modal({ title, subtitle, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-md max-h-[75vh] flex flex-col bg-slate-900 border border-slate-800 rounded-t-3xl md:rounded-2xl p-5"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <h2 className="text-white font-semibold text-lg truncate">{title}</h2>
            {subtitle && <p className="text-slate-400 text-sm">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-200 text-xl leading-none">
            ×
          </button>
        </div>
        <div className="overflow-y-auto min-h-0">{children}</div>
      </div>
    </div>
  );
}
