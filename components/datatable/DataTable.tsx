import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  RowSelectionState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onSelectedRow?: (selected: TData[]) => void; 
}

export interface DataTableRef {
  clearSelection: () => void;
}

const DataTableInner = <TData, TValue>(
  { columns, data, onSelectedRow }: DataTableProps<TData, TValue>,
  ref: React.ForwardedRef<DataTableRef>
) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    enableRowSelection: true,
    getRowId: (row: any) => row?.id
  });

  React.useEffect(() => {
    if (onSelectedRow) {
      const selected = data.filter((row: any) => rowSelection[row.id]);
      onSelectedRow(selected);
    }
  }, [rowSelection, data]);

  // Expose the clearSelection function via ref
  React.useImperativeHandle(ref, () => ({
    clearSelection: () => {
      console.log("Clearing selection");
      setRowSelection({});
    },
  }));

  return (
    <div className="w-full">
      <div className="rounded-md border flex flex-col">
        {/* Scrollable Table Section */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-full">
            <Table className="min-w-full">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className="sticky top-0 z-10 bg-background"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={header.column.getCanSort()
                              ? "cursor-pointer select-none flex items-center gap-1"
                              : ""}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (
                              <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                            )}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Footer / Pagination */}
        <div className="p-4 border-t flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div>
            Showing <span className="font-medium">1</span> to{" "}
            <span className="font-medium">{data.length}</span> of{" "}
            <span className="font-medium">{data.length}</span> results
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Forward the ref to the inner component
export const DataTable = React.forwardRef(DataTableInner) as <TData, TValue>(
  props: DataTableProps<TData, TValue> & { ref?: React.ForwardedRef<DataTableRef> }
) => React.ReactElement;