'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const FRUITS = ['🍎', '🍐', '🍊', '🍉', '🍇', '🍓'];
const FRUIT_COUNT = 6;
const SCREEN_WIDTH = 900;
const SCREEN_HEIGHT = 620;

function randomNumber() {
  return Math.floor(Math.random() * 10);
}

function createFruit(id) {
  const speed = 70 + Math.random() * 90;
  return {
    id,
    emoji: FRUITS[Math.floor(Math.random() * FRUITS.length)],
    number: randomNumber(),
    x: 40 + Math.random() * (SCREEN_WIDTH - 120),
    y: -Math.random() * 300,
    speed,
    spin: Math.random() * 360,
    spinSpeed: -90 + Math.random() * 180,
    pop: false
  };
}

export default function HomePage() {
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [fruits, setFruits] = useState(() => Array.from({ length: FRUIT_COUNT }, (_, i) => createFruit(i)));
  const [effects, setEffects] = useState([]);
  const [message, setMessage] = useState('准备好了吗？按数字开始吧！');
  const [smashed, setSmashed] = useState([]);
  const nextId = useRef(FRUIT_COUNT + 1);
  const spokenTextRef = useRef('');
  const audioCtxRef = useRef(null);
  const musicTimerRef = useRef(null);
  const noteIndexRef = useRef(0);
  const [musicOn, setMusicOn] = useState(false);

  useEffect(() => {
    let animationId;
    let previous = performance.now();

    const animate = (time) => {
      const delta = (time - previous) / 1000;
      previous = time;

      setFruits((prev) => {
        const next = [...prev];
        const newSmashed = [];

        for (let i = 0; i < next.length; i += 1) {
          const fruit = next[i];
          const updated = {
            ...fruit,
            y: fruit.y + fruit.speed * delta,
            spin: fruit.spin + fruit.spinSpeed * delta
          };

          if (updated.y > SCREEN_HEIGHT - 70) {
            newSmashed.push({
              id: updated.id,
              x: updated.x,
              emoji: '💥🍎',
              life: 1
            });
            next[i] = createFruit(nextId.current);
            nextId.current += 1;
            setStreak(0);
            setMessage('哎呀，水果掉地上啦！快接下一个！');
          } else {
            next[i] = updated;
          }
        }

        if (newSmashed.length) {
          setSmashed((old) => [...old, ...newSmashed]);
        }

        return next;
      });

      setSmashed((prev) => prev.map((item) => ({ ...item, life: item.life - delta * 1.8 })).filter((item) => item.life > 0));
      setEffects((prev) => prev.map((item) => ({ ...item, life: item.life - delta * 1.4 })).filter((item) => item.life > 0));

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const praise = useMemo(() => ['太棒了！', '你真厉害！', '完美命中！', '继续加油！'], []);

  const speak = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (spokenTextRef.current === text) {
      return;
    }

    spokenTextRef.current = text;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
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
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }

      const audioContext = audioCtxRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      if (musicTimerRef.current) {
        clearInterval(musicTimerRef.current);
      }

      const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 783.99, 698.46];
      noteIndexRef.current = 0;

      const playNote = () => {
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.value = notes[noteIndexRef.current % notes.length];
        noteIndexRef.current += 1;

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(0.045, now + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.35);
      };

      playNote();
      musicTimerRef.current = setInterval(playNote, 360);
      setMusicOn(true);
    } catch {
      setMessage('音乐暂时无法播放，先继续游戏吧！');
      setMusicOn(false);
    }
  };

  const onInputNumber = (num) => {
    setFruits((prev) => {
      const hitIndex = prev.findIndex((item) => item.number === num);

      if (hitIndex === -1) {
        setStreak(0);
        setMessage(`这个是 ${num}，再看看水果上的数字哦～`);
        return prev;
      }

      const hit = prev[hitIndex];
      const next = [...prev];
      next[hitIndex] = createFruit(nextId.current);
      nextId.current += 1;

      setScore((s) => s + 10);
      setStreak((s) => s + 1);
      const wow = praise[Math.floor(Math.random() * praise.length)];
      setMessage(`${wow} +10分`);
      speak('太棒了');

      const burst = Array.from({ length: 12 }, (_, i) => ({
        id: `${hit.id}-${i}-${Date.now()}`,
        x: hit.x + 25,
        y: hit.y + 25,
        angle: (Math.PI * 2 * i) / 12,
        life: 1,
        color: `hsl(${Math.random() * 360}, 88%, 62%)`
      }));

      setEffects((old) => [...old, ...burst]);
      return next;
    });
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (/^[0-9]$/.test(event.key)) {
        onInputNumber(Number(event.key));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      stopMusic();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <main className="game-wrap">
      <h1>🍓 水果数字大挑战 🍍</h1>
      <p className="tip">按键盘数字，或点下面数字按钮，打中对应水果就得分！</p>

      <section className="score-panel">
        <div>得分：<strong>{score}</strong></div>
        <div>连击：<strong>{streak}</strong></div>
        <div className="message">{message}</div>
      </section>

      <section className="arena" aria-label="水果掉落游戏区域">
        {fruits.map((fruit) => (
          <article
            key={fruit.id}
            className="fruit"
            style={{ transform: `translate(${fruit.x}px, ${fruit.y}px) rotate(${fruit.spin}deg)` }}
          >
            <span className="emoji" role="img" aria-label="fruit">{fruit.emoji}</span>
            <span className="number">{fruit.number}</span>
          </article>
        ))}

        {effects.map((effect) => (
          <span
            key={effect.id}
            className="spark"
            style={{
              transform: `translate(${effect.x + Math.cos(effect.angle) * (1 - effect.life) * 110}px, ${effect.y + Math.sin(effect.angle) * (1 - effect.life) * 110}px) scale(${effect.life})`,
              backgroundColor: effect.color,
              opacity: effect.life
            }}
          />
        ))}

        {smashed.map((item) => (
          <span key={`${item.id}-${item.life}`} className="smashed" style={{ left: item.x, opacity: item.life }}>
            {item.emoji}
          </span>
        ))}
      </section>

      <section className="controls" aria-label="数字按钮">
        {Array.from({ length: 10 }, (_, num) => (
          <button key={num} onClick={() => onInputNumber(num)}>
            {num}
          </button>
        ))}
      </section>

      <button
        className="music-toggle"
        onClick={() => {
          if (musicOn) {
            stopMusic();
          } else {
            startMusic();
          }
        }}
      >
        {musicOn ? '🔇 关闭背景音乐' : '🎵 开启背景音乐'}
      </button>
    </main>
  );
}
