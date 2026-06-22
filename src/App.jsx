import { useState, useRef } from "react";

export default function Recorder() {
    const [recording, setRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [song, setSong] = useState(null);
    const [clicked, setClicked] = useState(false);

    const mediaRecorderRef = useRef(null);
    const wsRef = useRef(null);
    const streamRef = useRef(null);

    // -----------------------------
    // START RECORDING (WS VERSION)
    // -----------------------------
    const startRecording = async () => {
        setSong(null);
        setLoading(false);

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });

        streamRef.current = stream;

        const recorder = new MediaRecorder(stream, {
            mimeType: "audio/webm",
        });

        mediaRecorderRef.current = recorder;

        // -----------------------------
        // CONNECT WEBSOCKET
        // -----------------------------
        const ws = new WebSocket("wss://music-cup-backend.onrender.com/ws/recognize");
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("WebSocket connected");
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);

            if (msg.type === "SEARCHING") {
                setLoading(true);
            }

            if (msg.type === "NOT_FOUND") {
                setLoading(false);
                stopRecording();
                alert("Song not found");
            }

            if (msg.type === "FOUND") {
                setSong({
                    success: true,
                    title: msg.data.title,
                    artist: msg.data.artist,
                    album: msg.data.album,
                    cover: msg.data.cover,
                    artist_image: msg.data.artist_image,
                    lyrics: msg.data.lyrics,
                    spotify_url:
                        msg.data?.spotify?.external_urls?.spotify ||
                        msg.data.spotify_url,
                });

                stopRecording();
            }
        };

        // ws.onmessage = (event) => {
        //     const msg = JSON.parse(event.data);
        //
        //     if (msg.type === "SEARCHING") {
        //         setLoading(true);
        //     }
        //
        //     if (msg.type === "FOUND") {
        //         setSong({
        //             success: true,
        //             title: msg.data.title,
        //             artist: msg.data.artist,
        //             album: msg.data.album,
        //             cover: msg.data.cover,
        //             artist_image: msg.data.artist_image,
        //             lyrics: msg.data.lyrics,
        //             spotify_url:
        //                 msg.data?.spotify?.external_urls?.spotify ||
        //                 msg.data.spotify_url,
        //         });
        //         stopRecording();
        //     }
        // };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
        };

        ws.onclose = () => {
            console.log("WebSocket closed");
        };

        // -----------------------------
        // SEND AUDIO CHUNKS
        // -----------------------------
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0 && ws.readyState === 1) {
                ws.send(e.data);
            }
        };

        // send chunk every 0.5s second
        recorder.start(500);

        setRecording(true);

        // ADD TimeOut
        setTimeout(() => {
            if (!song && recording) {
                setLoading(false);
                stopRecording();
            }
        }, 15000);
    };

    // -----------------------------
    // STOP RECORDING
    // -----------------------------
    const stopRecording = () => {
        setRecording(false);
        setLoading(false);

        mediaRecorderRef.current?.stop();

        streamRef.current?.getTracks().forEach((t) => t.stop());

        wsRef.current?.close();
    };

    // -----------------------------
    // BUTTON CLICK
    // -----------------------------
    const handleClick = () => {
        setClicked(true);
        setTimeout(() => setClicked(false), 300);

        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    };



  return (
      <div
          style={{
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "#000000",
            color: "white",
          }}
      >
        <div
            style={{
                padding: 40,
                width: "100%",
                maxWidth: "1400px",
            }}
        >
          <h1>🎵 Music Finder</h1>

            <div
                style={{
                    marginTop: 30,
                    display: "flex",
                    justifyContent: "center",
                }}
            >
                <button
                    onClick={handleClick}
                    style={{
                        width: 170,
                        height: 170,
                        borderRadius: "50%",
                        border: "none",
                        cursor: "pointer",
                        position: "relative",
                        overflow: "hidden",
                        transform: recording
                            ? "scale(1.08)"
                            : clicked
                                ? "scale(0.92)"
                                : "scale(1)",
                        background: recording
                            ? "linear-gradient(135deg,#ef4444,#dc2626)"
                            : "linear-gradient(135deg,#2563eb,#06b6d4)",

                        animation: recording
                            ? "recordingPulse 1.2s infinite"
                            : "pulse 2s infinite",

                        boxShadow: recording
                            ? "0 0 25px rgba(239,68,68,.8), 0 0 80px rgba(239,68,68,.4), inset 0 0 20px rgba(255,255,255,.1)"
                            : "0 0 25px rgba(37,99,235,.7), 0 0 80px rgba(6,182,212,.4), inset 0 0 20px rgba(255,255,255,.1)",

                        transition: "all .3s ease",
                    }}
                >
                    {!recording ? (
                        <div
                            style={{
                                fontSize: 60,
                            }}
                        >
                            🎤
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "flex-end",
                                gap: 6,
                                height: 40,
                            }}
                        >
                            {[0, 1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: 8,
                                        background: "white",
                                        borderRadius: 999,
                                        animation: `bars ${0.6 + i * 0.15}s infinite`,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </button>
            </div>
          <div style={{ marginTop: 20 }}>
            {recording && (
                <p style={{ color: "#f87171" }}>
                  🔴 Listening...
                </p>
            )}

            {loading && (
                <p>
                  ⏳ Identifying song...
                </p>
            )}
          </div>

            {song?.success && (
                <div
                    style={{
                        width: "100%",
                        maxWidth: "1400px",
                        marginTop: 40,
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1.5fr 1.5fr",
                            gap: 20,
                        }}
                    >
                        {/* ARTIST CARD */}
                        <div
                            style={{
                                position: "relative",
                                minHeight: 470,
                                borderRadius: 30,
                                overflow: "hidden",
                                backgroundImage: `url(${song.artist_image})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                            }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background:
                                        "linear-gradient(to top, rgba(0,0,0,.95), rgba(0,0,0,.25))",
                                }}
                            />

                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    padding: 28,
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                }}
                            >
                                <h2
                                    style={{
                                        margin: 0,
                                        fontSize: 32,
                                        fontWeight: 700,
                                    }}
                                >
                                    About Artist
                                </h2>

                                <div>
                                    <h1
                                        style={{
                                            margin: 0,
                                            fontSize: 42,
                                            fontWeight: 700,
                                        }}
                                    >
                                        {song.artist}
                                    </h1>

                                    <p
                                        style={{
                                            marginTop: 10,
                                            marginBottom: 20,
                                            fontSize: 22,
                                            color: "#d1d5db",
                                        }}
                                    >
                                        {song.monthly_listeners || "Popular Artist"}
                                    </p>

                                    <p
                                        style={{
                                            color: "#e5e7eb",
                                            lineHeight: 1.8,
                                            fontSize: 15,
                                        }}
                                    >
                                        {song.artist_bio ||
                                            "Artist information is currently unavailable."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* SONG SIDE */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 20,
                            }}
                        >
                            {/* BIG SONG COVER */}
                            <div
                                style={{
                                    position: "relative",
                                    height: 470,
                                    borderRadius: 30,
                                    overflow: "hidden",
                                    background: "#18181b",
                                }}
                            >
                                {song.cover && (
                                    <img
                                        src={song.cover}
                                        alt=""
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                        }}
                                    />
                                )}

                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        background:
                                            "linear-gradient(to top, rgba(0,0,0,.95), rgba(0,0,0,.05))",
                                    }}
                                />

                                <div
                                    style={{
                                        position: "absolute",
                                        left: 30,
                                        right: 30,
                                        bottom: 30,
                                    }}
                                >
                                    <div
                                        style={{
                                            color: "#9ca3af",
                                            fontSize: 13,
                                            letterSpacing: 3,
                                            marginBottom: 12,
                                        }}
                                    >
                                        SONG FOUND
                                    </div>

                                    <h1
                                        style={{
                                            margin: 0,
                                            fontSize: 52,
                                            fontWeight: 800,
                                            lineHeight: 1.1,
                                        }}
                                    >
                                        {song.title}
                                    </h1>

                                    <p
                                        style={{
                                            marginTop: 12,
                                            marginBottom: 8,
                                            fontSize: 24,
                                            color: "#d1d5db",
                                        }}
                                    >
                                        {song.artist}
                                    </p>

                                    <p
                                        style={{
                                            color: "#9ca3af",
                                            marginBottom: 20,
                                            fontSize: 16,
                                        }}
                                    >
                                        {song.album}
                                    </p>

                                    {song.spotify_url && (
                                        <a
                                            href={song.spotify_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                background: "#1DB954",
                                                color: "white",
                                                padding: "12px 22px",
                                                borderRadius: 999,
                                                textDecoration: "none",
                                                fontWeight: 700,
                                                display: "inline-block",
                                            }}
                                        >
                                            🎵 Open Spotify
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* LYRICS */}
                            <div
                                style={{
                                    background: "#18181b",
                                    borderRadius: 30,
                                    padding: 24,
                                    height: 220,
                                    overflowY: "auto",
                                }}
                            >
                                <h2
                                    style={{
                                        marginTop: 0,
                                        marginBottom: 16,
                                        fontSize: 24,
                                    }}
                                >
                                    Lyrics
                                </h2>

                                <div
                                    style={{
                                        whiteSpace: "pre-wrap",
                                        lineHeight: 1.8,
                                        color: "#d1d5db",
                                    }}
                                >
                                    {song.lyrics || "Lyrics not available"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
  );
}