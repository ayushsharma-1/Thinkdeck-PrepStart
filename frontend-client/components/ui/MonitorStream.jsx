"use client";
import React from 'react';

const MonitorStream = ({ url, className }) => {
  if (!url) return null;

  return (
    <div className={className || 'absolute top-3 right-3 w-48 h-32 bg-black/40 rounded-md overflow-hidden border border-white/20'}>
      <img
        src={url}
        alt="Monitor Stream"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
};

export default MonitorStream;
