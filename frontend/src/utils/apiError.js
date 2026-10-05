export function formatApiError(error, fallback = 'Something went wrong. Please try again.') {
  const responseData = error?.response?.data;
  const detail = responseData?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const message = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          if (typeof item.msg === 'string' && item.msg.trim()) return item.msg;
          if (typeof item.message === 'string' && item.message.trim()) return item.message;
          if (Array.isArray(item.loc) && item.loc.length) {
            const lastLocation = item.loc[item.loc.length - 1];
            return `${lastLocation}: ${item.msg || item.message || 'Invalid value'}`;
          }
        }
        return '';
      })
      .filter(Boolean)
      .join('. ');

    if (message) return message;
  }

  if (responseData && typeof responseData.message === 'string' && responseData.message.trim()) {
    return responseData.message;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
}
