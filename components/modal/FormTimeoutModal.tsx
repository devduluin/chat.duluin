// components/FormTimeoutModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle } from "lucide-react";

interface FormTimeoutModalProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  timeoutMinutes: number;
}

export function FormTimeoutModal({ open, onClose, onContinue, timeoutMinutes }: FormTimeoutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-xl border-0 bg-white shadow-xl">
        <div className="flex flex-col items-center p-6 text-center">
          {/* Animated warning icon */}
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100/80 p-2">
            <AlertTriangle className="h-8 w-8 text-amber-500 animate-pulse" />
          </div>

          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Time Limit Notice
            </DialogTitle>
          </DialogHeader>

          <div className="mt-3 space-y-2">
            <p className="text-sm text-gray-600">
              This form has a strict time limit of
            </p>
            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-gray-50 px-4 py-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-gray-900">
                {timeoutMinutes} minute{timeoutMinutes !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Complete this form once you start or your responses will auto-submit when time expires.
            </p>
          </div>

          <div className="mt-6 flex w-full gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              Cancel
            </Button>
            <Button
              onClick={onContinue}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500"
            >
              Start Now
            </Button>
          </div>
        </div>

        {/* Footer note */}
        {/* <div className="rounded-b-xl bg-gray-50/50 px-4 py-3 text-center">
          <p className="text-xs text-gray-500">
            Tip: Prepare your answers before starting
          </p>
        </div> */}
      </DialogContent>
    </Dialog>
  );
}