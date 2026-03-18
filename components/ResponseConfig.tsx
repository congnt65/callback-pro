"use client";

import {
    useState,
    useEffect,
} from "react";
import { CustomResponse } from "@/lib/types";

interface Props {
    endpointId: string;
}

const STATUS_CODES = [
    200, 201, 204, 301, 302, 400, 401,
    403, 404, 422, 500, 502, 503,
];

const STATUS_LABELS: Record<
    number,
    string
> = {
    200: "OK",
    201: "Created",
    204: "No Content",
    301: "Moved Permanently",
    302: "Found",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    422: "Unprocessable Entity",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
};

export default function ResponseConfig({
    endpointId,
}: Props) {
    const [config, setConfig] =
        useState<CustomResponse>({
            status: 200,
            headers: {},
            body: '{\n  "message": "ok"\n}',
            contentType:
                "application/json",
            delayMs: 0,
        });
    const [saving, setSaving] =
        useState(false);
    const [saved, setSaved] =
        useState(false);
    const [headerKey, setHeaderKey] =
        useState("");
    const [
        headerValue,
        setHeaderValue,
    ] = useState("");

    useEffect(() => {
        fetch(
            "/api/endpoint/" +
                endpointId +
                "/response",
        )
            .then((r) => r.json())
            .then((data) => {
                if (
                    data.error == null
                ) {
                    setConfig({
                        status:
                            data.status ??
                            200,
                        headers:
                            data.headers ??
                            {},
                        body:
                            data.body ??
                            "",
                        contentType:
                            data.contentType ??
                            "application/json",
                        delayMs:
                            data.delayMs ??
                            0,
                    });
                }
            });
    }, [endpointId]);

    async function save() {
        setSaving(true);
        try {
            await fetch(
                "/api/endpoint/" +
                    endpointId +
                    "/response",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify(
                        config,
                    ),
                },
            );
            setSaved(true);
            setTimeout(
                () => setSaved(false),
                2000,
            );
        } finally {
            setSaving(false);
        }
    }

    function addHeader() {
        const key = headerKey.trim();
        if (key.length === 0) return;
        setConfig((prev) => ({
            ...prev,
            headers: {
                ...prev.headers,
                [key]: headerValue,
            },
        }));
        setHeaderKey("");
        setHeaderValue("");
    }

    function removeHeader(key: string) {
        setConfig((prev) => {
            const h = {
                ...prev.headers,
            };
            delete h[key];
            return {
                ...prev,
                headers: h,
            };
        });
    }

    const inputStyle = {
        backgroundColor: "#0d1117",
        color: "#e6edf3",
        borderColor: "#30363d",
    };
    const statusColor =
        config.status >= 500
            ? "#f85149"
            : config.status >= 400
              ? "#d29922"
              : config.status >= 300
                ? "#bc8cff"
                : "#3fb950";

    return (
        <div className="flex flex-col h-full overflow-y-auto p-4 gap-5">
            <div className="flex items-center justify-between">
                <h3
                    style={{
                        color: "#e6edf3",
                    }}
                    className="text-sm font-semibold"
                >
                    Custom Response
                </h3>
                <button
                    onClick={save}
                    disabled={saving}
                    style={{
                        backgroundColor:
                            saved
                                ? "#1f4d27"
                                : "#1f3a5c",
                        color: saved
                            ? "#3fb950"
                            : "#58a6ff",
                        borderColor:
                            saved
                                ? "#2ea043"
                                : "#388bfd",
                    }}
                    className="text-xs px-3 py-1.5 rounded border disabled:opacity-60 transition-colors"
                >
                    {saving
                        ? "Saving..."
                        : saved
                          ? "Saved"
                          : "Save"}
                </button>
            </div>

            <div>
                <label
                    style={{
                        color: "#8b949e",
                    }}
                    className="text-xs block mb-1.5"
                >
                    Status Code
                </label>
                <div className="flex items-center gap-2">
                    <select
                        value={
                            config.status
                        }
                        onChange={(e) =>
                            setConfig(
                                (
                                    prev,
                                ) => ({
                                    ...prev,
                                    status: Number(
                                        e
                                            .target
                                            .value,
                                    ),
                                }),
                            )
                        }
                        style={{
                            ...inputStyle,
                            borderColor:
                                statusColor,
                        }}
                        className="text-xs px-2 py-1.5 rounded border flex-1 cursor-pointer"
                    >
                        {STATUS_CODES.map(
                            (code) => (
                                <option
                                    key={
                                        code
                                    }
                                    value={
                                        code
                                    }
                                >
                                    {
                                        code
                                    }{" "}
                                    -{" "}
                                    {
                                        STATUS_LABELS[
                                            code
                                        ]
                                    }
                                </option>
                            ),
                        )}
                    </select>
                    <span
                        style={{
                            color: statusColor,
                            backgroundColor:
                                "#21262d",
                        }}
                        className="text-xs font-bold px-2 py-1.5 rounded min-w-12 text-center"
                    >
                        {config.status}
                    </span>
                </div>
            </div>

            <div>
                <label
                    style={{
                        color: "#8b949e",
                    }}
                    className="text-xs block mb-1.5"
                >
                    Content-Type
                </label>
                <select
                    value={
                        config.contentType
                    }
                    onChange={(e) =>
                        setConfig(
                            (prev) => ({
                                ...prev,
                                contentType:
                                    e
                                        .target
                                        .value,
                            }),
                        )
                    }
                    style={inputStyle}
                    className="w-full text-xs px-2 py-1.5 rounded border cursor-pointer"
                >
                    <option value="application/json">
                        application/json
                    </option>
                    <option value="text/plain">
                        text/plain
                    </option>
                    <option value="text/html">
                        text/html
                    </option>
                    <option value="application/xml">
                        application/xml
                    </option>
                    <option value="application/x-www-form-urlencoded">
                        application/x-www-form-urlencoded
                    </option>
                </select>
            </div>

            <div>
                <label
                    style={{
                        color: "#8b949e",
                    }}
                    className="text-xs block mb-1.5"
                >
                    Body
                </label>
                <textarea
                    value={config.body}
                    onChange={(e) =>
                        setConfig(
                            (prev) => ({
                                ...prev,
                                body: e
                                    .target
                                    .value,
                            }),
                        )
                    }
                    style={{
                        ...inputStyle,
                        resize: "vertical",
                        fontFamily:
                            "monospace",
                        minHeight: 100,
                    }}
                    className="w-full text-xs px-2 py-2 rounded border"
                    placeholder="Response body..."
                    rows={6}
                />
            </div>

            <div>
                <label
                    style={{
                        color: "#8b949e",
                    }}
                    className="text-xs block mb-1.5"
                >
                    Response Delay
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min={0}
                        max={30000}
                        step={100}
                        value={
                            config.delayMs
                        }
                        onChange={(e) =>
                            setConfig(
                                (
                                    prev,
                                ) => ({
                                    ...prev,
                                    delayMs:
                                        Math.max(
                                            0,
                                            Math.min(
                                                30000,
                                                Number(
                                                    e
                                                        .target
                                                        .value,
                                                ) ||
                                                    0,
                                            ),
                                        ),
                                }),
                            )
                        }
                        style={{
                            ...inputStyle,
                        }}
                        className="text-xs px-2 py-1.5 rounded border w-28"
                    />
                    <span
                        style={{
                            color: "#6e7681",
                        }}
                        className="text-xs"
                    >
                        ms (0 – 30000)
                    </span>
                </div>
            </div>

            <div>
                <label
                    style={{
                        color: "#8b949e",
                    }}
                    className="text-xs block mb-1.5"
                >
                    Headers
                </label>
                {Object.entries(
                    config.headers,
                ).map(([k, v]) => (
                    <div
                        key={k}
                        className="flex items-center gap-1 mb-1"
                    >
                        <span
                            style={{
                                color: "#8b949e",
                                backgroundColor:
                                    "#161b22",
                                borderColor:
                                    "#30363d",
                            }}
                            className="text-xs px-2 py-1 rounded border flex-1 truncate font-mono"
                        >
                            {k}:{" "}
                            {String(v)}
                        </span>
                        <button
                            onClick={() =>
                                removeHeader(
                                    k,
                                )
                            }
                            style={{
                                color: "#f85149",
                            }}
                            className="text-xs hover:opacity-80 px-1.5 shrink-0"
                        >
                            x
                        </button>
                    </div>
                ))}
                <div className="flex gap-1 mt-1">
                    <input
                        value={
                            headerKey
                        }
                        onChange={(e) =>
                            setHeaderKey(
                                e.target
                                    .value,
                            )
                        }
                        onKeyDown={(
                            e,
                        ) => {
                            if (
                                e.key ===
                                "Enter"
                            )
                                addHeader();
                        }}
                        style={
                            inputStyle
                        }
                        className="text-xs px-2 py-1.5 rounded border flex-1 min-w-0"
                        placeholder="Header name"
                    />
                    <input
                        value={
                            headerValue
                        }
                        onChange={(e) =>
                            setHeaderValue(
                                e.target
                                    .value,
                            )
                        }
                        onKeyDown={(
                            e,
                        ) => {
                            if (
                                e.key ===
                                "Enter"
                            )
                                addHeader();
                        }}
                        style={
                            inputStyle
                        }
                        className="text-xs px-2 py-1.5 rounded border flex-1 min-w-0"
                        placeholder="Value"
                    />
                    <button
                        onClick={
                            addHeader
                        }
                        style={{
                            backgroundColor:
                                "#21262d",
                            color: "#8b949e",
                            borderColor:
                                "#30363d",
                        }}
                        className="text-xs px-2 py-1.5 rounded border hover:opacity-80"
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    );
}
