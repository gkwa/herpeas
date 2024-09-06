import { log } from "crawlee";

function getCallerInfo() {
  const error = {};
  Error.captureStackTrace(error);
  const stack = (error as any).stack.split('\n')[3];
  const match = stack.match(/at .+:(\d+):\d+/);
  return match ? `[Line ${match[1]}]` : '';
}

export function enhancedLog(level: 'info' | 'error' | 'debug', message: string, data?: Record<string, any>) {
  const callerInfo = getCallerInfo();
  if (data) {
    log[level](`${callerInfo} ${message}`, data);
  } else {
    log[level](`${callerInfo} ${message}`);
  }
}

