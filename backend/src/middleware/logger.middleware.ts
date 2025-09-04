import { Request, Response, NextFunction } from 'express';
import { logger } from '@/services/logger.service';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Log incoming request
  logger.http(`${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  
  res.end = function(chunk: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    logger.http(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    originalEnd.call(this, chunk, encoding);
  } as any;

  next();
};
