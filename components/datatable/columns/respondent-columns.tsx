// components/table/respondent-columns.tsx
import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, Trash2, List } from "lucide-react";
import Link from "next/link";
import { formatNumber } from "@/utils/formatCurrency";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface DynamicColumn {
  id: string;
  label: string;
  key: string;
}

type GetColumnsParams = {
  dynamicColumns: DynamicColumn[];
  visibleColumns: Record<string, boolean>;
  getAnswerForQuestion: (response: any, questionId: string) => string | React.JSX.Element;
  onDelete?: (responseId: string) => void; // optional handler
};

export const getRespondentsColumns = ({
  dynamicColumns,
  visibleColumns,
  getAnswerForQuestion,
  onDelete
}: GetColumnsParams): ColumnDef<any>[] => {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={value => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      header: "No.",
      cell: ({ row }) => row.index + 1
    },
    {
      accessorKey: "user_email",
      header: "Respondent",
      cell: ({ row }) => {
        const email = row.original.user_email || "Anonymous";
        const formId = row.original.form_id;
        const id = row.original.id;

        return (
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
              {email.charAt(0).toUpperCase()}
            </div>
            <Link href={`/forms/d/${formId}/r/${id}`}>
              <div className="ml-3 text-blue-700 dark:text-white">{email}</div>
            </Link>
          </div>
        );
      }
    },
    {
      accessorKey: "SubmittedAt",
      header: "Date Submitted",
      cell: ({ row }) => {
        const date = new Date(row.original.SubmittedAt);
        return (
          <div>
            <div>{date.toLocaleDateString()}</div>
            <div className="text-sm text-muted-foreground">{date.toLocaleTimeString()}</div>
          </div>
        );
      }
    },
    {
      accessorKey: "score",
      header: "Score",
      cell: ({ row }) => {
        const data = formatNumber(row.original.score);
        return (
          <div>
            <div className="text-sm">{data}</div>
          </div>
        );
      }
    },
    ...dynamicColumns
      .filter(col => visibleColumns[col.key])
      .map((col): ColumnDef<any> => ({
        accessorKey: col.key,
        header: col.label,
        cell: ({ row }) => getAnswerForQuestion(row.original, col.id)
      })),
    ...(visibleColumns["Actions"]
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: ({ row } : any) => {
              const formId = row.original.form_id;
              const responseId = row.original.id;
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <List className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/forms/d/${formId}/r/${responseId}`}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 flex items-center gap-2 cursor-pointer"
                      onClick={() => onDelete?.(responseId)} // <-- here
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
          }
        ]
      : [])
  ];
};
