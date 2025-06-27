import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipForward, RotateCcw, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TimeControlsProps {
  sessionId: number | null;
  currentTime?: Date;
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
}

export default function TimeControls({ 
  sessionId, 
  currentTime, 
  isPlaying, 
  onPlayStateChange 
}: TimeControlsProps) {
  const [speed, setSpeed] = useState([1]);
  const queryClient = useQueryClient();

  const advanceTimeMutation = useMutation({
    mutationFn: async (minutes: number) => {
      if (!sessionId) return;
      const res = await apiRequest("POST", `/api/backtest/${sessionId}/advance`, { minutes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/detail"] });
      queryClient.invalidateQueries({ queryKey: ["/api/forex/current"] });
    },
  });

  const setTimeMutation = useMutation({
    mutationFn: async (timestamp: Date) => {
      if (!sessionId) return;
      const res = await apiRequest("POST", `/api/backtest/${sessionId}/time`, { 
        timestamp: timestamp.toISOString() 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/detail"] });
      queryClient.invalidateQueries({ queryKey: ["/api/forex/current"] });
    },
  });

  const handlePlay = () => {
    onPlayStateChange(!isPlaying);
  };

  const handleStepForward = () => {
    const minutes = speed[0] * 60; // Convert to minutes based on speed
    advanceTimeMutation.mutate(minutes);
  };

  const handleReset = () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    setTimeMutation.mutate(thirtyDaysAgo);
    onPlayStateChange(false);
  };

  const formatDateTime = (date?: Date): string => {
    if (!date) return "No time set";
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    });
  };

  const speedLabels = ["1x", "2x", "4x", "8x", "16x"];
  const speedValues = [1, 2, 4, 8, 16];

  return (
    <div className="absolute bottom-16 left-4 right-4 z-10">
      <div className="trading-surface rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-between">
          {/* Time Display */}
          <div className="flex items-center space-x-3">
            <Clock className="h-4 w-4 trading-text-muted" />
            <div className="text-sm">
              <span className="trading-text-muted">Backtest Time:</span>
              <span className="ml-2 font-mono trading-text">
                {formatDateTime(currentTime)}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-4">
            {/* Speed Control */}
            <div className="flex items-center space-x-2">
              <span className="text-xs trading-text-muted">Speed:</span>
              <div className="w-24">
                <Slider
                  value={speed}
                  onValueChange={setSpeed}
                  max={4}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
              <span className="text-xs trading-text font-mono min-w-[24px]">
                {speedLabels[speed[0]]}
              </span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                className="text-xs"
                title="Reset to start"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              
              <Button
                size="sm"
                variant={isPlaying ? "default" : "ghost"}
                onClick={handlePlay}
                className="text-xs"
                disabled={!sessionId}
              >
                {isPlaying ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleStepForward}
                className="text-xs"
                disabled={!sessionId || advanceTimeMutation.isPending}
                title={`Step forward ${speedValues[speed[0]]} hour${speedValues[speed[0]] > 1 ? 's' : ''}`}
              >
                <SkipForward className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-3">
          <div className="flex justify-between text-xs trading-text-muted mb-1">
            <span>30 days ago</span>
            <span>Now</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: currentTime 
                  ? `${Math.min(100, Math.max(0, (Date.now() - currentTime.getTime()) / (30 * 24 * 60 * 60 * 1000) * 100))}%`
                  : "0%"
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}