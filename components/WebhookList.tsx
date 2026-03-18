"use client";

import { useState } from "react";
import { WebhookRequest } from "@/lib/types";

export const ALL_CSV_COLUMNS = [
    { key: "id", label: "ID" },
    {
        key: "received_at",
        label: "Received At",
    },
    { key: "method", label: "Method" },
    { key: "path", label: "Path" },
    {
        key: "query_params",
        label: "Query Params",
    },
    {
        key: "headers",
        label: "Headers",
    },
    { key: "body", label: "Body" },
    { key: "ip", label: "IP" },
    {
        key: "duration_ms",
        label: "Duration (ms)",
    },
] as const;

export type CsvColumnKey =
    (typeof ALL_CSV_COLUMNS)[number]["key"];

const METHOD_COLORS: Record<
    string,
    string
> = {
    GET: "#3fb950",
    POST: "#58a6ff",
    PUT: "#d29922",
    PATCH: "#bc8cff",
    DELETE: "#f85149",
    HEAD: "#8b949e",
    OPTIONS: "#ffa657",
};

function MethodBadge({
    method,
}: {
    method: string;
}) {
    const color =
        METHOD_COLORS[method] ??
        "#8b949e";
    return (
        <span
            style={{
                color,
                borderColor: color,
            }}
            className="text-xs font-bold px-1.5 py-0.5 rounded border shrink-0"
        >
            {method}
        </span>
    );
}

function timeAgo(dateStr: string) {
    const diff =
        Date.now() -
        new Date(dateStr).getTime();
    if (diff < 60000)
        return (
            Math.floor(diff / 1000) +
            "s ago"
        );
    if (diff < 3600000)
        return (
            Math.floor(diff / 60000) +
            "m ago"
        );
    return new Date(
        dateStr,
    ).toLocaleTimeString();
}

interface Props {
    requests: WebhookRequest[];
    selectedId: string | null;
    onSelect: (
        req: WebhookRequest,
    ) => void;
    onDelete: (id: string) => void;
    onDeleteAll: () => void;
    onExportCsv: (
        columns: CsvColumnKey[],
    ) => void;
    newRequestIds: Set<string>;
}

export default function WebhookList({
    requests,
    selectedId,
    onSelect,
    onDelete,
    onDeleteAll,
    onExportCsv,
    newRequestIds,
}: Props) {
    const [
        showExportModal,
        setShowExportModal,
    ] = useState(false);
    const [
        selectedColumns,
        setSelectedColumns,
    ] = useState<Set<CsvColumnKey>>(
        new Set(
            ALL_CSV_COLUMNS.map(
                (c) => c.key,
            ),
        ),
    );

    function toggleColumn(
        key: CsvColumnKey,
    ) {
        setSelectedColumns((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }

    function handleExport() {
        const ordered =
            ALL_CSV_COLUMNS.map(
                (c) => c.key,
            ).filter((k) =>
                selectedColumns.has(k),
            );
        onExportCsv(ordered);
        setShowExportModal(false);
    }
    if (requests.length === 0) {
        return (
            <>
                {showExportModal && (
                    <ExportModal
                        selectedColumns={
                            selectedColumns
                        }
                        onToggle={
                            toggleColumn
                        }
                        onExport={
                            handleExport
                        }
                        onClose={() =>
                            setShowExportModal(
                                false,
                            )
                        }
                    />
                )}
                <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                    <div
                        style={{
                            color: "#30363d",
                        }}
                        className="text-7xl select-none"
                    >
                        &#x29BF;
                    </div>
                    <p
                        style={{
                            color: "#8b949e",
                        }}
                        className="text-sm"
                    >
                        Waiting for
                        requests...
                    </p>
                    <p
                        style={{
                            color: "#6e7681",
                        }}
                        className="text-xs"
                    >
                        Send an HTTP
                        request to your
                        endpoint
                    </p>
                </div>
            </>
        );
    }
    return (
        <>
            {showExportModal && (
                <ExportModal
                    selectedColumns={
                        selectedColumns
                    }
                    onToggle={
                        toggleColumn
                    }
                    onExport={
                        handleExport
                    }
                    onClose={() =>
                        setShowExportModal(
                            false,
                        )
                    }
                />
            )}
            <div className="flex flex-col h-full">
                <div
                    style={{
                        borderColor:
                            "#30363d",
                    }}
                    className="flex items-center justify-between px-4 py-2 border-b shrink-0"
                >
                    <span
                        style={{
                            color: "#8b949e",
                        }}
                        className="text-xs"
                    >
                        {
                            requests.length
                        }{" "}
                        / 500 requests
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() =>
                                setShowExportModal(
                                    true,
                                )
                            }
                            style={{
                                color: "#8b949e",
                            }}
                            className="text-xs hover:opacity-80 transition-opacity flex items-center gap-1"
                            title="Export to CSV"
                        >
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                            >
                                <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" />
                                <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.97a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.779a.749.749 0 1 1 1.06-1.06l1.97 1.97Z" />
                            </svg>
                            Export CSV
                        </button>
                        <button
                            onClick={
                                onDeleteAll
                            }
                            style={{
                                color: "#f85149",
                            }}
                            className="text-xs hover:opacity-80 transition-opacity flex items-center gap-1"
                        >
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                            >
                                <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z" />
                            </svg>
                            Clear all
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {requests.map(
                        (req) => (
                            <div
                                key={
                                    req.id
                                }
                                onClick={() =>
                                    onSelect(
                                        req,
                                    )
                                }
                                style={{
                                    borderLeft:
                                        req.id ===
                                        selectedId
                                            ? "2px solid #58a6ff"
                                            : newRequestIds.has(
                                                    req.id,
                                                )
                                              ? "2px solid #3fb950"
                                              : "2px solid transparent",
                                    backgroundColor:
                                        req.id ===
                                        selectedId
                                            ? "#161b22"
                                            : newRequestIds.has(
                                                    req.id,
                                                )
                                              ? "#0d2117"
                                              : "transparent",
                                }}
                                className="group flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-[#161b22] transition-colors border-b border-[#21262d] relative"
                            >
                                {newRequestIds.has(
                                    req.id,
                                ) && (
                                    <span
                                        style={{
                                            backgroundColor:
                                                "#3fb950",
                                            color: "#0d1117",
                                        }}
                                        className="absolute right-2.5 top-2.5 text-[10px] font-bold px-1 rounded leading-4"
                                    >
                                        NEW
                                    </span>
                                )}
                                {!newRequestIds.has(
                                    req.id,
                                ) &&
                                    req.is_read ===
                                        false && (
                                        <span className="absolute right-2.5 top-2.5 w-1.5 h-1.5 rounded-full bg-[#58a6ff]" />
                                    )}
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <MethodBadge
                                            method={
                                                req.method
                                            }
                                        />
                                        <span
                                            style={{
                                                color: "#e6edf3",
                                            }}
                                            className="text-xs truncate flex-1 font-mono"
                                        >
                                            {req.path ||
                                                "/"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            style={{
                                                color: "#6e7681",
                                            }}
                                            className="text-xs"
                                        >
                                            {timeAgo(
                                                req.received_at,
                                            )}
                                        </span>
                                        {req.ip && (
                                            <span
                                                style={{
                                                    color: "#6e7681",
                                                }}
                                                className="text-xs"
                                            >
                                                &bull;{" "}
                                                {
                                                    req.ip
                                                }
                                            </span>
                                        )}
                                        {req.duration_ms !=
                                            null && (
                                            <span
                                                style={{
                                                    color:
                                                        req.duration_ms <
                                                        200
                                                            ? "#3fb950"
                                                            : req.duration_ms <
                                                                1000
                                                              ? "#d29922"
                                                              : "#f85149",
                                                    borderColor:
                                                        req.duration_ms <
                                                        200
                                                            ? "#3fb950"
                                                            : req.duration_ms <
                                                                1000
                                                              ? "#d29922"
                                                              : "#f85149",
                                                }}
                                                className="text-[10px] font-mono px-1 rounded border leading-4 shrink-0"
                                            >
                                                {
                                                    req.duration_ms
                                                }
                                                ms
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={(
                                        e,
                                    ) => {
                                        e.stopPropagation();
                                        onDelete(
                                            req.id,
                                        );
                                    }}
                                    style={{
                                        color: "#6e7681",
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#f85149] mt-0.5 shrink-0"
                                    title="Delete"
                                >
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 16 16"
                                        fill="currentColor"
                                    >
                                        <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                                    </svg>
                                </button>
                            </div>
                        ),
                    )}
                </div>
            </div>
        </>
    );
}

interface ExportModalProps {
    selectedColumns: Set<CsvColumnKey>;
    onToggle: (
        key: CsvColumnKey,
    ) => void;
    onExport: () => void;
    onClose: () => void;
}

function ExportModal({
    selectedColumns,
    onToggle,
    onExport,
    onClose,
}: ExportModalProps) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
                backgroundColor:
                    "rgba(0,0,0,0.6)",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor:
                        "#161b22",
                    borderColor:
                        "#30363d",
                }}
                className="w-72 rounded-lg border p-4 flex flex-col gap-3"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >
                <div className="flex items-center justify-between">
                    <span
                        style={{
                            color: "#e6edf3",
                        }}
                        className="text-sm font-semibold"
                    >
                        Choose columns
                    </span>
                    <button
                        onClick={
                            onClose
                        }
                        style={{
                            color: "#8b949e",
                        }}
                        className="hover:text-white transition-colors"
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                        >
                            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                        </svg>
                    </button>
                </div>
                <div className="flex flex-col gap-1.5">
                    {ALL_CSV_COLUMNS.map(
                        (col) => (
                            <label
                                key={
                                    col.key
                                }
                                className="flex items-center gap-2 cursor-pointer group"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedColumns.has(
                                        col.key,
                                    )}
                                    onChange={() =>
                                        onToggle(
                                            col.key,
                                        )
                                    }
                                    className="accent-[#58a6ff]"
                                />
                                <span
                                    style={{
                                        color: selectedColumns.has(
                                            col.key,
                                        )
                                            ? "#e6edf3"
                                            : "#8b949e",
                                    }}
                                    className="text-xs transition-colors"
                                >
                                    {
                                        col.label
                                    }
                                </span>
                            </label>
                        ),
                    )}
                </div>
                <button
                    onClick={onExport}
                    disabled={
                        selectedColumns.size ===
                        0
                    }
                    style={{
                        backgroundColor:
                            "#238636",
                        color: "#fff",
                        opacity:
                            selectedColumns.size ===
                            0
                                ? 0.4
                                : 1,
                    }}
                    className="w-full text-xs py-1.5 rounded transition-opacity hover:opacity-80 disabled:cursor-not-allowed"
                >
                    Export CSV
                </button>
            </div>
        </div>
    );
}
