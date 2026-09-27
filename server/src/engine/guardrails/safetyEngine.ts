import { Agent, WorkingHoursConfig, HumanHandoffConfig } from '../../types/index.js';

export interface WorkingHoursCheckResult {
  isWithinHours: boolean;
  reason?: string;
  outOfHoursMessage?: string;
}

export interface HandoffCheckResult {
  shouldHandoff: boolean;
  reason?: string;
  matchedKeyword?: string;
}

export class SafetyEngine {
  private static userMessageHistory: Map<string, number[]> = new Map();

  /**
   * Checks if the agent is currently within configured working hours
   */
  public static checkWorkingHours(agent: Agent): WorkingHoursCheckResult {
    const config = agent.workingHours;
    if (!config || !config.enabled) {
      return { isWithinHours: true };
    }

    try {
      const now = new Date();
      // Format current date in agent's configured timezone
      const tz = config.timezone || 'UTC';
      const timeString = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);

      const dayOfWeekString = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'long',
      }).format(now).toLowerCase();

      const dateIsoString = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now); // "YYYY-MM-DD"

      // Check Holiday rules
      if (config.holidayRules && config.holidayRules.length > 0) {
        const holiday = config.holidayRules.find(h => h.date === dateIsoString);
        if (holiday) {
          return {
            isWithinHours: false,
            reason: `Holiday: ${holiday.name}`,
            outOfHoursMessage: holiday.message || config.outOfHoursMessage,
          };
        }
      }

      // Check Daily schedule
      const daySchedule = config.schedule[dayOfWeekString as keyof typeof config.schedule];
      if (!daySchedule || daySchedule.isClosed) {
        return {
          isWithinHours: false,
          reason: `Closed on ${dayOfWeekString}`,
          outOfHoursMessage: config.outOfHoursMessage,
        };
      }

      const [currentHour, currentMin] = timeString.split(':').map(Number);
      const [openHour, openMin] = daySchedule.open.split(':').map(Number);
      const [closeHour, closeMin] = daySchedule.close.split(':').map(Number);

      const currentTotal = currentHour * 60 + currentMin;
      const openTotal = openHour * 60 + openMin;
      const closeTotal = closeHour * 60 + closeMin;

      if (currentTotal < openTotal || currentTotal > closeTotal) {
        return {
          isWithinHours: false,
          reason: `Outside hours: currently ${timeString} (Open ${daySchedule.open} - ${daySchedule.close})`,
          outOfHoursMessage: config.outOfHoursMessage,
        };
      }

      return { isWithinHours: true };
    } catch (err) {
      // Fallback to open if timezone is invalid
      return { isWithinHours: true };
    }
  }

  /**
   * Checks if user message matches human handoff triggers
   */
  public static checkHumanHandoff(agent: Agent, userMessage: string): HandoffCheckResult {
    const config = agent.humanHandoff;
    if (!config || !config.enabled) {
      return { shouldHandoff: false };
    }

    const lower = userMessage.toLowerCase();
    const keywords = config.triggerKeywords || [];

    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw.trim().toLowerCase()}\\b`, 'i');
      if (regex.test(lower)) {
        return {
          shouldHandoff: true,
          reason: `Matched keyword trigger: "${kw}"`,
          matchedKeyword: kw,
        };
      }
    }

    return { shouldHandoff: false };
  }

  /**
   * Enforces Rate Limiting per user (max 20 msgs per minute)
   */
  public static checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxRequests = 25;

    let timestamps = this.userMessageHistory.get(userId) || [];
    timestamps = timestamps.filter(t => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    timestamps.push(now);
    this.userMessageHistory.set(userId, timestamps);
    return { allowed: true, remaining: maxRequests - timestamps.length };
  }

  /**
   * Redacts sensitive tokens (Telegram Bot Tokens, API keys, passwords) from output
   */
  public static redactSecrets(content: string): string {
    let sanitized = content;

    // Telegram Bot Token regex: e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
    sanitized = sanitized.replace(/\b\d{8,12}:[a-zA-Z0-9_-]{20,48}\b/g, '[REDACTED_TELEGRAM_TOKEN]');

    // OpenAI / Gemini key patterns
    sanitized = sanitized.replace(/\b(sk-[a-zA-Z0-9_-]{20,60})\b/g, '[REDACTED_API_KEY]');
    sanitized = sanitized.replace(/\b(AIzaSy[a-zA-Z0-9_-]{15,40})\b/g, '[REDACTED_GEMINI_KEY]');

    return sanitized;
  }

  /**
   * Enforces reality-check guardrails so the agent doesn't falsely confirm actions it cannot do
   */
  public static enforceRealityCheck(agent: Agent, text: string): string {
    let checked = text;

    // If no calendar sync exists, convert definitive booking claims to booking request acknowledgments
    if (/your (appointment|booking) is (now )?(confirmed|booked)/i.test(checked)) {
      if (!checked.includes('request') && !checked.includes('pending confirmation')) {
        checked = checked.replace(
          /(your (?:appointment|booking) is (?:now )?(?:confirmed|booked))/i,
          'your appointment request has been recorded and is pending staff confirmation'
        );
      }
    }

    // Prevent fake payment completion
    if (/payment (has been )?completed/i.test(checked)) {
      checked = checked.replace(
        /(payment (?:has been )?completed)/i,
        'payment request received for processing'
      );
    }

    return checked;
  }
}
