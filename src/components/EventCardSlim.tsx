import type { Event } from '../types';

type EventCardSlimProps = {
  event: Event;
};

export default function EventCardSlim({ event }: EventCardSlimProps) {
  return (
    <div className="border-[0.5px] border-gray-400 rounded-lg mb-3 px-3 py-2">
      {/* Header: Time */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] font-semibold text-gray-700">
          {event.time}
        </div>
      </div>

      {/* Event Name */}
      <div className="text-sm font-semibold text-gray-700 mb-1.5">
        {event.event_name}
      </div>

      {/* Location */}
      {event.location && (
        <div className="text-[9px] text-gray-800 mb-1 flex items-center gap-1">
          <span>📍</span>
          <span>{event.location}</span>
        </div>
      )}

      {/* Lead & Helpers */}
      {(event.in_charge_raw || event.helpers_raw) && (
        <div className="text-[9px] text-gray-800 mb-1 flex items-start gap-1">
          <span>👤</span>
          <span>
            {event.in_charge_raw && (
              <>Lead: {event.in_charge_raw}</>
            )}
            {event.in_charge_raw && event.helpers_raw && <> · </>}
            {event.helpers_raw && (
              <>Helpers: {event.helpers_raw}</>
            )}
          </span>
        </div>
      )}

      {/* Childcare */}
      {event.childcare_raw && (
        <div className="text-[9px] text-gray-800 mb-1 flex items-center gap-1">
          <span>👶</span>
          <span>Childcare: {event.childcare_raw}</span>
        </div>
      )}

      {/* Food/Snacks */}
      {event.food_raw && (
        <div className="text-[9px] text-gray-800 mb-1 flex items-center gap-1">
          <span>🍔</span>
          <span>Snacks: {event.food_raw}</span>
        </div>
      )}

      {/* Notes */}
      {event.notes && (
        <div className="text-[9px] text-gray-800 mt-2 pt-2 border-t border-gray-400 italic">
          {event.notes}
        </div>
      )}
    </div>
  );
}
