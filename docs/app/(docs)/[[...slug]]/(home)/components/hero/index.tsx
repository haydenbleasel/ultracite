'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AvatarStack } from '@/components/ui/kibo-ui/avatar-stack';
import { people, providers } from '../avatars';
import { Installer } from '../installer';

const Animation = dynamic(
  () => import('./animation').then((mod) => mod.Animation),
  { ssr: false }
);

export const Hero = () => (
  <div className="relative isolate overflow-hidden rounded-3xl border bg-linear-to-br from-background to-secondary/40 px-4 sm:px-8">
    <div className="-top-24 -left-[20%] absolute z-0 h-[50rem] w-[120%] opacity-50">
      <Animation />
    </div>
    <div className="relative z-10 mx-auto grid max-w-3xl gap-6 py-24 text-center sm:py-32">
      <h1 className="mb-0 text-balance font-semibold text-4xl! tracking-tighter! sm:text-5xl! md:text-6xl!">
        The AI-ready formatter that helps you{' '}
        <span className="mr-2 ml-1 hidden sm:inline-flex">
          <AvatarStack className="inline-flex translate-y-1" size={48}>
            {people.map(({ name, avatar }) => (
              <Image
                alt=""
                className="size-12 rounded-full"
                height={48}
                key={name}
                src={avatar}
                width={48}
              />
            ))}
          </AvatarStack>
        </span>
        write and{' '}
        <AvatarStack className="hidden translate-y-1 sm:inline-flex" size={48}>
          {providers.map(({ name, avatar }) => (
            <Image
              alt=""
              className="size-12 rounded-full"
              height={48}
              key={name}
              src={avatar}
              width={48}
            />
          ))}
        </AvatarStack>{' '}
        generate code <span className="italic">faster</span>.
      </h1>
      <p className="mt-0 mb-0 text-balance text-muted-foreground md:text-xl">
        Ultracite is a zero-config{' '}
        <a className="underline" href="https://biomejs.dev">
          Biome
        </a>{' '}
        preset that provides a robust linting and formatting experience for your
        team and your AI integrations.
      </p>
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-2 sm:flex-row">
        <Installer />
        <Button
          asChild
          className="border border-foreground/10 bg-foreground/5 text-foreground backdrop-blur-xs hover:text-background"
          size="lg"
        >
          <Link href="/introduction">Read the docs</Link>
        </Button>
      </div>
      <div className="mt-4 flex flex-col items-center gap-4">
        <p className="text-muted-foreground text-sm">
          Used by over{' '}
          <a
            className="underline"
            href="https://github.com/haydenbleasel/ultracite/network/dependents"
          >
            500 developers
          </a>
        </p>
      </div>
    </div>
  </div>
);
