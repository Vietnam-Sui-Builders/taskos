import { toast } from "sonner";

/**
 * Handle transaction errors with user-friendly messages
 * @param error - The error object from the transaction
 * @param defaultMessage - Default error message if not a known error type
 */
export function handleTransactionError(
  error: unknown,
  defaultMessage: string = "Transaction failed"
): void {
  console.error("Transaction error:", error);

  const errorMessage = error instanceof Error ? error.message : String(error);

  // User rejected/cancelled the transaction
  if (
    errorMessage.includes("User rejected") ||
    errorMessage.includes("rejected the request") ||
    errorMessage.includes("User declined")
  ) {
    toast.info("Transaction cancelled", {
      description: "You cancelled the transaction.",
    });
    return;
  }

  // Insufficient gas
  if (
    errorMessage.includes("Insufficient") ||
    errorMessage.includes("insufficient")
  ) {
    toast.error("Insufficient balance", {
      description: "You don't have enough SUI to complete this transaction.",
    });
    return;
  }

  // Network errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("Network") ||
    errorMessage.includes("timeout")
  ) {
    toast.error("Network error", {
      description: "Please check your connection and try again.",
    });
    return;
  }

  // Default error
  toast.error(defaultMessage, {
    description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
  });
}

/**
 * Check if an error is a user rejection
 * @param error - The error object
 * @returns true if the user rejected the transaction
 */
export function isUserRejection(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (
    errorMessage.includes("User rejected") ||
    errorMessage.includes("rejected the request") ||
    errorMessage.includes("User declined")
  );
}
