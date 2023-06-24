/* eslint-disable id-length */

'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';

type Coordinates = {
  x: number;
  y: number;
};

const SVGGradient: FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [coords, setCoords] = useState<Coordinates>({ x: 0, y: 0 });

  const screenToSVG = (coordinates: Coordinates) => {
    if (!svgRef.current) {
      return { x: 0, y: 0 };
    }

    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = coordinates.x;
    point.y = coordinates.y;

    return point.matrixTransform(svg.getScreenCTM()?.inverse());
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const newCoords = screenToSVG({ x: event.clientX, y: event.clientY });

      if (newCoords.x !== coords.x && newCoords.y !== coords.y) {
        setCoords(newCoords);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [coords.x, coords.y]);

  return (
    <div className="absolute inset-0 hidden sm:block">
      <div className="relative h-full w-full">
        <Image
          src="/noise.png"
          alt="noise"
          className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
          width={1512}
          height={982}
        />

        <svg
          ref={svgRef}
          className="relative min-h-full min-w-full"
          viewBox="0 0 1512 982"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_878_1737)">
            <rect width="1512" height="982" fill="#1C1C1C" />
            <g filter="url(#filter0_f_878_1737)">
              <path
                d="M984 217.5C984 359 658.5 387.756 583 456.5C507.5 525.244 158.359 964 -19.5 964C-162.829 1141.33 -139 1008 -52.805 933.553C-174.626 933.553 -103.184 -0.252945 -103.184 -97.0044C-103.184 -193.756 355.031 -40.2318 476.852 -40.2318C763.466 -126.742 984 120.749 984 217.5Z"
                fill="#A390CE"
              />
            </g>
            <g filter="url(#filter1_f_878_1737)">
              <ellipse
                cx="983.5"
                cy="-15.5"
                rx="332.5"
                ry="263.5"
                fill="#8EADD9"
              />
            </g>

            <g
              transform={`translate(${coords.x} ${coords.y})`}
              className="mix-blend-color-dodge"
              filter="url(#filter2_f_878_1737)"
            >
              <path
                d="M145.315 -7.65351C122.208 154.962 385.107 134.277 519.445 103.607C555.57 82.7502 509.545 -26.117 443.829 -95.7139C378.113 -165.311 548.881 -294.712 484.481 -387.158C420.081 -479.603 174.199 -210.923 145.315 -7.65351Z"
                fill="#F838CD"
              />
              <path
                d="M233.221 -116.853C162.602 -177.782 -362.623 426.665 -182.463 523.08C-19.1196 610.495 401.825 195.226 451.222 153.295C512.968 100.882 321.496 -40.6913 233.221 -116.853Z"
                fill="#7A81BD"
              />
              <path
                d="M98.7067 -164.626C43.8658 -288.255 -143.801 -301.321 -235.873 -301.321C-327.946 -301.321 -513.6 -280.817 -519.637 -198.8C-527.184 -96.2787 -414.484 -88.7404 -414.484 128.363C-414.484 345.467 -216.754 206.259 23.2375 206.259C215.231 206.259 153.548 -40.9977 98.7067 -164.626Z"
                fill="#F1972C"
              />
            </g>
          </g>
          <defs>
            <filter
              id="filter0_f_878_1737"
              x="-424"
              y="-429"
              width="1708"
              height="1780.99"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend
                mode="normal"
                in="SourceGraphic"
                in2="BackgroundImageFix"
                result="shape"
              />
              <feGaussianBlur
                stdDeviation="100"
                result="effect1_foregroundBlur_878_1737"
              />
            </filter>
            <filter
              id="filter1_f_878_1737"
              x="351"
              y="-579"
              width="1265"
              height="1127"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend
                mode="normal"
                in="SourceGraphic"
                in2="BackgroundImageFix"
                result="shape"
              />
              <feGaussianBlur
                stdDeviation="100"
                result="effect1_foregroundBlur_878_1737"
              />
            </filter>
            <filter
              id="filter2_f_878_1737"
              x="-960"
              y="-845.921"
              width="1932.12"
              height="1821.06"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend
                mode="normal"
                in="SourceGraphic"
                in2="BackgroundImageFix"
                result="shape"
              />
              <feGaussianBlur
                stdDeviation="150"
                result="effect1_foregroundBlur_878_1737"
              />
            </filter>
            <clipPath id="clip0_878_1737">
              <rect width="1512" height="982" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default SVGGradient;
