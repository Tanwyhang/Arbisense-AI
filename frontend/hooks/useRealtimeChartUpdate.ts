'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseRealtimeChartUpdateOptions<T> {
  initialData: T[];
  maxPoints?: number;
  debounceMs?: number;
  onNewData?: (data: T) => void;
}

interface UseRealtimeChartUpdateReturn<T> {
  data: T[];
  addDataPoint: (point: T) => void;
  clearData: () => void;
  lastUpdateTime: number | null;
  isPulsing: boolean;
  isAutoScroll: boolean;
  toggleAutoScroll: () => void;
}

export default function useRealtimeChartUpdate<T>({
  initialData,
  maxPoints = 50,
  debounceMs = 100,
  onNewData,
}: UseRealtimeChartUpdateOptions<T>): UseRealtimeChartUpdateReturn<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  
  const pendingUpdates = useRef<T[]>([]);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const flushUpdates = useCallback(() => {
    if (pendingUpdates.current.length === 0) return;
    
    setData(prev => {
      const newData = [...prev, ...pendingUpdates.current];
      return newData.slice(-maxPoints);
    });
    
    setLastUpdateTime(Date.now());
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 200);
    
    pendingUpdates.current = [];
  }, [maxPoints]);

  const addDataPoint = useCallback((point: T) => {
    pendingUpdates.current.push(point);
    onNewData?.(point);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(flushUpdates, debounceMs);
  }, [debounceMs, flushUpdates, onNewData]);

  const clearData = useCallback(() => {
    setData([]);
    pendingUpdates.current = [];
    setLastUpdateTime(null);
  }, []);

  const toggleAutoScroll = useCallback(() => {
    setIsAutoScroll(prev => !prev);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    data,
    addDataPoint,
    clearData,
    lastUpdateTime,
    isPulsing,
    isAutoScroll,
    toggleAutoScroll,
  };
}
