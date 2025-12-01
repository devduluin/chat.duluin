import { Option } from "@/lib/question";
import type { RefObject } from "react";

/**
 * Stores a normalized copy of options into a given ref for original tracking.
 *
 * @param input - A single Option or an array of Options
 * @param targetRef - A RefObject that holds a map of Option IDs to Option objects
 */
export const storeOriginalOptions = (
  input: Option | Option[] | null | undefined,
  targetRef: RefObject<Record<string, Option>>
) => {
  if (!targetRef?.current) return;

  const options = Array.isArray(input) ? input : input ? [input] : [];

  for (const option of options) {
    if (option?.id) {
      targetRef.current[option.id] = { ...option };
    }
  }
};
