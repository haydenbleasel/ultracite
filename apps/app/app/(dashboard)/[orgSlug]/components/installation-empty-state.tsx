import { SiGithub } from "@icons-pack/react-simple-icons";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";

import { ConnectGitHubButton } from "./connect-github-button";

export const InstallationEmptyState = () => (
  <Empty className="py-8 sm:py-12 md:py-16">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <SiGithub className="size-5" />
      </EmptyMedia>
      <EmptyTitle>Connect GitHub</EmptyTitle>
      <EmptyDescription>
        Install the Ultracite GitHub App to start linting your repositories
        automatically.
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <ConnectGitHubButton hasInstallation={false} />
    </EmptyContent>
  </Empty>
);
