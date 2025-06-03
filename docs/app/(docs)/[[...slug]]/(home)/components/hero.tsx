import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Installer } from "./installer";

export const Hero = () => (
	<div className="py-16 sm:py-24">
		<div className="grid gap-6 max-w-3xl mx-auto text-center">
			<h1 className="mb-0 text-balance font-semibold text-3xl! xl:text-4xl! 2xl:text-6xl! tracking-tighter!">
				Ship code faster and with more confidence
			</h1>
			<p className="mt-0 mb-0 text-balance text-muted-foreground xl:text-lg 2xl:text-xl">
				Ultracite is a zero-config Biome preset that provides a robust linting
				and formatting experience for modern web development.
			</p>
			<div className="flex items-center gap-2 max-w-lg w-full mx-auto">
				<Installer />
				<Button asChild size="lg">
					<Link href="/introduction">Read the docs</Link>
				</Button>
			</div>
		</div>
	</div>
);
