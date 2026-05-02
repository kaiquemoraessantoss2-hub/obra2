import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Truck, ClipboardCheck, CheckCircle2, Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { loadCalendarEvents, saveCalendarEvents } from '@/lib/auth';

interface CalendarEvent {
  day: number;
  type: 'DELIVERY' | 'TASK';
  title: string;
  time: string;
  status: 'PENDING' | 'COMPLETED';
}

interface Props {
  companyId: string;
}

export default function ConstructionCalendar({ companyId }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', type: 'TASK' as 'DELIVERY' | 'TASK', day: 1, time: '08:00' });

  useEffect(() => {
    const storedEvents = loadCalendarEvents(companyId);
    setEvents(storedEvents);
  }, [companyId]);

  const handleSaveEvents = (newEvents: CalendarEvent[]) => {
    setEvents(newEvents);
    saveCalendarEvents(companyId, newEvents);
  };

  const completedEvents = events.filter(e => e.status === 'COMPLETED').length;
  const totalEvents = events.length;
  const deliveryRate = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 100;

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth(currentDate.getMonth(), currentDate.getFullYear()); i++) calendarDays.push(i);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-in">
      {/* Calendar Grid */}
      <div className="lg:col-span-3 glass-card p-10 rounded-[40px] border-white/5">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-black text-white">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <p className="text-sm text-slate-500">Cronograma diário de entregas e tarefas.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={prevMonth} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 border border-white/5"><ChevronLeft size={20} /></button>
            <button onClick={nextMonth} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 border border-white/5"><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-white/5 rounded-3xl overflow-hidden border border-white/5">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="bg-[var(--background)] p-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">{d}</div>
          ))}
          {calendarDays.map((day, idx) => {
             const dayEvents = day ? events.filter(e => e.day === day) : [];
             return (
                <div key={idx} className={cn(
                   "bg-[var(--background)] min-h-[120px] p-4 border border-white/2 transition-all",
                   day ? "hover:bg-white/[0.02] cursor-pointer" : "opacity-20"
                )}>
                   {day && (
                      <div className="space-y-3">
                         <span className={cn("text-xs font-black", day === 14 ? "w-6 h-6 flex items-center justify-center bg-blue-600 rounded-lg text-white" : "text-slate-500")}>{day}</span>
                         <div className="space-y-1">
                            {dayEvents.map((e, i) => (
                               <div key={i} className={cn(
                                  "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter flex items-center gap-1",
                                  e.type === 'DELIVERY' ? "bg-amber-500/10 text-amber-500" : "bg-blue-600/10 text-blue-500"
                               )}>
                                  {e.type === 'DELIVERY' ? <Truck size={10} /> : <ClipboardCheck size={10} />}
                                  <span className="line-clamp-1">{e.title}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                   )}
                </div>
             );
          })}
        </div>
      </div>

      {/* Side Summary */}
      <div className="lg:col-span-1 space-y-6">
        <button onClick={() => setIsAddingEvent(true)} className="w-full btn-primary py-6 flex items-center justify-center gap-3 shadow-blue-600/20">
           <Plus size={20} /> Nova Tarefa / Entrega
        </button>

        <div className="glass-card p-8 rounded-[32px] border-white/5">
           <h3 className="text-lg font-black text-white mb-6">Próximas Atividades</h3>
           <div className="space-y-6">
              {events.slice(0, 3).map((e, i) => (
                 <div key={i} className="flex gap-4 group">
                    <div className={cn(
                       "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                       e.type === 'DELIVERY' ? "bg-amber-500/10 text-amber-500" : "bg-blue-600/10 text-blue-500"
                    )}>
                       {e.type === 'DELIVERY' ? <Truck size={20} /> : <ClipboardCheck size={20} />}
                    </div>
                    <div>
                       <h4 className="text-white font-bold text-sm group-hover:text-blue-500 transition-colors">{e.title}</h4>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{e.time} — Dia {e.day}</p>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        <div className="glass-card p-8 rounded-[32px] border-emerald-500/10">
            <div className="flex items-center gap-3 text-emerald-500 mb-4">
               <CheckCircle2 size={24} />
               <p className="text-xs font-black uppercase">Taxa de Entrega</p>
            </div>
            <p className="text-3xl font-black text-white">{deliveryRate}%</p>
            <p className="text-slate-500 text-xs mt-1">Pontualidade dos fornecedores.</p>
        </div>
      </div>

      {/* Modal Adicionar Evento */}
      {isAddingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-8 rounded-[32px] border-white/10 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white">Nova Atividade</h3>
              <button onClick={() => setIsAddingEvent(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Título</label>
                <input 
                  type="text" 
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500"
                  placeholder="Ex: Concretagem Laje 5"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tipo</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setNewEvent({...newEvent, type: 'TASK'})}
                    className={cn("flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all", newEvent.type === 'TASK' ? "bg-blue-600 text-white" : "bg-white/5 text-slate-500")}
                  >
                    Tarefa
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewEvent({...newEvent, type: 'DELIVERY'})}
                    className={cn("flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all", newEvent.type === 'DELIVERY' ? "bg-amber-600 text-white" : "bg-white/5 text-slate-500")}
                  >
                    Entrega
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Dia</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="31"
                    value={newEvent.day}
                    onChange={(e) => setNewEvent({...newEvent, day: parseInt(e.target.value) || 1})}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Horário</label>
                  <input 
                    type="time" 
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <button 
                onClick={() => {
                  if (newEvent.title.trim()) {
                    handleSaveEvents([...events, { ...newEvent, status: 'PENDING' }]);
                    setIsAddingEvent(false);
                    setNewEvent({ title: '', type: 'TASK', day: 1, time: '08:00' });
                  }
                }}
                className="w-full btn-primary py-4 mt-4"
              >
                Criar Atividade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
