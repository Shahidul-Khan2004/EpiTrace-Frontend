import { cn } from "@/lib/utils/cn";

interface AlertProps {
  message: string;
  tone?: "error" | "success" | "info";
}

const toneClass: Record<NonNullable<AlertProps["tone"]>, string> = {
  error: "border-rose-200 bg-rose-50 text-rose-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-slate-200 bg-slate-50 text-slate-700",
};

export function Alert({ message, tone = "info" }: AlertProps) {
  return (
    <div className={cn("rounded-xl border px-3 py-2 text-sm", toneClass[tone])} role="alert">
      {message}
    </div>
  );
}
