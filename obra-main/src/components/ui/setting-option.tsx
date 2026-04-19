import { cn } from '@/lib/utils';

interface SettingOptionProps {
  title: string;
  desc: string;
  checked?: boolean;
}

export default function SettingOption({ title, desc, checked = false }: SettingOptionProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
      <div>
        <h4 className="font-bold text-white text-sm">{title}</h4>
        <p className="text-slate-500 text-xs">{desc}</p>
      </div>
      <div className={cn("w-10 h-5 bg-slate-800 rounded-full relative cursor-pointer", checked && "bg-blue-600")}>
        <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", checked ? "right-1" : "left-1")}/>
      </div>
    </div>
  );
}