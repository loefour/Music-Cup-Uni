import { useState, useRef, useEffect } from "react";
import "./App.css";

export default function Recorder() {
    const [recording, setRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [song, setSong] = useState(null);
    const [clicked, setClicked] = useState(false);


    const mediaRecorderRef = useRef(null);
    const wsRef = useRef(null);
    const streamRef = useRef(null);

    const timeoutRef = useRef(null);
    const recordingRef = useRef(false);


    // Mobile Respincive
    const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 900);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // -----------------------------
    // START WS CONNECTION
    // -----------------------------

    const connectWebSocket = () => {
        const ws = new WebSocket(
            "wss://music-cup-backend.onrender.com/ws/recognize"
        );

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
                console.log("Song not found, reconnecting...");

                if (recordingRef.current) {
                    ws.close();

                    setTimeout(() => {
                        if (recordingRef.current) {
                            connectWebSocket();
                        }
                    }, 500);
                }
            }

            if (msg.type === "FOUND") {
                clearTimeout(timeoutRef.current);

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

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
        };

        ws.onclose = () => {
            console.log("WebSocket closed");
        };
    };



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
        connectWebSocket();

        // -----------------------------
        // SEND AUDIO CHUNKS
        // -----------------------------
        recorder.ondataavailable = (e) => {
            if (
                e.data.size > 0 &&
                wsRef.current &&
                wsRef.current.readyState === WebSocket.OPEN
            ) {
                wsRef.current.send(e.data);
            }
        };
        // send chunk every 0.5s second
        recorder.start(3000);

        setRecording(true);

        recordingRef.current = true;

        timeoutRef.current = setTimeout(() => {
            console.log("25 seconds passed");

            stopRecording();

            alert("Song not found");
        }, 25000);

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
        recordingRef.current = false;

        clearTimeout(timeoutRef.current);

        setRecording(false);
        setLoading(false);

        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
        ) {
            mediaRecorderRef.current.stop();
        }

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
                width: "100vw",
                margin: 0,
                padding: 0,

                display: "flex",
                justifyContent: "center",
                alignItems: "center",

                backgroundImage:
                    !isMobile && song?.artist_image
                        ? `linear-gradient(rgba(0,0,0,.75), rgba(0,0,0,.85)), url(${song.artist_image})`
                        : "none",

                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
                backgroundColor: "#000",

                color: "white",
            }}
        >
            <div
                style={{
                    width: "100%",
                    padding: 20,
                }}
            >
          <h1>
              Music Cup
          </h1>
            <p>

            </p>

            <div
                style={{
                    marginTop: 50,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <button
                    onClick={handleClick}
                    style={{
                        width: isMobile ? 130 : 170,
                        height: isMobile ? 130 : 170,
                        borderRadius: "50%",
                        border: "none",
                        cursor: "pointer",
                        position: "relative",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        overflow: "visible",

                        background: recording
                            ? "linear-gradient(135deg,#ef4444,#dc2626)"
                            : "#050816",

                        transform: recording
                            ? "scale(1.08)"
                            : clicked
                                ? "scale(0.94)"
                                : "scale(1)",

                        transition: "all .3s ease",

                        boxShadow: recording
                            ? "0 0 25px rgba(239,68,68,.8), 0 0 80px rgba(239,68,68,.4)"
                            : `
                                0 0 15px rgba(59,130,246,.5),
                                0 0 40px rgba(59,130,246,.25),
                                inset 0 0 30px rgba(255,255,255,.03)
                              `,
                    }}
                >
                    {!recording && (
                        <>
                            <div
                                style={{
                                    position: "absolute",
                                    inset: -15,
                                    borderRadius: "50%",
                                    border: "2px solid rgba(239,68,68,.5)",
                                    animation: "pulseRing 1.5s infinite",
                                }}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    inset: -8,
                                    borderRadius: "50%",
                                    border: "3px solid rgba(96,165,250,.9)",
                                    boxShadow: `
                                                0 0 15px rgba(96,165,250,.8),
                                                0 0 35px rgba(96,165,250,.5)
                                            `,
                                }}
                            />

                            <div
                                style={{
                                    position: "absolute",
                                    inset: -18,
                                    borderRadius: "50%",
                                    border: "1px solid rgba(96,165,250,.15)",
                                }}
                            />

                            <div
                                style={{
                                    position: "absolute",
                                    inset: -30,
                                    borderRadius: "50%",
                                    border: "1px solid rgba(96,165,250,.08)",
                                }}
                            />
                        </>
                    )}

                    {!recording ? (
                        <div
                            style={{
                                fontSize: isMobile ? 42 : 58,
                                color: "#60a5fa",
                                textShadow:
                                    "0 0 10px rgba(96,165,250,.8), 0 0 25px rgba(96,165,250,.6)",
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
                                        height: 20,
                                        background: "white",
                                        borderRadius: 999,
                                        animation: "heartbeat 1.8s infinite ease-in-out",
                                        animationDelay: `${i * 0.15}s`,
                                        transformOrigin: "bottom",
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </button>
                {!recording && !loading && (
                    <div
                        style={{
                            marginTop: 30,
                            textAlign: "center",
                            color: "#9ca3af",
                            fontSize: 15,
                            letterSpacing: 1,
                        }}
                    >
                        Tap to identify music
                    </div>
                )}
            </div>
            {song?.success && (
                <div
                    style={{
                        width: "100%",
                        maxWidth: "1400px",
                        marginTop: 40,

                        height: isMobile
                            ? "auto"
                            : "calc(100vh - 140px)",
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: isMobile ? "1fr" : "420px 1fr",
                            height: isMobile ? "auto" : "100%",
                            gridTemplateAreas: isMobile
                                ? `
                                    "song"
                                    "artist"
                                    "lyrics"
                                  `
                                : `
                                    "artist song"
                                    "artist lyrics"
                                  `,
                            gap: 20,
                        }}
                    >
                        {/* ARTIST CARD */}
                        <div
                            style={{
                                gridArea: "artist",
                                position: "relative",
                                height: isMobile ? 320 : "100%",
                                minHeight: isMobile ? 320 : "unset",
                                width: "100%",
                                borderRadius: 30,
                                overflow: "hidden",

                                backgroundImage: `url(${song.artist_image})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center center",
                                backgroundRepeat: "no-repeat",

                                boxShadow: "0 20px 60px rgba(0,0,0,.45)",
                            }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background:
                                        "linear-gradient(to top, rgba(0,0,0,.98), rgba(0,0,0,.45))",
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
                                        fontSize: isMobile ? 22 : 32,
                                        fontWeight: 700,
                                    }}
                                >
                                    About Artist
                                </h2>

                                <div>
                                    <h1
                                        style={{
                                            margin: 0,
                                            fontSize: isMobile ? 28 : 42,
                                            fontWeight: 700,
                                        }}
                                    >
                                        {song.artist}
                                    </h1>
                                    <p
                                        style={{
                                            marginTop: 10,
                                            marginBottom: 20,
                                            fontSize: isMobile ? 16 : 22,
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
                                    <div
                                        style={{
                                            marginTop: 30,
                                            borderTop: "1px solid rgba(255,255,255,.15)",
                                            paddingTop: 25,
                                            display: isMobile ? "none" : "flex",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <div>
                                            <div
                                                style={{
                                                    color: "#ff4d4d",
                                                    fontSize: 28,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                78.2M
                                            </div>

                                            <div
                                                style={{
                                                    color: "#9ca3af",
                                                    fontSize: 14,
                                                }}
                                            >
                                                Monthly listeners
                                            </div>
                                        </div>

                                        <div>
                                            <div
                                                style={{
                                                    color: "#ff4d4d",
                                                    fontSize: 28,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                2010
                                            </div>

                                            <div
                                                style={{
                                                    color: "#9ca3af",
                                                    fontSize: 14,
                                                }}
                                            >
                                                Debut
                                            </div>
                                        </div>

                                        <div>
                                            <div
                                                style={{
                                                    color: "#ff4d4d",
                                                    fontSize: 28,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                8
                                            </div>

                                            <div
                                                style={{
                                                    color: "#9ca3af",
                                                    fontSize: 14,
                                                }}
                                            >
                                                Albums
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SONG SIDE */}
                        <div
                            style={{
                                gridArea: "song",
                                display: "flex",
                                flexDirection: "column",
                                gap: 20,
                                width: "100%",
                                alignItems: "stretch",
                            }}
                        >
                            {/* BIG SONG COVER */}
                            <div
                                style={{
                                    background: "rgba(20,20,20,.85)",
                                    backdropFilter: "blur(20px)",
                                    borderRadius: 30,
                                    padding: 24,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexDirection: "row",
                                    gap: 20,
                                    height: isMobile ? "auto" : 180,
                                    flexShrink: 0,
                                    width: "90%",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "row",
                                        gap: 20,
                                        alignItems: "center",
                                        justifyContent: "flex-start",
                                        width: "100%",
                                        height: "100%",
                                        overflow: "hidden",
                                    }}
                                >
                                    <img
                                        src={song.cover}
                                        alt=""
                                        style={{
                                            width: isMobile ? 150 : 140,
                                            height: isMobile ? 150 : 140,
                                            borderRadius: 20,
                                            objectFit: "cover",
                                            flexShrink: 0,
                                        }}
                                    />

                                    <div
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "flex-start",
                                            justifyContent: "center",
                                            textAlign: "left",
                                        }}
                                    >
                                        <div
                                            style={{
                                                color: "#9ca3af",
                                                fontSize: 13,
                                                letterSpacing: 2,
                                                marginBottom: 10,
                                            }}
                                        >
                                            SONG FOUND
                                        </div>

                                        <h1
                                            style={{
                                                margin: 0,
                                                paddingBottom: 5,
                                                paddingRight: 5,
                                                fontSize: isMobile ? 28 : 36,
                                                fontWeight: 800,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {song.title}
                                        </h1>

                                        <p
                                            style={{
                                                marginTop: 8,
                                                marginBottom: 5,
                                                color: "#d1d5db",
                                                fontSize: 20,
                                            }}
                                        >
                                            {song.artist}
                                        </p>

                                        <p
                                            style={{
                                                color: "#9ca3af",
                                                margin: 0,
                                            }}
                                        >
                                            {song.album}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* LYRICS */}
                        <div
                            style={{
                                gridArea: "lyrics",

                                background: isMobile
                                    ? "#18181b"
                                    : "linear-gradient(135deg, rgba(140,20,20,.95), rgba(60,0,0,.95))",

                                backdropFilter: "blur(20px)",

                                borderRadius: 30,

                                padding: isMobile ? 24 : 40,

                                flex: 1,
                                minHeight: 0,

                                overflowY: "auto",

                                boxShadow: "0 20px 50px rgba(0,0,0,.35)",
                            }}
                        >
                            <div
                                style={{
                                    color: "rgba(255,255,255,.65)",
                                    letterSpacing: 3,
                                    fontSize: 12,
                                    marginBottom: 30,
                                }}
                            >
                                MUSIC CUP
                            </div>
                            <h2
                                style={{
                                    marginTop: 0,
                                    marginBottom: 25,
                                    fontSize: isMobile ? 24 : 34,
                                    fontWeight: 700,
                                }}
                            >
                                Lyrics
                            </h2>

                            <div
                                style={{
                                    whiteSpace: "pre-wrap",
                                    lineHeight: 2,
                                    color: "#f3f4f6",
                                    fontSize: isMobile ? 15 : 18,
                                    maxWidth: "95%",
                                }}
                            >
                                {song.lyrics || "Lyrics not available"}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
  );
}