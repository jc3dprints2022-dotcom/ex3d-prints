import posthog from 'posthog-js';

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === 'undefined') return;

  const apiKey = 'phc_ptBpp9EGfhA7SW7MMpmGuwz8bLXParsZbTytqjBUaBWd';

  posthog.init(apiKey, {
    api_host: 'https://us.i.posthog.com',
    capture_pageview: true,
    autocapture: true,
    capture_pageleave: true,
    enable_recording_console_log: false,
    session_recording: {
      maskAllInputs: false,
      maskAllText: false,
    },
    loaded(ph) {
      // Persist UTM params for the session
      const params = new URLSearchParams(window.location.search);
      const utm = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => {
        if (params.get(k)) utm[k] = params.get(k);
      });
      if (Object.keys(utm).length) {
        ph.register(utm);
      }
      if (document.referrer) {
        ph.register({ referrer: document.referrer });
      }
    },
  });

  initialized = true;
}

export { posthog };