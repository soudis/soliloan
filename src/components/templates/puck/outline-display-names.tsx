'use client';

import type { Config, Data } from '@puckeditor/core';
import { walkTree } from '@puckeditor/core';
import { useEffect } from 'react';
import { useTemplatePuck } from './use-template-puck';

function collectDisplayNames(data: Data, config: Config): Map<string, string> {
  const names = new Map<string, string>();
  walkTree(data, config, (content) => {
    for (const item of content) {
      const id = typeof item.props.id === 'string' ? item.props.id : '';
      const custom = typeof item.props.displayName === 'string' ? item.props.displayName.trim() : '';
      if (id && custom) names.set(id, custom);
    }
    return content;
  });
  return names;
}

function applyOutlineLabels(root: Element, names: Map<string, string>) {
  root.querySelectorAll('[data-puck-layer-tree-id]').forEach((el) => {
    const id = el.getAttribute('data-puck-layer-tree-id');
    if (!id) return;
    const title = el.querySelector('[class*="Layer-title"]');
    const nameEl = title?.querySelector('[class*="Layer-name"]');
    if (!(nameEl instanceof HTMLElement)) return;
    if (!nameEl.dataset.puckTypeLabel) {
      nameEl.dataset.puckTypeLabel = nameEl.textContent ?? '';
    }
    const next = names.get(id) || nameEl.dataset.puckTypeLabel;
    if (nameEl.textContent !== next) nameEl.textContent = next;
  });
}

export function OutlineDisplayNames() {
  const data = useTemplatePuck((state) => state.appState.data);
  const config = useTemplatePuck((state) => state.config);

  useEffect(() => {
    const root = document.querySelector('.template-puck-sidebar');
    if (!root) return;

    const names = collectDisplayNames(data, config);
    let applying = false;
    const apply = () => {
      if (applying) return;
      applying = true;
      applyOutlineLabels(root, names);
      applying = false;
    };
    apply();

    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [config, data]);

  return null;
}
