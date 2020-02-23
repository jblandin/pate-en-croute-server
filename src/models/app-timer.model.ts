
export interface AppTimer {
  state: string;
  timeleft: number;
  timeleft_next: number;
  duration: number;
  date_move?: string;
  date_move_iso?: string;
  date_move_next?: string;
  date_move_next_iso?: string;
  isPauseAutomatique: boolean;
}

export type AppTimerCallbackFn = (at: AppTimer) => void;
