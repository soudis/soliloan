'use client';

import { AlertCircle, Check, Info, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ActionButton } from '@/components/ui/action-button';
import { DonutIndicator } from '@/components/ui/donut-indicator';
import { GridIndicator5x4 } from '@/components/ui/grid-indicator-5x4';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Showcase({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export function SandboxClient() {
  const [switchState, setSwitchState] = useState(false);
  const [gridValue, setGridValue] = useState(7);
  const [donutValue, setDonutValue] = useState(65000);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Komponenten Sandbox</h1>
        <p className="text-muted-foreground">Visuelle Referenz aller UI-Komponenten und ihrer Varianten.</p>
      </div>

      <Separator />

      {/* Buttons */}
      <Section title="Button">
        <Showcase label="Varianten">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </Showcase>

        <Showcase label="Größen">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">
            <Plus />
          </Button>
        </Showcase>

        <Showcase label="Zustände">
          <Button disabled>Disabled</Button>
          <Button>
            <Check className="mr-1" /> Mit Icon
          </Button>
        </Showcase>
      </Section>

      <Separator />

      {/* Badge */}
      <Section title="Badge">
        <Showcase label="Varianten">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </Showcase>
      </Section>

      <Separator />

      {/* Alert */}
      <Section title="Alert">
        <Showcase label="Default">
          <Alert className="w-full">
            <Info className="h-4 w-4" />
            <AlertTitle>Hinweis</AlertTitle>
            <AlertDescription>Das ist ein informativer Hinweis.</AlertDescription>
          </Alert>
        </Showcase>

        <Showcase label="Destructive">
          <Alert variant="destructive" className="w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fehler</AlertTitle>
            <AlertDescription>Es ist ein Fehler aufgetreten. Bitte versuche es erneut.</AlertDescription>
          </Alert>
        </Showcase>
      </Section>

      <Separator />

      {/* Card */}
      <Section title="Card">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Einfache Card</CardTitle>
              <CardDescription>Eine Card mit Titel und Beschreibung.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Hier steht der Inhalt der Card.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Card mit Footer</CardTitle>
              <CardDescription>Diese Card hat einen Footer-Bereich.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Inhalt mit Aktionen im Footer.</p>
            </CardContent>
            <CardFooter className="gap-2">
              <Button variant="outline" size="sm">
                Abbrechen
              </Button>
              <Button size="sm">Speichern</Button>
            </CardFooter>
          </Card>
        </div>
      </Section>

      <Separator />

      {/* Input & Textarea */}
      <Section title="Input & Textarea">
        <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="sandbox-default">Default</Label>
            <Input id="sandbox-default" placeholder="Placeholder-Text..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sandbox-disabled">Disabled</Label>
            <Input id="sandbox-disabled" placeholder="Nicht bearbeitbar" disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sandbox-invalid">Fehlerhaft (aria-invalid)</Label>
            <Input id="sandbox-invalid" aria-invalid="true" defaultValue="Ungültige Eingabe" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sandbox-file">Datei-Upload</Label>
            <Input id="sandbox-file" type="file" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="sandbox-textarea">Textarea</Label>
            <Textarea id="sandbox-textarea" placeholder="Mehrzeiliger Text..." />
          </div>
        </div>
      </Section>

      <Separator />

      {/* Switch */}
      <Section title="Switch">
        <Showcase label="Interaktiv">
          <div className="flex items-center gap-2">
            <Switch id="sandbox-switch" checked={switchState} onCheckedChange={setSwitchState} />
            <Label htmlFor="sandbox-switch">{switchState ? 'An' : 'Aus'}</Label>
          </div>
        </Showcase>

        <Showcase label="Disabled">
          <div className="flex items-center gap-2">
            <Switch disabled checked={false} />
            <Label className="opacity-50">Deaktiviert (Aus)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch disabled checked />
            <Label className="opacity-50">Deaktiviert (An)</Label>
          </div>
        </Showcase>
      </Section>

      <Separator />

      {/* GridIndicator5x4 */}
      <Section title="GridIndicator5x4">
        <Showcase label="Interaktiv">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24">
              <GridIndicator5x4 value={gridValue} className="h-full w-full" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium tabular-nums">{gridValue} / 20</p>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={gridValue}
                onChange={(e) => setGridValue(Number(e.target.value))}
                className="w-48"
              />
            </div>
          </div>
        </Showcase>
      </Section>

      <Separator />

      {/* DonutIndicator */}
      <Section title="DonutIndicator">
        <Showcase label="Interaktiv">
          <div className="flex items-center gap-6">
            <DonutIndicator value={donutValue} limit={100000} className="w-24 h-24">
              <span className="text-lg font-semibold">€</span>
            </DonutIndicator>
            <div className="space-y-2">
              <p className="text-sm font-medium tabular-nums">
                {donutValue.toLocaleString('de-DE')} / 100.000
              </p>
              <input
                type="range"
                min={0}
                max={120000}
                step={1000}
                value={donutValue}
                onChange={(e) => setDonutValue(Number(e.target.value))}
                className="w-48"
              />
            </div>
          </div>
        </Showcase>
      </Section>

      <Separator />

      {/* ActionButton */}
      <Section title="ActionButton">
        <Showcase label="Varianten">
          <ActionButton icon={<Pencil className="h-4 w-4" />} tooltip="Bearbeiten" onClick={() => {}} />
          <ActionButton
            icon={<Trash2 className="h-4 w-4" />}
            tooltip="Löschen"
            onClick={() => {}}
            variant="destructive"
          />
          <ActionButton
            icon={<Plus className="h-4 w-4" />}
            tooltip="Hinzufügen (disabled)"
            onClick={() => {}}
            disabled
          />
        </Showcase>
      </Section>
    </div>
  );
}
