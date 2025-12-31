import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { WorkflowIcon } from "lucide-react";

export const RepoEmptyState = () => (
  <Empty className="py-8 sm:py-12 md:py-16">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <WorkflowIcon className="size-5" />
      </EmptyMedia>
      <EmptyTitle>No lint runs yet</EmptyTitle>
      <EmptyDescription>
        Check back later to see your lint runs.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);
