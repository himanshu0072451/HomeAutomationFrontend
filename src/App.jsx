import React, { useState, useEffect, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const WEBSOCKET_URL = "wss://nodebackend-y9bx.onrender.com";

function App() {
    const [status, setStatus] = useState("OFF");
    const [error, setError] = useState(null);
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [suggestedCommands] = useState(["Turn on", "Turn off"]);
    const wsRef = useRef(null);
    const lastToastRef = useRef(""); // Store the last toast message to avoid duplication

    useEffect(() => {
        if (wsRef.current) return; // Prevent multiple WebSocket connections

        const connectWebSocket = () => {
            const socket = new WebSocket(WEBSOCKET_URL);
            wsRef.current = socket;

            socket.onopen = () => {
                showToast("✅ Connected to WebSocket Server", "success");
                setError(null);
            };

            socket.onmessage = (event) => {
                console.log("📩 Raw message received:", event.data);

                try {
                    let data = event.data.startsWith("{") && event.data.endsWith("}") ? JSON.parse(event.data) : { command: event.data };

                    if (data.command) {
                        setStatus(prevStatus => {
                            if (prevStatus !== data.command) {
                                showToast(`💡 Device is now ${data.command}`, "info");
                            }
                            return data.command;
                        });
                    }
                } catch (error) {
                    console.error("❌ Error parsing message:", error);
                    showToast("❌ Error parsing WebSocket message!", "error");
                }
            };

            socket.onerror = () => {
                console.error("❌ WebSocket Error");
                setError("❌ Connection failed!");
                showToast("⚠️ WebSocket Error! Retrying...", "error");
            };

            socket.onclose = () => {
                console.warn("⚠️ WebSocket Disconnected! Reconnecting...");
                setError("⚠️ WebSocket disconnected. Reconnecting...");
                showToast("🔄 Reconnecting to WebSocket...", "warning");
                wsRef.current = null;
                setTimeout(connectWebSocket, 3000);
            };
        };

        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    const showToast = (message, type) => {
        if (lastToastRef.current !== message) {
            lastToastRef.current = message;
            toast[type](message);
        }
    };

    const toggleAppliance = (command) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ command }));
            showToast(`📢 Command Sent: ${command}`, "success");
            setError(null);
        } else {
            console.error("WebSocket not connected!");
            setError("❌ WebSocket not connected!");
            showToast("❌ WebSocket not connected!", "error");
        }
    };

    const startListening = () => {
        if (!("webkitSpeechRecognition" in window)) {
            showToast("❌ Your browser does not support voice recognition.", "error");
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.lang = "en-US";
        recognition.interimResults = false;

        recognition.onstart = () => {
            setListening(true);
            setTranscript("Listening...");
            showToast("🎤 Listening for voice command...", "info");
        };

        recognition.onresult = (event) => {
            const spokenText = event.results[0][0].transcript.toLowerCase();
            setTranscript(spokenText);
            console.log("🗣 Recognized:", spokenText);
            showToast(`🗣 Recognized: "${spokenText}"`, "info");

            if (spokenText.includes("turn on")) {
                toggleAppliance("ON");
            } else if (spokenText.includes("turn off")) {
                toggleAppliance("OFF");
            } else {
                showToast(`⚠️ Unknown command: "${spokenText}"`, "warning");
            }
        };

        recognition.onerror = () => {
            console.error("Speech Recognition Error");
            setListening(false);
            setTranscript("Error recognizing voice.");
            showToast("❌ Voice recognition error!", "error");
        };

        recognition.onend = () => {
            setListening(false);
            showToast("🎤 Stopped listening.", "info");
        };

        recognition.start();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-6">
            <ToastContainer position="top-right" autoClose={3000} theme="dark" />

            <div className="glassmorphism w-full max-w-md p-8 rounded-xl text-center shadow-lg bg-gray-900 border border-gray-800">
                <h1 className="text-3xl font-bold text-gray-200 mb-6">🏠 Smart Home Control</h1>

                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                <p className="text-lg font-semibold mb-6">
                    Status:{" "}
                    <span className={`px-4 py-2 rounded-lg font-bold text-lg transition ${status === "ON" ? "bg-green-500" : "bg-red-500"}`}>
                        {status}
                    </span>
                </p>

                <div className="flex justify-center space-x-4">
                    <button 
                        onClick={() => toggleAppliance("ON")} 
                        className="px-6 py-3 bg-green-600 hover:bg-green-500 transition-all duration-200 rounded-lg shadow-lg transform hover:scale-105"
                    >
                        Turn ON
                    </button>

                    <button 
                        onClick={() => toggleAppliance("OFF")} 
                        className="px-6 py-3 bg-red-600 hover:bg-red-500 transition-all duration-200 rounded-lg shadow-lg transform hover:scale-105"
                    >
                        Turn OFF
                    </button>
                </div>

                <button 
                    onClick={startListening} 
                    className={`mt-6 px-6 py-3 ${listening ? "bg-gray-500" : "bg-blue-600"} hover:bg-blue-500 transition-all duration-200 rounded-lg shadow-lg transform hover:scale-105`}
                >
                    {listening ? "Listening..." : "🎤 Voice Command"}
                </button>

                <div className="mt-4 p-4 bg-gray-800 rounded-lg shadow-md w-full text-center">
                    <p className="text-sm text-gray-400">🗣 Recognized: <span className="text-gray-300">{transcript || "Waiting for input..."}</span></p>
                    <p className="text-sm text-gray-400 mt-2">💡 Try saying:</p>
                    <ul className="text-gray-300 text-sm mt-1">
                        {suggestedCommands.map((cmd, index) => (
                            <li key={index} className="mt-1">• {cmd}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default App; 