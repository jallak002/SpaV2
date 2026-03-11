'use client'

import React from 'react'

export default function LoadingScreen({ fullScreen = true }: { fullScreen?: boolean }) {
    return (
        <div className={`flex flex-col items-center justify-center ${fullScreen ? 'fixed inset-0 z-[9999] bg-[#0A0A0A]/90 backdrop-blur-md' : 'h-full w-full min-h-[400px]'}`}>
            <div className="relative flex items-center justify-center w-24 h-24 mb-6">
                {/* Dış halka */}
                <div
                    className="absolute inset-0 rounded-full border-t-[3px] border-r-[3px] border-transparent border-t-[#C9A84C] animate-spin"
                    style={{ animationDuration: '1.2s' }}
                />

                {/* İç halka */}
                <div
                    className="absolute inset-3 rounded-full border-b-[2px] border-l-[2px] border-transparent border-b-[#C9A84C]/60 animate-spin"
                    style={{ animationDuration: '2s', animationDirection: 'reverse' }}
                />

                {/* Merkez ışık */}
                <div className="w-4 h-4 rounded-full bg-[#C9A84C] animate-pulse shadow-[0_0_20px_#C9A84C]" />
            </div>

            <div className="flex flex-col items-center animate-pulse">
                <span className="text-2xl font-light tracking-[0.25em] text-[#C9A84C] uppercase ml-2">
                    Spa<span className="font-bold">V2</span>
                </span>
                <span className="text-[10px] tracking-[0.3em] text-zinc-500 mt-3 uppercase ml-1">
                    Yükleniyor
                </span>
            </div>
        </div>
    )
}
