import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser, getFirstOrganization } from '@/lib/auth';
import { CreateOrganizationForm } from './components/create-organization-form';

export const metadata: Metadata = {
  title: 'Create Organization',
  description: 'Create your organization to get started with Ultracite.',
};

const OnboardingPage = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  // If user already has an organization, redirect to it
  const organization = await getFirstOrganization();
  if (organization) {
    redirect(`/${organization.slug}`);
  }

  return (
    <div className="container relative mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-lg flex-col items-center justify-center px-4">
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-semibold text-2xl tracking-tight">
            Create your organization
          </h1>
          <p className="text-muted-foreground text-sm">
            Organizations help you manage repositories and collaborate with your
            team.
          </p>
        </div>
        <CreateOrganizationForm />
      </div>
    </div>
  );
};

export default OnboardingPage;
