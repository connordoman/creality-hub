export interface AppSettings {
  printerHost: string;
  printerName: string;
}

export interface UpdateAppSettingsRequest {
  printerHost?: string;
  printerName?: string;
}
