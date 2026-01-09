"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Switch } from "@repo/design-system/components/ui/switch";
import { SettingsIcon } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { updateRepo } from "@/actions/repo/update";

interface RepoSettingsProps {
  defaultBranch: string;
  defaultDailyRunsEnabled: boolean;
  defaultPrReviewEnabled: boolean;
  repoId: string;
}

export const RepoSettings = ({
  defaultBranch,
  defaultDailyRunsEnabled,
  defaultPrReviewEnabled,
  repoId,
}: RepoSettingsProps) => {
  const [state, formAction, isPending] = useActionState(
    async (
      _prevState: { success: boolean; error: string | undefined },
      formData: FormData
    ) => {
      const newDefaultBranch = formData.get("default-branch") as string;
      const newDailyRunsEnabled = formData.get("daily-runs-enabled") === "on";
      const newPrReviewEnabled = formData.get("pr-review-enabled") === "on";
      const result = await updateRepo(repoId, {
        dailyRunsEnabled: newDailyRunsEnabled,
        defaultBranch: newDefaultBranch,
        prReviewEnabled: newPrReviewEnabled,
      });

      return result;
    },
    { error: undefined, success: false }
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Repository settings updated");
    } else if (state.error) {
      toast.error("Failed to update repository settings", {
        description: state.error,
      });
    }
  }, [state.success, state.error]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <SettingsIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Repository settings</DialogTitle>
            <DialogDescription>
              Make changes to your connected GitHub repository.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-3">
              <Label htmlFor="default-branch">Default branch</Label>
              <Input
                defaultValue={defaultBranch}
                id="default-branch"
                name="default-branch"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="daily-runs-enabled">Daily runs</Label>
                <p className="text-muted-foreground text-sm">
                  Opens a PR that fixes all issues once a day.
                </p>
              </div>
              <Switch
                defaultChecked={defaultDailyRunsEnabled}
                id="daily-runs-enabled"
                name="daily-runs-enabled"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="pr-review-enabled">PR reviews</Label>
                <p className="text-muted-foreground text-sm">
                  Fixes your PR when you comment{" "}
                  <code className="-translate-y-0.5 text-xs">
                    @ultracite review
                  </code>
                  .
                </p>
              </div>
              <Switch
                defaultChecked={defaultPrReviewEnabled}
                id="pr-review-enabled"
                name="pr-review-enabled"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
