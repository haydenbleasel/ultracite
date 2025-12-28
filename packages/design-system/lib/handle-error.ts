import { toast } from "sonner";
import { parseError } from "./parse-error";

export const handleError = (error: unknown) => {
  const description = parseError(error);

  toast.error("Something went wrong", { description });
};
