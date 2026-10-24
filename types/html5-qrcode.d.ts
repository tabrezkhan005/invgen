declare module 'html5-qrcode' {
  export class Html5Qrcode {
    constructor(elementId: string);
    start(
      cameraIdOrConfig: string | { facingMode: string },
      config: { fps?: number; qrbox?: number | { width: number; height: number } },
      qrCodeSuccessCallback: (decodedText: string) => void,
      qrCodeErrorCallback?: (errorMessage: string) => void
    ): Promise<null>;
    stop(): Promise<void>;
    clear(): void;
  }
}
