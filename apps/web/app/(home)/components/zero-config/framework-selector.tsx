"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import type { ComponentType } from "react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

import {
	Angular,
	Astro,
	Jest,
	Nestjs,
	Nextjs,
	Qwik,
	React,
	Remix,
	Solid,
	Svelte,
	Vitest,
	Vue,
} from "./icons";

export const frameworks = [
	{
		label: "Next.js",
		logo: Nextjs,
		presets: ["next"],
	},
	{
		label: "React",
		logo: React,
		presets: ["react"],
	},
	{
		label: "Solid",
		logo: Solid,
		presets: ["solid"],
	},
	{
		label: "Vue",
		logo: Vue,
		presets: ["vue"],
	},
	{
		label: "Svelte",
		logo: Svelte,
		presets: ["svelte"],
	},
	{
		label: "Qwik",
		logo: Qwik,
		presets: ["qwik"],
	},
	{
		label: "Angular",
		logo: Angular,
		presets: ["angular"],
	},
	{
		label: "Remix",
		logo: Remix,
		presets: ["remix"],
	},
	{
		label: "Astro",
		logo: Astro,
		presets: ["astro"],
	},
	{
		label: "NestJS",
		logo: Nestjs,
		presets: ["nestjs"],
	},
	{
		label: "Jest",
		logo: Jest,
		presets: ["jest"],
	},
	{
		label: "Vitest",
		logo: Vitest,
		presets: ["vitest"],
	},
];

export interface Framework {
	label: string;
	logo: ComponentType<{ className?: string }>;
	presets: string[];
}

interface FrameworkSelectorProps {
	onValueChange: (values: string[]) => void;
	values: string[];
}

export const FrameworkSelector = ({
	values,
	onValueChange,
}: FrameworkSelectorProps) => {
	const [open, setOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);

	const selectedFrameworks = frameworks.filter((f) => values.includes(f.label));

	const toggle = (label: string) => {
		if (values.includes(label)) {
			onValueChange(values.filter((v) => v !== label));
		} else {
			onValueChange([...values, label]);
		}
	};

	return (
		<PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
			<PopoverPrimitive.Trigger
				ref={triggerRef}
				className="flex w-fit items-center justify-between gap-1.5 rounded-4xl border border-input bg-input/30 px-3 py-2 text-sm whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 h-9 [&_svg]:pointer-events-none [&_svg]:shrink-0"
			>
				{selectedFrameworks.length === 0 ? (
					<span className="text-muted-foreground">Select frameworks</span>
				) : selectedFrameworks.length === 1 ? (
					(() => {
						const Logo = selectedFrameworks[0].logo;
						return (
							<div className="flex items-center gap-1.5">
								<Logo className="size-4" />
								{selectedFrameworks[0].label}
							</div>
						);
					})()
				) : (
					<div className="flex items-center gap-1">
						<div className="flex gap-0.5">
							{selectedFrameworks.slice(0, 3).map((f) => (
								<f.logo key={f.label} className="size-4" />
							))}
						</div>
						<span>{selectedFrameworks.length} frameworks</span>
					</div>
				)}
				<ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
			</PopoverPrimitive.Trigger>
			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Content
					align="start"
					sideOffset={4}
					className="z-50 max-h-72 min-w-48 overflow-y-auto rounded-2xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/5 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
				>
					<div className="scroll-my-1 p-1">
						{frameworks.map((framework) => {
							const selected = values.includes(framework.label);
							return (
								<button
									key={framework.label}
									type="button"
									onClick={() => toggle(framework.label)}
									className={cn(
										"relative flex w-full cursor-default items-center gap-2.5 rounded-xl py-2 pr-8 pl-3 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground",
									)}
								>
									<framework.logo className="size-4" />
									<span>{framework.label}</span>
									{selected && (
										<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
											<CheckIcon className="size-4" />
										</span>
									)}
								</button>
							);
						})}
					</div>
				</PopoverPrimitive.Content>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
};
