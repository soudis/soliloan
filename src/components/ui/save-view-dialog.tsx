import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SaveViewDialogProps {
  disabled?: boolean;
  onSave: (name: string, isDefault: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function SaveViewDialog({
  onSave,
  isLoading = false,
  disabled = false,
}: SaveViewDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const t = useTranslations("views");

  const handleSave = async () => {
    if (!name.trim()) return;

    await onSave(name, isDefault);
    setOpen(false);
    setName("");
    setIsDefault(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title={t("saveView.title")}
          disabled={disabled}
        >
          <Save className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("saveView.title")}</DialogTitle>
          <DialogDescription>{t("saveView.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              {t("saveView.name")}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder={t("saveView.namePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right"></div>
            <div className="col-span-3 flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked as boolean)}
              />
              <Label htmlFor="isDefault">{t("saveView.isDefault")}</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? t("saveView.saving") : t("saveView.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
