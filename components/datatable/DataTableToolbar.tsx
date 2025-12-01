import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Search, Settings, ChevronDown, Filter, Trash2 } from "lucide-react";

interface TableToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onExport?: () => void;
  isExporting?: boolean;
  bulkDeleteButton?: boolean;
  onClickDeleteButton?: () => void;
  columnVisibility: Record<string, boolean>;
  toggleColumnVisibility: (key: string) => void;
  getColumnLabel: (key: string) => string;
  filters?: React.ReactNode;
}

export const DataTableToolbar: React.FC<TableToolbarProps> = ({
  searchTerm,
  onSearchChange,
  onExport,
  isExporting = false,
  bulkDeleteButton = false,
  onClickDeleteButton,
  columnVisibility,
  toggleColumnVisibility,
  getColumnLabel,
  filters,
}) => {
  return (
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Filter responses..."
            className="pl-10 h-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 w-full"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {/* Bulk Delete Button - only shown when bulkDeleteButton is true */}
          {bulkDeleteButton && onClickDeleteButton && (
            <Button
              variant="destructive"
              className="gap-y-2 gap-x-0.5 cursor-pointer"
              onClick={onClickDeleteButton}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Selected
            </Button>
          )}

          {/* Filters Dropdown */}
          {filters && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-x-2 cursor-pointer">
                  <Filter className="h-4 w-4" />
                  Filters
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[90vw] sm:w-96 max-h-[70vh] overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3"
              >
                {filters}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {onExport && (
            <Button
              className="gap-y-2 gap-x-0.5"
              onClick={onExport}
              variant="outline"
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "..." : "Export"}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-y-2 gap-x-0.5">
                <Settings className="h-4 w-4" />
                <span></span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
            >
              <div className="flex flex-col max-h-[70vh]">
                <div className="px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  COLUMN VISIBILITY
                </div>

                <div className="overflow-y-auto overscroll-contain thin-scrollbar">
                  <div className="space-y-1 p-2">
                    {Object.entries(columnVisibility).map(([key, visible]) => (
                      <div
                        key={key}
                        className="flex items-center px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => toggleColumnVisibility(key)}
                      >
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={visible}
                            readOnly
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                        </div>
                        <label className="ml-3 text-sm text-gray-700 dark:text-gray-300 truncate">
                          {getColumnLabel(key)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                  {Object.values(columnVisibility).filter(Boolean).length} columns visible
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
  );
};