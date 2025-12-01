import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fileToBase64 } from "@/utils/fileToBase64";

interface AnswerBlob {
  filename: string;
  mimeType: string;
  base64: string;
}

interface AnswerBlobState {
  blobs: Record<string, AnswerBlob>;
  setBlob: (questionId: string, file: File) => Promise<void>;
  removeBlob: (questionId: string) => void;
  resetBlobs: () => void;
}

// Create a map to cache stores by formId
const answerBlobStores = new Map<string, () => AnswerBlobState>();

export const useAnswerBlobStore = (formId: string) => {
  // Create new store if it doesn't exist for this formId
  if (!answerBlobStores.has(formId)) {
    const newStore = create<AnswerBlobState>()(
      persist(
        (set) => ({
          blobs: {},
          setBlob: async (questionId, file) => {
            const base64 = await fileToBase64(file);
            set((state) => ({
              blobs: {
                ...state.blobs,
                [questionId]: {
                  filename: file.name,
                  mimeType: file.type,
                  base64,
                },
              },
            }));
          },
          removeBlob: (questionId) =>
            set((state) => {
              const newBlobs = { ...state.blobs };
              delete newBlobs[questionId];
              return { blobs: newBlobs };
            }),
          resetBlobs: () => set({ blobs: {} }),
        }),
        {
          name: `answer-blob-storage-${formId}`, // Unique key per form
        }
      )
    );
    answerBlobStores.set(formId, newStore);
  }

  // Return the store instance
  const useStore = answerBlobStores.get(formId)!;
  return useStore();
};

// Optional utility function to clear blob storage for a specific form
export const clearFormBlobs = (formId: string) => {
  localStorage.removeItem(`answer-blob-storage-${formId}`);
  answerBlobStores.delete(formId); // Remove from cache
};