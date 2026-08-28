import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { TemplateType } from '@prisma/client';
import { convertCraftDesignToPuck, isCraftDesign } from '@/lib/templates/craft-to-puck';
import { isPuckData } from '@/lib/templates/puck-data';

const DESIGNS_DIR = path.join(process.cwd(), 'prisma', 'system-template-designs');

function templateTypeFromFile(fileName: string): TemplateType {
  const lower = fileName.toLowerCase();
  if (lower.includes('document') || lower.includes('yearly-account')) return TemplateType.DOCUMENT;
  return TemplateType.EMAIL;
}

async function main() {
  const files = (await readdir(DESIGNS_DIR)).filter((file) => file.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(DESIGNS_DIR, file);
    const raw = JSON.parse(await readFile(filePath, 'utf8')) as {
      designJson?: unknown;
      subjectOrFilename?: unknown;
    };
    const design = raw.designJson ?? raw;
    if (isPuckData(design)) {
      console.log(`skip (already puck): ${file}`);
      continue;
    }
    if (!isCraftDesign(design)) {
      console.warn(`skip (unrecognized): ${file}`);
      continue;
    }

    const converted = convertCraftDesignToPuck(design, templateTypeFromFile(file));
    await writeFile(
      filePath,
      `${JSON.stringify({ designJson: converted, subjectOrFilename: raw.subjectOrFilename ?? null }, null, 2)}\n`,
    );
    console.log(`converted: ${file}`);
  }
}

void main();
