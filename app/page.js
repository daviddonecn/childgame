'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const TREE_APPLE_COUNT = 8;

function createApple(id) {
  return {
    id,
    number: Math.floor(Math.random() * 10),
    picked: false,
    x: 12 + (id % 4) * 21 + Math.random() * 4,
    y: 14 + Math.floor(id / 4) * 24 + Math.random() * 5
  };
}

export default function HomePage() {
  const [score, setScore] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [message, setMessage] = useState('欢迎来到苹果采摘园！');
  const [musicOn, setMusicOn] = useState(false);
  const [sparkles, setSparkles] = useState([]);
  const [apples, setApples] = useState(() => Array.from({ length: TREE_APPLE_COUNT }, (_, i) => createApple(i + 1)));
  const [targetNumber, setTargetNumber] = useState(() => Math.floor(Math.random() * 10));

  const musicCtxRef = useRef(null);
  const sfxCtxRef = useRef(null);
  const musicTimerRef = useRef(null);
  const noteRef = useRef(0);

  const praiseList = useMemo(() => ['太棒啦！', '你真厉害！', '采摘成功！', '完美！'], []);

  const speak = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const getSfxContext = async () => {
    if (!sfxCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      sfxCtxRef.current = new AudioContextClass();
    }
    if (sfxCtxRef.current.state === 'suspended') {
      await sfxCtxRef.current.resume();
    }
    return sfxCtxRef.current;
  };

  const playGoodSound = async () => {
    const audioContext = await getSfxContext();
    const now = audioContext.currentTime;
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((hz, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = now + index * 0.08;
      oscillator.type = 'sine';
      oscillator.frequency.value = hz;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.06, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.14);
    });
  };

  const playBadSound = async () => {
    const audioContext = await getSfxContext();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(260, now);
    oscillator.frequency.linearRampToValueAtTime(180, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.22);
  };

  const stopMusic = () => {
    setMusicOn(false);
    if (musicTimerRef.current) {
      clearInterval(musicTimerRef.current);
      musicTimerRef.current = null;
    }
  };

  const startMusic = async () => {
    try {
      if (!musicCtxRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        musicCtxRef.current = new AudioContextClass();
      }
      const audioContext = musicCtxRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const melody = [392, 440, 523.25, 440, 392, 349.23, 392, 523.25];
      noteRef.current = 0;

      const playBeat = () => {
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.value = melody[noteRef.current % melody.length];
        noteRef.current += 1;

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.035, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.35);
      };

      playBeat();
      if (musicTimerRef.current) clearInterval(musicTimerRef.current);
      musicTimerRef.current = setInterval(playBeat, 360);
      setMusicOn(true);
    } catch {
      setMessage('背景音乐启动失败，先开心采摘吧！');
    }
  };

  const resetTree = () => {
    const nextApples = Array.from({ length: TREE_APPLE_COUNT }, (_, i) => createApple(i + 1));
    setApples(nextApples);
    const alive = nextApples.filter((item) => !item.picked);
    const targetApple = alive[Math.floor(Math.random() * alive.length)];
    setTargetNumber(targetApple.number);
    setMessage(`小猴子说：请采摘数字 ${targetApple.number} 的苹果！`);
    speak(`请采摘数字${targetApple.number}`);
  };

  useEffect(() => {
    resetTree();
  }, []);

  const burstAtCart = () => {
    const particles = Array.from({ length: 14 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      angle: (Math.PI * 2 * i) / 14,
      life: 1,
      color: `hsl(${Math.random() * 360}, 90%, 62%)`
    }));
    setSparkles((old) => [...old, ...particles]);
  };

  const pickByNumber = async (num) => {
    const index = apples.findIndex((item) => !item.picked && item.number === targetNumber && num === targetNumber);
    if (index === -1) {
      setMessage(`这次要找的是 ${targetNumber} 哦，再试试！`);
      speak('再试试');
      await playBadSound();
      return;
    }

    const next = [...apples];
    next[index] = { ...next[index], picked: true };
    setApples(next);
    setScore((prev) => prev + 20);
    setCartCount((prev) => prev + 1);
    burstAtCart();

    const cheer = praiseList[Math.floor(Math.random() * praiseList.length)];
    setMessage(`${cheer} 苹果进小车啦！+20分`);
    speak('太棒了，苹果进小车了');
    await playGoodSound();

    const left = next.filter((item) => !item.picked);
    if (!left.length) {
      setTimeout(() => {
        setMessage('一棵树采摘完成，去下一棵树！');
        resetTree();
      }, 700);
      return;
    }

    const nextTarget = left[Math.floor(Math.random() * left.length)];
    setTargetNumber(nextTarget.number);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (/^[0-9]$/.test(event.key)) {
        pickByNumber(Number(event.key));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [apples, targetNumber]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSparkles((old) => old.map((item) => ({ ...item, life: item.life - 0.12 })).filter((item) => item.life > 0));
    }, 70);

    return () => {
      clearInterval(timer);
      stopMusic();
      if (musicCtxRef.current) musicCtxRef.current.close();
      if (sfxCtxRef.current) sfxCtxRef.current.close();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <main className="park-wrap">
      <header className="top-bar">
        <h1>🐵 宝宝采摘苹果园 🍎</h1>
        <p>看数字，按数字，小猴子把苹果装进小车车！</p>
      </header>

      <section className="hud">
        <div>得分：<strong>{score}</strong></div>
        <div>已采摘：<strong>{cartCount}</strong></div>
        <div className="target">目标数字：<strong>{targetNumber}</strong></div>
      </section>

      <section className="orchard" aria-label="苹果采摘园">
        <div className="sun">☀️</div>

        <div className="tree">
          <div className="leaves" />
          <div className="trunk" />

          {apples.map((apple) => (
            <button
              key={apple.id}
              className={`apple ${apple.picked ? 'picked' : ''}`}
              style={{ left: `${apple.x}%`, top: `${apple.y}%` }}
              onClick={() => pickByNumber(apple.number)}
              disabled={apple.picked}
              aria-label={`数字${apple.number}苹果`}
            >
              <span>🍎</span>
              <b>{apple.number}</b>
            </button>
          ))}
        </div>

        <div className="monkey-lane">
          <div className="monkey-cart" style={{ transform: `translateX(${Math.min(cartCount * 10, 180)}px)` }}>
            <span className="monkey">🐵</span>
            <span className="cart">🛒</span>
            <span className="bag">{Array.from({ length: Math.min(cartCount, 6) }, (_, i) => <i key={i}>🍎</i>)}</span>
          </div>

          {sparkles.map((item) => (
            <span
              key={item.id}
              className="spark"
              style={{
                transform: `translate(${560 + Math.cos(item.angle) * (1 - item.life) * 90}px, ${470 + Math.sin(item.angle) * (1 - item.life) * 90}px) scale(${item.life})`,
                opacity: item.life,
                backgroundColor: item.color
              }}
            />
          ))}
        </div>
      </section>

      <section className="message-box">{message}</section>

      <section className="numpad" aria-label="数字键盘">
        {Array.from({ length: 10 }, (_, num) => (
          <button key={num} onClick={() => pickByNumber(num)}>
            {num}
          </button>
        ))}
      </section>

      <section className="bottom-actions">
        <button className="music-btn" onClick={() => (musicOn ? stopMusic() : startMusic())}>
          {musicOn ? '🔇 关闭背景音乐' : '🎵 开启背景音乐'}
        </button>
        <button className="reset-btn" onClick={resetTree}>🌳 换一棵苹果树</button>
      </section>
    </main>
  );
}
