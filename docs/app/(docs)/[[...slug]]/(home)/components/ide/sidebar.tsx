import {
  SiCss,
  SiJson,
  SiReact,
  SiTypescript,
} from '@icons-pack/react-simple-icons';
import { FolderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const files = [
  {
    name: 'index.tsx',
    icon: SiReact,
  },
  {
    name: 'layout.tsx',
    icon: SiReact,
  },
  {
    name: 'utils.ts',
    icon: SiTypescript,
  },
  {
    name: 'globals.css',
    icon: SiCss,
  },
  {
    name: 'biome.jsonc',
    icon: SiJson,
  },
];

const FileItem = ({
  name,
  icon: Icon,
  className,
}: {
  name: string;
  icon: typeof FolderIcon;
  className?: string;
}) => (
  <div
    className={cn('flex items-center gap-2 rounded-md px-2 py-1', className)}
  >
    <Icon className="size-3 shrink-0" />
    <p className="font-medium">{name}</p>
  </div>
);

export const Sidebar = () => (
  <div className="flex flex-col gap-1 px-2 py-4 font-mono text-muted-foreground text-xs">
    <div className="flex flex-col gap-px">
      <FileItem icon={FolderIcon} name=".cursor" />
      <FileItem className="ml-2" icon={FolderIcon} name=".rules" />
      <FileItem className="ml-4" icon={FolderIcon} name="ultracite.mdc" />
    </div>
    {files.map((file) => (
      <FileItem icon={file.icon} key={file.name} name={file.name} />
    ))}
  </div>
);
