import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Table } from '@tanstack/react-table';
import type { SaleRow } from '../types';

import { flexRender } from '@tanstack/react-table';

function OrderTable({ table }: { table: Table<SaleRow> }) {
  const rows = table.getRowModel().rows;
  const hasRows = rows.length > 0;

  return (
    <div className="relative w-full h-[400px] overflow-auto rounded-lg border border-border shadow-sm custom-scrollbar">
      <table className="w-full text-sm text-left">
        <TableHeader className="sticky top-0 z-20 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id} className="border-b border-border hover:bg-transparent">
              {headerGroup.headers.map(header => (
                <TableHead
                  key={header.id}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="bg-card divide-y divide-slate-700">
          {hasRows ? (
            rows.map(row => (
              <TableRow
                key={row.id}
                className="hover:bg-secondary/50 transition-colors border-border"
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell
                    key={cell.id}
                    className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getAllColumns().length}
                className="px-4 py-4 text-center text-sm text-muted-foreground"
              >
                No Orders available.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter className="sticky bottom-0 z-20 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TableRow className="border-t border-border hover:bg-transparent">
            <TableCell
              colSpan={4}
              className="px-4 py-4 text-left text-sm font-bold text-foreground"
            >
              Total
            </TableCell>
            <TableCell className="px-4 py-4 text-right text-sm font-bold text-foreground">
              {rows.reduce((acc, row) => acc + (row.original.quantity || 0), 0)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </table>
    </div>
  );
}

export default OrderTable;
