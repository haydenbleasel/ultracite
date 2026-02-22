import Link from "next/link";
import type { Organization } from "@/lib/types";

interface OrganizationListProps {
  organizations: (Organization | null)[];
}

export const OrganizationList = ({ organizations }: OrganizationListProps) => {
  const validOrgs = organizations.filter(
    (org): org is Organization => org !== null
  );

  return (
    <div className="flex flex-col gap-2">
      {validOrgs.map((org) => (
        <Link
          className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
          href={`/${org.slug}`}
          key={org._id}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground">
            {org.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="font-medium">{org.name}</span>
            <span className="text-muted-foreground text-sm">
              {org.githubOrgType === "User"
                ? "Personal account"
                : "Organization"}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
};
