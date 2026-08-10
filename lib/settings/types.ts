export interface BuildVolume {
  x: number;
  y: number;
  z: number;
}

export interface AppSettings {
  printerHost: string;
  printerName: string;
  motorStepSizes: number[];
  buildVolume: BuildVolume;
}

export interface UpdateAppSettingsRequest {
  printerHost?: string;
  printerName?: string;
  motorStepSizes?: number[];
  buildVolume?: BuildVolume;
}
