import React from 'react';
import styles from './EventsList.module.css';

interface Event {
  type: string;
  timestamp: string;
  data?: any;
}

interface EventsListProps {
  events: Event[];
}

const EventsList: React.FC<EventsListProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className={styles.empty}>
        <h3>Recent Events</h3>
        <p>No events recorded yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.eventsContainer}>
      <h3>Recent Events</h3>
      <ul className={styles.eventsList}>
        {events.map((event, index) => (
          <li key={index} className={styles.eventItem}>
            <div className={styles.eventType}>
              {event.type}
            </div>
            <div className={styles.eventTime}>
              {new Date(event.timestamp).toLocaleTimeString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EventsList;
