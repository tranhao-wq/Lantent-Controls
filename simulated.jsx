import React, { useEffect, useMemo, useRef, useState } from "react";

// Mini Hypersteering Demo (client-only)
// - Simulates hypersteering by updating visual params in real-time
// - Shows the JSON payload that would be sent over WebSocket
// - No backend required

function Slider({ label, value, min=0, max=1, step=0.01, onChange }){
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-xs text-gray-500 tabular-nums">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-black"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }){
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)} className="accent-black"/>
      {label}
    </label>
  );
}

function Button({ children, onClick, variant="primary" }){
  const base = "px-3 py-2 rounded-2xl text-sm font-medium transition shadow-sm";
  const styles = variant === "ghost"
    ? "bg-white hover:bg-gray-50 border border-gray-200"
    : "bg-black text-white hover:bg-gray-800";
  return (
    <button onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

// Simple mock WS that logs messages
class MockWS {
  constructor(url){
    this.url = url;
    this.readyState = 1;
    setTimeout(()=>{ this.onopen && this.onopen({}); }, 300);
  }
  send(msg){ console.log("[MockWS SEND]", msg); this.onmessage && this.onmessage({ data: `ack:${msg.length}` }); }
  close(){ this.readyState = 3; this.onclose && this.onclose({}); }
}

export default function App(){
  const [connected, setConnected] = useState(false);
  const [autoSend, setAutoSend] = useState(true);

  const [brightness, setBrightness] = useState(1.0); // 0.3 - 1.7
  const [contrast, setContrast] = useState(1.0);     // 0.5 - 2.0
  const [saturation, setSaturation] = useState(1.0); // 0.0 - 2.5
  const [camera, setCamera] = useState(0);           // -45 - 45 (deg)
  const [styleStrength, setStyleStrength] = useState(0.7); // 0-1
  const [latentMorph, setLatentMorph] = useState(0.0);     // -1 to 1

  const [lastPayload, setLastPayload] = useState(null);
  const [wsMsg, setWsMsg] = useState("");
  const wsRef = useRef(null);

  // Connect WS (mock)
  useEffect(()=>{
    const ws = new MockWS("wss://localhost/ws/steer");
    wsRef.current = ws;
    ws.onopen = ()=> setConnected(true);
    ws.onclose = ()=> setConnected(false);
    ws.onmessage = (ev)=> setWsMsg(String(ev.data));
    return ()=> ws.close();
  },[]);

  // Compose payload
  const payload = useMemo(()=>({
    t: Date.now(),
    op: "steer",
    params: {
      brightness, contrast, saturation,
      camera_angle_deg: camera,
      style_intensity: styleStrength,
      latent_morph: latentMorph,
    }
  }), [brightness, contrast, saturation, camera, styleStrength, latentMorph]);

  // Auto-send on change
  useEffect(()=>{
    if(!autoSend) return;
    if(wsRef.current && wsRef.current.readyState === 1){
      const msg = JSON.stringify(payload);
      wsRef.current.send(msg);
      setLastPayload(payload);
    }
  }, [payload, autoSend]);

  const handleSend = ()=>{
    if(wsRef.current && wsRef.current.readyState === 1){
      const msg = JSON.stringify(payload);
      wsRef.current.send(msg);
      setLastPayload(payload);
    }
  };

  const handleReset = ()=>{
    setBrightness(1); setContrast(1); setSaturation(1);
    setCamera(0); setStyleStrength(0.7); setLatentMorph(0);
  };

  const handleRandom = ()=>{
    setBrightness(+(0.7 + Math.random()*0.6).toFixed(2));
    setContrast(+(0.6 + Math.random()*1.2).toFixed(2));
    setSaturation(+(Math.random()*2.2).toFixed(2));
    setCamera(+(Math.random()*90 - 45).toFixed(0));
    setStyleStrength(+(Math.random()).toFixed(2));
    setLatentMorph(+(Math.random()*2 - 1).toFixed(2));
  };

  // Visual preview: a pseudo-3D card we "steer"
  const filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
  const rotate = `rotateY(${camera}deg)`;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold">Hypersteering Controls</h1>
            <span className={`text-xs px-2 py-1 rounded-full ${connected? 'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{connected? 'Connected':'Offline (mock)'}</span>
          </div>

          <Slider label="Brightness" value={brightness} min={0.3} max={1.7} step={0.01} onChange={setBrightness} />
          <Slider label="Contrast" value={contrast} min={0.5} max={2.0} step={0.01} onChange={setContrast} />
          <Slider label="Saturation" value={saturation} min={0.0} max={2.5} step={0.01} onChange={setSaturation} />
          <Slider label="Camera Angle (°)" value={camera} min={-45} max={45} step={1} onChange={setCamera} />
          <Slider label="Style Intensity" value={styleStrength} min={0} max={1} step={0.01} onChange={setStyleStrength} />
          <Slider label="Latent Morph" value={latentMorph} min={-1} max={1} step={0.01} onChange={setLatentMorph} />

          <div className="flex items-center justify-between mt-3 mb-4">
            <Toggle label="Auto-send /steer" checked={autoSend} onChange={setAutoSend} />
            <div className="flex gap-2">
              <Button onClick={handleReset} variant="ghost">Reset</Button>
              <Button onClick={handleRandom}>Randomize</Button>
            </div>
          </div>

          {!autoSend && (
            <Button onClick={handleSend}>Send /steer now</Button>
          )}
        </div>

        {/* Middle: Preview */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex flex-col">
          <h2 className="text-lg font-semibold mb-3">Live Preview (simulated)</h2>
          <div className="flex-1 grid place-items-center">
            <div
              className="w-[min(600px,90%)] h-72 md:h-80 lg:h-96 rounded-3xl shadow-md border border-gray-200 overflow-hidden relative"
              style={{ filter }}
            >
              {/* Scene background */}
              <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-white to-emerald-100" />
              {/* Pseudo subject card */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ perspective: "1000px" }}
              >
                <div
                  className="w-2/3 h-2/3 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-600 shadow-2xl border border-gray-700/40 flex items-center justify-center text-white text-xl font-semibold"
                  style={{ transform: rotate, transition: "transform 80ms linear" }}
                >
                  AI SUBJECT
                </div>
              </div>
              {/* HUD overlay */}
              <div className="absolute top-3 left-3 text-[10px] bg-black/50 text-white px-2 py-1 rounded-full">
                style:{styleStrength.toFixed(2)} | morph:{latentMorph.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div className="text-sm font-medium mb-1">Outgoing /steer payload</div>
              <pre className="text-xs overflow-auto max-h-48 leading-relaxed">{JSON.stringify(payload, null, 2)}</pre>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div className="text-sm font-medium mb-1">WS response (mock)</div>
              <code className="text-xs break-words">{wsMsg || "(waiting...)"}</code>
              <div className="text-[11px] text-gray-500 mt-2">This is a local mock. In production, replace MockWS with a real WebSocket to your inference server.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-6 text-xs text-gray-500">
        Tip: Move sliders quickly to simulate high-frequency hypersteering. The preview updates instantly, and the JSON payload mirrors what your backend would consume.
      </div>
    </div>
  );
}
import React, { useEffect, useMemo, useRef, useState } from "react";

// Mini Hypersteering Demo (client-only)
// - Simulates hypersteering by updating visual params in real-time
// - Shows the JSON payload that would be sent over WebSocket
// - No backend required

function Slider({ label, value, min=0, max=1, step=0.01, onChange }){
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-xs text-gray-500 tabular-nums">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-black"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }){
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)} className="accent-black"/>
      {label}
    </label>
  );
}

function Button({ children, onClick, variant="primary" }){
  const base = "px-3 py-2 rounded-2xl text-sm font-medium transition shadow-sm";
  const styles = variant === "ghost"
    ? "bg-white hover:bg-gray-50 border border-gray-200"
    : "bg-black text-white hover:bg-gray-800";
  return (
    <button onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

// Simple mock WS that logs messages
class MockWS {
  constructor(url){
    this.url = url;
    this.readyState = 1;
    setTimeout(()=>{ this.onopen && this.onopen({}); }, 300);
  }
  send(msg){ console.log("[MockWS SEND]", msg); this.onmessage && this.onmessage({ data: `ack:${msg.length}` }); }
  close(){ this.readyState = 3; this.onclose && this.onclose({}); }
}

export default function App(){
  const [connected, setConnected] = useState(false);
  const [autoSend, setAutoSend] = useState(true);

  const [brightness, setBrightness] = useState(1.0); // 0.3 - 1.7
  const [contrast, setContrast] = useState(1.0);     // 0.5 - 2.0
  const [saturation, setSaturation] = useState(1.0); // 0.0 - 2.5
  const [camera, setCamera] = useState(0);           // -45 - 45 (deg)
  const [styleStrength, setStyleStrength] = useState(0.7); // 0-1
  const [latentMorph, setLatentMorph] = useState(0.0);     // -1 to 1

  const [lastPayload, setLastPayload] = useState(null);
  const [wsMsg, setWsMsg] = useState("");
  const wsRef = useRef(null);

  // Connect WS (mock)
  useEffect(()=>{
    const ws = new MockWS("wss://localhost/ws/steer");
    wsRef.current = ws;
    ws.onopen = ()=> setConnected(true);
    ws.onclose = ()=> setConnected(false);
    ws.onmessage = (ev)=> setWsMsg(String(ev.data));
    return ()=> ws.close();
  },[]);

  // Compose payload
  const payload = useMemo(()=>({
    t: Date.now(),
    op: "steer",
    params: {
      brightness, contrast, saturation,
      camera_angle_deg: camera,
      style_intensity: styleStrength,
      latent_morph: latentMorph,
    }
  }), [brightness, contrast, saturation, camera, styleStrength, latentMorph]);

  // Auto-send on change
  useEffect(()=>{
    if(!autoSend) return;
    if(wsRef.current && wsRef.current.readyState === 1){
      const msg = JSON.stringify(payload);
      wsRef.current.send(msg);
      setLastPayload(payload);
    }
  }, [payload, autoSend]);

  const handleSend = ()=>{
    if(wsRef.current && wsRef.current.readyState === 1){
      const msg = JSON.stringify(payload);
      wsRef.current.send(msg);
      setLastPayload(payload);
    }
  };

  const handleReset = ()=>{
    setBrightness(1); setContrast(1); setSaturation(1);
    setCamera(0); setStyleStrength(0.7); setLatentMorph(0);
  };

  const handleRandom = ()=>{
    setBrightness(+(0.7 + Math.random()*0.6).toFixed(2));
    setContrast(+(0.6 + Math.random()*1.2).toFixed(2));
    setSaturation(+(Math.random()*2.2).toFixed(2));
    setCamera(+(Math.random()*90 - 45).toFixed(0));
    setStyleStrength(+(Math.random()).toFixed(2));
    setLatentMorph(+(Math.random()*2 - 1).toFixed(2));
  };

  // Visual preview: a pseudo-3D card we "steer"
  const filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
  const rotate = `rotateY(${camera}deg)`;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold">Hypersteering Controls</h1>
            <span className={`text-xs px-2 py-1 rounded-full ${connected? 'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{connected? 'Connected':'Offline (mock)'}</span>
          </div>

          <Slider label="Brightness" value={brightness} min={0.3} max={1.7} step={0.01} onChange={setBrightness} />
          <Slider label="Contrast" value={contrast} min={0.5} max={2.0} step={0.01} onChange={setContrast} />
          <Slider label="Saturation" value={saturation} min={0.0} max={2.5} step={0.01} onChange={setSaturation} />
          <Slider label="Camera Angle (°)" value={camera} min={-45} max={45} step={1} onChange={setCamera} />
          <Slider label="Style Intensity" value={styleStrength} min={0} max={1} step={0.01} onChange={setStyleStrength} />
          <Slider label="Latent Morph" value={latentMorph} min={-1} max={1} step={0.01} onChange={setLatentMorph} />

          <div className="flex items-center justify-between mt-3 mb-4">
            <Toggle label="Auto-send /steer" checked={autoSend} onChange={setAutoSend} />
            <div className="flex gap-2">
              <Button onClick={handleReset} variant="ghost">Reset</Button>
              <Button onClick={handleRandom}>Randomize</Button>
            </div>
          </div>

          {!autoSend && (
            <Button onClick={handleSend}>Send /steer now</Button>
          )}
        </div>

        {/* Middle: Preview */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex flex-col">
          <h2 className="text-lg font-semibold mb-3">Live Preview (simulated)</h2>
          <div className="flex-1 grid place-items-center">
            <div
              className="w-[min(600px,90%)] h-72 md:h-80 lg:h-96 rounded-3xl shadow-md border border-gray-200 overflow-hidden relative"
              style={{ filter }}
            >
              {/* Scene background */}
              <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-white to-emerald-100" />
              {/* Pseudo subject card */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ perspective: "1000px" }}
              >
                <div
                  className="w-2/3 h-2/3 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-600 shadow-2xl border border-gray-700/40 flex items-center justify-center text-white text-xl font-semibold"
                  style={{ transform: rotate, transition: "transform 80ms linear" }}
                >
                  AI SUBJECT
                </div>
              </div>
              {/* HUD overlay */}
              <div className="absolute top-3 left-3 text-[10px] bg-black/50 text-white px-2 py-1 rounded-full">
                style:{styleStrength.toFixed(2)} | morph:{latentMorph.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div className="text-sm font-medium mb-1">Outgoing /steer payload</div>
              <pre className="text-xs overflow-auto max-h-48 leading-relaxed">{JSON.stringify(payload, null, 2)}</pre>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div className="text-sm font-medium mb-1">WS response (mock)</div>
              <code className="text-xs break-words">{wsMsg || "(waiting...)"}</code>
              <div className="text-[11px] text-gray-500 mt-2">This is a local mock. In production, replace MockWS with a real WebSocket to your inference server.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-6 text-xs text-gray-500">
        Tip: Move sliders quickly to simulate high-frequency hypersteering. The preview updates instantly, and the JSON payload mirrors what your backend would consume.
      </div>
    </div>
  );
}
