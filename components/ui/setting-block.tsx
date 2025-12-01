import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const SettingBlock = ({
  icon,
  label,
  description,
  control
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  control: React.ReactNode;
}) => (
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <div className="flex items-center gap-2">
        {icon}
        <Label>{label}</Label>
      </div>
      <p className="text-xs text-gray-500 ml-6 mt-1 mr-2">{description}</p>
    </div>
    <div className="ml-2">{control}</div>
  </div>
);

export const ToggleSetting = ({
  icon,
  label,
  description,
  value,
  onChange,
  onLabel = "On",
  offLabel = "Off"
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  onLabel?: string;
  offLabel?: string;
}) => (
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <div className="flex items-center gap-2">
        {icon}
        <Label>{label}</Label>
      </div>
      <p className="text-xs text-gray-500 ml-6 mt-1 mr-2">{description}</p>
    </div>
    <div className="flex items-center gap-2">
      <Label className="text-xs text-gray-500">{value ? onLabel : offLabel}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  </div>
);