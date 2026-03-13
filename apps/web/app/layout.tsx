import "./global.css";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { CTA } from "@/components/cta";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/ultracite/navbar";
import { fonts } from "@/lib/fonts";
import { Footer } from "../components/ultracite/footer";

interface LayoutProps {
	children: ReactNode;
}

const Layout = async ({ children }: LayoutProps) => (
	<html lang="en" suppressHydrationWarning>
		<body className={fonts}>
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				disableTransitionOnChange
				enableSystem
				{...properties}
			>
				<TooltipProvider>
					<Navbar />
					<div className="container relative mx-auto mt-16 grid px-4 sm:mt-24 2xl:max-w-7xl">
						{children}
						<div className="mt-16 sm:mt-24 md:mt-32">
							<CTA />
							<Footer />
						</div>
					</div>
				</TooltipProvider>
				<Toaster />
				<Analytics />
			</ThemeProvider>
		</body>
	</html>
);

export default Layout;
