import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { WorkflowIcon } from "lucide-react";

import { TriggerLintRunButton } from "./trigger-lint-run";

interface RepoEmptyStateProps {
  repoId: string;
  isSubscribed: boolean;
}

export const RepoEmptyState = ({
  repoId,
  isSubscribed,
}: RepoEmptyStateProps) => (
  <Empty className="py-8 sm:py-12 md:py-16">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <WorkflowIcon className="size-5" />
      </EmptyMedia>
      <EmptyTitle>No lint runs yet</EmptyTitle>
      <EmptyDescription>
        Check back later to see your lint runs, or trigger your first lint run
        now.
      </EmptyDescription>
      <EmptyContent>
        {isSubscribed && <TriggerLintRunButton repoId={repoId} />}
      </EmptyContent>
    </EmptyHeader>
  </Empty>
);
