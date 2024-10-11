import type ScratchStorage from 'scratch-storage';

export type GUIConfigFactory = () => GUIConfig;
export type ProjectId = string | number;

export interface GUIConfig {
  storage: GUIStorage
}

export interface GUIStorage {
  scratchStorage: ScratchStorage;

  // Called multiple times (as changes happen)
  setProjectHost?(host: string): void;
  setProjectToken?(token: string): void;
  setProjectMetadata?(projectId: string | null | undefined): void;
  setAssetHost?(host: string): void;
  setTranslatorFunction?(formatMessageFn: TranslatorFunction): void;
  setBackpackHost?(host: string): void;

  saveProject(projectId: ProjectId | null | undefined, vmState: object, params: {
    originalId: ProjectId,
    isCopy: boolean | 1,
    isRemix: boolean | 1,
    title: string
  }): Promise<{ id: ProjectId }>;

  saveProjectThumbnail?(projectId: ProjectId, thumbnail: Blob): void;

  // TODO: backpacks
}

export type TranslatorFunction = (msgObj: MessageObject, options?: {index: number}) => string;

export interface MessageObject {
  id: string;
  description: string;
  defaultMessage: string;
}
