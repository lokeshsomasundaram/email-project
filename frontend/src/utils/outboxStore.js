// Manages outbox emails in localStorage for frontend-only scheduling and persistence
const OUTBOX_KEY = 'stackly_outbox';

export const getOutboxItems = () => {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  } catch {
    return [];
  }
};

export const addToOutbox = (emailData) => {
  const items = getOutboxItems();
  const newItem = {
    ...emailData,
    id: `outbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    outbox_status: emailData.outbox_status || 'scheduled',
    scheduled_for: emailData.scheduled_for || null,
    date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    subject: emailData.subject || '(No Subject)',
    to: emailData.to || '',
    body: emailData.body || '',
    is_read: true,
  };
  items.unshift(newItem);
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  return newItem;
};

export const removeFromOutbox = (id) => {
  const items = getOutboxItems().filter((item) => item.id !== id);
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
};

export const updateOutboxItemStatus = (id, status) => {
  const items = getOutboxItems().map((item) =>
    item.id === id ? { ...item, outbox_status: status } : item
  );
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
};
