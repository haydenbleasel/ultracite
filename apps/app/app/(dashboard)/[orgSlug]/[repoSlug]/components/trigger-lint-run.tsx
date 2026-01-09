"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { triggerLintRun } from "@/actions/repo/lint";

interface TriggerLintRunButtonProps {
  repoId: string;
}

export const TriggerLintRunButton = ({ repoId }: TriggerLintRunButtonProps) => {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: { success: boolean; error: string | undefined }) => {
      const result = await triggerLintRun(repoId);

      return result;
    },
    { error: undefined, success: false }
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Lint run triggered", {
        description: "The lint run has been queued and will start shortly.",
      });
    } else if (state.error) {
      toast.error("Failed to trigger lint run", {
        description: state.error,
      });
    }
  }, [state.success, state.error]);

  return (
    <form action={formAction}>
      <Button disabled={isPending} type="submit" variant="secondary">
        {isPending ? "Triggering..." : "Trigger lint run"}
      </Button>
    </form>
  );
};
