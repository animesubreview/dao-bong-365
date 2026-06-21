// ── Football domain types (API-Football v3 shape, trimmed to what we use) ──

export interface FixtureTeam {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

export interface FixtureLeague {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string | null;
  season: number;
  round: string;
}

export interface FixtureGoals {
  home: number | null;
  away: number | null;
}

export interface FixtureStatus {
  long: string;
  short: string; // NS, 1H, HT, 2H, FT, ET, PEN, LIVE, PST, CANC...
  elapsed: number | null;
}

export interface Fixture {
  id: number;
  date: string; // ISO
  timestamp: number;
  status: FixtureStatus;
  venue: { name: string | null; city: string | null };
}

export interface FixtureItem {
  fixture: Fixture;
  league: FixtureLeague;
  teams: { home: FixtureTeam; away: FixtureTeam };
  goals: FixtureGoals;
  score: {
    halftime: FixtureGoals;
    fulltime: FixtureGoals;
  };
}

export const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT'];
export const FINISHED_STATUSES = ['FT', 'AET', 'PEN'];

export function isLive(s: string) { return LIVE_STATUSES.includes(s); }
export function isFinished(s: string) { return FINISHED_STATUSES.includes(s); }
export function isUpcoming(s: string) { return s === 'NS' || s === 'TBD'; }
