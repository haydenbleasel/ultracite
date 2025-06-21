import Image from 'next/image';
import { cn } from '@/lib/utils';
import { people, providers } from '../avatars';

const avatarClassNames = [
  'absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2', // 0° - top
  'absolute top-[70%] left-[93.3%] -translate-x-1/2 -translate-y-1/2', // 120° - bottom right
  'absolute top-[70%] left-[6.7%] -translate-x-1/2 -translate-y-1/2', // 240° - bottom left
];

export const AIGraphic = () => (
  <div className='-translate-y-1/2 relative flex aspect-square h-[380px] items-center justify-center'>
    {/* Outer circle */}
    <div className="absolute size-full rounded-full border border-muted-foreground opacity-40" />

    {/* Inner circle */}
    <div className="absolute size-[70%] rounded-full border border-muted-foreground opacity-40" />

    {/* Orbiting icons - Outer orbit */}
    <div
      className="absolute size-full animate-spin"
      style={{ animationDuration: '24s' }}
    >
      {people.map(({ avatar, name }, index) => (
        <Image
          alt="GitHub avatar"
          className={cn(
            'size-8 rounded-full',
            avatarClassNames[index % avatarClassNames.length]
          )}
          height={32}
          key={name}
          src={avatar}
          width={32}
        />
      ))}
    </div>

    {/* Orbiting providers - Inner orbit (counter-rotating) */}
    <div
      className="absolute size-[70%] animate-spin"
      style={{ animationDuration: '16s', animationDirection: 'reverse' }}
    >
      {providers.map(({ avatar, name }, index) => (
        <Image
          alt={`${name} logo`}
          className={cn(
            'size-8 rounded-full',
            avatarClassNames[index % avatarClassNames.length]
          )}
          height={24}
          key={name}
          src={avatar}
          width={24}
        />
      ))}
    </div>
  </div>
);
