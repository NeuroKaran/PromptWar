'use client';

import { useGameStore } from '@/lib/gameStore';
import { GLOBAL_DAILY_TARGET } from '@/lib/carbonMath';
import { getChoiceLabel } from '@/lib/weeklyReport';
import { getAudioManager } from '@/lib/audioManager';
import { useState, useEffect } from 'react';

export default function WeeklyReport() {
  const report = useGameStore((s) => s.lastWeeklyReport);
  const dismissWeeklyReport = useGameStore((s) => s.dismissWeeklyReport);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    getAudioManager().play('day_complete');
    const t = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(t);
  }, []);

  if (!report) return null;

  const isGoodWeek = report.avgDailyCO2 <= GLOBAL_DAILY_TARGET;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/assets/Office.webp), url(/assets/Office.png)',
          filter: 'brightness(0.15) saturate(0.3)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />

      {/* Newspaper */}
      {showContent && (
        <div className="relative z-10 w-full max-w-md mx-4 animate-scale-in">
          <div className="newspaper" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            {/* Header */}
            <div className="text-center mb-1">
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.5rem', color: '#666' }}>
                THE ECOPIXEL TIMES
              </div>
            </div>
            <h1 style={{ fontSize: '0.85rem' }}>
              📰 WEEK {report.weekIndex + 1} REPORT
            </h1>

            {/* Overall Grade */}
            <div className="text-center mb-4 p-3" style={{ background: isGoodWeek ? '#d4edda' : '#f8d7da', border: `2px solid ${isGoodWeek ? '#28a745' : '#dc3545'}` }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.7rem', color: isGoodWeek ? '#155724' : '#721c24' }}>
                {isGoodWeek ? '🌟 EXCELLENT WEEK!' : '⚠️ ROOM TO IMPROVE'}
              </div>
            </div>

            {/* Stats */}
            <div className="newspaper-stat flex justify-between">
              <span>Avg. daily CO₂:</span>
              <strong style={{ color: report.avgDailyCO2 <= GLOBAL_DAILY_TARGET ? '#28a745' : '#dc3545' }}>
                {report.avgDailyCO2} kg/day
              </strong>
            </div>
            <div className="newspaper-stat flex justify-between">
              <span>Target:</span>
              <strong>{GLOBAL_DAILY_TARGET} kg/day</strong>
            </div>
            <div className="newspaper-stat flex justify-between">
              <span>Total this week:</span>
              <strong>{report.totalCO2} kg CO₂e</strong>
            </div>
            <div className="newspaper-stat flex justify-between">
              <span>Days under target:</span>
              <strong style={{ color: '#28a745' }}>{report.daysBelowTarget} / 7</strong>
            </div>

            {/* Best / Worst */}
            {report.bestDecision && (
              <div className="mt-4 p-3" style={{ background: '#d4edda', border: '1px solid #c3e6cb' }}>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.45rem', color: '#155724', marginBottom: '4px' }}>
                  🏆 BEST DECISION
                </div>
                <div style={{ fontSize: '1.3rem' }}>
                  {getChoiceLabel(report.bestDecision.choiceId)} ({report.bestDecision.co2Delta} kg)
                </div>
              </div>
            )}

            {report.worstDecision && (
              <div className="mt-2 p-3" style={{ background: '#f8d7da', border: '1px solid #f5c6cb' }}>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.45rem', color: '#721c24', marginBottom: '4px' }}>
                  💀 WORST DECISION
                </div>
                <div style={{ fontSize: '1.3rem' }}>
                  {getChoiceLabel(report.worstDecision.choiceId)} ({report.worstDecision.co2Delta} kg)
                </div>
              </div>
            )}

            {/* Counterfactual */}
            <div className="mt-4 p-3" style={{ background: '#fff3cd', border: '1px solid #ffc107' }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.45rem', color: '#856404', marginBottom: '4px' }}>
                💡 WHAT IF?
              </div>
              <div style={{ fontSize: '1.3rem', color: '#856404' }}>
                If you&apos;d chosen the greenest option every time, you could have saved up to {report.counterfactualSavings} kg CO₂ this week!
              </div>
            </div>

            {/* Daily chart */}
            <div className="mt-4">
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.45rem', marginBottom: '8px' }}>
                DAILY BREAKDOWN
              </div>
              <div className="flex items-end gap-1" style={{ height: '60px' }}>
                {report.dailyScores.map((score, i) => {
                  const maxScore = Math.max(...report.dailyScores, GLOBAL_DAILY_TARGET);
                  const height = (score / maxScore) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 transition-all"
                      style={{
                        height: `${height}%`,
                        background: score <= GLOBAL_DAILY_TARGET ? '#28a745' : '#dc3545',
                        minHeight: '4px',
                      }}
                      title={`Day ${i + 1}: ${score} kg`}
                    />
                  );
                })}
              </div>
              {/* Target line label */}
              <div className="flex justify-between mt-1" style={{ fontSize: '0.9rem', color: '#999' }}>
                <span>Day 1</span>
                <span>Day 7</span>
              </div>
            </div>

            {/* Dismiss */}
            <div className="text-center mt-6">
              <button
                id="dismiss-report-btn"
                onClick={() => { getAudioManager().play('click'); dismissWeeklyReport(); }}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '0.55rem',
                  padding: '10px 20px',
                  background: '#333',
                  color: '#fff',
                  border: '2px solid #666',
                  cursor: 'pointer',
                }}
              >
                Continue ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
