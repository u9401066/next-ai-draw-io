/**
 * DrawioAdapter - 封裝 Draw.io 操作
 * 
 * 將 draw.io 的操作封裝在 Infrastructure 層，讓 Domain 層不需要知道 draw.io 的細節
 */

export interface DrawioAdapterInterface {
    load(xml: string): void;
    export(): Promise<string>;
    clear(): void;
}

/**
 * DrawioAdapter 的實作會在 React 元件中使用 drawioRef 實現
 * 這裡只定義介面
 */
export { DrawioAdapterInterface as DrawioAdapter };
