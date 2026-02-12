export const processTemplate = (template: string, currentData: Record<string, any>): string => {
  let result = template;
  const loopStartRegex = /\{\{#(\w+)\}\}/g;
  let loopMatch: RegExpExecArray | null;
  let loopReplacementResult = '';
  let lastEnd = 0;

  // biome-ignore lint/suspicious/noAssignInExpressions: logic requires it
  while ((loopMatch = loopStartRegex.exec(template)) !== null) {
    const key = loopMatch[1];
    const startIdx = loopMatch.index;
    const endTag = `{{/${key}}}`;
    let depth = 1;
    let searchPos = startIdx + loopMatch[0].length;
    let foundEndIdx = -1;

    while (depth > 0) {
      const nextStart = template.indexOf(`{{#${key}}}`, searchPos);
      const nextEnd = template.indexOf(endTag, searchPos);
      if (nextEnd === -1) break;
      if (nextStart !== -1 && nextStart < nextEnd) {
        depth++;
        searchPos = nextStart + `{{#${key}}}`.length;
      } else {
        depth--;
        if (depth === 0) {
          foundEndIdx = nextEnd;
        } else {
          searchPos = nextEnd + endTag.length;
        }
      }
    }

    if (foundEndIdx !== -1) {
      loopReplacementResult += template.substring(lastEnd, startIdx);
      const innerContent = template.substring(startIdx + loopMatch[0].length, foundEndIdx);
      const items = currentData[key];
      if (Array.isArray(items)) {
        loopReplacementResult += items.map((item: any) => processTemplate(innerContent, item)).join('');
      }
      lastEnd = foundEndIdx + endTag.length;
      loopStartRegex.lastIndex = lastEnd;
    }
  }

  loopReplacementResult += template.substring(lastEnd);
  result = loopReplacementResult;

  // Improved tag regex to support optional spaces and broader key characters (e.g. {{ project-name }})
  const tagRegex = /\{\{\s*([a-zA-Z0-9.\-_#\/]+)\s*\}\}/g;
  result = result.replace(tagRegex, (match, path) => {
    if (path.startsWith('#') || path.startsWith('/')) return match;
    const parts = path.split('.');
    let value = currentData;
    for (const part of parts) {
      value = value?.[part];
    }
    return value !== undefined && value !== null ? String(value) : match;
  });
  return result;
};
