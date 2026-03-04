import { Card, CardContent } from "@/components/ui/card";

interface Props {
	label: string;
	value: number;
	highlight?: boolean;
}

export default function StatsCard({ label, value, highlight }: Props) {
	return (
		<Card
			className={
				highlight ? "bg-primary text-primary-foreground border-primary" : ""
			}
		>
			<CardContent className="flex flex-col items-center gap-1 p-5">
				<span className="text-3xl font-bold">{value}</span>
				<span
					className={`text-sm ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}
				>
					{label}
				</span>
			</CardContent>
		</Card>
	);
}
