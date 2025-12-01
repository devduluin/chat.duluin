import { useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";

export function usePagination(defaultPage = 1) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read page from URL or fall back to default
  const currentPage = Number(searchParams.get("page")) || defaultPage;

  // Update the URL query param
  const setCurrentPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", page.toString());
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleNextPage = useCallback(
    (totalPages: number) => {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    },
    [currentPage, setCurrentPage]
  );

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage, setCurrentPage]);

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(page);
    },
    [setCurrentPage]
  );

  return {
    currentPage,
    setCurrentPage,
    handleNextPage,
    handlePreviousPage,
    goToPage,
  };
}
