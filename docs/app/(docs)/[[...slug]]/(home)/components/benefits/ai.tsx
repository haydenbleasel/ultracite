import Image from 'next/image';
import { cn } from '@/lib/utils';
import { people, providers } from '../avatars';

const avatarClassNames = [
  'absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2', // 0° - top
  'absolute top-3/4 left-[93.3%] -translate-x-1/2 -translate-y-1/2', // 120° - bottom right
  'absolute top-3/4 left-[6.7%] -translate-x-1/2 -translate-y-1/2', // 240° - bottom left
];

export const AIGraphic = () => (
  <div className="-translate-y-1/2 relative flex aspect-square w-full items-center justify-center">
    {/* Outer circle */}
    <div className="absolute size-full rounded-full border border-dotted" />

    {/* Inner circle */}
    <div className="absolute size-3/4 rounded-full border border-dotted" />

    {/* Orbiting icons - Outer orbit */}
    <div
      className="absolute size-full animate-spin"
      style={{ animationDuration: '24s' }}
    >
      {people.map(({ avatar, name }, index) => (
        <Image
          key={name}
          src={avatar}
          alt="GitHub avatar"
          width={32}
          height={32}
          className={cn(
            'size-8 rounded-full',
            avatarClassNames[index % avatarClassNames.length]
          )}
        />
      ))}
    </div>

    {/* Orbiting providers - Inner orbit (counter-rotating) */}
    <div
      className="absolute size-3/4 animate-spin"
      style={{ animationDuration: '16s', animationDirection: 'reverse' }}
    >
      {providers.map(({ avatar, name }, index) => (
        <Image
          key={name}
          src={avatar}
          alt={`${name} logo`}
          width={24}
          height={24}
          className={cn(
            'size-8 rounded-full',
            avatarClassNames[index % avatarClassNames.length]
          )}
        />
      ))}
    </div>
  </div>
);
