import type { Editor } from '@tiptap/react';
import type { MutableRefObject } from 'react';
import { useEffect, useState } from 'react';

type EditorData = {
  editor: Editor;
  lastSelection: MutableRefObject<{ from: number; to: number } | null>;
};

class EditorRegistry {
  private static instance: EditorRegistry;
  private editors: Map<string, EditorData> = new Map();
  private listeners: Map<string, Set<() => void>> = new Map();

  private constructor() {}

  public static getInstance(): EditorRegistry {
    if (!EditorRegistry.instance) {
      EditorRegistry.instance = new EditorRegistry();
    }
    return EditorRegistry.instance;
  }

  public register(id: string, editor: Editor, lastSelection: MutableRefObject<{ from: number; to: number } | null>) {
    this.editors.set(id, { editor, lastSelection });
    this.notify(id);
  }

  public unregister(id: string) {
    this.editors.delete(id);
    this.notify(id);
  }

  public get(id: string): EditorData | undefined {
    return this.editors.get(id);
  }

  public subscribe(id: string, callback: () => void) {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    this.listeners.get(id)?.add(callback);
    return () => {
      this.listeners.get(id)?.delete(callback);
    };
  }

  private notify(id: string) {
    if (this.listeners.has(id)) {
      this.listeners.get(id)?.forEach((cb) => cb());
    }
  }
}

export const editorRegistry = EditorRegistry.getInstance();

export const useEditorRegistry = (id: string) => {
  const [data, setData] = useState<EditorData | undefined>(() => editorRegistry.get(id));

  useEffect(() => {
    // Update initial state in case it changed before effect ran
    setData(editorRegistry.get(id));

    return editorRegistry.subscribe(id, () => {
      setData(editorRegistry.get(id));
    });
  }, [id]);

  return data;
};
