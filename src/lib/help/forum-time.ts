import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

export function formatForumRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: de });
}

export function formatForumAbsoluteTime(date: Date | string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(date));
}
