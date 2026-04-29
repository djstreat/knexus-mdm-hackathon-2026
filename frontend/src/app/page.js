"use client";

import clsx from "clsx";
import {
	AlertTriangle,
	Bell,
	ChevronDown,
	ChevronUp,
	ShieldAlert,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { getAlerts } from "@/app/actions";
import { RepairInfo } from "@/components/repair-info";
import {
	Sidebar,
	SidebarBody,
	SidebarHeading,
	SidebarItem,
	SidebarSection,
} from "@/components/sidebar";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Switch, SwitchField } from "@/components/switch";
import { Text } from "@/components/text";

const mapSeverity = (severity) => {
	switch (severity) {
		case "critical":
			return "mission-critical";
		case "high":
			return "urgent";
		case "medium":
			return "warning";
		default:
			return "warning";
	}
};

const SEVERITY_ORDER = {
	"mission-critical": 0,
	urgent: 1,
	warning: 2,
};

const SEVERITY_COLORS = {
	"mission-critical":
		"text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
	urgent:
		"text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
	warning:
		"text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
};

const SEVERITY_ICONS = {
	"mission-critical": ShieldAlert,
	urgent: AlertTriangle,
	warning: Bell,
};

const SIDEBAR_OPTIONS = [
	{ label: "Today", value: "all" },
	{ label: "Yesterday", value: "2026-04-28" },
	{ label: "April 27, 2026", value: "2026-04-27" },
];

function AlertCard({ alert, isExpanded, onToggle }) {
	const Icon = SEVERITY_ICONS[alert.severity];

	return (
		<div className="mb-3 overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all dark:border-zinc-800 dark:bg-zinc-900">
			<button
				onClick={onToggle}
				className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
			>
				<div
					className={clsx(
						"flex size-10 shrink-0 items-center justify-center rounded-lg border",
						SEVERITY_COLORS[alert.severity],
					)}
				>
					<Icon className="size-5" />
				</div>
				<div className="flex flex-1 flex-col gap-0.5">
					<h3 className="font-semibold text-zinc-950 dark:text-white">
						{alert.title}
					</h3>
					<div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
						<span>{alert.severity.replace("-", " ").toUpperCase()}</span>
						<span>•</span>
						<span>{alert.createdAt.toLocaleTimeString()}</span>
					</div>
				</div>
				{isExpanded ? (
					<ChevronUp className="size-5 text-zinc-400" />
				) : (
					<ChevronDown className="size-5 text-zinc-400" />
				)}
			</button>

			{isExpanded && (
				<div className="border-t border-zinc-100 p-4 pt-2">
					<RepairInfo srNumber={alert.srNumber} />
				</div>
			)}
		</div>
	);
}

export default function Dashboard() {
	const [sortBySeverity, setSortBySeverity] = useState(true);
	const [expandedId, setExpandedId] = useState(null);
	const [selectedDate, setSelectedDate] = useState("all");
	const [alerts, setAlerts] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchAlerts() {
			try {
				const data = await getAlerts();
				const processed = data.map((alert) => ({
					...alert,
					createdAt: new Date(alert.createdAt),
					severity: mapSeverity(alert.severity),
				}));
				setAlerts(processed);
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		}
		fetchAlerts();
	}, []);

	const filteredAlerts = useMemo(() => {
		let filtered = [...alerts];
		if (selectedDate !== "all") {
			filtered = filtered.filter((alert) => {
				const dateStr = alert.createdAt.toISOString().split("T")[0];
				return dateStr === selectedDate;
			});
		}

		return filtered.sort((a, b) => {
			if (sortBySeverity) {
				return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
			} else {
				return b.createdAt.getTime() - a.createdAt.getTime();
			}
		});
	}, [sortBySeverity, selectedDate, alerts]);

	const toggleAlert = (id) => {
		setExpandedId((prevId) => (prevId === id ? null : id));
	};

	return (
		<SidebarLayout
			sidebar={
				<Sidebar>
					<SidebarBody>
						<SidebarSection>
							<SidebarHeading>Timeline</SidebarHeading>
							{SIDEBAR_OPTIONS.map((option) => (
								<SidebarItem
									key={option.value}
									current={selectedDate === option.value}
									onClick={() => setSelectedDate(option.value)}
								>
									{option.label}
								</SidebarItem>
							))}
						</SidebarSection>
						<SidebarSection>
							<SidebarHeading>Navigation</SidebarHeading>
							<SidebarItem href="/" current>
								Dashboard
							</SidebarItem>
							<SidebarItem href="/reports">Reports</SidebarItem>
						</SidebarSection>
					</SidebarBody>
				</Sidebar>
			}
		>
			<div className="flex flex-col gap-6">
				<header className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-zinc-950 dark:text-white">
							{SIDEBAR_OPTIONS.find((o) => o.value === selectedDate)?.label ||
								"Dashboard"}
						</h1>
						<Text>Real-time monitoring of your infrastructure</Text>
					</div>

					<div className="flex items-center gap-3">
						<span className="text-sm font-medium text-zinc-500">
							Sort by severity
						</span>
						<SwitchField>
							<Switch
								checked={sortBySeverity}
								onChange={(checked) => setSortBySeverity(checked)}
							/>
						</SwitchField>
					</div>
				</header>

				{loading ? (
					<div className="flex items-center justify-center py-12 text-zinc-500">
						<Bell className="size-12 mb-4 opacity-20 animate-pulse" />
						<p>Loading alerts...</p>
					</div>
				) : filteredAlerts.length > 0 ? (
					filteredAlerts.map((alert) => (
						<AlertCard
							key={alert.id}
							alert={alert}
							isExpanded={expandedId === alert.id}
							onToggle={() => toggleAlert(alert.id)}
						/>
					))
				) : (
					<div className="flex flex-col items-center justify-center py-12 text-zinc-500">
						<Bell className="size-12 mb-4 opacity-20" />
						<p>No alerts found for this period</p>
					</div>
				)}
			</div>
		</SidebarLayout>
	);
}
