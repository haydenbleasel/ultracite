import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Installer } from './installer';

export const Hero = () => (
  <div className="py-16 sm:py-24">
    <div className="mx-auto grid max-w-3xl gap-6 text-center">
      <h1 className="mb-0 text-balance font-semibold text-3xl! tracking-tighter! xl:text-4xl! 2xl:text-6xl!">
        Ship code faster and with more confidence
      </h1>
      <p className="mt-0 mb-0 text-balance text-muted-foreground xl:text-lg 2xl:text-xl">
        Ultracite is a zero-config Biome preset that provides a robust linting
        and formatting experience for modern web development.
      </p>
      <div className="mx-auto flex w-full max-w-lg items-center gap-2">
        <Installer />
        <Button asChild size="lg">
          <Link href="/introduction">Read the docs</Link>
        </Button>
      </div>
    </div>
  </div>
);
