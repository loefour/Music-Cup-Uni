import { useState, useRef, useEffect } from "react";

export default function Recorder() {
    const [recording, setRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [song, setSong] = useState(null);
    const [clicked, setClicked] = useState(false);

    const mediaRecorderRef = useRef(null);
    const wsRef = useRef(null);
    const streamRef = useRef(null);

    // Mobile Respincive
    const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 900);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

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
        recorder.start(3000);

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
                padding: isMobile ? 20 : 40,
                width: "100%",
                maxWidth: "1400px",
            }}
        >
          <h1>🎵 Music Cup</h1>

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
                        width: isMobile ? 130 : 170,
                        height: isMobile ? 130 : 170,
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
                                fontSize: isMobile ? 40 : 60,
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
                            gridTemplateColumns: isMobile ? "1fr" : "420px 1fr",

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
                                minHeight: isMobile ? 320 : 900,
                                borderRadius: 30,
                                overflow: "hidden",

                                backgroundImage: `url(${song.artist_image})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",

                                boxShadow: "0 20px 60px rgba(0,0,0,.45)",
                                backdropFilter: "blur(10px)",
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

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            marginTop: 10,
                                            color: "#e5e7eb",
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 18,
                                                height: 18,
                                                borderRadius: "50%",
                                                background: "#ef4444",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: 12,
                                            }}
                                        >
                                            ✓
                                        </span>

                                        <span>Verified Artist</span>
                                    </div>
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
                                    <div
                                        style={{
                                            marginTop: 30,
                                            borderTop: "1px solid rgba(255,255,255,.15)",
                                            paddingTop: 25,
                                            display: "flex",
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
                                    gap: 20,
                                    minHeight: 180,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 20,
                                        height: "100%",
                                    }}
                                >
                                    <img
                                        src={song.cover}
                                        alt=""
                                        style={{
                                            width: isMobile ? 100 : 140,
                                            height: isMobile ? 100 : 140,
                                            borderRadius: 20,
                                            objectFit: "cover",
                                        }}
                                    />

                                    <div>
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
                                                fontSize: isMobile ? 28 : 42,
                                                fontWeight: 800,
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

                                {/*{song.spotify_url && (*/}
                                {/*    <a*/}
                                {/*        href={song.spotify_url}*/}
                                {/*        target="_blank"*/}
                                {/*        rel="noreferrer"*/}
                                {/*        style={{*/}
                                {/*            background: "#1DB954",*/}
                                {/*            color: "white",*/}
                                {/*            padding: "14px 22px",*/}
                                {/*            borderRadius: 15,*/}
                                {/*            textDecoration: "none",*/}
                                {/*            fontWeight: 700,*/}
                                {/*            whiteSpace: "nowrap",*/}
                                {/*        }}*/}
                                {/*    >*/}
                                {/*        Play on Spotify*/}
                                {/*    </a>*/}
                                {/*)}*/}
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

                                height: isMobile ? "auto" : 680,

                                overflowY: "auto",

                                boxShadow: "0 20px 50px rgba(0,0,0,.35)",
                            }}
                        >
                            <div
                                style={{
                                    color: "rgba(255,255,255,.65)",
                                    letterSpacing: 3,
                                    fontSize: 12,
                                    marginBottom: 10,
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