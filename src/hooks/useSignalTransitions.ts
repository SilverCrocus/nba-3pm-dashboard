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

    // Apply flashes
    if (newFlashes.size > 0) {
      setFlashes(prev => {
        const merged = new Map(prev);
        newFlashes.forEach((v, k) => merged.set(k, v));
        return merged;
      });
      // Auto-clear after animation duration
      const ids = [...newFlashes.keys()];
      setTimeout(() => {
        setFlashes(prev => {
          const next = new Map(prev);
          ids.forEach(id => next.delete(id));
          return next;
        });
      }, FLASH_DURATION_MS);
    }

    // Apply ticks
    if (newTicks.size > 0) {
      setTicks(prev => {
        const merged = new Set(prev);
        newTicks.forEach(id => merged.add(id));
        return merged;
      });
      // Auto-clear after animation duration
      const ids = [...newTicks];
      setTimeout(() => {
        setTicks(prev => {
          const next = new Set(prev);
          ids.forEach(id => next.delete(id));
          return next;
        });
      }, TICK_DURATION_MS);
    }
  }, [signals]);

  return { flashes, ticks };
}
