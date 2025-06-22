'use client';

import { type HTMLAttributes, useCallback, useEffect, useRef } from 'react';

class Pixel {
  width: number;
  height: number;
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  color: string;
  speed: number;
  size: number;
  sizeStep: number;
  minSize: number;
  maxSizeInteger: number;
  maxSize: number;
  delay: number;
  counter: number;
  counterStep: number;
  isIdle: boolean;
  isReverse: boolean;
  isShimmer: boolean;

  constructor(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    speed: number,
    delay: number
  ) {
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = context;
    this.x = x;
    this.y = y;
    this.color = color;
    this.speed = this.getRandomValue(0.1, 0.9) * speed;
    this.size = 0;
    this.sizeStep = Math.random() * 0.4;
    this.minSize = 0.5;
    this.maxSizeInteger = 2;
    this.maxSize = this.getRandomValue(this.minSize, this.maxSizeInteger);
    this.delay = delay;
    this.counter = 0;
    this.counterStep = Math.random() * 4 + (this.width + this.height) * 0.01;
    this.isIdle = false;
    this.isReverse = false;
    this.isShimmer = false;
  }

  getRandomValue(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  draw() {
    const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(
      this.x + centerOffset,
      this.y + centerOffset,
      this.size,
      this.size
    );
  }

  appear() {
    this.isIdle = false;

    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }

    if (this.size >= this.maxSize) {
      this.isShimmer = true;
    }

    if (this.isShimmer) {
      this.shimmer();
    } else {
      this.size += this.sizeStep;
    }

    this.draw();
  }

  disappear() {
    this.isShimmer = false;
    this.counter = 0;

    if (this.size <= 0) {
      this.isIdle = true;
      return;
    }
    this.size -= 0.1;

    this.draw();
  }

  shimmer() {
    if (this.size >= this.maxSize) {
      this.isReverse = true;
    } else if (this.size <= this.minSize) {
      this.isReverse = false;
    }

    if (this.isReverse) {
      this.size -= this.speed;
    } else {
      this.size += this.speed;
    }
  }
}

export interface PixelCanvasProps extends HTMLAttributes<HTMLDivElement> {
  gap?: number;
  speed?: number;
  colors?: string[];
  variant?: 'default' | 'icon';
  noFocus?: boolean;
}

export function PixelCanvas({
  gap = 5,
  speed = 35,
  colors = ['#f8fafc', '#f1f5f9', '#cbd5e1'],
  variant = 'default',
  noFocus = false,
  style,
  ...props
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const animationRef = useRef<number | null>(null);
  const timeIntervalRef = useRef<number>(1000 / 60);
  const timePreviousRef = useRef<number>(performance.now());
  const reducedMotionRef = useRef<boolean>(false);

  // Normalize props
  const normalizedGap = Math.max(4, Math.min(50, gap));
  const normalizedSpeed = reducedMotionRef.current
    ? 0
    : Math.max(0, Math.min(100, speed)) * 0.001;

  const getDistanceToCenter = useCallback(
    (x: number, y: number, canvas: HTMLCanvasElement) => {
      const dx = x - canvas.width / 2;
      const dy = y - canvas.height / 2;
      return Math.sqrt(dx * dx + dy * dy);
    },
    []
  );

  const getDistanceToBottomLeft = useCallback(
    (x: number, y: number, canvas: HTMLCanvasElement) => {
      const dx = x;
      const dy = canvas.height - y;
      return Math.sqrt(dx * dx + dy * dy);
    },
    []
  );

  const calculatePixelDelay = useCallback(
    (x: number, y: number, canvas: HTMLCanvasElement) => {
      if (reducedMotionRef.current) {
        return 0;
      }

      if (variant === 'icon') {
        return getDistanceToCenter(x, y, canvas);
      }

      return getDistanceToBottomLeft(x, y, canvas);
    },
    [variant, getDistanceToCenter, getDistanceToBottomLeft]
  );

  const createPixels = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!(canvas && ctx)) {
      return;
    }

    pixelsRef.current = [];

    for (let x = 0; x < canvas.width; x += normalizedGap) {
      for (let y = 0; y < canvas.height; y += normalizedGap) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const delay = calculatePixelDelay(x, y, canvas);

        pixelsRef.current.push(
          new Pixel(canvas, ctx, x, y, color, normalizedSpeed, delay)
        );
      }
    }
  }, [colors, normalizedGap, normalizedSpeed, calculatePixelDelay]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!(canvas && ctx)) {
      return;
    }

    const rect = canvas.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    createPixels();
  }, [createPixels]);

  const animateFrame = useCallback((name: 'appear' | 'disappear') => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!(canvas && ctx)) {
      return true;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let allIdle = true;
    for (const pixel of pixelsRef.current) {
      pixel[name]();
      if (!pixel.isIdle) {
        allIdle = false;
      }
    }

    return allIdle;
  }, []);

  const handleAnimation = useCallback(
    (name: 'appear' | 'disappear') => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      const animate = () => {
        animationRef.current = requestAnimationFrame(animate);

        const timeNow = performance.now();
        const timePassed = timeNow - timePreviousRef.current;

        if (timePassed < timeIntervalRef.current) {
          return;
        }

        timePreviousRef.current =
          timeNow - (timePassed % timeIntervalRef.current);

        const allIdle = animateFrame(name);

        if (allIdle && animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      };

      animate();
    },
    [animateFrame]
  );

  const handleMouseEnter = useCallback(() => {
    handleAnimation('appear');
  }, [handleAnimation]);

  const handleMouseLeave = useCallback(() => {
    handleAnimation('disappear');
  }, [handleAnimation]);

  const handleFocus = useCallback(() => {
    handleAnimation('appear');
  }, [handleAnimation]);

  const handleBlur = useCallback(() => {
    handleAnimation('disappear');
  }, [handleAnimation]);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
  }, []);

  const setupEventListeners = useCallback(
    (container: HTMLDivElement) => {
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);

      if (!noFocus) {
        container.addEventListener('focus', handleFocus, { capture: true });
        container.addEventListener('blur', handleBlur, { capture: true });
      }
    },
    [handleMouseEnter, handleMouseLeave, handleFocus, handleBlur, noFocus]
  );

  const cleanupEventListeners = useCallback(
    (container: HTMLDivElement) => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);

      if (!noFocus) {
        container.removeEventListener('focus', handleFocus, {
          capture: true,
        });
        container.removeEventListener('blur', handleBlur, { capture: true });
      }
    },
    [handleMouseEnter, handleMouseLeave, handleFocus, handleBlur, noFocus]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!(canvas && container)) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length) {
        return;
      }
      requestAnimationFrame(() => handleResize());
    });

    resizeObserver.observe(canvas);
    handleResize();
    setupEventListeners(container);

    return () => {
      resizeObserver.disconnect();
      cleanupEventListeners(container);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [handleResize, setupEventListeners, cleanupEventListeners]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
        ...style,
      }}
      {...props}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'grid',
          inlineSize: '100%',
          blockSize: '100%',
          overflow: 'hidden',
        }}
      />
    </div>
  );
}
