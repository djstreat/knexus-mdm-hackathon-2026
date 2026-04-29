"use client";

import clsx from "clsx";
import {
	AlertTriangle,
	Bell,
	ChevronDown,
	ChevronUp,
	ShieldAlert,
} from "lucide-react";
import React, { useMemo, useState } from "react";
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

// sr_number_x2CljIDyRaiOFhcMcZ_a
// sr_number_HCM3Z2QkCjG136MlzlOP
// sr_number_A1aX91v4E8E6TP84aata
// sr_number_IRvRnIj4zI8GlOApC_9X
// sr_number_VFpVomlntnagw6w3pYYW
// sr_number_wUs4okvIpIr7wG5hLTgo

const ALERTS = [
	{
		id: "1",
		srNumber: "sr_number_x2CljIDyRaiOFhcMcZ_a",
		title: "Critical Repair Anomaly Detected",
		severity: "mission-critical",
		createdAt: new Date("2026-04-28T10:00:00Z"),
	},
	{
		id: "2",
		srNumber: "sr_number_HCM3Z2QkCjG136MlzlOP",
		title: "High Priority Maintenance Needed",
		severity: "urgent",
		createdAt: new Date("2026-04-28T11:30:00Z"),
	},
	{
		id: "3",
		srNumber: "sr_number_A1aX91v4E8E6TP84aata",
		title: "Scheduled Inspection Overdue",
		severity: "warning",
		createdAt: new Date("2026-04-27T15:00:00Z"),
	},
	{
		id: "4",
		srNumber: "sr_number_IRvRnIj4zI8GlOApC_9X",
		title: "Critical Component Failure",
		severity: "mission-critical",
		createdAt: new Date("2026-04-28T09:00:00Z"),
	},
	{
		id: "5",
		srNumber: "sr_number_VFpVomlntnagw6w3pYYW",
		title: "Urgent Service Required",
		severity: "urgent",
		createdAt: new Date("2026-04-28T12:00:00Z"),
	},
	{
		id: "6",
		srNumber: "sr_number_wUs4okvIpIr7wG5hLTgo",
		title: "Minor Maintenance Alert",
		severity: "warning",
		createdAt: new Date("2026-04-27T18:00:00Z"),
	},
];

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

	const filteredAlerts = useMemo(() => {
		let alerts = [...ALERTS];
		if (selectedDate !== "all") {
			alerts = alerts.filter((alert) => {
				const dateStr = alert.createdAt.toISOString().split("T")[0];
				return dateStr === selectedDate;
			});
		}

		return alerts.sort((a, b) => {
			if (sortBySeverity) {
				return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
			} else {
				return b.createdAt.getTime() - a.createdAt.getTime();
			}
		});
	}, [sortBySeverity, selectedDate]);

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

				{filteredAlerts.length > 0 ? (
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
