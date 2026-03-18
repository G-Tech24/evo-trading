import { ScrollArea } from "@/components/ui/scroll-area";
import { Baby, Skull, TrendingUp, Zap, Dna } from "lucide-react";
import type { Event } from "@shared/schema";

const EVENT_ICONS: Record<string, React.ReactNode> = {
  birth: <Baby className="w-3 h-3 text-blue-400 flex-shrink-0"/>,
  death: <Skull className="w-3 h-3 text-red-400 flex-shrink-0"/>,
  trade: <TrendingUp className="w-3 h-3 text-green-400 flex-shrink-0"/>,
  generation: <Zap className="w-3 h-3 text-yellow-400 flex-shrink-0"/>,
  reproduction: <Dna className="w-3 h-3 text-purple-400 flex-shrink-0"/>,
};

const EVENT_COLORS: Record<string, string> = {
  birth: "text-blue-300",
  death: "text-red-300",
  trade: "text-green-300",
  generation: "text-yellow-300",
  reproduction: "text-purple-300",
};

export function EventLog({ events }: { events: Event[] }) {
  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-2 space-y-1">
        {events.map(event => (
          <div key={event.id} className="flex items-start gap-1.5 py-1 border-b border-border/40">
            {EVENT_ICONS[event.type] ?? <TrendingUp className="w-3 h-3 text-muted-foreground flex-shrink-0"/>}
            <div className="min-w-0">
              <p className={`text-[10px] font-mono leading-tight break-words ${EVENT_COLORS[event.type] ?? "text-muted-foreground"}`}>
                {event.message}
              </p>
              <span className="text-[9px] text-muted-foreground font-mono">
                {new Date(event.timestamp).toLocaleTimeString("en", { hour12: false })}
              </span>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-center text-muted-foreground text-[10px] py-6">
            Sin eventos aún...
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
