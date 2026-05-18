import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ResponsiveTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => ReactNode;
  mobileLabel?: string;
};

type ResponsiveTableProps<T> = {
  columns: ResponsiveTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  className?: string;
};

export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No records yet.",
  className,
}: ResponsiveTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className={cn("hidden md:block rounded-2xl border border-border bg-card overflow-hidden", className)}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={cn("text-left px-4 py-3", col.className)}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-muted/30">
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3", col.className)}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={cn("md:hidden space-y-3", className)}>
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            className="rounded-2xl border border-border bg-card p-4 space-y-2"
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-muted-foreground shrink-0">{col.mobileLabel ?? col.header}</span>
                <span className={cn("text-right font-medium", col.className)}>{col.cell(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
