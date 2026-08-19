import mixpanel, { Dict } from 'mixpanel-browser';

const isBrowser = typeof window !== 'undefined';
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || 'YOUR_FALLBACK_TOKEN_HERE';

if (isBrowser) {
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: process.env.NODE_ENV === 'development',
    track_pageview: true,
    persistence: 'localStorage',
  });
}

export const trackEvent = (eventName: string, props?: Dict) => {
  if (isBrowser) {
    mixpanel.track(eventName, props);
  }
};

export const identifyUser = (userId: string, traits?: Dict) => {
  if (isBrowser) {
    mixpanel.identify(userId);
    if (traits) {
      mixpanel.people.set(traits);
    }
  }
};

export const resetUser = () => {
  if (isBrowser) {
    mixpanel.reset();
  }
};

export default mixpanel;
