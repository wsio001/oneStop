import type { Event } from '../types';

type EventCardSlimProps = {
  event: Event;
};

export default function EventCardSlim({ event }: EventCardSlimProps) {
  return (
    <div className="border border-gray-200 bg-gray-50 rounded-lg p-3 mb-2.5">
      {/* Header: Time + Group */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px] font-medium text-gray-600">
          {event.time} · {event.group || 'General'}
        </div>
      </div>

      {/* Event Name */}
      <div className="text-base font-semibold text-gray-700 mb-2">
        {event.event_name}
      </div>

      {/* Location */}
      {event.location && (
        <div className="text-[12px] text-gray-600 mb-1 flex items-center gap-1">
          <span>📍</span>
          <span>{event.location}</span>
        </div>
      )}

      {/* Lead & Helpers */}
      {(event.in_charge.length > 0 || event.helpers.length > 0) && (
        <div className="text-[12px] text-gray-600 mb-1 flex items-start gap-1">
          <span>👤</span>
          <span>
            {event.in_charge.length > 0 && (
              <>Lead: {event.in_charge.join(', ')}</>
            )}
            {event.in_charge.length > 0 && event.helpers.length > 0 && <> · </>}
            {event.helpers.length > 0 && (
              <>Helpers: {event.helpers.join(', ')}</>
            )}
          </span>
        </div>
      )}

      {/* Childcare */}
      {event.childcare.length > 0 && (
        <div className="text-[12px] text-gray-600 mb-1 flex items-center gap-1">
          <span>😊</span>
          <span>Childcare: {event.childcare.join(', ')}</span>
        </div>
      )}

      {/* Food/Snacks */}
      {event.food.length > 0 && (
        <div className="text-[12px] text-gray-600 mb-1 flex items-center gap-1">
          <span>🍔</span>
          <span>Snacks: {event.food.join(', ')}</span>
        </div>
      )}

      {/* Notes */}
      {event.notes && (
        <div className="text-[11px] text-gray-600 mt-2 pt-2 border-t border-gray-200 italic">
          {event.notes}
        </div>
      )}
    </div>
  );
}
