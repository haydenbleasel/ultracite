import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { Installer } from './installer';

const avatars = [
  'https://avatars.githubusercontent.com/u/44647675?s=40&v=4',
  'https://avatars.githubusercontent.com/u/99208066?s=40&v=4',
  'https://avatars.githubusercontent.com/u/18316?s=40&v=4',
  'https://avatars.githubusercontent.com/u/126797452?s=40&v=4',
  'https://avatars.githubusercontent.com/u/74460583?s=40&v=4',
  'https://avatars.githubusercontent.com/u/37576747?s=40&v=4',
  'https://avatars.githubusercontent.com/u/77968538?s=40&v=4',
  'https://avatars.githubusercontent.com/u/40150036?s=40&v=4',
];

export const Hero = () => (
  <div className="px-8 py-16 sm:py-24">
    <div className="mx-auto grid max-w-3xl gap-6 text-center">
      <h1 className="mb-0 text-balance font-semibold text-4xl! tracking-tighter! sm:text-5xl! md:text-6xl!">
        Ship code faster and with more confidence
      </h1>
      <p className="mt-0 mb-0 text-balance text-muted-foreground md:text-xl">
        Ultracite is a zero-config{' '}
        <a href="https://biomejs.dev" className="underline">
          Biome
        </a>{' '}
        preset that provides a robust linting and formatting experience for
        modern web development.
      </p>
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-2 sm:flex-row">
        <Installer />
        <Button asChild size="lg">
          <Link href="/introduction">Read the docs</Link>
        </Button>
      </div>
      <div className="mt-4 flex flex-col items-center gap-4">
        <p className="text-muted-foreground text-sm">
          Used by over{' '}
          <a
            href="https://github.com/haydenbleasel/ultracite/network/dependents"
            className="underline"
          >
            500 developers
          </a>
        </p>
        <div className="-space-x-2 flex">
          {avatars.map((avatar) => (
            <Image
              key={avatar}
              src={avatar}
              alt="GitHub avatar"
              width={32}
              height={32}
              className="rounded-full border-2 border-background"
              unoptimized
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);
