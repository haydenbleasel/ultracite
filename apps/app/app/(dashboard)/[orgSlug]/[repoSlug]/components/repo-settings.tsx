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
  defaultEnabled: boolean;
  repoId: string;
}

export const RepoSettings = ({
  defaultBranch,
  defaultEnabled,
  repoId,
}: RepoSettingsProps) => {
  const [state, formAction, isPending] = useActionState(
    async (
      _prevState: { success: boolean; error: string | undefined },
      formData: FormData
    ) => {
      const newDefaultBranch = formData.get("default-branch") as string;
      const newEnabled = formData.get("enabled") === "on";
      const result = await updateRepo(repoId, {
        defaultBranch: newDefaultBranch,
        enabled: newEnabled,
      });

      return result;
    },
    { success: false, error: undefined }
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
      <DialogContent className="sm:max-w-[425px]">
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
              <Label htmlFor="enabled">Enabled</Label>
              <Switch
                defaultChecked={defaultEnabled}
                id="enabled"
                name="enabled"
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
