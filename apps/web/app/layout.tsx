import type { Metadata } from "next";
import { Instrument_Serif, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const displayFont = Instrument_Serif({
	subsets: ["latin"],
	weight: "400",
	variable: "--font-display",
});

const sansFont = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-sans",
});

export const metadata: Metadata = {
	title: "Rankclaw",
	description: "CLI-first SEO operating system for research, crawling, briefs, audits, and evaluation.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en">
			<body className={`${displayFont.variable} ${sansFont.variable}`}>{children}</body>
		</html>
	);
}
