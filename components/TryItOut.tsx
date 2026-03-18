"use client";

import { useState } from "react";

const METHODS = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
];
const METHOD_COLORS: Record<
    string,
    string
> = {
    GET: "#3fb950",
    POST: "#58a6ff",
    PUT: "#d29922",
    PATCH: "#bc8cff",
    DELETE: "#f85149",
};

interface Props {
    endpointId: string;
}

export default function TryItOut({
    endpointId,
}: Props) {
    const [method, setMethod] =
        useState("POST");
    const [body, setBody] = useState(
        '{\n  "hello": "world"\n}',
    );
    const [status, setStatus] =
        useState<number | null>(null);
    const [sending, setSending] =
        useState(false);
    const [error, setError] = useState<
        string | null
    >(null);

    const hookUrl =
        (typeof window !== "undefined"
            ? window.location.origin
            : "") +
        "/api/hook/" +
        endpointId;
    const hasBody =
        method !== "GET" &&
        method !== "DELETE";

    async function send() {
        setSending(true);
        setStatus(null);
        setError(null);
        try {
            const res = await fetch(
                hookUrl,
                {
                    method,
                    headers: hasBody
                        ? {
                              "Content-Type":
                                  "application/json",
                          }
                        : undefined,
                    body:
                        hasBody &&
                        body.trim()
                            ? body
                            : undefined,
                },
            );
            setStatus(res.status);
        } catch {
            setError(
                "Request failed — check your network or endpoint.",
            );
        } finally {
            setSending(false);
        }
    }

    const statusColor =
        status == null
            ? "#6e7681"
            : status >= 500
              ? "#f85149"
              : status >= 400
                ? "#d29922"
                : "#3fb950";

    return (
        <div
            style={{
                borderColor: "#30363d",
                backgroundColor:
                    "#161b22",
            }}
            className="rounded border p-3 flex flex-col gap-3"
        >
            <p
                style={{
                    color: "#8b949e",
                }}
                className="text-[10px] font-semibold uppercase tracking-wider"
            >
                Try it out
            </p>

            {/* Method + Send */}
            <div className="flex gap-2 items-center">
                <select
                    value={method}
                    onChange={(e) =>
                        setMethod(
                            e.target
                                .value,
                        )
                    }
                    style={{
                        backgroundColor:
                            "#0d1117",
                        color:
                            METHOD_COLORS[
                                method
                            ] ??
                            "#e6edf3",
                        borderColor:
                            "#30363d",
                    }}
                    className="text-xs font-bold px-2 py-1.5 rounded border cursor-pointer w-24"
                >
                    {METHODS.map(
                        (m) => (
                            <option
                                key={m}
                                value={
                                    m
                                }
                                style={{
                                    color:
                                        METHOD_COLORS[
                                            m
                                        ] ??
                                        "#e6edf3",
                                }}
                            >
                                {m}
                            </option>
                        ),
                    )}
                </select>
                <span
                    style={{
                        color: "#6e7681",
                        fontFamily:
                            "monospace",
                    }}
                    className="text-[10px] flex-1 truncate"
                >
                    {hookUrl}
                </span>
                <button
                    onClick={send}
                    disabled={sending}
                    style={{
                        backgroundColor:
                            sending
                                ? "#21262d"
                                : "#1f3a5c",
                        color: sending
                            ? "#6e7681"
                            : "#58a6ff",
                        borderColor:
                            sending
                                ? "#30363d"
                                : "#388bfd",
                    }}
                    className="text-xs px-3 py-1.5 rounded border shrink-0 hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
                >
                    {sending
                        ? "Sending…"
                        : "Send"}
                </button>
            </div>

            {/* Body editor */}
            {hasBody && (
                <textarea
                    value={body}
                    onChange={(e) =>
                        setBody(
                            e.target
                                .value,
                        )
                    }
                    style={{
                        backgroundColor:
                            "#0d1117",
                        color: "#e6edf3",
                        borderColor:
                            "#30363d",
                        fontFamily:
                            "monospace",
                        resize: "vertical",
                    }}
                    className="text-xs px-2 py-2 rounded border w-full"
                    rows={4}
                    placeholder="Request body (JSON)..."
                />
            )}

            {/* Result */}
            {(status != null ||
                error != null) && (
                <div className="flex items-center gap-2">
                    {status != null && (
                        <span
                            style={{
                                color: statusColor,
                                borderColor:
                                    statusColor,
                            }}
                            className="text-xs font-bold px-2 py-0.5 rounded border font-mono"
                        >
                            {status}
                        </span>
                    )}
                    <span
                        style={{
                            color: error
                                ? "#f85149"
                                : "#6e7681",
                        }}
                        className="text-xs"
                    >
                        {error ??
                            "Request sent — check the list for the new entry."}
                    </span>
                </div>
            )}
        </div>
    );
}
