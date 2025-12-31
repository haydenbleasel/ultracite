import { SiGithub } from "@icons-pack/react-simple-icons";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";

interface ConnectGitHubButtonProps {
  hasInstallation: boolean;
}

export const ConnectGitHubButton = ({
  hasInstallation,
}: ConnectGitHubButtonProps) => {
  const installUrl = `https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_SLUG}/installations/new`;

  return (
    <Button asChild variant={hasInstallation ? "secondary" : "default"}>
      <Link href={installUrl}>
        <SiGithub className="size-4" />
        {hasInstallation ? "Manage GitHub" : "Connect GitHub"}
      </Link>
    </Button>
  );
};
