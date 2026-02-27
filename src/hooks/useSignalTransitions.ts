'use client';

import { useRef, useState, useEffect } from 'react';
import { EnrichedSignal, SignalStatus } from '@/types/database';

export interface SignalTransitions {
  /** signal_id -> 'hit' | 'miss' for signals that just resolved */
  flashes: Map<string, 'hit' | 'miss'>;
  /** signal_id set for signals whose 3PM count just increased */
  ticks: Set<string>;
}

const FLASH_DURATION_MS = 1500;
const TICK_DURATION_MS = 400;

export function useSignalTransitions(signals: EnrichedSignal[]): SignalTransitions {
  const prevStatusRef = useRef<Map<string, SignalStatus>>(new Map());
  const prev3PMRef = useRef<Map<string, number>>(new Map());
  const [flashes, setFlashes] = useState<Map<string, 'hit' | 'miss'>>(new Map());
  const [ticks, setTicks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const prev3PM = prev3PMRef.current;
    const newFlashes = new Map<string, 'hit' | 'miss'>();
    const newTicks = new Set<string>();

    for (const signal of signals) {
      const id = signal.signal_id;
      const oldStatus = prevStatus.get(id);
      const newStatus = signal.signalStatus;

      // Detect status transition: tracking -> hit/miss
      if (oldStatus === 'tracking' && (newStatus === 'hit' || newStatus === 'miss')) {
        newFlashes.set(id, newStatus);
      }

      // Detect 3PM tick: value increased
      if (signal.liveThreePointersMade !== null) {
        const old3PM = prev3PM.get(id);
        if (old3PM !== undefined && signal.liveThreePointersMade > old3PM) {
          newTicks.add(id);
        }
        prev3PM.set(id, signal.liveThreePointersMade);
      }

      prevStatus.set(id, newStatus);
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Apply flashes asynchronously to avoid cascading renders
    if (newFlashes.size > 0) {
      const flashEntries = [...newFlashes.entries()];
      const flashIds = [...newFlashes.keys()];
      timers.push(setTimeout(() => {
        setFlashes(prev => {
          const merged = new Map(prev);
          flashEntries.forEach(([k, v]) => merged.set(k, v));
          return merged;
        });
      }, 0));
      // Auto-clear after animation duration
      timers.push(setTimeout(() => {
        setFlashes(prev => {
          const next = new Map(prev);
          flashIds.forEach(id => next.delete(id));
          return next;
        });
      }, FLASH_DURATION_MS));
    }

    // Apply ticks asynchronously to avoid cascading renders
    if (newTicks.size > 0) {
      const tickIds = [...newTicks];
      timers.push(setTimeout(() => {
        setTicks(prev => {
          const merged = new Set(prev);
          tickIds.forEach(id => merged.add(id));
          return merged;
        });
      }, 0));
      // Auto-clear after animation duration
      timers.push(setTimeout(() => {
        setTicks(prev => {
          const next = new Set(prev);
          tickIds.forEach(id => next.delete(id));
          return next;
        });
      }, TICK_DURATION_MS));
    }

    return () => timers.forEach(t => clearTimeout(t));
  }, [signals]);

  return { flashes, ticks };
}
