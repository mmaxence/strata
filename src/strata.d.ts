export type SceneMode = 'focus' | 'overview';
export type ScenePath = 'none' | 'belt' | 'float' | 'wave' | 'spiral';
export type SceneLayout = 'grid' | 'pile' | 'fan' | 'rail';
export interface AssemblySlot { x: number; y: number; width?: number; height?: number }
export interface AssemblyOptions { width?: number; height?: number; slots?: Record<string, AssemblySlot> }
export interface PathOptions { diameter?: number; axis?: number; speed?: number; interaction?: 'none' | 'pause' | 'steer'; tilt?: number }
export interface SceneOptions {
  onChange?: (state: Readonly<SceneState>) => void;
  /** Enable adaptive panel sizing and assembly. Defaults to data-workspace or legacy data-case. */
  workspace?: boolean;
  compactWidth?: number;
  referenceWidth?: number;
  observeVisibility?: boolean;
  assembly?: AssemblyOptions;
}
export interface SceneState {
  active: string;
  mode: SceneMode;
  depth: number;
  rotation: number;
  depthOfField: number;
  assembled: boolean;
  layout: SceneLayout;
  railIndex: number;
  railPosition: number;
  path: ScenePath;
  configuredPath: ScenePath;
  angularVelocity: number;
  pileDragMode: 'cycle' | 'free';
  cursorMode: 'none' | 'pause' | 'steer';
  cursorTilt: number;
  diameter: number;
  axis: number;
  speed: number;
  reducedMotion: boolean;
  dragging: boolean;
  settling: boolean;
  resizing: boolean;
  paused: boolean;
  visible: boolean;
  disposed: boolean;
}
export interface SceneStats {
  animationFramePending: boolean;
  dragging: boolean;
  settling: boolean;
  resizing: boolean;
  pendingFrames: number;
  layoutAnimations: number;
}
export interface SceneController {
  focus(id: string): void;
  setMode(mode: SceneMode): void;
  setLayout(layout: SceneLayout): void;
  setPath(path: ScenePath, options?: PathOptions): void;
  setAssembled(assembled: boolean): void;
  sendToBack(): void;
  /** Rail only. Move by a signed number of items; clamps at either end. */
  navigate(step: number): void;
  setPileDragMode(mode: 'cycle' | 'free'): void;
  resizeSurface(id: string, width: number, height: number): void;
  setDepth(depth: number): void;
  setDepthOfField(pixels: number): void;
  orbit(degrees: number): void;
  pause(): void;
  resume(): void;
  reset(): void;
  destroy(): void;
  readonly state: Readonly<SceneState>;
  readonly stats: Readonly<SceneStats>;
  readonly isPaused: boolean;
}
/** Mount after the real HTML panels exist. Call destroy before removing the scene. */
export function createScene(element: HTMLElement, options?: SceneOptions): SceneController;
