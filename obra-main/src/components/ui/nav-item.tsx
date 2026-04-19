import { cn } from '@/lib/utils';

interface NavItemProps {
  icon: React.ComponentType<any>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export default function NavItem({ icon: Icon, label, active = false, onClick }: NavItemProps) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300", 
        active ? "nav-item-active" : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
      )}
    >
      <Icon size={18} /> 
      <span className="text-sm font-black">{label}</span>
    </button>
  );
}