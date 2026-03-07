import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Plus, QrCode, RefreshCw, Settings, UserPlus, Users, X, Zap, Smile, WifiHigh, Sparkles, Play, Star, Gamepad2, Trophy, Palette, Heart, Home, BookOpen } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { generateBuddyImage, generateEnvironmentImage, generateGameScenario, generateStoryContent, generateCheerMessage } from "./services/aiService";
import { cn } from "./lib/utils";
import QRCode from 'react-qr-code';
import { playClickSound, playCoinSound, playHitSound, playJumpSound } from "./lib/audioService";
import { supabase } from "./lib/supabaseClient";

// --- Types ---
type UserProfile = {
  id: string;
  nickname: string;
  energy: number;
  happiness: number;
  score: number;
};

// --- Components ---

const IconButton = ({ icon: Icon, label, color, onClick, active }: { icon: any, label: string, color: string, onClick?: () => void, active?: boolean }) => (
  <motion.button
    whileHover={{ scale: 1.1, y: -5 }}
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center p-4 rounded-[2.5rem] transition-all duration-300 shadow-xl border-b-4",
      active ? `${color} border-black/20` : "bg-white/90 hover:bg-white border-gray-200",
      "w-20 h-20 md:w-28 md:h-28"
    )}
  >
    <Icon size={28} className={active ? "text-white" : "text-gray-600"} />
    <span className={cn("text-[10px] md:text-xs font-black mt-2 uppercase tracking-wider", active ? "text-white" : "text-gray-600")}>{label}</span>
  </motion.button>
);

const StatusBadge = ({ icon: Icon, value, color }: { icon: any, value: string, color: string }) => (
  <div className={cn("flex items-center gap-2 px-5 py-2.5 rounded-full shadow-lg bg-white border-b-4", color)}>
    <Icon size={20} className="text-gray-700" />
    <span className="font-black text-gray-800 text-lg">{value}</span>
  </div>
);

const EmotionBar = ({ energy, happiness }: { energy: number, happiness: number }) => (
  <div className="flex flex-col gap-3 bg-white/90 backdrop-blur-md p-5 rounded-[2rem] border-b-4 border-gray-200 shadow-2xl min-w-[200px]">
    {/* Energy Bar */}
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-black text-gray-700 flex items-center gap-1 uppercase tracking-tighter">
          <Zap size={12} className="text-yellow-500" /> Energía
        </span>
        <span className="text-[10px] font-black text-yellow-600">{energy}%</span>
      </div>
      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden border-2 border-white">
        <motion.div
          animate={{ width: `${energy}%` }}
          transition={{ type: "spring", stiffness: 50 }}
          className={cn("h-full", energy > 20 ? "bg-gradient-to-r from-yellow-400 to-green-400" : "bg-red-500 animate-pulse")}
        />
      </div>
    </div>

    {/* Happiness Bar */}
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-black text-gray-700 flex items-center gap-1 uppercase tracking-tighter">
          <Heart size={12} className="text-pink-500 fill-pink-500" /> Felicidad
        </span>
        <span className="text-[10px] font-black text-pink-600">{happiness}%</span>
      </div>
      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden border-2 border-white">
        <motion.div
          animate={{ width: `${happiness}%` }}
          transition={{ type: "spring", stiffness: 50 }}
          className="h-full bg-gradient-to-r from-pink-400 to-purple-400"
        />
      </div>
    </div>
  </div>
);

// --- Multiplayer Map Component ---

const MultiplayerMap = ({ buddyImg, currentRoom }: { buddyImg: string | null, currentRoom: string }) => {
  const [players, setPlayers] = useState<Record<string, { x: number, y: number, color: string, id: string }>>({});
  const socketRef = useRef<Socket | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to the server, passing the current room
    socketRef.current = io({
      query: { room: currentRoom }
    });

    socketRef.current.on("init", (initialPlayers) => {
      setPlayers(initialPlayers);
    });

    socketRef.current.on("playerJoined", (player) => {
      setPlayers(prev => ({ ...prev, [player.id]: player }));
    });

    socketRef.current.on("playerMoved", (player) => {
      setPlayers(prev => ({ ...prev, [player.id]: player }));
    });

    socketRef.current.on("playerLeft", (id) => {
      setPlayers(prev => {
        const newPlayers = { ...prev };
        delete newPlayers[id];
        return newPlayers;
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [currentRoom]);

  const handleMapClick = (e: React.MouseEvent) => {
    if (!mapRef.current || !socketRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Update local state immediately for responsiveness
    const myId = socketRef.current.id;
    if (myId && players[myId]) {
      setPlayers(prev => ({
        ...prev,
        [myId]: { ...prev[myId], x, y }
      }));
    }

    socketRef.current.emit("move", { x, y });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-md border-b-4 border-gray-100">
        <h3 className="text-2xl font-black text-blue-600 uppercase italic">Mapa Multijugador</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full shadow-inner border-2 border-blue-100">
            <WifiHigh size={16} className="text-blue-500" />
            <span className="font-black text-sm text-blue-700">Sala: {currentRoom === "global" ? "Pública" : currentRoom}</span>
          </div>
          <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full shadow-inner border-2 border-green-100">
            <Users size={16} className="text-green-500" />
            <span className="font-black text-sm text-green-700">{Object.keys(players).length} Jugadores</span>
          </div>
        </div>
      </div>
      <div
        ref={mapRef}
        onClick={handleMapClick}
        className="relative aspect-video bg-blue-50 rounded-[3rem] border-8 border-white shadow-2xl overflow-hidden cursor-crosshair"
        style={{ backgroundImage: 'radial-gradient(#BFDBFE 2px, transparent 2px)', backgroundSize: '30px 30px' }}
      >
        {Object.values(players).map((player) => (
          <motion.div
            key={player.id}
            initial={false}
            animate={{ left: `${player.x}%`, top: `${player.y}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          >
            <div className="relative">
              <div
                className="w-12 h-12 rounded-2xl shadow-lg border-4 border-white flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: player.color }}
              >
                {buddyImg ? (
                  <img src={buddyImg} className="w-full h-full object-cover rounded-full filter drop-shadow-[0_5px_5px_rgba(0,0,0,0.3)] border-2 border-white" alt="Player" />
                ) : (
                  <Smile className="text-white" />
                )}
              </div>
              {player.id === socketRef.current?.id && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
                  TÚ
                </div>
              )}
            </div>
            <span className="text-[10px] font-black text-gray-500 mt-1 bg-white/80 px-2 py-0.5 rounded-full">
              {player.id.slice(0, 4)}
            </span>
          </motion.div>
        ))}
      </div>
      <p className="text-center text-xs font-bold text-gray-400">¡Haz clic en el mapa para moverte y que otros te vean!</p>
    </div>
  );
};

// --- Views ---

const HomeView = ({
  buddyImg,
  roomImg,
  loading,
  cheerMessage,
  onCheer,
  energy,
  setEnergy,
  happiness,
  setHappiness,
  soundEnabled
}: {
  buddyImg: string | null,
  roomImg: string | null,
  loading: boolean,
  cheerMessage: string | null,
  onCheer: () => void,
  energy: number,
  setEnergy: React.Dispatch<React.SetStateAction<number>>,
  happiness: number,
  setHappiness: React.Dispatch<React.SetStateAction<number>>,
  soundEnabled: boolean
}) => {
  const feedBuddy = () => {
    if (soundEnabled) playClickSound();
    setEnergy(prev => Math.min(100, prev + 15));
    setHappiness(prev => Math.min(100, prev + 5));
  };

  const playWithBuddy = () => {
    if (energy < 5) {
      if (soundEnabled) playHitSound();
      return;
    }
    if (soundEnabled) playJumpSound();
    setEnergy(prev => Math.max(0, prev - 5));
    setHappiness(prev => Math.min(100, prev + 20));
  };

  const sleepBuddy = () => {
    if (soundEnabled) playCoinSound(); // Gentle rising tone for sleep start
    setEnergy(100);
    setHappiness(prev => Math.min(100, prev + 10));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative aspect-video rounded-[3.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-[12px] border-white bg-blue-100"
        >
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <RefreshCw className="animate-spin text-blue-500 mb-4" size={48} />
              <p className="font-black text-blue-500 uppercase tracking-widest">Cargando Mundo...</p>
            </div>
          ) : (
            <>
              {/* Room background - CSS gradient or image */}
              <div className="absolute inset-0 w-full h-full" style={{ background: roomImg || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.img
                  animate={{ y: [0, -20, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  src={buddyImg || ""}
                  className="w-48 h-48 object-cover rounded-full border-4 border-white filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.3)]"
                  alt="Game_Buddy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>

              <AnimatePresence>
                {cheerMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute top-1/4 right-10 bg-white p-6 rounded-[2rem] shadow-2xl border-b-4 border-blue-100 max-w-[200px] z-20"
                  >
                    <p className="text-sm font-black text-blue-600 leading-tight">{cheerMessage}</p>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-r-4 border-b-4 border-blue-100" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute top-8 left-8">
                <EmotionBar energy={energy} happiness={happiness} />
              </div>
              <div className="absolute bottom-8 right-8">
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onCheer}
                  className="bg-yellow-400 p-6 rounded-full shadow-[0_10px_0_rgb(202,138,4)] border-4 border-white text-white"
                >
                  <Sparkles size={40} />
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </div>
      <div className="lg:col-span-4 space-y-6">

        {/* BUDDY CARE PANEL */}
        <div className="bg-white p-6 rounded-[3rem] shadow-xl border-b-8 border-pink-100">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2 text-pink-500 uppercase italic">
            <Heart className="fill-pink-500" /> Cuidado Game_Buddy
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={feedBuddy}
              className="flex flex-col items-center p-3 bg-orange-50 rounded-2xl border-b-4 border-orange-200"
            >
              <span className="text-3xl mb-1">🍎</span>
              <span className="text-[10px] font-black text-orange-600">COMER</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={playWithBuddy}
              className="flex flex-col items-center p-3 bg-green-50 rounded-2xl border-b-4 border-green-200"
            >
              <span className="text-3xl mb-1">🎾</span>
              <span className="text-[10px] font-black text-green-600">JUGAR</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={sleepBuddy}
              className="flex flex-col items-center p-3 bg-indigo-50 rounded-2xl border-b-4 border-indigo-200"
            >
              <span className="text-3xl mb-1">😴</span>
              <span className="text-[10px] font-black text-indigo-600">DORMIR</span>
            </motion.button>
          </div>
        </div>

        {/* QUESTS PANEL */}
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border-b-8 border-blue-100">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2 text-blue-600 uppercase italic">
            <Zap className="fill-blue-600" /> ¡Misiones!
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-3xl border-2 border-blue-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-md">
                <Play fill="white" size={16} />
              </div>
              <div>
                <p className="font-black text-xs leading-tight">Juega "Espacio"</p>
                <p className="text-[10px] text-blue-400 font-bold">Gana +10 Mimos</p>
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-3xl border-2 border-purple-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white shadow-md">
                <Star fill="white" size={16} />
              </div>
              <div>
                <p className="font-black text-xs leading-tight">Lee 1 Cuento</p>
                <p className="text-[10px] text-purple-400 font-bold">Gana +20 Felicidad</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const GamesView = ({
  buddyImg,
  currentRoom,
  soundEnabled,
  energy,
  setEnergy
}: {
  buddyImg: string | null,
  currentRoom: string,
  soundEnabled: boolean,
  energy: number,
  setEnergy: React.Dispatch<React.SetStateAction<number>>
}) => {
  const [scenario, setScenario] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [activeTheme, setActiveTheme] = useState("Espacio");
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isInvulnerable, setIsInvulnerable] = useState(false);
  const [buddyPos, setBuddyPos] = useState({ x: 50, y: 80 });
  const [obstacles, setObstacles] = useState<{ id: number, x: number, y: number }[]>([]);
  const [collectibles, setCollectibles] = useState<{ id: number, x: number, y: number }[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const buddyPosRef = useRef({ x: 50, y: 80 });
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const invulnerableRef = useRef(0);
  const isPlayingRef = useRef(false);

  const loadNewGame = async (theme: string) => {
    if (soundEnabled) playClickSound();
    setLoading(true);
    setActiveTheme(theme);
    const img = await generateGameScenario(theme);
    setScenario(img);
    setLoading(false);
    setShowMultiplayer(false);
    setIsPlaying(false);
  };

  const [gameOver, setGameOver] = useState(false);

  const { obs: themeObs, col: themeCol } = (() => {
    switch (activeTheme) {
      case "Espacio": return { obs: "☄️", col: "🌟" };
      case "Jungla": return { obs: "🪨", col: "🍌" };
      case "Dulces": return { obs: "🍬", col: "🍭" };
      case "Hielo": return { obs: "🧊", col: "💎" };
      default: return { obs: "⚡", col: "🪙" };
    }
  })();

  const startGame = () => {
    if (energy < 15) {
      if (soundEnabled) playHitSound();
      alert("¡Tu Game_Buddy está muy cansado para jugar! Llévalo a dormir en Inicio.");
      return;
    }
    const newEnergy = Math.max(0, energy - 15);
    setEnergy(newEnergy);
    supabase.from('profiles').update({ energy: newEnergy }).eq('id', (window as any).currentUserProfile?.id).then();

    if (soundEnabled) playJumpSound();
    setIsPlaying(true);
    isPlayingRef.current = true;
    setGameOver(false);
    setScore(0);
    setLives(3);
    livesRef.current = 3;
    scoreRef.current = 0;
    invulnerableRef.current = 0;
    setIsInvulnerable(false);
    const initialPos = { x: 50, y: 80 };
    setBuddyPos(initialPos);
    buddyPosRef.current = initialPos;
    setObstacles([]);
    setCollectibles([]);

    let lastTime = Date.now();
    let entityId = 0;

    const loop = () => {
      if (!isPlayingRef.current) return;

      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (invulnerableRef.current > 0 && now > invulnerableRef.current) {
        invulnerableRef.current = 0;
        setIsInvulnerable(false);
      }

      setObstacles(prev => {
        const currentScore = scoreRef.current;
        const currentBuddyPos = buddyPosRef.current;

        const moved = prev.map(o => ({ ...o, y: o.y + (40 + currentScore / 50) * dt }))
          .filter(o => o.y < 110);

        // Spawn obstacles
        if (Math.random() < 0.04 + Math.min(0.1, currentScore / 5000)) {
          moved.push({ id: entityId++, x: Math.random() * 90 + 5, y: -10 });
        }

        let collision = false;
        for (const o of moved) {
          const dx = Math.abs(o.x - currentBuddyPos.x);
          const dy = Math.abs(o.y - currentBuddyPos.y);
          if (dx < 6 && dy < 6) {
            collision = true;
            break;
          }
        }

        if (collision && invulnerableRef.current === 0) {
          if (soundEnabled) playHitSound();
          livesRef.current -= 1;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            setIsPlaying(false);
            isPlayingRef.current = false;
            setGameOver(true);
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
          } else {
            invulnerableRef.current = now + 1500;
            setIsInvulnerable(true);
          }
        }

        return moved;
      });

      setCollectibles(prev => {
        const currentScore = scoreRef.current;
        const currentBuddyPos = buddyPosRef.current;

        const moved = prev.map(c => ({ ...c, y: c.y + (40 + currentScore / 50) * dt }))
          .filter(c => c.y < 110);

        // Spawn collectibles
        if (Math.random() < 0.02) {
          moved.push({ id: entityId++, x: Math.random() * 90 + 5, y: -10 });
        }

        return moved.filter(c => {
          const dx = Math.abs(c.x - currentBuddyPos.x);
          const dy = Math.abs(c.y - currentBuddyPos.y);
          if (dx < 8 && dy < 8) {
            scoreRef.current += 100;
            if (soundEnabled) playCoinSound();
            return false;
          }
          return true;
        });
      });

      scoreRef.current += 1;
      setScore(Math.floor(scoreRef.current / 10));
      if (isPlayingRef.current) {
        gameLoopRef.current = requestAnimationFrame(loop);
      }
    };

    gameLoopRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPlaying) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const newX = Math.max(5, Math.min(95, x));
    setBuddyPos(prev => ({ ...prev, x: newX }));
    buddyPosRef.current = { ...buddyPosRef.current, x: newX };
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-4xl font-black text-blue-600 uppercase italic tracking-tighter">Zona de Juegos</h2>
          {isPlaying && <p className="text-xl font-black text-orange-500">PUNTUACIÓN: {score}</p>}
        </div>
        <div className="flex gap-2">
          {!isPlaying && (
            <>
              <button
                onClick={() => setShowMultiplayer(true)}
                className={cn(
                  "px-4 py-2 rounded-full font-black text-xs shadow-md transition-all flex items-center gap-2",
                  showMultiplayer ? "bg-blue-600 text-white" : "bg-white text-blue-600 hover:bg-blue-50"
                )}
              >
                <Users size={14} /> Mapa Online
              </button>
              {["Espacio", "Jungla", "Dulces", "Hielo"].map((t) => (
                <button
                  key={t}
                  onClick={() => loadNewGame(t)}
                  className="px-4 py-2 bg-white rounded-full font-black text-xs shadow-md hover:bg-blue-500 hover:text-white transition-all"
                >
                  {t}
                </button>
              ))}
            </>
          )}
          {isPlaying && (
            <button
              onClick={() => {
                setIsPlaying(false);
                if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
              }}
              className="px-6 py-2 bg-red-500 text-white rounded-full font-black text-xs shadow-md"
            >
              SALIR DEL JUEGO
            </button>
          )}
        </div>
      </div>

      {showMultiplayer ? (
        <MultiplayerMap buddyImg={buddyImg} currentRoom={currentRoom} />
      ) : (
        <div
          onMouseMove={handleMouseMove}
          className="relative aspect-video rounded-[4rem] overflow-hidden shadow-2xl border-[12px] border-white bg-gray-900 cursor-none"
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="animate-spin text-white" size={64} />
            </div>
          ) : scenario ? (
            <div className="absolute inset-0 w-full h-full" style={{ background: scenario }} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-12 text-center">
              <Gamepad2 size={80} className="mb-6 opacity-20" />
              <h3 className="text-2xl font-black mb-4">¡Selecciona un Mundo para Jugar!</h3>
              <p className="opacity-60 max-w-md">Cada mundo es generado dinámicamente para que nunca te aburras.</p>
            </div>
          )}

          {isPlaying && (
            <div className="absolute inset-0 pointer-events-none">
              {/* HUD */}
              <div className="absolute top-4 w-full px-8 flex justify-between items-center z-20">
                <div className="text-4xl tracking-widest drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className={i < lives ? "opacity-100" : "opacity-30 grayscale"}>💖</span>
                  ))}
                </div>
              </div>

              {/* Player */}
              <motion.div
                animate={{ left: `${buddyPos.x}%`, top: `${buddyPos.y}%` }}
                className={cn(
                  "absolute w-24 h-24 -translate-x-1/2 -translate-y-1/2 transition-opacity",
                  isInvulnerable ? "opacity-50 animate-pulse" : "opacity-100"
                )}
              >
                <img src={buddyImg || ""} className="w-full h-full object-cover rounded-full filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.4)] border-4 border-white" alt="Player" />
              </motion.div>

              {/* Obstacles */}
              {obstacles.map(o => (
                <motion.div
                  key={o.id}
                  style={{ left: `${o.x}%`, top: `${o.y}%` }}
                  className="absolute w-16 h-16 flex items-center justify-center text-5xl drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] -translate-x-1/2 -translate-y-1/2"
                >
                  {themeObs}
                </motion.div>
              ))}

              {/* Collectibles */}
              {collectibles.map(c => (
                <motion.div
                  key={c.id}
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  className="absolute w-16 h-16 flex items-center justify-center text-5xl drop-shadow-[0_0px_15px_rgba(255,255,255,0.9)] animate-bounce -translate-x-1/2 -translate-y-1/2"
                >
                  {themeCol}
                </motion.div>
              ))}
            </div>
          )}

          {scenario && !loading && !isPlaying && !gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <motion.button
                whileHover={{ scale: 1.2 }}
                onClick={startGame}
                className={cn(
                  "px-12 py-6 rounded-full text-white font-black text-3xl border-4 border-white flex items-center gap-4 transition-colors",
                  energy >= 15 ?
                    "bg-green-500 shadow-[0_10px_0_rgb(22,163,74)]" :
                    "bg-gray-400 shadow-[0_10px_0_rgb(156,163,175)] opacity-80"
                )}
              >
                <Play size={40} fill="white" /> {energy >= 15 ? "¡JUGAR!" : "SIN ENERGÍA"}
              </motion.button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/40 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white p-12 rounded-[4rem] shadow-2xl text-center border-b-8 border-gray-200"
              >
                <Trophy size={80} className="text-yellow-500 mx-auto mb-4" />
                <h3 className="text-4xl font-black text-gray-800 mb-2 uppercase italic">¡Juego Terminado!</h3>
                <p className="text-2xl font-black text-blue-500 mb-8">PUNTUACIÓN: {score}</p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={startGame}
                    className="bg-green-500 px-8 py-4 rounded-full text-white font-black text-xl shadow-[0_6px_0_rgb(22,163,74)] border-2 border-white"
                  >
                    REINTENTAR
                  </button>
                  <button
                    onClick={() => setGameOver(false)}
                    className="bg-gray-500 px-8 py-4 rounded-full text-white font-black text-xl shadow-[0_6px_0_rgb(75,85,99)] border-2 border-white"
                  >
                    SALIR
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StoriesView = () => {
  const [story, setStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getStory = async (topic: string) => {
    setLoading(true);
    const text = await generateStoryContent(topic);
    setStory(text || "¡Hubo un error al crear tu historia!");
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h2 className="text-4xl font-black text-pink-500 text-center uppercase italic">Cuentos Mágicos</h2>
      <div className="grid grid-cols-3 gap-4">
        {["Dragones", "Espacio", "Animales"].map(t => (
          <button
            key={t}
            onClick={() => getStory(t)}
            className="p-6 bg-white rounded-[2rem] shadow-lg border-b-4 border-gray-200 font-black text-gray-700 hover:bg-pink-500 hover:text-white transition-all"
          >
            {t}
          </button>
        ))}
      </div>
      <div className="bg-white p-12 rounded-[4rem] shadow-2xl min-h-[300px] flex items-center justify-center relative overflow-hidden border-b-8 border-gray-100">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 to-purple-400" />
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="animate-spin text-pink-400" size={48} />
            <p className="text-pink-400 font-black animate-pulse">ESCRIBIENDO TU AVENTURA...</p>
          </div>
        ) : story ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-gray-700 leading-relaxed text-center"
          >
            {story}
          </motion.div>
        ) : (
          <p className="text-xl font-bold text-gray-300">Elige un tema para comenzar tu aventura...</p>
        )}
      </div>
    </div>
  );
};

const RoomView = ({ buddyImg, onUpdateBuddy }: { buddyImg: string | null, onUpdateBuddy: (prompt: string) => void }) => {
  const [room, setRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [buddyLoading, setBuddyLoading] = useState(false);

  const changeRoom = async (style: string) => {
    setLoading(true);
    const img = await generateEnvironmentImage(`A futuristic ${style} bedroom for a video game character, colorful, neon lights, cozy`);
    setRoom(img);
    setLoading(false);
  };

  const buddyStyles = [
    { name: "Super Héroe", prompt: "Superhero version with a cape and mask, heroic pose" },
    { name: "Astronauta", prompt: "Astronaut version with a space suit and helmet" },
    { name: "Pirata", prompt: "Pirate version with a hat and eye patch" },
    { name: "Mago", prompt: "Wizard version with a magic hat and wand" },
    { name: "Robot", prompt: "Cybernetic robot version with glowing parts" }
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-black text-orange-500 uppercase italic">Personalización</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 relative aspect-video rounded-[3rem] overflow-hidden shadow-2xl border-[10px] border-white bg-orange-50">
          {(loading || buddyLoading) ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
              <RefreshCw className="animate-spin text-orange-500" size={48} />
            </div>
          ) : null}
          <div className="absolute inset-0 w-full h-full" style={{ background: room || "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={buddyImg || ""} className="w-48 h-48 object-cover rounded-full filter drop-shadow-[0_20px_20px_rgba(0,0,0,0.4)] border-4 border-white mx-auto" alt="Game_Buddy" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-xl space-y-4">
            <h3 className="font-black text-xl mb-4 flex items-center gap-2">
              <Palette className="text-orange-500" /> Estilo del Cuarto
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {["Galaxia", "Castillo", "Laboratorio", "Bosque"].map(s => (
                <button
                  key={s}
                  onClick={() => changeRoom(s)}
                  className="p-3 bg-orange-50 rounded-2xl font-black text-xs text-orange-600 border-b-4 border-orange-200 hover:bg-orange-500 hover:text-white transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-xl space-y-4">
            <h3 className="font-black text-xl mb-4 flex items-center gap-2">
              <Smile className="text-blue-500" /> Estilo de Game_Buddy
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {buddyStyles.map(s => (
                <button
                  key={s.name}
                  onClick={async () => {
                    setBuddyLoading(true);
                    await onUpdateBuddy(s.prompt);
                    setBuddyLoading(false);
                  }}
                  className="p-3 bg-blue-50 rounded-2xl font-black text-xs text-blue-600 border-b-4 border-blue-200 hover:bg-blue-500 hover:text-white transition-all"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Connect View ---

const ConnectView = ({ onJoinRoom, currentRoom }: { onJoinRoom: (code: string) => void, currentRoom: string }) => {
  const [roomCode, setRoomCode] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [ScannerComponent, setScannerComponent] = useState<any>(null);

  useEffect(() => {
    if (showScanner && !ScannerComponent) {
      import('@yudiel/react-qr-scanner').then((module) => {
        setScannerComponent(() => module.Scanner);
      }).catch(err => {
        console.error("Failed to load scanner", err);
      });
    }
  }, [showScanner]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black text-blue-600 uppercase italic">Conectar con Amigos</h2>
        <p className="text-gray-600 font-bold max-w-lg mx-auto">
          ¿Estás de viaje o tienes internet lento? ¡No te preocupes! Opciones súper ligeras que gastan muy pocos megas para jugar juntos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Room Code Block */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white p-8 rounded-[3rem] shadow-xl border-b-8 border-blue-200 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <WifiHigh size={100} />
          </div>
          <h3 className="text-2xl font-black mb-4 flex items-center gap-2 text-blue-600">
            <Users className="text-blue-500" /> Código de Sala
          </h3>
          <p className="text-sm text-gray-500 mb-6 font-bold">
            Ingresa el mismo número rápido que tus amigos en la misma habitación para verlos en el mapa. (Ej. "402" para el cuarto 402).
          </p>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Ej. 1234"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              className="w-full text-center text-3xl font-black p-4 bg-blue-50 border-4 border-blue-100 rounded-2xl text-blue-600 focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={() => { if (roomCode.length > 0) onJoinRoom(roomCode) }}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-white text-lg shadow-[0_6px_0_rgba(0,0,0,0.2)] transition-all",
                roomCode.length > 0 ? "bg-green-500 hover:bg-green-400" : "bg-gray-300 cursor-not-allowed"
              )}
            >
              ENTRAR A LA SALA
            </button>
          </div>
        </motion.div>

        {/* QR Code Block */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white p-8 rounded-[3rem] shadow-xl border-b-8 border-purple-200 flex flex-col items-center justify-between"
        >
          <div className="w-full">
            <h3 className="text-2xl font-black mb-4 flex items-center gap-2 text-purple-600">
              <QrCode className="text-purple-500" /> Escanear QR
            </h3>
            <p className="text-sm text-gray-500 mb-6 font-bold">
              ¿Tu amigo está al lado tuyo? Escanea su código directamente con tu cámara para unirte al instante.
            </p>
          </div>

          {!showScanner ? (
            <div className="w-full flex flex-col items-center gap-4">
              {currentRoom !== "global" ? (
                <div className="text-center w-full">
                  <div className="bg-white p-4 rounded-3xl inline-block border-4 border-purple-100 mb-4 shadow-sm relative">
                    <QRCode value={currentRoom} size={150} />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-md"
                      onClick={() => navigator.clipboard.writeText(currentRoom)}
                      title="Copiar código manual">
                      <Copy className="text-purple-600" size={16} />
                    </div>
                  </div>
                  <p className="font-black text-purple-600 text-lg">Sala actual: {currentRoom}</p>
                </div>
              ) : (
                <div
                  onClick={() => setShowScanner(true)}
                  className="aspect-square w-48 bg-purple-50 rounded-3xl border-4 border-purple-100 flex flex-col items-center justify-center p-8 text-center space-y-4 cursor-pointer hover:bg-purple-100 transition-colors"
                >
                  <QrCode size={80} className="text-purple-400" />
                  <span className="font-black text-purple-600 uppercase tracking-widest text-sm">
                    Abrir Cámara
                  </span>
                </div>
              )}

              {currentRoom !== "global" && (
                <button
                  onClick={() => setShowScanner(true)}
                  className="w-full py-4 mt-2 rounded-2xl font-black text-white text-lg bg-purple-500 hover:bg-purple-600 shadow-[0_6px_0_rgba(168,85,247,0.4)] transition-all"
                >
                  ESCANEAR A OTRO AMIGO
                </button>
              )}
            </div>
          ) : (
            <div className="w-full flex flex-col gap-4 relative">
              <button
                onClick={() => setShowScanner(false)}
                className="absolute -top-4 -right-4 bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-full z-10 transition-colors"
                title="Cerrar escáner"
              >
                <X size={20} className="font-bold" />
              </button>

              <div className="rounded-3xl overflow-hidden border-4 border-purple-200 aspect-square flex items-center justify-center bg-black">
                {ScannerComponent ? (
                  <ScannerComponent
                    onScan={(results: any) => {
                      if (results && results.length > 0 && results[0].rawValue) {
                        const code = results[0].rawValue;
                        if (/^\d+$/.test(code)) { // Ensure it's a numeric room code to prevent garbage
                          setShowScanner(false);
                          onJoinRoom(code);
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="text-white text-sm font-bold flex flex-col items-center gap-2">
                    <RefreshCw className="animate-spin text-purple-400" size={30} />
                    Cargando Cámara...
                  </div>
                )}
              </div>
              <p className="text-center font-bold text-purple-700 animate-pulse">Apuntando a la pantalla de un amigo...</p>
            </div>
          )}
        </motion.div>
      </div>

      <div className="bg-yellow-50 p-6 rounded-3xl border-2 border-yellow-200 flex items-start gap-4 shadow-sm">
        <div className="bg-yellow-100 p-3 rounded-xl">
          <Zap className="text-yellow-600" size={24} />
        </div>
        <div>
          <h4 className="font-black text-yellow-800">Modo Ahorro de Datos</h4>
          <p className="text-sm font-bold text-yellow-700/80">
            Al usar Códigos de Sala en Perú, el juego desactiva la descarga de imágenes pesadas y prioriza usar la red WiFi local para mantenerte conectado casi sin gastar saldo.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Login View ---

const LoginView = ({ onLogin }: { onLogin: (profile: UserProfile) => void }) => {
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname || pin.length < 4) {
      setError("Ingresa un Apodo y un PIN de al menos 4 números.");
      return;
    }
    setLoading(true);
    setError("");

    // Pseudo-email strategy for kids login
    const email = `${nickname.toLowerCase().replace(/[^a-z0-9]/g, '')}_${pin}@gamebuddy.com`;
    const password = `pin-${pin}-${nickname}`;

    try {
      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError && authError.message.includes("Invalid login")) {
        // Auto-signup if user doesn't exist
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        authData = signUpData;
      } else if (authError) {
        throw authError;
      }

      if (!authData.user) throw new Error("No user created");

      // Fetch or create profile
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: authData.user.id, nickname, energy: 100, happiness: 100, score: 0 }])
          .select()
          .single();
        if (insertError) throw insertError;
        profile = newProfile;
      } else if (profileError) {
        throw profileError;
      }

      playJumpSound();
      onLogin(profile as UserProfile);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al conectar. ¿Configuraste las tablas SQL?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-10 rounded-[3rem] shadow-2xl border-b-8 border-gray-200 max-w-md w-full relative z-10"
      >
        <div className="text-center mb-8">
          <Gamepad2 size={60} className="mx-auto text-blue-500 mb-4" />
          <h1 className="text-4xl font-black text-blue-600 italic uppercase">Game_Buddy Login</h1>
          <p className="text-gray-500 font-bold mt-2">Guarda a tu mascota en la nube</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2 uppercase">Tu Apodo</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="w-full p-4 bg-gray-50 border-4 border-gray-100 rounded-2xl text-xl font-black text-blue-600 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
              placeholder="Ej. Leo"
            />
          </div>
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2 uppercase">PIN Secreto (Números)</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full p-4 bg-gray-50 border-4 border-gray-100 rounded-2xl text-xl font-black text-blue-600 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors tracking-widest"
              placeholder="****"
              maxLength={4}
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 font-bold text-sm text-center">
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 active:bg-green-600 text-white font-black text-xl py-5 rounded-2xl shadow-[0_6px_0_rgb(22,163,74)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <RefreshCw className="animate-spin mx-auto" /> : "ENTRAR"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [buddyImg, setBuddyImg] = useState<string | null>(null);
  const [roomImg, setRoomImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [cheerMessage, setCheerMessage] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string>("global");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Buddy Care System State
  const [energy, setEnergy] = useState(100);
  const [happiness, setHappiness] = useState(100);

  // Sync state changes to global store for GameLoop
  useEffect(() => {
    if (profile) {
      (window as any).currentUserProfile = profile;
    }
  }, [profile]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        // Clear any old cached images from previous deployments
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('v2_cache_') || key.startsWith('v3_cache_'))) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(k => localStorage.removeItem(k));

        // Show orange dragon placeholder immediately, then replace with HF-generated Goku
        setBuddyImg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="#FF8C00"/><text x="60" y="75" text-anchor="middle" font-size="52">🐉</text></svg>')}`);
        setLoading(false);
        // Generate both in parallel: Goku avatar + room background (HF takes ~10-15s)
        Promise.all([
          generateBuddyImage("Goku from Dragon Ball, chibi anime style, orange gi, spiky black hair, energetic pose"),
          generateEnvironmentImage("A vibrant, colorful game lobby with floating islands and neon lights"),
        ]).then(([buddy, room]) => {
          setBuddyImg(buddy);
          setRoomImg(room);
        }).catch(() => setRoomImg("linear-gradient(135deg, #667eea 0%, #764ba2 100%)"))
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setLoading(false);
      }
    }

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (data) {
          setProfile(data as UserProfile);
          setEnergy(data.energy);
          setHappiness(data.happiness);
        }
      }
      loadInitialData();
    }

    checkSession();
  }, []);

  const handleCheer = async () => {
    if (cheerMessage) return;
    const msg = await generateCheerMessage();
    setCheerMessage(msg);
    setTimeout(() => setCheerMessage(null), 5000);
  };

  const handleUpdateBuddy = async (stylePrompt: string) => {
    const fullPrompt = `${stylePrompt}, Stumble Guys style, cute version, energetic pose, vibrant colors`;
    const newBuddy = await generateBuddyImage(fullPrompt);
    if (newBuddy) setBuddyImg(newBuddy);
  };

  const handleJoinRoom = (code: string) => {
    setCurrentRoom(code);
    setActiveTab("games"); // Redirect to the map to see friends
  };

  const navTo = (tab: string) => {
    if (soundEnabled) playClickSound();
    setActiveTab(tab);
  };

  const updateCloudState = async (attr: string, amount: number, setter: React.Dispatch<React.SetStateAction<number>>, isSet: boolean = false) => {
    if (!profile) return;
    setter(prev => {
      const newVal = isSet ? amount : Math.min(100, Math.max(0, prev + amount));
      supabase.from('profiles').update({ [attr]: newVal }).eq('id', profile.id).then();
      return newVal;
    });
  };

  // Replace HomeView handlers with Cloud Sync equivalents inside App rendering
  const handleLogin = (p: UserProfile) => {
    setProfile(p);
    setEnergy(p.energy);
    setHappiness(p.happiness);
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#E0F2FE] font-sans text-gray-900 overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(#3B82F6 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
        </div>
        <LoginView onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E0F2FE] font-sans text-gray-900 overflow-x-hidden pb-32">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(#3B82F6 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Header */}
      <header className="p-6 md:p-10 flex justify-between items-center relative z-10">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-4"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] shadow-[0_8px_0_rgb(30,58,138)] flex items-center justify-center border-4 border-white">
            <Gamepad2 className="text-white fill-white" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-blue-700 italic uppercase leading-none">GAME_BUDDY</h1>
            <p className="text-xs font-black text-blue-400 uppercase tracking-widest">NIVEL 12 • Pro Player</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex gap-4"
        >
          <StatusBadge icon={Star} value="4,500" color="border-yellow-400" />
          <StatusBadge icon={Trophy} value="28" color="border-purple-400" />
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="px-6 md:px-12 max-w-7xl mx-auto relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "home" && (
              <HomeView
                buddyImg={buddyImg}
                roomImg={roomImg}
                loading={loading}
                cheerMessage={cheerMessage}
                onCheer={handleCheer}
                energy={energy}
                setEnergy={(val) => {
                  const newVal = typeof val === 'function' ? val(energy) : val;
                  setEnergy(newVal);
                  updateCloudState('energy', newVal, setEnergy, true);
                }}
                happiness={happiness}
                setHappiness={(val) => {
                  const newVal = typeof val === 'function' ? val(happiness) : val;
                  setHappiness(newVal);
                  updateCloudState('happiness', newVal, setHappiness, true);
                }}
                soundEnabled={soundEnabled}
              />
            )}
            {activeTab === "games" && (
              <GamesView
                buddyImg={buddyImg}
                currentRoom={currentRoom}
                soundEnabled={soundEnabled}
                energy={energy}
                setEnergy={setEnergy}
              />
            )}
            {activeTab === "connect" && <ConnectView onJoinRoom={handleJoinRoom} currentRoom={currentRoom} />}
            {activeTab === "room" && <RoomView buddyImg={buddyImg} onUpdateBuddy={handleUpdateBuddy} />}
            {activeTab === "stories" && <StoriesView />}
            {activeTab === "settings" && (
              <div className="max-w-2xl mx-auto bg-white p-12 rounded-[4rem] shadow-2xl border-b-8 border-gray-100">
                <h2 className="text-3xl font-black mb-8 text-gray-800 uppercase italic">Ajustes del Juego</h2>
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-6 bg-gray-50 rounded-3xl">
                    <span className="font-black text-gray-600">Música de Fondo</span>
                    <div className="w-16 h-8 bg-gray-300 rounded-full relative cursor-not-allowed opacity-50"><div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow-md" /></div>
                  </div>
                  <div
                    className="flex justify-between items-center p-6 bg-gray-50 rounded-3xl cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      setSoundEnabled(!soundEnabled);
                      if (!soundEnabled) playClickSound();
                    }}
                  >
                    <span className="font-black text-gray-600">Efectos de Sonido (8-bits)</span>
                    <div className={cn("w-16 h-8 rounded-full relative transition-colors duration-300", soundEnabled ? "bg-green-500" : "bg-gray-300")}>
                      <div className={cn("absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300", soundEnabled ? "right-1" : "left-1")} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-gray-50 rounded-3xl">
                    <span className="font-black text-gray-600">Sesión Activa</span>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setProfile(null);
                        if (soundEnabled) playHitSound();
                      }}
                      className="px-6 py-2 bg-red-500 text-white rounded-full font-black text-sm shadow-[0_4px_0_rgb(185,28,28)] active:shadow-none active:translate-y-1 transition-all"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-6">
        <div className="bg-white/90 backdrop-blur-2xl p-4 rounded-[4rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-t-4 border-white flex gap-3 md:gap-6">
          <IconButton icon={Home} label="Inicio" color="bg-blue-600" active={activeTab === "home"} onClick={() => navTo("home")} />
          <IconButton icon={Gamepad2} label="Juegos" color="bg-green-500" active={activeTab === "games"} onClick={() => navTo("games")} />
          <IconButton icon={UserPlus} label="Conectar" color="bg-indigo-500" active={activeTab === "connect"} onClick={() => navTo("connect")} />
          <IconButton icon={Palette} label="Cuarto" color="bg-orange-500" active={activeTab === "room"} onClick={() => navTo("room")} />
          <IconButton icon={BookOpen} label="Historias" color="bg-pink-500" active={activeTab === "stories"} onClick={() => navTo("stories")} />
          <IconButton icon={Settings} label="Ajustes" color="bg-gray-600" active={activeTab === "settings"} onClick={() => navTo("settings")} />
        </div>
      </nav>
    </div>
  );
}
