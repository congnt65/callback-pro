"use client";

import {
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { WebhookRequest } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import WebhookList from "@/components/WebhookList";
import type { CsvColumnKey } from "@/components/WebhookList";
import WebhookDetail from "@/components/WebhookDetail";
import ResponseConfig from "@/components/ResponseConfig";
import EndpointHeader from "@/components/EndpointHeader";
import TryItOut from "@/components/TryItOut";

const STORAGE_KEY =
    "callbackpro_endpoint";

function getTodayKey() {
    return new Date()
        .toISOString()
        .slice(0, 10);
}

function getOrCreateEndpointId(): string {
    const today = getTodayKey();
    try {
        const stored =
            localStorage.getItem(
                STORAGE_KEY,
            );
        if (stored) {
            const parsed =
                JSON.parse(stored);
            if (
                parsed.date === today &&
                parsed.id
            )
                return parsed.id;
        }
    } catch {
        /* ignore */
    }
    const id = uuidv4();
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            date: today,
            id,
        }),
    );
    return id;
}

type Panel = "requests" | "response";

export default function Home() {
    const [endpointId, setEndpointId] =
        useState<string | null>(null);
    const [requests, setRequests] =
        useState<WebhookRequest[]>([]);
    const [
        selectedRequest,
        setSelectedRequest,
    ] = useState<WebhookRequest | null>(
        null,
    );
    const [
        requestCount,
        setRequestCount,
    ] = useState(0);
    const [panel, setPanel] =
        useState<Panel>("requests");
    const [loading, setLoading] =
        useState(true);
    const [
        newRequestIds,
        setNewRequestIds,
    ] = useState<Set<string>>(
        new Set(),
    );
    const realtimeRef =
        useRef<ReturnType<
            typeof supabase.channel
        > | null>(null);

    useEffect(() => {
        const id =
            getOrCreateEndpointId();
        setEndpointId(id);
        initEndpoint(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initEndpoint = useCallback(
        async (id: string) => {
            await fetch(
                "/api/endpoint",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify(
                        { id },
                    ),
                },
            );
            const res = await fetch(
                "/api/requests/" + id,
            );
            const data =
                await res.json();
            const requests =
                Array.isArray(data)
                    ? data
                    : [];
            setRequests(requests);
            const epRes = await fetch(
                "/api/endpoint/" + id,
            );
            const ep =
                await epRes.json();
            if (ep.error == null)
                setRequestCount(
                    Math.max(
                        requests.length,
                        ep.request_count ??
                            0,
                    ),
                );
            setLoading(false);
        },
        [],
    );

    useEffect(() => {
        if (endpointId == null) return;

        const channel = supabase
            .channel(
                "requests:" +
                    endpointId,
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "requests",
                    filter:
                        "endpoint_id=eq." +
                        endpointId,
                },
                (payload) => {
                    const newReq =
                        payload.new as WebhookRequest;
                    setRequests(
                        (prev) => [
                            newReq,
                            ...prev,
                        ],
                    );
                    setRequestCount(
                        (prev) =>
                            prev + 1,
                    );
                    setNewRequestIds(
                        (prev) =>
                            new Set([
                                ...prev,
                                newReq.id,
                            ]),
                    );
                    setTimeout(() => {
                        setNewRequestIds(
                            (prev) => {
                                const next =
                                    new Set(
                                        prev,
                                    );
                                next.delete(
                                    newReq.id,
                                );
                                return next;
                            },
                        );
                    }, 2000);
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "requests",
                    filter:
                        "endpoint_id=eq." +
                        endpointId,
                },
                (payload) => {
                    setRequests(
                        (prev) =>
                            prev.filter(
                                (r) =>
                                    r.id !==
                                    payload
                                        .old
                                        .id,
                            ),
                    );
                },
            )
            .subscribe();

        realtimeRef.current = channel;
        return () => {
            supabase.removeChannel(
                channel,
            );
        };
    }, [endpointId]);

    async function handleSelect(
        req: WebhookRequest,
    ) {
        setSelectedRequest(req);
        if (req.is_read === false) {
            setRequests((prev) =>
                prev.map((r) =>
                    r.id === req.id
                        ? {
                              ...r,
                              is_read: true,
                          }
                        : r,
                ),
            );
            await fetch(
                "/api/requests/" +
                    endpointId +
                    "/" +
                    req.id,
                { method: "PATCH" },
            );
        }
    }

    async function handleDelete(
        id: string,
    ) {
        setRequests((prev) =>
            prev.filter(
                (r) => r.id !== id,
            ),
        );
        if (selectedRequest?.id === id)
            setSelectedRequest(null);
        setRequestCount((prev) =>
            Math.max(0, prev - 1),
        );
        await fetch(
            "/api/requests/" +
                endpointId +
                "/" +
                id,
            { method: "DELETE" },
        );
    }

    async function handleDeleteAll() {
        setRequests([]);
        setSelectedRequest(null);
        setRequestCount(0);
        await fetch(
            "/api/requests/" +
                endpointId,
            { method: "DELETE" },
        );
    }

    async function generateNewEndpoint() {
        const id = uuidv4();
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                date: getTodayKey(),
                id,
            }),
        );
        setRequests([]);
        setSelectedRequest(null);
        setRequestCount(0);
        setLoading(true);
        setEndpointId(id);
        await initEndpoint(id);
    }

    function exportToCsv(
        columns: CsvColumnKey[],
    ) {
        const escape = (v: string) =>
            '"' +
            v.replaceAll('"', '""') +
            '"';

        // Collect all unique header keys across all requests
        const headerKeys: string[] = [];
        if (
            columns.includes("headers")
        ) {
            const seen =
                new Set<string>();
            for (const r of requests) {
                for (const k of Object.keys(
                    r.headers ?? {},
                )) {
                    if (!seen.has(k)) {
                        seen.add(k);
                        headerKeys.push(
                            k,
                        );
                    }
                }
            }
        }

        // Collect all unique top-level body keys (JSON objects only)
        const bodyKeys: string[] = [];
        if (columns.includes("body")) {
            const seen =
                new Set<string>();
            for (const r of requests) {
                try {
                    const parsed =
                        r.body
                            ? JSON.parse(
                                  r.body,
                              )
                            : null;
                    if (
                        parsed &&
                        typeof parsed ===
                            "object" &&
                        !Array.isArray(
                            parsed,
                        )
                    ) {
                        for (const k of Object.keys(
                            parsed as object,
                        )) {
                            if (
                                !seen.has(
                                    k,
                                )
                            ) {
                                seen.add(
                                    k,
                                );
                                bodyKeys.push(
                                    k,
                                );
                            }
                        }
                    }
                } catch {
                    /* not JSON */
                }
            }
        }

        // Build CSV header row — headers/body expand into per-key columns
        const csvHeaders: string[] = [];
        for (const col of columns) {
            if (col === "headers") {
                if (
                    headerKeys.length >
                    0
                ) {
                    for (const k of headerKeys)
                        csvHeaders.push(
                            "header." +
                                k,
                        );
                } else
                    csvHeaders.push(
                        "headers",
                    );
            } else if (col === "body") {
                if (
                    bodyKeys.length > 0
                ) {
                    for (const k of bodyKeys)
                        csvHeaders.push(
                            "body." + k,
                        );
                } else
                    csvHeaders.push(
                        "body",
                    );
            } else {
                csvHeaders.push(col);
            }
        }

        // Build data rows
        const rows = requests.map(
            (r) => {
                const cells: string[] =
                    [];
                for (const col of columns) {
                    if (
                        col ===
                        "headers"
                    ) {
                        const h =
                            (r.headers ??
                                {}) as Record<
                                string,
                                string
                            >;
                        if (
                            headerKeys.length >
                            0
                        ) {
                            for (const k of headerKeys)
                                cells.push(
                                    escape(
                                        h[
                                            k
                                        ] ??
                                            "",
                                    ),
                                );
                        } else {
                            cells.push(
                                escape(
                                    JSON.stringify(
                                        h,
                                    ),
                                ),
                            );
                        }
                    } else if (
                        col === "body"
                    ) {
                        if (
                            bodyKeys.length >
                            0
                        ) {
                            let parsed: Record<
                                string,
                                unknown
                            > = {};
                            try {
                                parsed =
                                    r.body
                                        ? (JSON.parse(
                                              r.body,
                                          ) as Record<
                                              string,
                                              unknown
                                          >)
                                        : {};
                            } catch {
                                /* */
                            }
                            for (const k of bodyKeys) {
                                const v =
                                    parsed[
                                        k
                                    ];
                                cells.push(
                                    escape(
                                        v ==
                                            null
                                            ? ""
                                            : typeof v ===
                                                "object"
                                              ? JSON.stringify(
                                                    v,
                                                )
                                              : String(
                                                    v,
                                                ),
                                    ),
                                );
                            }
                        } else {
                            cells.push(
                                escape(
                                    r.body ??
                                        "",
                                ),
                            );
                        }
                    } else {
                        switch (col) {
                            case "id":
                                cells.push(
                                    escape(
                                        r.id,
                                    ),
                                );
                                break;
                            case "received_at":
                                cells.push(
                                    escape(
                                        r.received_at,
                                    ),
                                );
                                break;
                            case "method":
                                cells.push(
                                    escape(
                                        r.method,
                                    ),
                                );
                                break;
                            case "path":
                                cells.push(
                                    escape(
                                        r.path ||
                                            "/",
                                    ),
                                );
                                break;
                            case "query_params":
                                cells.push(
                                    escape(
                                        JSON.stringify(
                                            r.query_params ??
                                                {},
                                        ),
                                    ),
                                );
                                break;
                            case "ip":
                                cells.push(
                                    escape(
                                        r.ip ??
                                            "",
                                    ),
                                );
                                break;
                            case "duration_ms":
                                cells.push(
                                    escape(
                                        r.duration_ms ==
                                            null
                                            ? ""
                                            : String(
                                                  r.duration_ms,
                                              ),
                                    ),
                                );
                                break;
                        }
                    }
                }
                return cells.join(",");
            },
        );

        const csv = [
            csvHeaders.join(","),
            ...rows,
        ].join("\n");
        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;",
        });
        const url =
            URL.createObjectURL(blob);
        const a =
            document.createElement("a");
        a.href = url;
        a.download =
            "requests-" +
            endpointId +
            ".csv";
        a.click();
        URL.revokeObjectURL(url);
    }

    if (loading) {
        return (
            <div
                style={{
                    backgroundColor:
                        "#0d1117",
                    color: "#8b949e",
                }}
                className="h-screen flex items-center justify-center text-sm"
            >
                Initializing endpoint...
            </div>
        );
    }

    if (endpointId == null) return null;

    return (
        <div
            style={{
                backgroundColor:
                    "#0d1117",
            }}
            className="h-screen flex flex-col overflow-hidden"
        >
            <header
                style={{
                    borderColor:
                        "#30363d",
                    backgroundColor:
                        "#161b22",
                }}
                className="flex items-center justify-between px-4 h-12 border-b shrink-0"
            >
                <div className="flex items-center gap-2">
                    <span
                        style={{
                            color: "#58a6ff",
                        }}
                        className="text-sm font-bold tracking-tight"
                    >
                        CallbackPro
                    </span>
                    <span
                        style={{
                            color: "#30363d",
                        }}
                    >
                        |
                    </span>
                    <span
                        style={{
                            color: "#6e7681",
                        }}
                        className="text-xs"
                    >
                        Webhook
                        Inspector
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        style={{
                            backgroundColor:
                                newRequestIds.size >
                                0
                                    ? "#3fb950"
                                    : "#2ea043",
                            opacity:
                                newRequestIds.size >
                                0
                                    ? 1
                                    : 0.4,
                        }}
                        className="w-2 h-2 rounded-full transition-all duration-300"
                    />
                    <span
                        style={{
                            color: "#8b949e",
                        }}
                        className="text-xs"
                    >
                        Live
                    </span>
                </div>
            </header>

            <EndpointHeader
                endpointId={endpointId}
                requestCount={
                    requestCount
                }
                onGenerate={
                    generateNewEndpoint
                }
            />

            <div className="flex flex-1 min-h-0">
                <div
                    style={{
                        borderColor:
                            "#30363d",
                        width: 300,
                        minWidth: 200,
                    }}
                    className="flex flex-col border-r shrink-0 overflow-hidden"
                >
                    <div
                        style={{
                            borderColor:
                                "#30363d",
                        }}
                        className="flex border-b shrink-0"
                    >
                        <button
                            onClick={() =>
                                setPanel(
                                    "requests",
                                )
                            }
                            style={{
                                color:
                                    panel ===
                                    "requests"
                                        ? "#e6edf3"
                                        : "#8b949e",
                                borderBottom:
                                    panel ===
                                    "requests"
                                        ? "2px solid #58a6ff"
                                        : "2px solid transparent",
                            }}
                            className="flex-1 text-xs py-2 px-3 transition-colors hover:text-white"
                        >
                            Requests
                        </button>
                        <button
                            onClick={() =>
                                setPanel(
                                    "response",
                                )
                            }
                            style={{
                                color:
                                    panel ===
                                    "response"
                                        ? "#e6edf3"
                                        : "#8b949e",
                                borderBottom:
                                    panel ===
                                    "response"
                                        ? "2px solid #58a6ff"
                                        : "2px solid transparent",
                            }}
                            className="flex-1 text-xs py-2 px-3 transition-colors hover:text-white"
                        >
                            Response
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {panel ===
                        "requests" ? (
                            <WebhookList
                                requests={
                                    requests
                                }
                                selectedId={
                                    selectedRequest?.id ??
                                    null
                                }
                                hookUrl={
                                    (typeof window !==
                                    "undefined"
                                        ? window
                                              .location
                                              .origin
                                        : "") +
                                    "/api/hook/" +
                                    endpointId
                                }
                                onSelect={
                                    handleSelect
                                }
                                onDelete={
                                    handleDelete
                                }
                                onDeleteAll={
                                    handleDeleteAll
                                }
                                onExportCsv={
                                    exportToCsv
                                }
                                newRequestIds={
                                    newRequestIds
                                }
                            />
                        ) : (
                            <ResponseConfig
                                endpointId={
                                    endpointId
                                }
                            />
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    {selectedRequest ? (
                        <WebhookDetail
                            request={
                                selectedRequest
                            }
                            onClose={() =>
                                setSelectedRequest(
                                    null,
                                )
                            }
                        />
                    ) : (
                        <div
                            style={{
                                color: "#6e7681",
                                backgroundColor:
                                    "#0d1117",
                            }}
                            className="flex flex-col h-full overflow-y-auto p-6 gap-6"
                        >
                            {/* Header */}
                            <div className="flex flex-col gap-1">
                                <p
                                    style={{
                                        color: "#e6edf3",
                                    }}
                                    className="text-sm font-semibold"
                                >
                                    No
                                    request
                                    selected
                                </p>
                                <p
                                    style={{
                                        color: "#6e7681",
                                    }}
                                    className="text-xs"
                                >
                                    Click
                                    a
                                    request
                                    on
                                    the
                                    left
                                    to
                                    inspect
                                    its
                                    details,
                                    or
                                    send
                                    a
                                    new
                                    one
                                    to
                                    your
                                    endpoint.
                                </p>
                            </div>

                            {/* Stats row */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    {
                                        label: "Requests captured",
                                        value: String(
                                            requestCount,
                                        ),
                                    },
                                    {
                                        label: "Capacity remaining",
                                        value: String(
                                            Math.max(
                                                0,
                                                500 -
                                                    requestCount,
                                            ),
                                        ),
                                    },
                                ].map(
                                    ({
                                        label,
                                        value,
                                    }) => (
                                        <div
                                            key={
                                                label
                                            }
                                            style={{
                                                backgroundColor:
                                                    "#161b22",
                                                borderColor:
                                                    "#30363d",
                                            }}
                                            className="rounded border p-3 flex flex-col gap-1"
                                        >
                                            <span
                                                style={{
                                                    color: "#e6edf3",
                                                }}
                                                className="text-lg font-bold font-mono"
                                            >
                                                {
                                                    value
                                                }
                                            </span>
                                            <span
                                                style={{
                                                    color: "#6e7681",
                                                }}
                                                className="text-xs"
                                            >
                                                {
                                                    label
                                                }
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>

                            {/* Try it out */}
                            <TryItOut
                                endpointId={
                                    endpointId
                                }
                            />

                            {/* What you can inspect */}
                            <div
                                style={{
                                    borderColor:
                                        "#30363d",
                                }}
                                className="border-t pt-4 flex flex-col gap-2"
                            >
                                <p
                                    style={{
                                        color: "#8b949e",
                                    }}
                                    className="text-[10px] font-semibold uppercase tracking-wider"
                                >
                                    What
                                    you
                                    can
                                    inspect
                                </p>
                                {[
                                    [
                                        "Headers",
                                        "All request headers (Vercel internals stripped)",
                                    ],
                                    [
                                        "Body",
                                        "Raw or pretty-printed JSON body",
                                    ],
                                    [
                                        "Query params",
                                        "Parsed key-value pairs from the URL",
                                    ],
                                    [
                                        "Duration",
                                        "Server-side processing time in ms",
                                    ],
                                    [
                                        "IP address",
                                        "Originating client IP",
                                    ],
                                ].map(
                                    ([
                                        title,
                                        desc,
                                    ]) => (
                                        <div
                                            key={
                                                title
                                            }
                                            className="flex gap-2"
                                        >
                                            <span
                                                style={{
                                                    color: "#58a6ff",
                                                    minWidth: 90,
                                                }}
                                                className="text-xs font-mono shrink-0"
                                            >
                                                {
                                                    title
                                                }
                                            </span>
                                            <span
                                                style={{
                                                    color: "#6e7681",
                                                }}
                                                className="text-xs"
                                            >
                                                {
                                                    desc
                                                }
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>

                            {/* Tips */}
                            <div
                                style={{
                                    borderColor:
                                        "#30363d",
                                }}
                                className="border-t pt-4 flex flex-col gap-2"
                            >
                                <p
                                    style={{
                                        color: "#8b949e",
                                    }}
                                    className="text-[10px] font-semibold uppercase tracking-wider"
                                >
                                    Tips
                                </p>
                                {[
                                    "Use the Response tab to simulate custom status codes, headers, and body.",
                                    "Set a response delay to test timeout handling in your app.",
                                    "Export all captured requests to CSV from the list toolbar.",
                                    "Click + New in the endpoint bar to generate a fresh endpoint.",
                                ].map(
                                    (
                                        tip,
                                    ) => (
                                        <div
                                            key={
                                                tip
                                            }
                                            className="flex items-start gap-2"
                                        >
                                            <span
                                                style={{
                                                    color: "#3fb950",
                                                }}
                                                className="text-xs shrink-0"
                                            >
                                                →
                                            </span>
                                            <span
                                                style={{
                                                    color: "#6e7681",
                                                }}
                                                className="text-xs"
                                            >
                                                {
                                                    tip
                                                }
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
