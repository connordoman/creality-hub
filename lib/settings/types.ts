export interface AppSettings {
  printerHost: string;
  printerName: string;
  motorStepSizes: number[];
}

export interface UpdateAppSettingsRequest {
  printerHost?: string;
  printerName?: string;
  motorStepSizes?: number[];
}
