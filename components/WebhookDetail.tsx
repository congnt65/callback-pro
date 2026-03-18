"use client";

import { useState } from "react";
import { WebhookRequest } from "@/lib/types";

function tryPrettyJson(
    s: string | null,
): string | null {
    if (s == null) return null;
    try {
        return JSON.stringify(
            JSON.parse(s),
            null,
            2,
        );
    } catch {
        return s;
    }
}

function HeaderRow({
    name,
    value,
}: {
    name: string;
    value: string;
}) {
    return (
        <div className="flex gap-2 py-1 border-b border-[#21262d] text-xs">
            <span
                style={{
                    color: "#8b949e",
                    minWidth: 180,
                }}
                className="shrink-0 break-all"
            >
                {name}
            </span>
            <span
                style={{
                    color: "#e6edf3",
                }}
                className="break-all"
            >
                {value}
            </span>
        </div>
    );
}

interface Props {
    request: WebhookRequest;
}

type Tab = "headers" | "body" | "query";

export default function WebhookDetail({
    request,
}: Props) {
    const [tab, setTab] =
        useState<Tab>("body");
    const [copied, setCopied] =
        useState(false);

    const headers =
        request.headers as Record<
            string,
            string
        >;
    const queryParams =
        request.query_params as Record<
            string,
            string
        >;
    const prettyBody = tryPrettyJson(
        request.body,
    );

    function copy(text: string) {
        navigator.clipboard.writeText(
            text,
        );
        setCopied(true);
        setTimeout(
            () => setCopied(false),
            1500,
        );
    }

    const tabs: {
        id: Tab;
        label: string;
        count?: number;
    }[] = [
        { id: "body", label: "Body" },
        {
            id: "headers",
            label: "Headers",
            count: Object.keys(headers)
                .length,
        },
        {
            id: "query",
            label: "Query",
            count: Object.keys(
                queryParams,
            ).length,
        },
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Request info bar */}
            <div
                style={{
                    borderColor:
                        "#30363d",
                    backgroundColor:
                        "#161b22",
                }}
                className="px-4 py-3 border-b shrink-0"
            >
                <div className="flex items-center gap-2 mb-1">
                    <MethodBadge
                        method={
                            request.method
                        }
                    />
                    <span
                        style={{
                            color: "#e6edf3",
                        }}
                        className="text-sm font-mono truncate"
                    >
                        {request.path ||
                            "/"}
                    </span>
                </div>
                <div
                    className="flex items-center gap-3 text-xs"
                    style={{
                        color: "#6e7681",
                    }}
                >
                    <span>
                        {new Date(
                            request.received_at,
                        ).toLocaleString()}
                    </span>
                    {request.ip && (
                        <span>
                            &bull;{" "}
                            {request.ip}
                        </span>
                    )}
                    {request.duration_ms !=
                        null && (
                        <span>
                            &bull;{" "}
                            <span
                                style={{
                                    color: "#3fb950",
                                }}
                            >
                                {
                                    request.duration_ms
                                }
                                ms
                            </span>
                        </span>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div
                style={{
                    borderColor:
                        "#30363d",
                }}
                className="flex gap-0 border-b shrink-0 px-4"
            >
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() =>
                            setTab(t.id)
                        }
                        style={{
                            color:
                                tab ===
                                t.id
                                    ? "#58a6ff"
                                    : "#8b949e",
                            borderBottom:
                                tab ===
                                t.id
                                    ? "2px solid #58a6ff"
                                    : "2px solid transparent",
                        }}
                        className="px-3 py-2 text-xs transition-colors hover:text-[#e6edf3] flex items-center gap-1.5"
                    >
                        {t.label}
                        {t.count !==
                            undefined &&
                            t.count >
                                0 && (
                                <span
                                    style={{
                                        backgroundColor:
                                            "#21262d",
                                        color: "#8b949e",
                                    }}
                                    className="px-1.5 py-0.5 rounded text-xs"
                                >
                                    {
                                        t.count
                                    }
                                </span>
                            )}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
                {tab === "body" && (
                    <div>
                        {request.body ? (
                            <div className="relative">
                                <button
                                    onClick={() =>
                                        copy(
                                            prettyBody ??
                                                request.body ??
                                                "",
                                        )
                                    }
                                    style={{
                                        color: copied
                                            ? "#3fb950"
                                            : "#8b949e",
                                        backgroundColor:
                                            "#21262d",
                                    }}
                                    className="absolute top-2 right-2 text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity z-10"
                                >
                                    {copied
                                        ? "Copied!"
                                        : "Copy"}
                                </button>
                                <pre
                                    style={{
                                        backgroundColor:
                                            "#0d1117",
                                        color: "#e6edf3",
                                        borderColor:
                                            "#30363d",
                                    }}
                                    className="text-xs p-4 rounded border overflow-x-auto whitespace-pre-wrap break-all"
                                >
                                    {
                                        prettyBody
                                    }
                                </pre>
                            </div>
                        ) : (
                            <p
                                style={{
                                    color: "#8b949e",
                                }}
                                className="text-xs italic"
                            >
                                No body
                            </p>
                        )}
                    </div>
                )}

                {tab === "headers" && (
                    <div>
                        {Object.keys(
                            headers,
                        ).length ===
                        0 ? (
                            <p
                                style={{
                                    color: "#8b949e",
                                }}
                                className="text-xs italic"
                            >
                                No
                                headers
                            </p>
                        ) : (
                            Object.entries(
                                headers,
                            ).map(
                                ([
                                    k,
                                    v,
                                ]) => (
                                    <HeaderRow
                                        key={
                                            k
                                        }
                                        name={
                                            k
                                        }
                                        value={
                                            v
                                        }
                                    />
                                ),
                            )
                        )}
                    </div>
                )}

                {tab === "query" && (
                    <div>
                        {Object.keys(
                            queryParams,
                        ).length ===
                        0 ? (
                            <p
                                style={{
                                    color: "#8b949e",
                                }}
                                className="text-xs italic"
                            >
                                No query
                                parameters
                            </p>
                        ) : (
                            Object.entries(
                                queryParams,
                            ).map(
                                ([
                                    k,
                                    v,
                                ]) => (
                                    <HeaderRow
                                        key={
                                            k
                                        }
                                        name={
                                            k
                                        }
                                        value={
                                            v
                                        }
                                    />
                                ),
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function MethodBadge({
    method,
}: {
    method: string;
}) {
    const colors: Record<
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
    const color =
        colors[method] ?? "#8b949e";
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
