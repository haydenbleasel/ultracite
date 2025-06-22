import { SiReact } from '@icons-pack/react-simple-icons';
import { XCircleIcon } from 'lucide-react';

export const Problems = () => (
  <div className='flex flex-col gap-2 overflow-y-auto p-4 text-muted-foreground text-xs'>
    <div className="flex items-center justify-between gap-2">
      <p className="font-medium">Problems</p>
      <div className="-mx-1 -mt-1 rounded-full bg-secondary px-2.5 py-1">
        <p>Biome (Ultracite)</p>
      </div>
    </div>
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <SiReact className="size-3" />
        <p className="text-foreground">index.tsx</p>
        <p>/index.tsx</p>
      </div>
      <div className="ml-4 flex items-center gap-2">
        <XCircleIcon className="size-3" />
        <p className="truncate">React is imported but not used</p>
      </div>
      <div className="ml-4 flex items-center gap-2">
        <XCircleIcon className="size-3" />
        <p className="truncate">
          It is not necessary to wrap the return statement in a div.
        </p>
      </div>
    </div>
  </div>
);
