import { cn } from "@/lib/utils/cn";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function Textarea({ label, className, error, id, ...props }: TextareaProps) {
  const textareaId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="space-y-4" htmlFor={textareaId}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        id={textareaId}
        className={cn(
          "min-h-[110px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200",
          error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : "",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
