export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null; // Prevent SSR errors

  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function setCookie(
  name: string,
  value: string,
  options: { [key: string]: any } = {}
) {
  if (typeof window === 'undefined') return; // SSR guard
  
  let cookie = `${name}=${value}`;
  
  for (const optionKey in options) {
    cookie += `; ${optionKey}`;
    const optionValue = options[optionKey];
    if (optionValue !== true) {
      cookie += `=${optionValue}`;
    }
  }
  
  document.cookie = cookie;
}

export function deleteCookie(name: string) {
  setCookie(name, '', {
    'max-age': -1,
    path: '/'
  });
}