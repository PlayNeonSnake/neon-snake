import { useRef, useEffect, useState, useCallback } from "react";

const CELL = 20;
const COLS = 28;
const ROWS = 28;
const WIDTH = COLS * CELL;
const HEIGHT = ROWS * CELL;
const SCORE_PER_LEVEL = 50;
const COMBO_WINDOW = 3000; // ms for combo
const POWERUP_DURATION = 8000; // ms

type Point = { x: number; y: number };
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};
type PowerUp = {
  pos: Point;
  type: "shield" | "speed" | "double" | "ghost";
  spawnTime: number;
};

type ActivePowerUp = {
  type: "shield" | "speed" | "double" | "ghost";
  expiresAt: number;
};

const POWERUP_CONFIG = {
  shield: { color: "#ffdd00", symbol: "\u2726", name: "SHIELD" },
  speed: { color: "#ff8800", symbol: "\u26A1", name: "SPEED" },
  double: { color: "#00ff88", symbol: "\u00D72", name: "2x PTS" },
  ghost: { color: "#aa88ff", symbol: "\u2B21", name: "GHOST" },
} as const;

const DIRS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

function randInt(max: number) {
  return Math.floor(Math.random() * max);
}

// Web Audio sound effects
const audioCtxRef = { current: null as AudioContext | null };
function getAudioCtx() {
  if (!audioCtxRef.current) {
    audioCtxRef.current = new AudioContext();
  }
  return audioCtxRef.current;
}

function playSound(type: "eat" | "die" | "levelup" | "powerup" | "combo") {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    switch (type) {
      case "eat":
        osc.type = "sine";
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      case "die":
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case "levelup":
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(550, now + 0.1);
        osc.frequency.setValueAtTime(660, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
        break;
      case "powerup":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case "combo":
        osc.type = "sine";
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.setValueAtTime(900, now + 0.05);
        osc.frequency.setValueAtTime(1100, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
    }
  } catch {
    // Audio not available
  }
}

function generateObstacles(level: number): Point[] {
  if (level <= 1) return [];
  const obs: Point[] = [];
  const midX = Math.floor(COLS / 2);
  const midY = Math.floor(ROWS / 2);

  const addLine = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.sign(x2 - x1);
    const dy = Math.sign(y2 - y1);
    let x = x1, y = y1;
    while (true) {
      if (Math.abs(x - midX) > 3 || Math.abs(y - midY) > 3) {
        obs.push({ x, y });
      }
      if (x === x2 && y === y2) break;
      x += dx;
      y += dy;
    }
  };

  if (level >= 2) {
    addLine(5, 5, 12, 5); addLine(15, 5, 22, 5);
    addLine(5, 22, 12, 22); addLine(15, 22, 22, 22);
  }
  if (level >= 3) {
    addLine(4, 8, 4, 13); addLine(4, 14, 4, 19);
    addLine(23, 8, 23, 13); addLine(23, 14, 23, 19);
    addLine(12, 12, 15, 12); addLine(12, 15, 15, 15);
  }
  if (level >= 4) {
    addLine(8, 3, 8, 8); addLine(3, 8, 8, 8);
    addLine(19, 3, 19, 8); addLine(19, 8, 24, 8);
    addLine(8, 19, 8, 24); addLine(3, 19, 8, 19);
    addLine(19, 19, 19, 24); addLine(19, 19, 24, 19);
  }
  if (level >= 5) {
    addLine(9, 9, 18, 9); addLine(9, 18, 18, 18);
    addLine(9, 9, 9, 14); addLine(9, 14, 9, 18);
    addLine(18, 9, 18, 14); addLine(18, 14, 18, 18);
  }
  if (level >= 6) {
    for (let i = 0; i < 4; i++) {
      obs.push({ x: 2 + i, y: 2 + i }); obs.push({ x: 25 - i, y: 2 + i });
      obs.push({ x: 2 + i, y: 25 - i }); obs.push({ x: 25 - i, y: 25 - i });
    }
  }

  const seen = new Set<string>();
  return obs.filter((o) => {
    const key = `${o.x},${o.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isOccupied(pos: Point, snake: Point[], obstacles: Point[], powerups: PowerUp[]): boolean {
  return (
    snake.some((s) => s.x === pos.x && s.y === pos.y) ||
    obstacles.some((o) => o.x === pos.x && o.y === pos.y) ||
    powerups.some((p) => p.pos.x === pos.x && p.pos.y === pos.y)
  );
}

function spawnFood(snake: Point[], obstacles: Point[], powerups: PowerUp[]): Point {
  let food: Point;
  let tries = 0;
  do {
    food = { x: randInt(COLS), y: randInt(ROWS) };
    tries++;
  } while (isOccupied(food, snake, obstacles, powerups) && tries < 500);
  return food;
}

function spawnPowerUp(snake: Point[], obstacles: Point[], food: Point, powerups: PowerUp[]): PowerUp | null {
  if (Math.random() > 0.3) return null; // 30% chance
  const types: PowerUp["type"][] = ["shield", "speed", "double", "ghost"];
  const type = types[randInt(types.length)];
  let pos: Point;
  let tries = 0;
  do {
    pos = { x: randInt(COLS), y: randInt(ROWS) };
    tries++;
  } while (
    (isOccupied(pos, snake, obstacles, powerups) || (pos.x === food.x && pos.y === food.y)) &&
    tries < 500
  );
  return { pos, type, spawnTime: Date.now() };
}

function directionFromAngle(dx: number, dy: number): Point | null {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 10) return null;
  const nx = dx / len;
  const ny = dy / len;
  if (Math.abs(nx) > Math.abs(ny)) return nx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  return ny > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
}

function AnalogJoystick({
  onDirection,
  active,
}: {
  onDirection: (dir: Point) => void;
  active: boolean;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastDirRef = useRef<Point | null>(null);
  const RADIUS = 45;
  const STICK_R = 26;

  const updateStick = useCallback(
    (rawDx: number, rawDy: number) => {
      const len = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
      const maxDist = RADIUS - STICK_R / 2;
      let dx = rawDx, dy = rawDy;
      if (len > maxDist) {
        dx = (rawDx / len) * maxDist;
        dy = (rawDy / len) * maxDist;
      }
      setStick({ x: dx, y: dy });
      if (active) {
        const dir = directionFromAngle(dx, dy);
        if (dir && (!lastDirRef.current || dir.x !== lastDirRef.current.x || dir.y !== lastDirRef.current.y)) {
          lastDirRef.current = dir;
          onDirection(dir);
        }
      }
    },
    [onDirection, active]
  );

  const handleStart = useCallback((clientX: number, clientY: number) => {
    setDragging(true);
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    updateStick(clientX - rect.left - rect.width / 2, clientY - rect.top - rect.height / 2);
  }, [updateStick]);

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragging) return;
      const base = baseRef.current;
      if (!base) return;
      const rect = base.getBoundingClientRect();
      updateStick(clientX - rect.left - rect.width / 2, clientY - rect.top - rect.height / 2);
    },
    [dragging, updateStick]
  );

  const handleEnd = useCallback(() => {
    setDragging(false);
    setStick({ x: 0, y: 0 });
    lastDirRef.current = null;
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); };
    const onTouchEnd = () => handleEnd();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleMove, handleEnd]);

  if (!active) return null;

  return (
    <div
      ref={baseRef}
      style={{
        position: "relative", width: RADIUS * 2, height: RADIUS * 2, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,255,255,0.06) 0%, rgba(0,255,255,0.02) 100%)",
        border: "2px solid rgba(0,255,255,0.15)",
        boxShadow: "0 0 30px rgba(0,255,255,0.05), inset 0 0 20px rgba(0,0,0,0.3)",
        touchAction: "none", userSelect: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onTouchStart={(e) => { e.preventDefault(); handleStart(e.touches[0].clientX, e.touches[0].clientY); }}
    >
      {["\u25B2", "\u25BC", "\u25C4", "\u25BA"].map((arrow, i) => {
        const positions = [
          { top: 8, left: "50%", transform: "translateX(-50%)" },
          { bottom: 8, left: "50%", transform: "translateX(-50%)" },
          { left: 8, top: "50%", transform: "translateY(-50%)" },
          { right: 8, top: "50%", transform: "translateY(-50%)" },
        ] as const;
        return (
          <div key={i} style={{ position: "absolute", ...positions[i], color: "rgba(0,255,255,0.2)", fontSize: "0.7rem", fontFamily: "monospace" }}>
            {arrow}
          </div>
        );
      })}
      <div
        style={{
          width: STICK_R * 2, height: STICK_R * 2, borderRadius: "50%",
          background: dragging ? "radial-gradient(circle, rgba(0,255,255,0.35) 0%, rgba(0,255,255,0.1) 100%)" : "radial-gradient(circle, rgba(0,255,255,0.18) 0%, rgba(0,255,255,0.05) 100%)",
          border: `2px solid ${dragging ? "rgba(0,255,255,0.6)" : "rgba(0,255,255,0.25)"}`,
          boxShadow: dragging ? "0 0 25px rgba(0,255,255,0.4), inset 0 0 10px rgba(0,255,255,0.15)" : "0 0 15px rgba(0,255,255,0.1), inset 0 0 8px rgba(0,0,0,0.2)",
          transform: `translate(${stick.x}px, ${stick.y}px)`,
          transition: dragging ? "none" : "transform 0.15s ease-out, box-shadow 0.15s, border-color 0.15s",
        }}
      />
    </div>
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("snake_high");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<"menu" | "playing" | "over" | "paused">("menu");
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(0);
  const [activePowerUps, setActivePowerUps] = useState<ActivePowerUp[]>([]);
  const [levelFlash, setLevelFlash] = useState(false);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const [soundEnabled, setSoundEnabled] = useState(true);

  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;
  const activePowerUpsRef = useRef<ActivePowerUp[]>([]);
  activePowerUpsRef.current = activePowerUps;

  const snakeRef = useRef<Point[]>([{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }]);
  const dirRef = useRef<Point>({ x: 1, y: 0 });
  const nextDirRef = useRef<Point>({ x: 1, y: 0 });
  const foodRef = useRef<Point>({ x: 10, y: 10 });
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const obstaclesRef = useRef<Point[]>([]);
  const powerupsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<Point[]>([]);
  const tickRef = useRef(0);
  const comboRef = useRef(0);
  const lastEatRef = useRef(0);
  const shieldActiveRef = useRef(false);

  const spawnParticles = useCallback((x: number, y: number, extraColors?: string[]) => {
    const colors = extraColors || ["#0ff", "#f0f", "#ff0", "#0f0", "#f55"];
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 3.5;
      particlesRef.current.push({
        x: x * CELL + CELL / 2, y: y * CELL + CELL / 2,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, color: colors[randInt(colors.length)],
      });
    }
  }, []);

  const triggerShake = useCallback(() => {
    let frame = 0;
    const shakeFrames = 8;
    const doShake = () => {
      frame++;
      if (frame > shakeFrames) {
        setShakeOffset({ x: 0, y: 0 });
        return;
      }
      const intensity = 6 * (1 - frame / shakeFrames);
      setShakeOffset({
        x: (Math.random() - 0.5) * intensity,
        y: (Math.random() - 0.5) * intensity,
      });
      requestAnimationFrame(doShake);
    };
    doShake();
  }, []);
  
