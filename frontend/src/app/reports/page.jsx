"use client";

import { useEffect, useState } from "react";
import { getReports } from "@/app/actions";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import {
	Alert,
	AlertActions,
	AlertBody,
	AlertDescription,
	AlertTitle,
} from "@/components/alert";
import {
	Sidebar,
	SidebarBody,
	SidebarHeading,
	SidebarItem,
	SidebarSection,
} from "@/components/sidebar";
import { SidebarLayout } from "@/components/sidebar-layout";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/table";

export default function ReportsPage() {
	const [reports, setReports] = useState([]);
	const [selectedReport, setSelectedReport] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchReports = async () => {
			try {
				const data = await getReports();
				setReports(data);
			} catch (error) {
				console.error("Failed to fetch reports:", error);
			} finally {
				setLoading(false);
			}
		};
		fetchReports();
	}, []);

	return (
		<SidebarLayout
			sidebar={
				<Sidebar>
					<SidebarBody>
						<SidebarSection>
							<SidebarHeading>Timeline</SidebarHeading>
							<SidebarItem href="/">Dashboard</SidebarItem>
							<SidebarItem href="/reports" current>
								Reports
							</SidebarItem>
						</SidebarSection>
					</SidebarBody>
				</Sidebar>
			}
		>
			<div className="flex flex-col gap-6">
				<header>
					<h1 className="text-2xl font-bold text-zinc-950 dark:text-white">
						Reports
					</h1>
					<p className="text-zinc-500">
						System generated maintenance and supply chain reports
					</p>
				</header>

				{loading ? (
					<div className="flex flex-col items-center justify-center py-12 text-zinc-500">
						<p>Loading reports...</p>
					</div>
				) : reports.length > 0 ? (
					<div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
						<Table striped>
							<TableHead>
								<TableRow>
									<TableHeader>Date</TableHeader>
									<TableHeader>Report Summary</TableHeader>
								</TableRow>
							</TableHead>
							<TableBody>
								{reports.map((report) => (
									<TableRow
										key={report.id}
										onClick={() => setSelectedReport(report)}
										className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5"
									>
										<TableCell className="whitespace-nowrap">
											{new Date(report.created_at).toLocaleDateString()}
										</TableCell>
										<TableCell>
											<div className="max-w-2xl overflow-hidden text-ellipsis whitespace-nowrap font-medium text-zinc-950 dark:text-white">
												{report.report.substring(0, 100)}...
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-12 text-zinc-500">
						<p>No reports available.</p>
					</div>
				)}

				{selectedReport && (
					<Alert open={true} onClose={() => setSelectedReport(null)}>
						<AlertTitle>Report Details</AlertTitle>
						<AlertDescription>
							{new Date(selectedReport.created_at).toLocaleString()}
						</AlertDescription>
						<AlertBody>
							<Message from="assistant">
								<MessageContent>
									<MessageResponse>{selectedReport.report}</MessageResponse>
								</MessageContent>
							</Message>
						</AlertBody>
						<AlertActions>
							<button
								onClick={() => setSelectedReport(null)}
								className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 dark:bg-white dark:text-zinc-950"
							>
								Close
							</button>
						</AlertActions>
					</Alert>
				)}
			</div>
		</SidebarLayout>
	);
}
