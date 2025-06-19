'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Scene } from '@/components/ui/hero-section';
import { AvatarStack } from '@/components/ui/kibo-ui/avatar-stack';
import { Installer } from '../installer';
import claude from './claude.jpg';
import deepseek from './deepseek.jpg';
import haydenbleasel from './haydenbleasel.jpg';
import openai from './openai.jpg';
import piersonmarks from './piersonmarks.jpg';
import shadcn from './shadcn.jpg';

const avatars = [
  {
    name: 'Hayden Bleasel',
    avatar: haydenbleasel,
  },
  {
    name: 'Shadcn',
    avatar: shadcn,
  },
  {
    name: 'Pierson Marks',
    avatar: piersonmarks,
  },
];

const aiProviders = [
  {
    name: 'OpenAI',
    avatar: openai,
  },
  {
    name: 'Claude',
    avatar: claude,
  },
  {
    name: 'DeepSeek',
    avatar: deepseek,
  },
];

export const Hero = () => (
  <div className="container mx-auto">
    <div className="relative isolate overflow-hidden rounded-3xl border bg-linear-to-br from-background to-secondary/40 px-8">
      <div className="-top-24 -left-[20%] absolute z-0 h-[50rem] w-[120%] opacity-50">
        <Scene />
      </div>
      <div className="relative z-10 mx-auto grid max-w-3xl gap-6 py-32 text-center">
        <h1 className="mb-0 text-balance font-semibold text-4xl! tracking-tighter! sm:text-5xl! md:text-6xl!">
          The AI-ready toolchain that helps you{' '}
          <span className="mr-2 ml-1 inline-flex">
            <AvatarStack className="inline-flex translate-y-1" size={48}>
              {avatars.map(({ name, avatar }) => (
                <Image
                  key={name}
                  src={avatar}
                  alt="GitHub avatar"
                  width={48}
                  height={48}
                  className="size-12 rounded-full"
                />
              ))}
            </AvatarStack>
          </span>
          write and{' '}
          <AvatarStack className="inline-flex translate-y-1" size={48}>
            {aiProviders.map(({ name, avatar }) => (
              <Image
                key={name}
                src={avatar}
                alt="AI provider"
                width={48}
                height={48}
                className="size-12 rounded-full"
              />
            ))}
          </AvatarStack>{' '}
          generate code <span className="italic">faster</span>.
        </h1>
        <p className="mt-0 mb-0 text-balance text-muted-foreground md:text-xl">
          Ultracite is a zero-config{' '}
          <a href="https://biomejs.dev" className="underline">
            Biome
          </a>{' '}
          preset that provides a robust linting and formatting experience for
          your team and your AI integrations.
        </p>
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-2 sm:flex-row">
          <Installer />
          <Button
            asChild
            size="lg"
            className="border border-foreground/10 bg-foreground/5 text-foreground backdrop-blur-xs hover:text-background"
          >
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
        </div>
      </div>
    </div>
  </div>
);
