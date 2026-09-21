import mixpanel, { Dict } from 'mixpanel-browser';

const isBrowser = typeof window !== 'undefined';
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

if (isBrowser && MIXPANEL_TOKEN) {
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: process.env.NODE_ENV !== 'production',
    track_pageview: true,
    persistence: 'localStorage',
  });
}

function isMixpanelReady(): boolean {
  return isBrowser && !!MIXPANEL_TOKEN;
}

export const trackEvent = (eventName: string, props?: Dict) => {
  if (!isMixpanelReady()) return;
  mixpanel.track(eventName, props);
};

export const identifyUser = (userId: string, traits?: Dict) => {
  if (!isMixpanelReady()) return;
  mixpanel.identify(userId);
  if (traits) {
    mixpanel.people.set(traits);
  }
};

export const resetUser = () => {
  if (!isMixpanelReady()) return;
  mixpanel.reset();
};

export default mixpanel;
