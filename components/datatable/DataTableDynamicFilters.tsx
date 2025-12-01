import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { DateRange } from "react-day-picker";


interface Filter {
  questionId: string;
  value: any;
}

interface SmartDynamicFiltersProps {
  questions: any[];
  filters: Filter[];
  setFilters: (filters: Filter[]) => void;
}

export const DataTableDynamicFilters: React.FC<SmartDynamicFiltersProps> = ({
  questions,
  filters,
  setFilters,
}) => {
  const handleChange = (index: number, key: "questionId" | "value", value: any) => {
    const updated = [...filters];
    updated[index][key] = value;

    // Reset value if questionId changes
    if (key === "questionId") {
      updated[index].value = undefined;
    }

    setFilters(updated);
  };

  const addFilter = () => {
    setFilters([...filters, { questionId: "", value: undefined }]);
  };

  const removeFilter = (index: number) => {
    const updated = [...filters];
    updated.splice(index, 1);
    setFilters(updated);
  };

  const renderField = (filter: Filter, index: number) => {
    const question = questions.find((q) => q.id === filter.questionId);
    if (!question) return null;

    switch (question.type) {
      case "single":
      case "multiple":
        return (
          <Select
            value={filter.value || ""}
            onValueChange={(val) => handleChange(index, "value", val)}
          >
            <SelectTrigger className="flex-1 h-8 text-sm w-full">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              {question.options.map((opt: { id: string; text: string }) => (
                <SelectItem key={opt.id} value={opt.text}>
                  {opt.text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "date":
        return (
          <DatePickerWithRange
            date={filter.value as DateRange}
            setDate={(val) => handleChange(index, "value", val)}
            className="flex-1 h-8 text-sm"
          />
        );

      case "open":
        return (
          <Input
            value={filter.value || ""}
            onChange={(e) => handleChange(index, "value", e.target.value)}
            placeholder="Type keyword"
            className="flex-1 w-full h-8 text-sm"
          />
        );

      case "nps":
      case "rating":
      case "number":
        return (
          <Input
            type="number"
            value={filter.value || ""}
            onChange={(e) => handleChange(index, "value", e.target.value)}
            placeholder="Enter score"
            className="flex-1 w- h-8 text-sm"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
    {filters.length === 0 ? (
        <div className="text-xs text-gray-500 text-center py-4">
        No filters selected. Use the button below to add one.
        </div>
    ) : (
        filters.map((filter, index) => (
        <div
            key={index}
            className="flex flex-wrap items-start gap-2 sm:items-center sm:flex-nowrap"
        >
            {/* Question Selector */}
            <Select
            value={filter.questionId}
            onValueChange={(val) => handleChange(index, "questionId", val)}
            >
            <SelectTrigger className="w-full sm:w-56 truncate h-8 text-sm">
                <SelectValue placeholder="Select question" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-auto">
                {questions
                  .filter((q) => {
                    const isAlreadySelected = filters.some(
                      (f, i) => f.questionId === q.id && i !== index
                    );
                    const isNotFileType = q.type !== "file";
                    return (!isAlreadySelected || q.id === filter.questionId) && isNotFileType;
                  })
                  .map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      <span className="line-clamp-1">
                        {q.text.replace(/<[^>]+>/g, "")}
                      </span>
                    </SelectItem>
                ))}
            </SelectContent>
            </Select>

            {/* Field Renderer */}
            <div className="flex-1 min-w-[150px]">{renderField(filter, index)}</div>

            {/* Delete Button */}
            <div className="mt-1 sm:mt-0">
            <Button
                type="button"
                variant="ghost"
                onClick={() => removeFilter(index)}
                size="icon"
            >
                <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
            </div>
        </div>
        ))
    )}

    

    <div className="flex justify-between items-center mt-4">
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFilters([])}
            className="text-xs text-muted-foreground hover:text-foreground"
        >
            Clear Filters
        </Button>
        
        <Button type="button" variant="outline" size="sm" className='text-xs' onClick={addFilter}>
        <Plus className="h-4 w-4 mr-2" />
        Add Filter
        </Button>
    </div>
    </div>

  );
};
