import { Progress } from "@/components/ui/progress";

interface StepHeaderProps {
  title: string;
  subtitle: string;
  step: number;
  total: number;
}

export const StepHeader = ({ title, subtitle, step, total }: StepHeaderProps) => {
  const progress = Math.round((step / total) * 100);
  return (
    <div className="mb-4 sm:mb-6">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">Step {step} of {total}</div>
      <h1 className="mt-2 text-xl font-semibold sm:text-2xl">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <Progress className="mt-4" value={progress} />
    </div>
  );
};

