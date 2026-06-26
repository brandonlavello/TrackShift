<script setup>
import { computed } from 'vue';

const props = defineProps({
  activeRing: {
    type: String,
    default: null,
  },
  latitudeDeg: {
    type: Number,
    default: 0,
  },
});

/** Side-view helical trail — planet orbits Sun while the system moves through the galaxy. */
function buildHelixTrail({
  sunX,
  sunY,
  amplitude,
  wavelength,
  phase,
  length,
  steps = 48,
  verticalBias = 0,
}) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * length;
    const x = sunX - t;
    const orbitPhase = (t / wavelength) * Math.PI * 2 + phase;
    const y = sunY + Math.sin(orbitPhase) * amplitude + verticalBias;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M ${points.join(' L ')}`;
}

function buildSunTrail(sunX, sunY, length, steps = 24) {
  const dots = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * length;
    dots.push({ x: sunX - t, y: sunY, r: 1.2 - (i / steps) * 0.4 });
  }
  return dots;
}

const sunX = 200;
const sunY = 100;

const sunTrail = computed(() => buildSunTrail(sunX, sunY, 95));

const planetTrails = computed(() => [
  {
    id: 'earth',
    color: '#60a5fa',
    glow: '#3b82f6',
    amplitude: 22,
    wavelength: 34,
    phase: 0.4,
    length: 130,
    verticalBias: -6,
    ring: 'orbit',
  },
  {
    id: 'inner',
    color: '#94a3b8',
    glow: '#cbd5e1',
    amplitude: 14,
    wavelength: 22,
    phase: 2.1,
    length: 115,
    verticalBias: 4,
    ring: 'earth',
  },
  {
    id: 'outer',
    color: '#f87171',
    glow: '#ef4444',
    amplitude: 30,
    wavelength: 42,
    phase: 4.2,
    length: 140,
    verticalBias: 10,
    ring: 'galaxy',
  },
]);

const trails = computed(() =>
  planetTrails.value.map((p) => ({
    ...p,
    path: buildHelixTrail({
      sunX,
      sunY,
      amplitude: p.amplitude,
      wavelength: p.wavelength,
      phase: p.phase,
      length: p.length,
      verticalBias: p.verticalBias,
    }),
    head: trailHeadPoint(p),
  })),
);

function trailHeadPoint(planet) {
  const orbitPhase = planet.phase;
  return {
    x: sunX + Math.cos(orbitPhase) * (planet.amplitude * 0.35),
    y: sunY + Math.sin(orbitPhase) * planet.amplitude + planet.verticalBias,
  };
}

const spinRate = computed(() => {
  const lat = Math.abs(props.latitudeDeg);
  return `${Math.max(3, 18 - lat * 0.15)}s`;
});

function isActive(ring) {
  return props.activeRing != null && props.activeRing === ring;
}
</script>

<template>
  <div class="tw-space-y-3">
    <div
      class="tw-relative tw-overflow-hidden tw-rounded-xl tw-border tw-border-slate-800 tw-bg-black tw-p-3 sm:tw-p-4"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 320 200"
        class="tw-h-auto tw-w-full"
      >
        <defs>
          <radialGradient
            id="sun-glow"
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop
              offset="0%"
              stop-color="#fef3c7"
            />
            <stop
              offset="70%"
              stop-color="#fbbf24"
            />
            <stop
              offset="100%"
              stop-color="#f59e0b"
            />
          </radialGradient>
          <filter id="trail-glow">
            <feGaussianBlur
              stdDeviation="1.2"
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- Motion streaks (galaxy drift) -->
        <g opacity="0.25">
          <line
            x1="0"
            y1="42"
            x2="320"
            y2="42"
            stroke="#475569"
            stroke-width="0.5"
          />
          <line
            x1="0"
            y1="78"
            x2="320"
            y2="78"
            stroke="#334155"
            stroke-width="0.5"
          />
          <line
            x1="0"
            y1="158"
            x2="320"
            y2="158"
            stroke="#475569"
            stroke-width="0.5"
          />
          <circle
            cx="28"
            cy="24"
            r="0.5"
            fill="#64748b"
          />
          <circle
            cx="88"
            cy="18"
            r="0.4"
            fill="#94a3b8"
          />
          <circle
            cx="268"
            cy="32"
            r="0.5"
            fill="#64748b"
          />
          <circle
            cx="302"
            cy="168"
            r="0.4"
            fill="#94a3b8"
          />
        </g>

        <!-- Galactic motion arrow -->
        <g
          class="cosmic-galactic-flow"
          :class="{ 'cosmic-highlight': isActive('galaxy') || isActive('cmb') }"
        >
          <path
            d="M 8 100 L 72 100"
            stroke="#a78bfa"
            stroke-width="1"
            stroke-dasharray="3 4"
            opacity="0.5"
          />
          <polygon
            points="76,100 68,96 68,104"
            fill="#a78bfa"
            opacity="0.6"
          />
          <text
            x="8"
            y="88"
            fill="#94a3b8"
            font-size="8"
            font-family="system-ui, sans-serif"
          >
            Through the galaxy
          </text>
        </g>

        <!-- Tilted orbital planes (like the reference diagram) -->
        <g
          transform="translate(200 100) rotate(-58)"
          opacity="0.45"
        >
          <ellipse
            cx="0"
            cy="0"
            rx="38"
            ry="12"
            fill="none"
            stroke="#e2e8f0"
            stroke-width="0.8"
            :class="{ 'cosmic-orbit-plane-active': isActive('orbit') }"
            class="cosmic-orbit-plane"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="52"
            ry="16"
            fill="none"
            stroke="#cbd5e1"
            stroke-width="0.6"
            opacity="0.7"
            class="cosmic-orbit-plane"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="66"
            ry="20"
            fill="none"
            stroke="#94a3b8"
            stroke-width="0.5"
            opacity="0.5"
            class="cosmic-orbit-plane"
          />
        </g>

        <!-- Helical planet trails -->
        <g
          v-for="trail in trails"
          :key="trail.id"
          filter="url(#trail-glow)"
        >
          <path
            :d="trail.path"
            fill="none"
            :stroke="trail.color"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.35"
            class="cosmic-helix-trail"
            :class="{ 'cosmic-helix-active': isActive(trail.ring) }"
          />
          <circle
            :cx="trail.head.x"
            :cy="trail.head.y"
            r="3.5"
            :fill="trail.glow"
            :class="{ 'cosmic-planet-pulse': isActive(trail.ring) }"
          />
        </g>

        <!-- Sun trail -->
        <g>
          <circle
            v-for="(dot, i) in sunTrail"
            :key="i"
            :cx="dot.x"
            :cy="dot.y"
            :r="dot.r"
            fill="#fbbf24"
            :opacity="0.15 + (i / sunTrail.length) * 0.55"
          />
        </g>

        <!-- Sun -->
        <g
          class="cosmic-sun"
          :class="{ 'cosmic-sun-active': isActive('orbit') || isActive('galaxy') }"
        >
          <circle
            :cx="sunX"
            :cy="sunY"
            r="16"
            fill="#fbbf24"
            opacity="0.12"
          />
          <circle
            :cx="sunX"
            :cy="sunY"
            r="11"
            fill="url(#sun-glow)"
          />
        </g>

        <!-- Earth rotation hint -->
        <g
          v-if="trails[0]"
          class="cosmic-earth-spin"
          :class="{ 'cosmic-highlight': isActive('earth') }"
          :transform="`translate(${trails[0].head.x} ${trails[0].head.y})`"
          :style="{ animationDuration: spinRate }"
        >
          <circle
            cx="0"
            cy="0"
            r="6"
            fill="none"
            stroke="#38bdf8"
            stroke-width="1"
            stroke-dasharray="2 3"
            opacity="0.7"
          />
        </g>
      </svg>

      <div
        class="tw-mt-2 tw-flex tw-flex-wrap tw-justify-center tw-gap-3 tw-text-[10px] tw-text-slate-400"
      >
        <span class="tw-flex tw-items-center tw-gap-1">
          <span class="tw-h-2 tw-w-2 tw-rounded-full tw-bg-amber-400" /> Sun
        </span>
        <span class="tw-flex tw-items-center tw-gap-1">
          <span class="tw-h-2 tw-w-2 tw-rounded-full tw-bg-blue-400" /> Earth (helical path)
        </span>
        <span class="tw-flex tw-items-center tw-gap-1">
          <span class="tw-h-1.5 tw-w-4 tw-rounded tw-bg-violet-400/50" /> Galactic motion
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cosmic-helix-trail {
  stroke-dasharray: 6 10;
  animation: cosmic-dash 12s linear infinite;
}

.cosmic-helix-active {
  opacity: 0.85 !important;
  stroke-width: 2.5;
}

.cosmic-planet-pulse {
  animation: cosmic-pulse 1.5s ease-in-out infinite;
}

.cosmic-earth-spin {
  transform-box: fill-box;
  transform-origin: center;
  animation: cosmic-spin linear infinite;
}

.cosmic-sun {
  animation: cosmic-sun-drift 20s ease-in-out infinite alternate;
}

@keyframes cosmic-dash {
  to {
    stroke-dashoffset: -160;
  }
}

@keyframes cosmic-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes cosmic-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

@keyframes cosmic-sun-drift {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(6px);
  }
}

.cosmic-highlight .cosmic-orbit-plane,
.cosmic-orbit-plane-active {
  stroke-width: 1.4;
  opacity: 1;
}

.cosmic-sun-active circle:last-child {
  filter: drop-shadow(0 0 6px #fbbf24);
}
</style>
