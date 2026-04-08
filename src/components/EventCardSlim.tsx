import type { Event } from '../types';

type EventCardSlimProps = {
  event: Event;
};

export default function EventCardSlim({ event }: EventCardSlimProps) {
  return (
    <div className="border-l-2 border-gray-300 pl-2 py-1 mb-1 opacity-65">
      <div className="text-[10px] text-gray-600">
        {event.time} · {event.event_name}
      </div>
    </div>
  );
}
