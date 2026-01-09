import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { BuildingIcon } from "lucide-react";

import { ConnectGitHubButton } from "./connect-github-button";

interface OrganizationEmptyStateProps {
  hasInstallation: boolean;
}

export const OrganizationEmptyState = ({
  hasInstallation,
}: OrganizationEmptyStateProps) => (
  <Empty className="py-8 sm:py-12 md:py-16">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <BuildingIcon className="size-5" />
      </EmptyMedia>
      <EmptyTitle>No repositories</EmptyTitle>
      <EmptyDescription>
        No repositories found. Make sure you have granted access to at least one
        repository.
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <ConnectGitHubButton hasInstallation={hasInstallation} />
    </EmptyContent>
  </Empty>
);
